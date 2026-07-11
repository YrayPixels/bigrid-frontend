import { CriticAgent } from "./CriticAgent";
import { ExecutorAgent } from "./ExecutorAgent";
import { InterpreterAgent } from "./InterpreterAgent";
import { PlannerAgent } from "./PlannerAgent";

export type BuilderAgentRegistry = {
  interpreter: InterpreterAgent;
  planner: PlannerAgent;
  executor: ExecutorAgent;
  critic: CriticAgent;
};

/**
 * Creates role agents with their prompts ready.
 * They stay idle until StorefrontBuilderManager feeds them instructions (waterfall).
 */
export function createBuilderAgentRegistry(): BuilderAgentRegistry {
  return {
    interpreter: new InterpreterAgent(),
    planner: new PlannerAgent(),
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
export { InterpreterAgent } from "./InterpreterAgent";
export { PlannerAgent } from "./PlannerAgent";
