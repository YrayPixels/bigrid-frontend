export type WebMcpJsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type WebMcpToolDefinition = {
  name: string;
  description: string;
  inputSchema: WebMcpJsonSchema;
  execute: (input: Record<string, unknown>) => unknown | Promise<unknown>;
  annotations?: {
    readOnlyHint?: boolean;
  };
};

export type WebMcpModelContext = {
  registerTool: (
    tool: Omit<WebMcpToolDefinition, "annotations"> & {
      annotations?: WebMcpToolDefinition["annotations"];
    },
    options?: { signal?: AbortSignal },
  ) => Promise<void>;
  getTools?: (options?: { fromOrigins?: string[] }) => Promise<unknown[]>;
};

declare global {
  interface Document {
    modelContext?: WebMcpModelContext;
  }

  interface Navigator {
    /** Deprecated in Chromium 150; kept for feature detection on older builds. */
    modelContext?: WebMcpModelContext;
  }
}

export {};
