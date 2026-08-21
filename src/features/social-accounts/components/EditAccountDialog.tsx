"use client";

import React, { useState } from "react";
import {
  Pencil,
  Loader2,
  AlertCircle,
  CheckCircle2,
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
import { useUpdateSocialAccount } from "../hooks/use-social-accounts";
import type { SocialAccount, SocialPlatform } from "../types";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: SocialAccount | null;
}

export const EditAccountDialog: React.FC<EditAccountDialogProps> = ({
  open,
  onOpenChange,
  account,
}) => {
  const [username, setUsername] = useState<string>(account?.username || "");
  const [displayName, setDisplayName] = useState<string>(account?.displayName || "");
  const [accountIdentifier, setAccountIdentifier] = useState<string>(account?.accountIdentifier || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(account?.avatarUrl || "");
  const [isActive, setIsActive] = useState<boolean>(account?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const [prevAccount, setPrevAccount] = useState<SocialAccount | null>(account);
  if (account !== prevAccount) {
    setPrevAccount(account);
    if (account) {
      setUsername(account.username);
      setDisplayName(account.displayName);
      setAccountIdentifier(account.accountIdentifier);
      setAvatarUrl(account.avatarUrl || "");
      setIsActive(account.isActive);
      setError(null);
    }
  }

  const updateMutation = useUpdateSocialAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setError(null);

    const cleanUsername = username.trim().replace(/^@/, "");
    if (!cleanUsername) {
      setError("Username cannot be empty.");
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: account.id,
        data: {
          username: cleanUsername,
          displayName: displayName.trim() || cleanUsername,
          accountIdentifier: accountIdentifier.trim() || account.accountIdentifier,
          avatarUrl: avatarUrl.trim() || null,
          isActive,
        },
      });

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update social account.");
    }
  };

  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-white shadow-md">
              <Pencil className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Edit Social Account
              </DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">
                Update account profile details for @{account.username} ({account.platform.toUpperCase()}).
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

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-username" className="text-xs font-semibold text-neutral-300">
              Username / Handle *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-mono">
                @
              </span>
              <Input
                id="edit-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="pl-7 bg-neutral-900 border-neutral-800 text-white text-xs h-9 focus-visible:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Display Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-displayName" className="text-xs font-semibold text-neutral-300">
              Display Name
            </Label>
            <Input
              id="edit-displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-white text-xs h-9 focus-visible:ring-blue-500"
            />
          </div>

          {/* Account Identifier */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-accountIdentifier" className="text-xs font-semibold text-neutral-300">
              Account Identifier
            </Label>
            <Input
              id="edit-accountIdentifier"
              type="text"
              value={accountIdentifier}
              onChange={(e) => setAccountIdentifier(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-white text-xs font-mono h-9 focus-visible:ring-blue-500"
              required
            />
          </div>

          {/* Avatar URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-avatarUrl" className="text-xs font-semibold text-neutral-300">
              Avatar Image URL
            </Label>
            <Input
              id="edit-avatarUrl"
              type="url"
              placeholder="https://example.com/avatar.jpg"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              className="bg-neutral-900 border-neutral-800 text-white text-xs h-9 focus-visible:ring-blue-500"
            />
          </div>

          {/* Active Status Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="edit-isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded bg-neutral-900 border-neutral-700 text-blue-600 focus:ring-blue-500"
            />
            <Label htmlFor="edit-isActive" className="text-xs text-neutral-300 cursor-pointer">
              Account is Active
            </Label>
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
              disabled={updateMutation.isPending || !username.trim()}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 gap-1.5"
            >
              {updateMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Save Changes</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
