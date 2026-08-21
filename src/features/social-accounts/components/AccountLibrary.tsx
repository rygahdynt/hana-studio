"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  Loader2,
  AlertTriangle,
  Video,
  Camera,
  Briefcase,
  Play,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useSocialAccounts,
  useDeleteSocialAccount,
} from "../hooks/use-social-accounts";
import type { SocialAccount, SocialPlatform } from "../types";
import { AccountCard } from "./AccountCard";
import { AddAccountDialog } from "./AddAccountDialog";
import { EditAccountDialog } from "./EditAccountDialog";

const PLATFORM_FILTERS = [
  { id: "all", label: "All Accounts" },
  { id: "tiktok", label: "TikTok", icon: <Video className="w-3 h-3 text-pink-400" /> },
  { id: "instagram", label: "Instagram", icon: <Camera className="w-3 h-3 text-purple-400" /> },
  { id: "linkedin", label: "LinkedIn", icon: <Briefcase className="w-3 h-3 text-blue-400" /> },
  { id: "youtube", label: "YouTube", icon: <Play className="w-3 h-3 text-red-400" /> },
];

export const AccountLibrary: React.FC = () => {
  const { data: accounts, isLoading, error } = useSocialAccounts();
  const deleteMutation = useDeleteSocialAccount();

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  // Modals
  const [addDialogOpen, setAddDialogOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<SocialAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<SocialAccount | null>(null);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((acc) => {
      const matchesPlatform =
        selectedPlatform === "all" || acc.platform.toLowerCase() === selectedPlatform;
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        acc.username.toLowerCase().includes(query) ||
        acc.displayName.toLowerCase().includes(query) ||
        acc.accountIdentifier.toLowerCase().includes(query);

      return matchesPlatform && matchesSearch;
    });
  }, [accounts, selectedPlatform, searchQuery]);

  const handleDeleteConfirm = async () => {
    if (!deletingAccount) return;
    try {
      await deleteMutation.mutateAsync(deletingAccount.id);
      setDeletingAccount(null);
    } catch (err) {
      console.error("Failed to delete social account:", err);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-blue-500" />
            Social Account Library
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Manage UGC and creator account profiles you publish to from Hana Studio.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setAddDialogOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs h-9 px-4 gap-2 shrink-0 shadow-md shadow-blue-950"
        >
          <Plus className="w-4 h-4" />
          <span>Add Social Account</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-900/60 border border-neutral-800">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5" />
          <Input
            type="text"
            placeholder="Search accounts by username, name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-neutral-950 border-neutral-800 text-xs text-white h-8 w-full focus-visible:ring-blue-500"
          />
        </div>

        {/* Platform Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {PLATFORM_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedPlatform(filter.id)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all shrink-0 ${
                selectedPlatform === filter.id
                  ? "bg-neutral-800 text-white border border-neutral-700 shadow-sm"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900"
              }`}
            >
              {filter.icon}
              <span>{filter.label}</span>
              {accounts && (
                <span className="text-[10px] text-neutral-500 ml-0.5 font-mono">
                  {filter.id === "all"
                    ? accounts.length
                    : accounts.filter((a) => a.platform.toLowerCase() === filter.id).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Account Grid / List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-xs text-neutral-400">Loading your social accounts...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/80 text-red-300 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
          <span>Failed to load social accounts: {error.message}</span>
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="py-16 px-4 rounded-2xl border border-dashed border-neutral-800 bg-neutral-950/40 flex flex-col items-center justify-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500">
            <Users className="w-6 h-6" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-sm font-bold text-white">No accounts found</h3>
            <p className="text-xs text-neutral-400">
              {searchQuery || selectedPlatform !== "all"
                ? "No social accounts match your search or filter."
                : "Your Social Account Library is empty. Add your TikTok, Instagram, LinkedIn, or YouTube profiles to get started."}
            </p>
          </div>
          {searchQuery || selectedPlatform !== "all" ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedPlatform("all");
              }}
              className="text-xs border-neutral-800 text-neutral-300 mt-2"
            >
              Reset Filters
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold mt-2 gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Account</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onEdit={(acc) => setEditingAccount(acc)}
              onDelete={(acc) => setDeletingAccount(acc)}
            />
          ))}
        </div>
      )}

      {/* Add Account Modal */}
      <AddAccountDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {/* Edit Account Modal */}
      <EditAccountDialog
        open={Boolean(editingAccount)}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        account={editingAccount}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(deletingAccount)} onOpenChange={(open) => !open && setDeletingAccount(null)}>
        <DialogContent className="sm:max-w-[420px] bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 shadow-md">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-white">
                Delete Social Account
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-neutral-400 pt-2 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">@{deletingAccount?.username}</strong> ({deletingAccount?.platform.toUpperCase()}) from your Account Library?
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-400">
            Deleting this account will remove it as the target account from associated projects. <strong className="text-neutral-200">Projects themselves will not be deleted.</strong>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingAccount(null)}
              className="border-neutral-800 text-neutral-300 hover:bg-neutral-800 text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold h-9 gap-1.5"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              )}
              <span>Delete Account</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
