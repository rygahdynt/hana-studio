import { db } from "@/server/db";

export interface SocialAccountDTO {
  id: string;
  userId: string;
  platform: string;
  accountIdentifier: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSocialAccountInput {
  platform: string;
  accountIdentifier: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateSocialAccountInput {
  platform?: string;
  accountIdentifier?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  isActive?: boolean;
}

const VALID_PLATFORMS = ["tiktok", "instagram", "linkedin", "youtube"] as const;

function sanitizeHandle(username: string): string {
  const trimmed = username.trim();
  return trimmed.startsWith("@") ? trimmed.slice(1) : trimmed;
}

function generateDefaultIdentifier(platform: string, username: string): string {
  const cleanHandle = sanitizeHandle(username).toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${platform.toLowerCase()}-${cleanHandle}`;
}

export async function listSocialAccounts(userId: string): Promise<SocialAccountDTO[]> {
  const accounts = await db.socialAccount.findMany({
    where: { userId },
    orderBy: [
      { isActive: "desc" },
      { platform: "asc" },
      { username: "asc" },
    ],
  });

  return accounts.map((acc) => ({
    id: acc.id,
    userId: acc.userId,
    platform: acc.platform,
    accountIdentifier: acc.accountIdentifier,
    username: acc.username,
    displayName: acc.displayName,
    avatarUrl: acc.avatarUrl,
    isActive: acc.isActive,
    createdAt: acc.createdAt,
    updatedAt: acc.updatedAt,
  }));
}

export async function getSocialAccountById(
  id: string,
  userId: string,
): Promise<SocialAccountDTO | null> {
  const account = await db.socialAccount.findFirst({
    where: { id, userId },
  });

  if (!account) return null;

  return {
    id: account.id,
    userId: account.userId,
    platform: account.platform,
    accountIdentifier: account.accountIdentifier,
    username: account.username,
    displayName: account.displayName,
    avatarUrl: account.avatarUrl,
    isActive: account.isActive,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

export async function createSocialAccount(
  userId: string,
  input: CreateSocialAccountInput,
): Promise<SocialAccountDTO> {
  const platform = input.platform?.toLowerCase().trim() || "tiktok";
  if (!VALID_PLATFORMS.includes(platform as (typeof VALID_PLATFORMS)[number])) {
    throw new Error(`Invalid platform '${platform}'. Supported platforms: ${VALID_PLATFORMS.join(", ")}`);
  }

  const rawUsername = input.username?.trim();
  if (!rawUsername) {
    throw new Error("Username is required");
  }

  const username = sanitizeHandle(rawUsername);
  const displayName = input.displayName?.trim() || username;
  const accountIdentifier = input.accountIdentifier?.trim() || generateDefaultIdentifier(platform, username);
  const avatarUrl = input.avatarUrl?.trim() || null;
  const isActive = input.isActive !== undefined ? Boolean(input.isActive) : true;

  // Check unique constraint for [userId, platform, accountIdentifier]
  const existing = await db.socialAccount.findUnique({
    where: {
      userId_platform_accountIdentifier: {
        userId,
        platform,
        accountIdentifier,
      },
    },
  });

  if (existing) {
    throw new Error(`An account with identifier '${accountIdentifier}' already exists for platform '${platform}'.`);
  }

  const created = await db.socialAccount.create({
    data: {
      userId,
      platform,
      accountIdentifier,
      username,
      displayName,
      avatarUrl,
      isActive,
    },
  });

  return {
    id: created.id,
    userId: created.userId,
    platform: created.platform,
    accountIdentifier: created.accountIdentifier,
    username: created.username,
    displayName: created.displayName,
    avatarUrl: created.avatarUrl,
    isActive: created.isActive,
    createdAt: created.createdAt,
    updatedAt: created.updatedAt,
  };
}

export async function updateSocialAccount(
  id: string,
  userId: string,
  input: UpdateSocialAccountInput,
): Promise<SocialAccountDTO> {
  const existing = await db.socialAccount.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Social account not found or access denied");
  }

  const updateData: {
    platform?: string;
    accountIdentifier?: string;
    username?: string;
    displayName?: string;
    avatarUrl?: string | null;
    isActive?: boolean;
  } = {};

  if (input.platform !== undefined) {
    const platform = input.platform.toLowerCase().trim();
    if (!VALID_PLATFORMS.includes(platform as (typeof VALID_PLATFORMS)[number])) {
      throw new Error(`Invalid platform '${platform}'. Supported platforms: ${VALID_PLATFORMS.join(", ")}`);
    }
    updateData.platform = platform;
  }

  if (input.username !== undefined) {
    const rawUsername = input.username.trim();
    if (!rawUsername) {
      throw new Error("Username cannot be empty");
    }
    updateData.username = sanitizeHandle(rawUsername);
  }

  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (!displayName) {
      throw new Error("Display name cannot be empty");
    }
    updateData.displayName = displayName;
  }

  if (input.accountIdentifier !== undefined) {
    const identifier = input.accountIdentifier.trim();
    if (!identifier) {
      throw new Error("Account identifier cannot be empty");
    }
    updateData.accountIdentifier = identifier;
  }

  if (input.avatarUrl !== undefined) {
    updateData.avatarUrl = input.avatarUrl ? input.avatarUrl.trim() : null;
  }

  if (input.isActive !== undefined) {
    updateData.isActive = Boolean(input.isActive);
  }

  // If changing identifier or platform, check unique conflict
  const targetPlatform = updateData.platform || existing.platform;
  const targetIdentifier = updateData.accountIdentifier || existing.accountIdentifier;

  if (
    targetPlatform !== existing.platform ||
    targetIdentifier !== existing.accountIdentifier
  ) {
    const conflict = await db.socialAccount.findFirst({
      where: {
        userId,
        platform: targetPlatform,
        accountIdentifier: targetIdentifier,
        NOT: { id: existing.id },
      },
    });

    if (conflict) {
      throw new Error(`Another account with identifier '${targetIdentifier}' already exists for platform '${targetPlatform}'.`);
    }
  }

  const updated = await db.socialAccount.update({
    where: { id },
    data: updateData,
  });

  return {
    id: updated.id,
    userId: updated.userId,
    platform: updated.platform,
    accountIdentifier: updated.accountIdentifier,
    username: updated.username,
    displayName: updated.displayName,
    avatarUrl: updated.avatarUrl,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

export async function deleteSocialAccount(id: string, userId: string): Promise<void> {
  const existing = await db.socialAccount.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Social account not found or access denied");
  }

  // Projects assigned to this social account will automatically have socialAccountId set to null via SetNull cascade
  await db.socialAccount.delete({
    where: { id },
  });
}
