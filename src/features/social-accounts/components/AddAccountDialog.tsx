"use client";

import React, { useState } from "react";
import {
  UserPlus,
  Loader2,
  Video,
  Camera,
  Briefcase,
  Play,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCreateSocialAccount } from "../hooks/use-social-accounts";
import type { SocialPlatform } from "../types";

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORMS: { id: SocialPlatform; label: string; icon: React.ReactNode }[] = [
  { id: "tiktok", label: "TikTok", icon: <Video className="w-4 h-4 text-pink-400" /> },
  { id: "instagram", label: "Instagram", icon: <Camera className="w-4 h-4 text-purple-400" /> },
  { id: "linkedin", label: "LinkedIn", icon: <Briefcase className="w-4 h-4 text-blue-400" /> },
  { id: "youtube", label: "YouTube", icon: <Play className="w-4 h-4 text-red-400" /> },
];

export const AddAccountDialog: React.FC<AddAccountDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const [platform, setPlatform] = useState<SocialPlatform>("tiktok");
  const [username, setUsername] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [accountIdentifier, setAccountIdentifier] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isActive, setIsActive] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSocialAccount();

  const resetForm = () => {
    setPlatform("tiktok");
    setUsername("");
    setDisplayName("");
    setAccountIdentifier("");
    setAvatarUrl("");
    setIsActive(true);
    setError(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  // Auto-generate identifier and display name if user types username
  const handleUsernameChange = (val: string) => {
    setUsername(val);
    const cleanHandle = val.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!accountIdentifier || accountIdentifier.startsWith(platform)) {
      setAccountIdentifier(`${platform}-${cleanHandle}`);
    }
    if (!displayName) {
      setDisplayName(val.trim().replace(/^@/, ""));
    }
  };

  const handlePlatformChange = (newPlatform: SocialPlatform) => {
    setPlatform(newPlatform);
    const cleanHandle = username.trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
    setAccountIdentifier(`${newPlatform}-${cleanHandle}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().replace(/^@/, "");
    if (!cleanUsername) {
      setError("Please enter a username or handle.");
      return;
    }

    try {
      await createMutation.mutateAsync({
        platform,
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        accountIdentifier: accountIdentifier.trim() || `${platform}-${cleanUsername.toLowerCase()}`,
        avatarUrl: avatarUrl.trim() || null,
        isActive,
      });

      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add social account.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Add Social Account
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Register a social media profile you manage in your Account Library.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          {error && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/80 text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Platform Selector */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold text-neutral-300">
              Platform
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePlatformChange(p.id)}
                  className={`p-2.5 rounded-lg border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                    platform === p.id
                      ? "bg-neutral-800 border-blue-500 text-white shadow-sm"
                      : "bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200"
                  }`}
                >
                  {p.icon}
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="username" className="text-xs font-semibold text-neutral-300">
              Username / Handle *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-mono">
                @
              </span>
              <Input
                id="username"
                type="text"
                placeholder="zahra.marketing"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className="pl-7 bg-neutral-900 border-neutral-800 text-white text-xs h-9 focus-visible:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName" className="text-xs font-semibold text-neutral-300">
              Display Name
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Zahra Marketing"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-white text-xs h-9 focus-visible:ring-blue-500"
            />
          </div>

          {/* Account Identifier */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="accountIdentifier" className="text-xs font-semibold text-neutral-300">
                Account Identifier
              </Label>
              <span className="text-[10px] text-neutral-500">
                Unique profile identifier
              </span>
            </div>
            <Input
              id="accountIdentifier"
              type="text"
              placeholder="tiktok-zahra-marketing"
              value={accountIdentifier}
              onChange={(e) => setAccountIdentifier(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-white text-xs font-mono h-9 focus-visible:ring-blue-500"
              required
            />
          </div>

          {/* Avatar URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="avatarUrl" className="text-xs font-semibold text-neutral-300">
              Avatar Image URL (Optional)
            </Label>
            <Input
              id="avatarUrl"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-white text-xs h-9 focus-visible:ring-blue-500"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !username.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 gap-1.5"
            >
              {createMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Add Account</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
