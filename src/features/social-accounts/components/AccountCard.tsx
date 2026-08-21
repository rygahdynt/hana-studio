"use client";

import React from "react";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Share2,
  Video,
  Camera,
  Briefcase,
  Play,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SocialAccount } from "../types";

interface AccountCardProps {
  account: SocialAccount;
  onEdit: (account: SocialAccount) => void;
  onDelete: (account: SocialAccount) => void;
}

export function getPlatformBadgeConfig(platform: string): {
  label: string;
  className: string;
  icon: React.ReactNode;
} {
  switch (platform.toLowerCase()) {
    case "tiktok":
      return {
        label: "TikTok",
        className: "bg-pink-950/60 text-pink-300 border-pink-800/60",
        icon: <Video className="w-3 h-3 text-pink-400" />,
      };
    case "instagram":
      return {
        label: "Instagram",
        className: "bg-purple-950/60 text-purple-300 border-purple-800/60",
        icon: <Camera className="w-3 h-3 text-purple-400" />,
      };
    case "linkedin":
      return {
        label: "LinkedIn",
        className: "bg-blue-950/60 text-blue-300 border-blue-800/60",
        icon: <Briefcase className="w-3 h-3 text-blue-400" />,
      };
    case "youtube":
      return {
        label: "YouTube",
        className: "bg-red-950/60 text-red-300 border-red-800/60",
        icon: <Play className="w-3 h-3 text-red-400" />,
      };
    default:
      return {
        label: platform,
        className: "bg-neutral-800 text-neutral-300 border-neutral-700",
        icon: <Share2 className="w-3 h-3 text-neutral-400" />,
      };
  }
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
}) => {
  const platformConfig = getPlatformBadgeConfig(account.platform);
  const initials = (account.displayName || account.username || "?")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between gap-4 group">
      {/* Top section: Avatar + Info + Platform */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          {account.avatarUrl ? (
            <img
              src={account.avatarUrl}
              alt={account.displayName}
              className="w-11 h-11 rounded-full object-cover border border-neutral-700 shrink-0 bg-neutral-950"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-neutral-800 to-neutral-700 border border-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-200 shrink-0">
              {initials}
            </div>
          )}

          {/* Name & Handle */}
          <div className="flex flex-col min-w-0">
            <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
              {account.displayName}
            </h4>
            <span className="text-xs font-mono text-neutral-400 truncate">
              @{account.username}
            </span>
          </div>
        </div>

        {/* Platform Badge */}
        <Badge
          variant="outline"
          className={`text-[10px] font-semibold px-2 py-0.5 flex items-center gap-1 shrink-0 ${platformConfig.className}`}
        >
          {platformConfig.icon}
          <span>{platformConfig.label}</span>
        </Badge>
      </div>

      {/* Middle section: Identifier & Status */}
      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-neutral-800/60">
        <div className="flex flex-col">
          <span className="text-[10px] text-neutral-500 font-mono">
            ID: {account.accountIdentifier}
          </span>
        </div>
        <div>
          {account.isActive ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-neutral-500 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
              Inactive
            </span>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-end gap-1.5 pt-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onEdit(account)}
          className="h-8 px-2.5 text-xs text-neutral-300 hover:text-white hover:bg-neutral-800 gap-1"
        >
          <Pencil className="w-3.5 h-3.5" />
          <span>Edit</span>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => onDelete(account)}
          className="h-8 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete</span>
        </Button>
      </div>
    </div>
  );
};
