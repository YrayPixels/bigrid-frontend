To build a complete, state-of-the-art AI software engineering agent platform (like Lovable, Bolt, or Devin), you need to combine all four systems into a unified backend service.
Below is the complete production-grade blueprint and implementation code using TypeScript, the Vercel AI SDK, and E2B Sandboxes / WebContainers.

---

## Architecture Overview

                      +---------------------------------------+

                      |          User Prompt Input            |
                      +-------------------+-------------------+
                                          |
                                          v

+-----------------------------------------+-----------------------------------------+

| AGENT ENGINE LOOP (Step 1) |
| |
| +-------------------+ System Prompt +--------------------------+ |
| | | +--------------------> | | |
| | Context State | | LLM Reasoning Core | |
| | (Files + Logs) | <--------------------+ | (Claude 3.5 / GPT-4o) | |
| | | Tool Outputs | | |
| +---------^---------+ +------------+-------------+ |
| | | |
+--------------|-------------------------------------------------|------------------+

               |                                                 | Tool Call
               |                                                 v

+--------------|-------------------------------------------------+------------------+

| TOOL EXECUTION & VERIFICATION LOOP (Steps 3 & 4) |
| |
| +----------+----------+ +-------------------+ +-----------------+ |
| | Context Engine | | Sandbox VM / | | Verification | |
| | (Vector/Keyword) | <---> | WebContainer | <---> | Linter Engine | |
| | (Step 2) | | File System | | (ESLint / TSC) | |
| +---------------------+ +-------------------+ +-----------------+ |
+-----------------------------------------------------------------------------------+

---

## 1. The Full Implementation Code

Create a unified engine module (e.g., agent-engine.ts). This code runs the full ReAct loop, interacts with your sandbox file system, references code indices, and self-corrects on errors.

import { generateText, tool } from 'ai';import { openai } from '@ai-sdk/openai'; // Or '@ai-sdk/anthropic' for Claudeimport { z } from 'zod';
// ==========================================// CONFIGURATION & SIMULATED RUNTIMES// ==========================================// Replace this mock sandbox with your actual E2B client or WebContainer instanceconst mockSandbox = {
fs: {
readFile: async (path: string, encoding: string) => "export function add(a, b) { return a + b }",
writeFile: async (path: string, content: string) => {},
},
commands: {
run: async (cmd: string) => {
if (cmd.includes('eslint')) {
return { exitCode: 1, stderr: "Line 1: 'add' is defined but never used (no-unused-vars)" };
}
return { exitCode: 0, stdout: "Passed", stderr: "" };
}
}
};
// ==========================================// PART A: THE SYSTEM PROMPT (REASONING CORE)// ==========================================const SYSTEM_PROMPT = `
You are an autonomous senior AI software engineer with expert tool-use reasoning capabilities.
Your task is to solve the user's issue by analyzing the codebase, writing robust code, and verifying your work.

CRITICAL RULES:

1. ALWAYS use the following multi-step loop structure:
   - THOUGHT: Analyze the problem, map file targets, and list structural code requirements.
   - ACTION: Invoke a tool to view files, edit code, search, or run shell terminal commands.
   - OBSERVATION: Process the feedback returned from the environment or linter.
2. ALWAYS output a detailed structural plan wrapped inside a <thinking> XML tag before making a tool call or presenting an answer.
3. Keep changes precise. Avoid modifying unrelated files.
4. When writing code, choose modern, production-safe structural design pattern variations. Prefer using shadcn/ui configurations and Tailwind CSS for frontend layouts.
   `;
   // ==========================================// PART B & C: THE TOOL BOX DEFINITIONS// ==========================================const agentTools = {
   /\*\*
   - CONTEXT ENGINE TOOL: Semantic Keyword + Vector Mock Search
     \*/
     search_codebase: tool({
     description: 'Searches the workspace files using semantic meaning and exact keyword match combinations.',
     parameters: z.object({
     query: z.string().describe('The search terms, variable name, or functional concept to look up'),
     }),
     execute: async ({ query }) => {
     // In production: Query your ChromaDB / Qdrant instance combined with a BM25 keyword score.
     return JSON.stringify([
     { path: 'src/math.js', snippet: 'export function add(a, b) { ... }', score: 0.92 }
     ]);
     }
     }),

/\*\*

- FILE SYSTEM TOOL: View file content chunks
  \*/
  view_file: tool({
  description: 'Reads specific blocks of a file. Use this to inspect structural layout before making an edit.',
  parameters: z.object({
  path: z.string().describe('Relative path to target file'),
  line_start: z.number().optional().default(1),
  line_end: z.number().optional().default(100),
  }),
  execute: async ({ path, line_start, line_end }) => {
  try {
  const fullContent = await mockSandbox.fs.readFile(path, 'utf-8');
  const lines = fullContent.split('\n');
  const slice = lines.slice(line_start - 1, line_end);
  return `--- FILE: ${path} (Lines ${line_start}-${line_end}) ---\n${slice.join('\n')}`;
  } catch (err: any) {
  return `Error reading file ${path}: ${err.message}`;
  }
  }
  }),

/\*\*

- ADVANCED EDITING TOOL WITH AUTOMATED VERIFICATION (PART D)
  \*/
  edit_file: tool({
  description: 'Performs an exact search-and-replace modification. Triggers automated internal validation loops.',
  parameters: z.object({
  path: z.string().describe('Relative file path to modify'),
  search_string: z.string().describe('The EXACT existing code block to replace'),
  replace_string: z.string().describe('The new code block to replace it with'),
  }),
  execute: async ({ path, search_string, replace_string }) => {
  try {
  const currentContent = await mockSandbox.fs.readFile(path, 'utf-8');

        if (!currentContent.includes(search_string)) {
          return `CRITICAL ERROR: Search string not found in ${path}. Ensure your spacing, indentation, and punctuation perfectly match what you saw in view_file.`;
        }

        const modifiedContent = currentContent.replace(search_string, replace_string);
        await mockSandbox.fs.writeFile(path, modifiedContent);

        // --- AUTOMATED VERIFICATION LOOP ENGINE ---
        let verificationLog = "\n[Verification Log]: File written successfully.";

        // Match linter profile to extension types
        const isJavaScript = path.endsWith('.js') || path.endsWith('.jsx') || path.endsWith('.ts') || path.endsWith('.tsx');

        if (isJavaScript) {
          const checkCmd = `npx eslint ${path} --quiet`;
          const lintResult = await mockSandbox.commands.run(checkCmd);

          if (lintResult.exitCode !== 0) {
            // Self-correction loop: Return failure state instead of success
            return `WARNING: File updated, but VERIFICATION FAILED. The system encountered compilation/lint errors. You must call edit_file again to fix these logs immediately:\n${lintResult.stderr}`;
          }
          verificationLog += "\n[Verification Log]: ESLint checks passed smoothly.";
        }

        return `Success: ${path} updated completely.${verificationLog}`;
      } catch (err: any) {
        return `Operational failure modifying file: ${err.message}`;
      }

  }
  }),

/\*\*

- COMMAND RUNNER TOOL
  \*/
  execute_command: tool({
  description: 'Executes isolated terminal commands in the workspace environment (e.g. running test runners or installing npm modules).',
  parameters: z.object({
  command: z.string().describe('The exact bash shell string to run'),
  }),
  execute: async ({ command }) => {
  const output = await mockSandbox.commands.run(command);
  return `[Command Exit Code: ${output.exitCode}]\nSTDOUT:\n${output.stdout}\nSTDERR:\n${output.stderr}`;
  }
  })
  };
  // ==========================================// THE CORE ENGINE EXECUTION LOOP// ==========================================export async function runAgentOrchestrator(userPrompt: string) {
  let executionHistory: any[] = [];
  let currentIteration = 0;
  const MAX_REACT_LOOPS = 6;

let promptContext = `User Request: ${userPrompt}`;

console.log("🚀 Agent Engineering Loop Initialized...");

while (currentIteration < MAX_REACT_LOOPS) {
currentIteration++;
console.log(`\n--- Running Loop Pass [${currentIteration}/${MAX_REACT_LOOPS}] ---`);

    // Execute reasoning run
    const result = await generateText({
      model: openai('gpt-4o'), // Substitute with 'claude-3-5-sonnet' for maximum logic handling
      system: SYSTEM_PROMPT,
      prompt: promptContext,
      tools: agentTools,
      maxSteps: 1, // Process individual step feedback iterations incrementally
    });

    // Capture response strings
    if (result.text) {
      console.log(`Agent Thought Output:\n${result.text}`);
    }

    // Check if the LLM generated active tool requests
    if (!result.toolCalls || result.toolCalls.length === 0) {
      console.log("✅ Goal accomplished! No further tools needed.");
      return result.text;
    }

    // Process tool execution requests sequentially
    for (const executionCall of result.toolCalls) {
      const targetTool = agentTools[executionCall.toolName as keyof typeof agentTools];

      if (!targetTool) {
        promptContext += `\nError: Tool ${executionCall.toolName} is unknown.`;
        continue;
      }

      console.log(`🛠️ Executing Tool: [${executionCall.toolName}] with args:`, executionCall.args);

      // Resolve functional action responses
      const outcome = await (targetTool as any).execute(executionCall.args);
      console.log(`📥 Tool Observation Received.`);

      // Feed observations seamlessly back into pipeline context
      promptContext += `\n\n[Action taken via ${executionCall.toolName}]: Arguments: ${JSON.stringify(executionCall.args)}\n[Observation outcome]: ${outcome}`;
    }

}

throw new Error("Execution cycle limits hit without arriving at a final resolution step.");
}

---

## 2. Context Extraction (Tree-Sitter AST Worker)

To implement the AST Parsing described in Part B, you must run a script inside your server environment that inspects target codebases when projects build or change. This script parses files into metadata tokens so your vector databases understand functional dependencies.

import Parser from 'tree-sitter';import JavaScript from 'tree-sitter-javascript';
/\*\*

- Generates structured indices out of flat code files
  \*/export function generateCodeTreeSummary(sourceCode: string): Array<{ type: string; name: string; position: string }> {
  const parser = new Parser();
  parser.setLanguage(JavaScript);

const syntaxTree = parser.parse(sourceCode);
const identifiedNodes: Array<{ type: string; name: string; position: string }> = [];

function traverseNode(currentNode: Parser.SyntaxNode) {
// Extract declared functions
if (currentNode.type === 'function_declaration' || currentNode.type === 'method_definition') {
const identifier = currentNode.childForFieldName('name');
if (identifier) {
identifiedNodes.push({
type: 'Function/Method Definition',
name: identifier.text,
position: `Lines ${currentNode.startPosition.row + 1} to ${currentNode.endPosition.row + 1}`
});
}
}

    // Extract structural exports or classes
    if (currentNode.type === 'class_declaration') {
      const identifier = currentNode.childForFieldName('name');
      if (identifier) {
        identifiedNodes.push({
          type: 'Class Structure',
          name: identifier.text,
          position: `Lines ${currentNode.startPosition.row + 1} to ${currentNode.endPosition.row + 1}`
        });
      }
    }

    for (let i = 0; i < currentNode.childCount; i++) {
      traverseNode(currentNode.child(i)!);
    }

}

traverseNode(syntaxTree.rootNode);
return identifiedNodes;
}

---

## 3. How to Deploy and Connect This Stack

To bring this live into your web container platform:

1.  Initialize Your Core Workspace: Install dependencies via terminal:

npm install ai @ai-sdk/openai zod tree-sitter tree-sitter-javascript

2.  Hook Up Your Frontend State Streams: Map your client chat bubbles to trigger runAgentOrchestrator(msg).
3.  Connect Your Real Runtimes: Swap out the mockSandbox calls inside edit_file, view_file, and execute_command with your actual WebContainer file handles (webcontainerInstance.fs._) or E2B instance bindings (sandbox.files._).

Would you like help with writing the specific frontend streaming UI code to display the <thinking> blocks differently from standard text, or do you want to integrate real vector database ingestion into this code?
