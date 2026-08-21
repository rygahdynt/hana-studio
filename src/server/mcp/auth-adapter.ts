import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { db } from "@/server/db";
import type { User } from "@prisma/client";

/**
 * Resolves the authenticated Hana Studio user for incoming MCP requests.
 * 1. Checks active Clerk session or Clerk-issued Bearer token.
 * 2. Checks configured MCP_API_KEY environment secret for external MCP connectors.
 *
 * Security Invariant: An unauthenticated email address or database identifier alone
 * NEVER grants authentication.
 */
export async function resolveMcpUser(request: NextRequest): Promise<User | null> {
  // 1. Check active Clerk session or Clerk JWT Bearer token
  try {
    const sessionUser = await getCurrentUser();
    if (sessionUser) {
      return sessionUser;
    }
  } catch (err) {
    console.warn("[MCP Auth] Clerk session resolution failed:", err);
  }

  // 2. Check server-configured MCP_API_KEY for external MCP client connections
  const serverApiKey = process.env.MCP_API_KEY;
  if (serverApiKey && serverApiKey.trim().length >= 16) {
    const authHeader = request.headers.get("authorization");
    const apiKeyHeader = request.headers.get("x-api-key");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : apiKeyHeader?.trim();

    if (token && token === serverApiKey.trim()) {
      // Resolve the primary owner / admin account for this configured MCP secret
      const ownerUser = await db.user.findFirst({
        orderBy: { createdAt: "asc" },
      });
      if (ownerUser) {
        return ownerUser;
      }
    }
  }

  return null;
}
