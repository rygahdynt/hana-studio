import { auth, currentUser as getClerkCurrentUser } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import type { User } from "@prisma/client";

/**
 * Resolves the authenticated Clerk user to an internal Prisma User.
 * If the Prisma User record does not exist yet, provisions or links it.
 * Real database/SQL errors are allowed to surface rather than being masked.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return null;
  }

  // 1. Authoritative lookup by clerkId
  let user = await db.user.findUnique({
    where: { clerkId },
  });

  if (user) {
    return user;
  }

  // 2. First-time identity linking / provisioning from Clerk profile
  const clerkUser = await getClerkCurrentUser();
  if (!clerkUser) {
    return null;
  }

  const primaryEmail =
    clerkUser.emailAddresses?.find((e) => e.id === clerkUser.primaryEmailAddressId)?.emailAddress ||
    clerkUser.emailAddresses?.[0]?.emailAddress ||
    `${clerkId}@clerk.user`;

  const fullName =
    `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() ||
    clerkUser.username ||
    null;

  const avatarUrl = clerkUser.imageUrl || null;

  // 3. Check if user already exists by email (e.g. initial seed user) to link clerkId
  user = await db.user.findUnique({
    where: { email: primaryEmail },
  });

  if (user) {
    user = await db.user.update({
      where: { id: user.id },
      data: {
        clerkId,
        name: user.name || fullName,
        avatarUrl: user.avatarUrl || avatarUrl,
      },
    });
    return user;
  }

  // 4. Provision new internal Prisma User
  user = await db.user.create({
    data: {
      clerkId,
      email: primaryEmail,
      name: fullName,
      avatarUrl,
    },
  });

  return user;
}

/**
 * Enforces authentication and returns the internal Prisma User.
 * Throws an Unauthorized error if unauthenticated.
 */
export async function requireCurrentUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
