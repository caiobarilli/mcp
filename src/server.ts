import { McpServer } from "@modelcontextprotocol/server";
import { registerArchitectureDeepDivePrompt } from "./prompts/architecture-deep-dive.js";
import { registerRecruiterBriefPrompt } from "./prompts/recruiter-brief.js";
import { registerGetArticlesTool } from "./tools/get-articles.js";
import { registerGetExperienceTool } from "./tools/get-experience.js";
import { registerGetProfileTool } from "./tools/get-profile.js";
import { registerGetProjectTool } from "./tools/get-project.js";
import { registerGetStackTool } from "./tools/get-stack.js";
import { registerListProjectsTool } from "./tools/list-projects.js";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: "mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        prompts: {},
      },
    },
  );

  registerGetProfileTool(server);
  registerGetExperienceTool(server);
  registerListProjectsTool(server);
  registerGetProjectTool(server);
  registerGetStackTool(server);
  registerGetArticlesTool(server);

  registerRecruiterBriefPrompt(server);
  registerArchitectureDeepDivePrompt(server);

  return server;
}
