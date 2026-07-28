import { CriticAgent } from "./CriticAgent";
import { ExecutorAgent } from "./ExecutorAgent";
import { InterpretPlannerAgent } from "./InterpretPlannerAgent";
import { SessionAgent } from "./SessionAgent";

export type BuilderAgentRegistry = {
  interpretPlanner: InterpretPlannerAgent;
  sessionAgent: SessionAgent;
  executor: ExecutorAgent;
  critic: CriticAgent;
};

/**
 * Creates role agents with their prompts ready.
 * They stay idle until StorefrontBuilderManager feeds them instructions.
 */
export function createBuilderAgentRegistry(): BuilderAgentRegistry {
  return {
    interpretPlanner: new InterpretPlannerAgent(),
    sessionAgent: new SessionAgent(),
    executor: new ExecutorAgent(),
    critic: new CriticAgent(),
  };
}

export { BuilderAgent } from "./BuilderAgent";
export { CriticAgent } from "./CriticAgent";
export { ExecutorAgent } from "./ExecutorAgent";
export type {
  ExecutorChatMessage,
  ExecutorStepDecision,
  ExecutorToolCall,
  OpenAiToolSchema,
} from "./ExecutorAgent";
export { InterpretPlannerAgent } from "./InterpretPlannerAgent";
export { SessionAgent } from "./SessionAgent";
export { SessionManager } from "./SessionManager";
