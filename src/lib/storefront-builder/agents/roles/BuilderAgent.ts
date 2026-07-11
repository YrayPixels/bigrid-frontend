/** Owns a fixed role prompt; waits idle until the manager feeds it an instruction. */
export abstract class BuilderAgent {
  abstract readonly role: "Interpreter" | "Planner" | "Executor" | "Critic";

  /** Base system prompt for this role (may be extended per turn). */
  abstract get systemPrompt(): string;
}
