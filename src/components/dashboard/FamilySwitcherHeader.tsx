"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileUp,
  HeartPulse,
  LayoutDashboard,
  Plus,
  QrCode,
  User,
} from "lucide-react";
import { createFamilyWorkspaceAction } from "@/app/actions";
import { ThemeToggle } from "@/components/dashboard/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectDropdown } from "@/components/ui/select-dropdown";
import { DEMO_SAMPLE_QR_TOKEN, type FamilyRow } from "@/types/database";

interface FamilySwitcherHeaderProps {
  activeFamily: FamilyRow;
  families: FamilyRow[];
  userEmail: string;
  isLiveSupabase: boolean;
  memberCount: number;
  documentCount: number;
  pendingHitlCount: number;
}

export function FamilySwitcherHeader({
  activeFamily,
  families,
  userEmail,
  pendingHitlCount,
}: FamilySwitcherHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [selectedFamilyId, setSelectedFamilyId] = useState(activeFamily.id);

  function handleCreateFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!newFamilyName.trim()) return;
    startTransition(async () => {
      await createFamilyWorkspaceAction({
        name: newFamilyName.trim(),
        tier: "family_care",
      });
      setNewFamilyName("");
      setShowNewFamilyModal(false);
      router.refresh();
    });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: Brand & Household */}
        <div className="flex items-center gap-2.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-2xs">
              <HeartPulse className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground">
              AyuVansha
            </span>
          </Link>

          <span className="hidden text-border sm:inline">/</span>

          <div className="hidden items-center gap-1.5 sm:flex">
            {families.length > 1 ? (
              <SelectDropdown
                value={selectedFamilyId}
                onValueChange={(val) => {
                  setSelectedFamilyId(val);
                  router.refresh();
                }}
                options={families.map((f) => ({
                  value: f.id,
                  label: f.name,
                }))}
                className="w-48"
                ariaLabel="Switch family workspace"
              />
            ) : (
              <span className="text-sm font-medium text-muted-foreground">
                {activeFamily.name}
              </span>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowNewFamilyModal(true)}
              title="New family workspace"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Center: Primary Navigation */}
        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className={buttonVariants({
              variant: pathname === "/" ? "secondary" : "ghost",
              size: "sm",
            })}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span>Overview</span>
          </Link>

          <Link
            href="/upload"
            className={buttonVariants({
              variant: pathname === "/upload" ? "secondary" : "ghost",
              size: "sm",
            })}
          >
            <FileUp className="h-3.5 w-3.5" />
            <span>Upload &amp; Review</span>
            {pendingHitlCount > 0 && (
              <Badge variant="warning" className="ml-0.5 px-1.5 py-0 text-[11px]">
                {pendingHitlCount}
              </Badge>
            )}
          </Link>

          <Link
            href={`/brief/${DEMO_SAMPLE_QR_TOKEN}`}
            className={buttonVariants({
              variant: "ghost",
              size: "sm",
              className: "hidden text-primary hover:text-primary md:inline-flex",
            })}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>Doctor Brief</span>
          </Link>
        </nav>

        {/* Right: Dark Mode Toggle & Account */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            href="/login"
            title={userEmail}
            className={buttonVariants({
              variant: "outline",
              size: "sm",
              className: "gap-1.5",
            })}
          >
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden max-w-[130px] truncate sm:inline">
              {userEmail.split("@")[0]}
            </span>
          </Link>
        </div>
      </div>

      {/* Create New Family Modal */}
      {showNewFamilyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg">
            <h3 className="text-base font-semibold">New Family Workspace</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a separate private health workspace for another branch of
              your family.
            </p>
            <form onSubmit={handleCreateFamily} className="mt-4 space-y-4">
              <Input
                type="text"
                required
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                placeholder="e.g., Maternal Family Care"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNewFamilyModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isPending}>
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
