import { ensurePlatformWebMcpTools } from "@/lib/webmcp/bootstrap";

// Register WebMCP tools before React hydration so ChatGPT's browser can discover them early.
void ensurePlatformWebMcpTools();
