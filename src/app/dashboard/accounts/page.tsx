"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Film, Image as ImageIcon } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { AccountLibrary } from "@/features/social-accounts";
import { AssetLibraryDialog } from "@/features/assets";

export default function AccountsDashboardPage() {
  const [assetLibraryOpen, setAssetLibraryOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100 font-sans">
      {/* Top Application Shell Header */}
      <header className="sticky top-0 z-30 h-14 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo / Branding */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/30">
              H
            </div>
            <span className="font-semibold text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
              Hana Studio
            </span>
          </Link>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Projects
            </Link>
            <Link
              href="/dashboard/accounts"
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-800 text-white flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-purple-400" />
              Accounts
            </Link>
            <button
              type="button"
              onClick={() => setAssetLibraryOpen(true)}
              className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Open Asset Library"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              Assets
            </button>
            <Link
              href="/dashboard/renders"
              className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors flex items-center gap-1.5"
              title="Rendered Carousel Outputs"
            >
              <Film className="w-3.5 h-3.5 text-emerald-400" />
              Renders
            </Link>
          </nav>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-neutral-900 border border-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Projects</span>
          </Link>
          <div className="flex items-center justify-center pl-2 border-l border-neutral-800">
            <UserButton appearance={{ elements: { avatarBox: "w-8 h-8 rounded-full border border-neutral-800" } }} />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <AccountLibrary />
      </main>

      {/* Asset Library Dialog */}
      <AssetLibraryDialog
        open={assetLibraryOpen}
        onOpenChange={setAssetLibraryOpen}
      />
    </div>
  );
}
