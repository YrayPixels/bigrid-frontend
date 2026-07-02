/**
 * Streaming parser for bolt-style code artifacts in AI responses.
 *
 * This parser is intentionally "dumb but streaming-safe":
 * - It can be fed arbitrary token chunks
 * - It emits completed `<boltAction>` blocks as structured actions
 * - It does NOT apply actions itself (use an ActionRunner for determinism/logging)
 */

export type BoltActionType = "file" | "shell" | "start" | "build" | "unsplash";

export type BoltAction = {
  type: BoltActionType;
  filePath?: string;
  attrs?: Record<string, string>;
  content: string;
};

export type BoltArtifactInfo = {
  id?: string;
  title?: string;
};

type ParserState = {
  insideArtifact: boolean;
  insideAction: boolean;
  artifactInfo: BoltArtifactInfo | null;
  currentAction: Partial<BoltAction> | null;
  buffer: string;
};

export type BoltParserHandlers = {
  onArtifactStart?: (info: BoltArtifactInfo) => void;
  onArtifactEnd?: () => void;
  onAction?: (action: BoltAction) => void;
};

function parseArtifactAttrs(tag: string): BoltArtifactInfo {
  const id = tag.match(/\bid="([^"]+)"/i)?.[1];
  const title = tag.match(/\btitle="([^"]+)"/i)?.[1];
  return { id, title };
}

function cleanBoltActionContent(raw: string): string {
  // Some models occasionally wrap file bodies in code fences even when asked not to.
  // Strip ONLY the outermost fences; keep everything else verbatim.
  let content = raw;
  content = content.replace(/^\s*```[a-z0-9_-]*\s*\n/i, "");
  content = content.replace(/\n```\s*$/i, "");
  return content.trimEnd();
}

export function createCodeParser(handlers: BoltParserHandlers = {}) {
  const state: ParserState = {
    insideArtifact: false,
    insideAction: false,
    artifactInfo: null,
    currentAction: null,
    buffer: "",
  };

  function feed(chunk: string) {
    state.buffer += chunk;

    while (true) {
      if (!state.insideArtifact) {
        const artifactStart = state.buffer.match(/<boltArtifact[^>]*>/i);
        if (!artifactStart) {
          // Keep a small tail so split tags can still match next chunk.
          state.buffer = state.buffer.slice(-512);
          break;
        }

        const startIdx = artifactStart.index ?? 0;
        const tag = artifactStart[0];
        state.insideArtifact = true;
        state.artifactInfo = parseArtifactAttrs(tag);
        handlers.onArtifactStart?.(state.artifactInfo);
        state.buffer = state.buffer.slice(startIdx + tag.length);
        continue;
      }

      if (!state.insideAction) {
        const artifactClose = state.buffer.match(/<\/boltArtifact>/i);
        const actionStart = state.buffer.match(
          /<boltAction\s+type="(file|shell|start|build|unsplash)"([^>]*)>/i,
        );

        if (actionStart && (artifactClose == null || (actionStart.index ?? 0) < (artifactClose.index ?? 0))) {
          const rawAttrs = actionStart[2] ?? "";
          const attrs: Record<string, string> = {};
          // Parse key="value" attributes (streaming-safe: this only runs on full open tags).
          for (const match of rawAttrs.matchAll(/\s+([a-zA-Z_][\w-]*)="([^"]*)"/g)) {
            attrs[match[1]] = match[2];
          }
          state.insideAction = true;
          state.currentAction = {
            type: actionStart[1] as BoltActionType,
            filePath: attrs.filePath,
            attrs,
            content: "",
          };
          state.buffer = state.buffer.slice((actionStart.index ?? 0) + actionStart[0].length);
          continue;
        }

        if (artifactClose) {
          state.insideArtifact = false;
          state.insideAction = false;
          state.currentAction = null;
          state.artifactInfo = null;
          handlers.onArtifactEnd?.();
          state.buffer = state.buffer.slice((artifactClose.index ?? 0) + artifactClose[0].length);
          continue;
        }

        // Still inside artifact, waiting for an action.
        // Keep some buffer tail for partial tags.
        state.buffer = state.buffer.slice(-1024);
        break;
      }

      // Inside an action, wait for a full close tag.
      const actionClose = state.buffer.match(/<\/boltAction>/i);
      if (!actionClose) {
        // Prevent unbounded memory growth; move through buffer gradually.
        if (state.buffer.length > 4096) {
          const take = state.buffer.slice(0, 2048);
          state.currentAction!.content = (state.currentAction!.content ?? "") + take;
          state.buffer = state.buffer.slice(2048);
        }
        break;
      }

      const body = state.buffer.slice(0, actionClose.index ?? 0);
      state.currentAction!.content = (state.currentAction!.content ?? "") + body;

      const complete: BoltAction = {
        type: state.currentAction!.type as BoltActionType,
        filePath: state.currentAction!.filePath,
        content: cleanBoltActionContent(state.currentAction!.content ?? ""),
      };
      handlers.onAction?.(complete);

      state.insideAction = false;
      state.currentAction = null;
      state.buffer = state.buffer.slice((actionClose.index ?? 0) + actionClose[0].length);
      continue;
    }
  }

  function flush() {
    // If we ended mid-action, do nothing: partial writes are nondeterministic.
    state.buffer = "";
    state.insideArtifact = false;
    state.insideAction = false;
    state.currentAction = null;
    state.artifactInfo = null;
  }

  return { feed, flush };
}
