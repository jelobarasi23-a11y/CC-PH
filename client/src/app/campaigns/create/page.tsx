"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/wallet";
import { useRouter } from "next/navigation";
import { useContract } from "@/hooks/contract";
import { supabase } from "@/lib/supabase/client";
import { Card, CardHeader, CardContent, Button } from "@/components/ui";
import { useToast } from "@/hooks/toast";
import { sanitizeInput } from "@/lib/validation";

export default function CreateCampaignPage() {
  const { connected, address, user } = useWallet();
  const router = useRouter();
  const { createCampaign, loading } = useContract();
  const { addToast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [maxReferrals, setMaxReferrals] = useState("10");
  const [orgName, setOrgName] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;

    const sanitizedTitle = sanitizeInput(title);
    const sanitizedDesc = sanitizeInput(description);
    const sanitizedOrg = sanitizeInput(orgName);

    if (sanitizedTitle.length < 3) {
      addToast("Title must be at least 3 characters", "error");
      return;
    }

    const amount = parseFloat(commissionAmount);
    if (isNaN(amount) || amount <= 0) {
      addToast("Commission amount must be positive", "error");
      return;
    }

    const maxRef = parseInt(maxReferrals);
    if (isNaN(maxRef) || maxRef <= 0) {
      addToast("Max referrals must be positive", "error");
      return;
    }

    try {
      // Create or get organization
      let orgId = "";

      const { data: existingOrg } = await supabase
        .from("organizations")
        .select("id")
        .eq("wallet_address", address)
        .single();

      if (existingOrg) {
        orgId = existingOrg.id;
      } else {
        const { data: newOrg } = await supabase
          .from("organizations")
          .insert({
            name: sanitizedOrg || "My Business",
            wallet_address: address,
            user_id: user?.id,
            type: "business",
          })
          .select("id")
          .single();
        orgId = newOrg?.id || "";
      }

      if (!orgId) {
        addToast("Failed to create organization", "error");
        return;
      }

      const result = await createCampaign({
        title: sanitizedTitle,
        description: sanitizedDesc,
        commission_amount: amount,
        max_referrals: maxRef,
        organization_id: orgId,
      });

      addToast("Campaign created! Fund it to activate.", "success");
      router.push("/campaigns");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to create campaign",
        "error"
      );
    }
  }

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Please connect your wallet to create a campaign.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Create Campaign
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Set up a new commission campaign. Fund it after creation to activate.
        </p>
      </div>

      <Card>
        <CardContent className="py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Real Estate Referral Program"
                className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the commission campaign..."
                rows={3}
                className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Commission Amount (USDC) *
                </label>
                <input
                  type="number"
                  value={commissionAmount}
                  onChange={(e) => setCommissionAmount(e.target.value)}
                  placeholder="100"
                  min="0.01"
                  step="0.01"
                  className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Max Referrals *
                </label>
                <input
                  type="number"
                  value={maxReferrals}
                  onChange={(e) => setMaxReferrals(e.target.value)}
                  placeholder="10"
                  min="1"
                  className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your business name"
                className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                <strong>Escrow required:</strong>{" "}
                {commissionAmount && maxReferrals
                  ? `${(parseFloat(commissionAmount || "0") * parseInt(maxReferrals || "0")).toLocaleString()} USDC`
                  : "0 USDC"}{" "}
                ({commissionAmount || "0"} × {maxReferrals || "0"} referrals)
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? "Creating..." : "Create Campaign"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
