import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { resolveMcpUser } from "@/server/mcp/auth-adapter";
import { createHanaStudioMcpServer } from "@/server/mcp/server";

async function handleMcpRequest(req: NextRequest): Promise<Response> {
  // 1. Resolve authenticated Hana Studio user
  const user = await resolveMcpUser(req);
  if (!user) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Hana Studio MCP requires authentication. Provide a valid Clerk session or Authorization Bearer header.",
      },
      { status: 401 },
    );
  }

  // 2. Instantiate and connect user-scoped MCP server
  const server = createHanaStudioMcpServer(user);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);
  return transport.handleRequest(req);
}

export async function GET(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function POST(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleMcpRequest(req);
}
