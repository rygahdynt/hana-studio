import { requireCurrentUser } from "./current-user";

/**
 * @deprecated Use requireCurrentUser() or getCurrentUser() from "@/server/auth".
 * This alias ensures any legacy references resolve to the authenticated Clerk session.
 */
export async function getDevUser() {
  return requireCurrentUser();
}
