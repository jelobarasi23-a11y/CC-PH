"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/wallet";
import Link from "next/link";
import { useContract, type Campaign } from "@/hooks/contract";
import { Card, Badge, LoadingState, EmptyState, Button } from "@/components/ui";
import { useToast } from "@/hooks/toast";

function statusVariant(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "draft":
      return "warning" as const;
    case "completed":
      return "info" as const;
    case "cancelled":
    case "paused":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

export default function CampaignsPage() {
  const { connected, address } = useWallet();
  const { getCampaigns, fundCampaign, loading } = useContract();
  const { addToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [fundingId, setFundingId] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    setLoadingCampaigns(true);
    const data = await getCampaigns();
    setCampaigns(data || []);
    setLoadingCampaigns(false);
  }

  async function handleFund(campaign: Campaign) {
    setFundingId(campaign.id);
    try {
      if (!campaign.soroban_campaign_id) {
        throw new Error("Campaign is not linked to a Soroban contract");
      }
      const amount = campaign.commission_amount * campaign.max_referrals;
      await fundCampaign(campaign.soroban_campaign_id, amount);
      addToast("Campaign funded successfully on-chain and in database!", "success");
      await loadCampaigns();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to fund campaign",
        "error"
      );
    } finally {
      setFundingId(null);
    }
  }

  const isBusiness = (c: Campaign) =>
    c.organizations?.wallet_address === address;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Campaigns
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Browse commission campaigns and manage escrow funding
          </p>
        </div>
        <Link href="/campaigns/create">
          <Button>Create Campaign</Button>
        </Link>
      </div>

      {loadingCampaigns ? (
        <LoadingState message="Loading campaigns..." />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No campaigns yet"
          description="Create your first commission campaign to get started"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col">
              <div className="p-6 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {campaign.title}
                  </h3>
                  <Badge variant={statusVariant(campaign.status)}>
                    {campaign.status}
                  </Badge>
                </div>
                {campaign.description && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2">
                    {campaign.description}
                  </p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Commission
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {campaign.commission_amount} {campaign.commission_asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Escrow Balance
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {campaign.escrow_amount?.toLocaleString() || 0}{" "}
                      {campaign.commission_asset}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Max Referrals
                    </span>
                    <span className="font-medium text-zinc-900 dark:text-white">
                      {campaign.max_referrals}
                    </span>
                  </div>
                  {campaign.organizations && (
                    <div className="flex justify-between">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Business
                      </span>
                      <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {campaign.organizations.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="px-6 pb-4">
                {campaign.status === "draft" && isBusiness(campaign) && (
                  <Button
                    onClick={() => handleFund(campaign)}
                    disabled={fundingId === campaign.id || loading}
                    className="w-full"
                  >
                    {fundingId === campaign.id
                      ? "Funding..."
                      : "Fund Escrow & Activate"}
                  </Button>
                )}
                {campaign.status === "active" && (
                  <Link
                    href={`/referrals?campaign=${campaign.id}`}
                    className="block"
                  >
                    <Button variant="secondary" className="w-full">
                      Submit Referral
                    </Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
