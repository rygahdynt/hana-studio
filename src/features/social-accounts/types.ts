export type SocialPlatform = "tiktok" | "instagram" | "linkedin" | "youtube";

export interface SocialAccount {
  id: string;
  userId: string;
  platform: SocialPlatform | string;
  accountIdentifier: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
