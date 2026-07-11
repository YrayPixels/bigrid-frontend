import {
  concreteTemplateIds,
  hasMinimumBusinessProfile,
  profileToStore,
  resolveSelectedTemplateId,
  sanitizeBusinessProfile,
  synthesizeStorefront,
} from "@/lib/storefront-builder/local-ai";
import { isCodeWorkbenchEnabled } from "@/lib/features";
import { codeFs } from "@/lib/code-fs";
import { createBoltStreamPipeline, lockedPathsFromStorefront } from "@/lib/bolt/bolt-stream";
import {
  createEditCheckpoint,
  formatDiffSummaryForChat,
  slimCheckpointForPersistence,
  snapshotFileContents,
} from "@/lib/bolt/workbench-diff";
import { runWorkbenchEditAgent } from "@/lib/bolt/workbench-edit-agent";
import {
  appendHistoryToMessages,
  resolveLiveWorkbenchFiles,
} from "@/lib/bolt/workbench-context";
import type { WebsiteBuilderToolDef } from "../types";

/** Bolt / code-workbench custom HTML storefront generation and edits. */
export class CustomSiteTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "generate_custom_site",
        description:
          "Generate a fully custom website with real HTML/CSS code instead of templates. The AI writes the complete storefront from scratch in bolt artifact format. Use when the merchant wants a unique handcrafted design or says 'custom site', 'build from scratch', 'unique design'.",
        parameters: {
          type: "object",
          properties: {
            style_note: { type: "string", description: "Style direction" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!isCodeWorkbenchEnabled()) {
            return { ok: false, error: "code_workbench_disabled" };
          }
          if (!hasMinimumBusinessProfile(ctx.profile)) {
            ctx.profile = sanitizeBusinessProfile({
              ...ctx.profile,
              business_name: ctx.profile.business_name ?? ctx.session.store?.business_name ?? "My Store",
              description:
                ctx.profile.description ??
                ctx.session.store?.description ??
                "A modern online store with curated products and a smooth checkout experience.",
              industry: ctx.profile.industry ?? ctx.session.store?.industry ?? "other",
              brand_color: ctx.profile.brand_color ?? ctx.session.store?.brand_color ?? "#0E7C66",
            });
          }
          const { postChatStream } = await import("@/lib/storefront-builder/agents/openaiChat");
          const styleNote = typeof args.style_note === "string" ? args.style_note : "";
          try {
            if (!ctx.storefront) {
              const available = concreteTemplateIds(ctx.templateOptions);
              const selected = resolveSelectedTemplateId(
                {
                  ...ctx.session,
                  selected_template_id: ctx.selectedTemplateId ?? ctx.session.selected_template_id,
                },
                ctx.recommendations,
                available,
              );
              ctx.selectedTemplateId = selected ?? (available[0] ?? null);
              const store =
                ctx.session.store ?? profileToStore(ctx.profile, ctx.selectedTemplateId ?? undefined);
              ctx.storefront = synthesizeStorefront(store, ctx.recommendations);
            }

            codeFs.clear();
            const storefrontRecord = ctx.storefront as Record<string, unknown>;
            const lockedPaths = lockedPathsFromStorefront(storefrontRecord, ctx.lockedPaths);
            const { parser, runner } = createBoltStreamPipeline({
              lockedPaths,
              callbacks: ctx.boltStream,
            });
            const products = Array.isArray(ctx.storefront?.products) ? ctx.storefront.products : [];
            const productLines =
              products.length > 0
                ? products
                    .map(
                      (p) =>
                        `- ${p.name} | ${p.price} ${p.currency ?? "NGN"}${p.description ? ` — ${p.description}` : ""}`,
                    )
                    .join("\n")
                : "Generate 4-6 sample products for this industry with prices in NGN.";
            const messages = appendHistoryToMessages(
              [
                {
                  role: "system" as const,
                  content: [
                    "You are Bizgrid Code. Build a complete e-commerce storefront website.",
                    "Output ALL code in bolt artifact format:",
                    '<boltArtifact id="storefront" title="Storefront">',
                    '  <boltAction type="file" filePath="index.html">...complete HTML...</boltAction>',
                    '  <boltAction type="file" filePath="styles.css">...all CSS...</boltAction>',
                    '  <boltAction type="file" filePath="script.js">...all JS...</boltAction>',
                    "</boltArtifact>",
                    "RULES:",
                    "- index.html: Complete HTML5 with nav, hero, product grid, about, FAQ, contact, footer",
                    `- Brand color: ${ctx.profile.brand_color ?? ctx.session.store?.brand_color ?? "#0E7C66"}`,
                    `- Store: ${ctx.profile.business_name ?? ctx.session.store?.business_name ?? "My Store"}`,
                    `- Industry: ${ctx.profile.industry ?? ctx.session.store?.industry ?? "other"}`,
                    styleNote ? `- Style: ${styleNote}` : "",
                    "- NO external CSS/JS — vanilla only",
                    "- Responsive mobile-first, CSS variables with brand color",
                    "- Cart in localStorage, Unsplash product images",
                    "- No markdown fences inside boltAction tags",
                    `Products:\n${productLines}`,
                  ]
                    .filter(Boolean)
                    .join("\n"),
                },
              ],
              ctx.chatHistory ?? [],
            );
            messages.push({
              role: "user",
              content: styleNote.trim()
                ? `Generate the storefront with this direction: ${styleNote}. Output in bolt artifact format only.`
                : "Generate the storefront now. Output in bolt artifact format only.",
            });

            let fullText = "";
            await postChatStream({
              messages,
              temperature: 0.7,
              onDelta: (delta) => {
                fullText += delta;
                parser.feed(delta);
              },
            });
            parser.flush();

            if (codeFs.listFiles().length === 0 && fullText.trim()) {
              codeFs.writeFile("index.html", fullText.trim());
            }
            (ctx.storefront as Record<string, unknown>).custom_code = codeFs.getMainHtml();
            (ctx.storefront as Record<string, unknown>).custom_files = codeFs.exportFiles();
            ctx.status = "content_generated";
            ctx.assistantMessage = "Your custom website is ready! Switch to Custom mode in the preview.";
            ctx.payload = {
              type: "custom_site_generated",
              custom_code: codeFs.getMainHtml(),
              files: codeFs.listFiles(),
              bolt_action_log: runner.getLog(),
            };
            return { ok: true, files: codeFs.listFiles(), html_size: fullText.length };
          } catch (err) {
            console.error("generate_custom_site failed:", err);
            ctx.assistantMessage = "Something went wrong. Let me try the template approach.";
            return { ok: false, error: `error: ${err instanceof Error ? err.message : "unknown"}` };
          }
        },
      },
      {
        name: "edit_custom_site_code",
        description:
          "Edit an already-generated custom website using a natural-language instruction. Uses grep → read → search_replace for surgical file patches.",
        parameters: {
          type: "object",
          properties: {
            instruction: { type: "string", description: "What to change in the custom code" },
          },
          required: ["instruction"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!isCodeWorkbenchEnabled()) {
            return { ok: false, error: "code_workbench_disabled" };
          }
          if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
          if (!hasMinimumBusinessProfile(ctx.profile)) {
            ctx.profile = sanitizeBusinessProfile({
              ...ctx.profile,
              business_name: ctx.profile.business_name ?? ctx.session.store?.business_name ?? "My Store",
              description:
                ctx.profile.description ??
                ctx.session.store?.description ??
                "A modern online store with curated products and a smooth checkout experience.",
              industry: ctx.profile.industry ?? ctx.session.store?.industry ?? "other",
              brand_color: ctx.profile.brand_color ?? ctx.session.store?.brand_color ?? "#0E7C66",
            });
          }

          const instruction =
            typeof args.instruction === "string" && args.instruction.trim()
              ? args.instruction.trim()
              : ctx.message.trim();
          if (!instruction) return { ok: false, error: "missing_instruction" };

          const storefrontRecord = ctx.storefront as Record<string, unknown>;
          const liveBeforeEdit = codeFs.exportFiles();
          if (liveBeforeEdit.length > 0) {
            storefrontRecord.custom_files = liveBeforeEdit;
            storefrontRecord.custom_code = codeFs.getMainHtml();
          }
          const files =
            liveBeforeEdit.length > 0 ? liveBeforeEdit : resolveLiveWorkbenchFiles(storefrontRecord);
          if (files.length === 0) return { ok: false, error: "no_custom_site_files" };

          const filePaths = files.map((f) => f.path);
          const isNodeProject = filePaths.includes("package.json");
          const lockedPaths = lockedPathsFromStorefront(storefrontRecord, ctx.lockedPaths);
          const beforeSnapshot = snapshotFileContents(files, filePaths);

          const agentResult = await runWorkbenchEditAgent({
            instruction,
            files,
            lockedPaths,
            chatHistory: ctx.chatHistory,
            isNodeProject,
            focusedPath: ctx.contextHints?.selectedPath,
            taggedPaths: ctx.contextHints?.taggedPaths,
            previewErrors: ctx.contextHints?.previewErrors,
            onStep: ctx.boltStream?.onAgentStep,
          });

          if (!agentResult.finished || !agentResult.ok) {
            ctx.status = "review_ready";
            ctx.assistantMessage =
              agentResult.summary ||
              "I couldn't complete that request. Try describing what you want changed.";
            ctx.payload = {
              type: "custom_site_edited",
              files: codeFs.listFiles(),
              edit_mode: "agent",
              agent_steps: agentResult.steps,
              no_changes: agentResult.patchesApplied === 0,
              context_selection: {
                search_match_count: agentResult.steps.filter((s) => s.type === "grep").length,
                patches_applied: agentResult.patchesApplied,
              },
            };
            return { ok: false, error: "agent_incomplete", mode: "agent", steps: agentResult.steps };
          }

          if (agentResult.patchesApplied === 0) {
            ctx.status = "review_ready";
            ctx.assistantMessage = agentResult.summary;
            ctx.payload = {
              type: "conversation",
              workbench_agent: true,
              agent_steps: agentResult.steps,
            };
            return { ok: true, mode: "agent", steps: agentResult.steps };
          }

          const afterFiles = codeFs.exportFiles();
          const { checkpoint, diffs } = createEditCheckpoint({
            instruction,
            beforeByPath: beforeSnapshot,
            afterFiles,
          });

          storefrontRecord.custom_files = afterFiles;
          storefrontRecord.custom_code = codeFs.getMainHtml();

          const diffSummary = formatDiffSummaryForChat(diffs);
          ctx.status = "review_ready";
          ctx.assistantMessage =
            diffs.length > 0 ? `${agentResult.summary}\n\n${diffSummary}` : agentResult.summary;
          ctx.payload = {
            type: "custom_site_edited",
            files: codeFs.listFiles(),
            edit_mode: "agent",
            agent_steps: agentResult.steps,
            bolt_action_log: agentResult.editedPaths.map((path) => ({
              ok: true,
              action: { type: "file", filePath: path },
            })),
            context_selection: {
              search_match_count: agentResult.steps.filter((s) => s.type === "grep").length,
              patches_applied: agentResult.patchesApplied,
            },
            edit_checkpoint: slimCheckpointForPersistence(checkpoint),
            file_diffs: diffs,
          };
          return { ok: true, files: codeFs.listFiles(), mode: "agent" };
        },
      },
    ];
  }
}
