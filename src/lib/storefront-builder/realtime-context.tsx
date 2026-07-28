"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { BuilderSession } from "@/lib/api/types";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import {
  getSharedBuilderRealtimeSession,
  isSharedBuilderRealtimeActive,
  stopSharedBuilderRealtimeSession,
} from "@/lib/storefront-builder/agents/BuilderSessionManager";
import {
  startBuilderRealtimeSession,
  stopBuilderRealtimeSession,
} from "@/lib/storefront-builder/client";
import { isBuilderToolAgentEnabled } from "@/lib/features";

type BuilderRealtimeContextValue = {
  /** True when muted Realtime WebRTC is connected for the current builder session. */
  isSessionActive: boolean;
  /** True while open-token + WebRTC handshake is in flight. */
  starting: boolean;
  /** Builder session id the live Realtime connection is bound to. */
  builderSessionId: string | null;
  /** Feature gate — when false, chat works without Realtime start/stop. */
  realtimeRequired: boolean;
  startSession: (session: BuilderSession, options?: {
    onLog?: (entry: AgentThinkingLogEntry) => void;
  }) => Promise<void>;
  stopSession: () => void;
  /** Re-check shared slot (e.g. after external stop). */
  syncFromShared: (builderSessionId?: string) => void;
};

const BuilderRealtimeContext = createContext<BuilderRealtimeContextValue | null>(null);

/**
 * HeySolana-style session ownership: one muted Realtime connection for the merchant builder.
 * Start once → send messages on the live session → Stop tears down.
 */
export function BuilderRealtimeProvider({ children }: { children: ReactNode }) {
  const realtimeRequired = isBuilderToolAgentEnabled();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [builderSessionId, setBuilderSessionId] = useState<string | null>(null);
  const startPromiseRef = useRef<Promise<void> | null>(null);

  const syncFromShared = useCallback((forSessionId?: string) => {
    const active = isSharedBuilderRealtimeActive(forSessionId);
    setIsSessionActive(active);
    if (!active) {
      setBuilderSessionId(null);
      return;
    }
    if (forSessionId) setBuilderSessionId(forSessionId);
  }, []);

  useEffect(() => {
    syncFromShared();
    return () => {
      // Tear down when leaving the merchant shell so the next visit cold-starts cleanly.
      stopSharedBuilderRealtimeSession();
    };
  }, [syncFromShared]);

  const startSession = useCallback(
    async (
      session: BuilderSession,
      options?: { onLog?: (entry: AgentThinkingLogEntry) => void },
    ) => {
      if (!realtimeRequired) return;

      if (startPromiseRef.current) {
        return startPromiseRef.current;
      }

      if (
        isSharedBuilderRealtimeActive(session.id) &&
        getSharedBuilderRealtimeSession()?.isActive()
      ) {
        setIsSessionActive(true);
        setBuilderSessionId(session.id);
        return;
      }

      setStarting(true);
      const promise = startBuilderRealtimeSession({
        session,
        onLog: options?.onLog,
      })
        .then(() => {
          setIsSessionActive(true);
          setBuilderSessionId(session.id);
        })
        .catch((error) => {
          setIsSessionActive(false);
          setBuilderSessionId(null);
          throw error;
        })
        .finally(() => {
          setStarting(false);
          startPromiseRef.current = null;
        });

      startPromiseRef.current = promise;
      return promise;
    },
    [realtimeRequired],
  );

  const stopSession = useCallback(() => {
    stopBuilderRealtimeSession();
    setIsSessionActive(false);
    setBuilderSessionId(null);
  }, []);

  const value = useMemo<BuilderRealtimeContextValue>(
    () => ({
      isSessionActive,
      starting,
      builderSessionId,
      realtimeRequired,
      startSession,
      stopSession,
      syncFromShared,
    }),
    [
      isSessionActive,
      starting,
      builderSessionId,
      realtimeRequired,
      startSession,
      stopSession,
      syncFromShared,
    ],
  );

  return (
    <BuilderRealtimeContext.Provider value={value}>{children}</BuilderRealtimeContext.Provider>
  );
}

export function useBuilderRealtime(): BuilderRealtimeContextValue {
  const ctx = useContext(BuilderRealtimeContext);
  if (!ctx) {
    throw new Error("useBuilderRealtime must be used inside <BuilderRealtimeProvider>");
  }
  return ctx;
}

/** Optional hook for components that may render outside the provider. */
export function useBuilderRealtimeOptional(): BuilderRealtimeContextValue | null {
  return useContext(BuilderRealtimeContext);
}
