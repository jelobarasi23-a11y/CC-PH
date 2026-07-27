"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/wallet";
import { useContract, type Referral, type Campaign } from "@/hooks/contract";
import {
  Card,
  CardHeader,
  CardContent,
  Badge,
  Button,
  LoadingState,
  EmptyState,
} from "@/components/ui";
import { useToast } from "@/hooks/toast";
import { sanitizeInput } from "@/lib/validation";

function statusVariant(status: string) {
  switch (status) {
    case "verified":
    case "paid":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "disputed":
    case "rejected":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

export default function ReferralsPage() {
  const { connected, address, user } = useWallet();
  const {
    getMyReferrals,
    submitReferral,
    verifyReferral,
    disputeReferral,
    resolveDispute,
    claimCommission,
    loading,
  } = useContract();
  const { addToast } = useToast();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [referralHash, setReferralHash] = useState("");
  const [referralNotes, setReferralNotes] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [disputeId, setDisputeId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoadingData(true);
    const [r, c] = await Promise.all([
      getMyReferrals(),
      fetch("/api/campaigns").then((res) => (res.ok ? res.json() : [])),
    ]);
    setReferrals(r || []);
    setCampaigns(c || []);
    setLoadingData(false);
  }

  /** Helper to find the Soroban campaign ID and referral hash for on-chain calls */
  function getOnChainContext(referral: Referral) {
    const campaign = campaigns.find((c) => c.id === referral.campaign_id);
    return {
      sorobanCampaignId: campaign?.soroban_campaign_id || null,
      referralHash: referral.referral_hash,
      campaign,
    };
  }

  async function handleSubmitReferral(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCampaign || !referralHash) {
      addToast("Please fill in all required fields", "error");
      return;
    }
    try {
      await submitReferral({
        campaign_id: selectedCampaign,
        referral_hash: sanitizeInput(referralHash),
        notes: referralNotes ? sanitizeInput(referralNotes) : undefined,
      });
      addToast("Referral submitted on-chain!", "success");
      setShowSubmitForm(false);
      setReferralHash("");
      setReferralNotes("");
      setSelectedCampaign("");
      await loadData();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to submit referral",
        "error"
      );
    }
  }

  async function handleVerify(referral: Referral) {
    setActionLoading(referral.id);
    try {
      const { sorobanCampaignId, referralHash } = getOnChainContext(referral);
      if (!sorobanCampaignId) {
        throw new Error("Campaign not linked to on-chain contract");
      }
      await verifyReferral(referral.id, sorobanCampaignId, referralHash);
      addToast("Referral verified on-chain!", "success");
      await loadData();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to verify",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleClaim(referral: Referral) {
    setActionLoading(referral.id);
    try {
      const { sorobanCampaignId, referralHash } = getOnChainContext(referral);
      if (!sorobanCampaignId) {
        throw new Error("Campaign not linked to on-chain contract");
      }
      await claimCommission(referral.id, sorobanCampaignId, referralHash);
      addToast("Commission claimed on-chain!", "success");
      await loadData();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to claim commission",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDispute(referral: Referral) {
    if (!disputeReason.trim()) {
      addToast("Please provide a reason", "error");
      return;
    }
    setActionLoading(referral.id);
    try {
      const { sorobanCampaignId, referralHash } = getOnChainContext(referral);
      if (!sorobanCampaignId) {
        throw new Error("Campaign not linked to on-chain contract");
      }
      await disputeReferral(
        referral.id,
        sanitizeInput(disputeReason),
        sorobanCampaignId,
        referralHash
      );
      addToast("Dispute opened on-chain!", "success");
      setDisputeId(null);
      setDisputeReason("");
      await loadData();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to open dispute",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResolve(referral: Referral, inFavor: boolean) {
    setActionLoading(referral.id);
    try {
      const { sorobanCampaignId, referralHash } = getOnChainContext(referral);
      if (!sorobanCampaignId) {
        throw new Error("Campaign not linked to on-chain contract");
      }
      await resolveDispute(
        referral.id,
        inFavor,
        sorobanCampaignId,
        referralHash
      );
      addToast("Dispute resolved on-chain!", "success");
      await loadData();
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to resolve dispute",
        "error"
      );
    } finally {
      setActionLoading(null);
    }
  }

  const isBusinessForReferral = (r: Referral) => {
    const campaign = campaigns.find((c) => c.id === r.campaign_id);
    return campaign?.organizations?.wallet_address === address;
  };

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Please connect your wallet to view referrals.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
            Referrals
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Submit and manage commission referrals on-chain
          </p>
        </div>
        <Button onClick={() => setShowSubmitForm(!showSubmitForm)}>
          {showSubmitForm ? "Cancel" : "Submit Referral"}
        </Button>
      </div>

      {/* Submit Referral Form */}
      {showSubmitForm && (
        <Card className="mb-8">
          <CardHeader>
            <h2 className="font-semibold text-zinc-900 dark:text-white">
              New Referral
            </h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReferral} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Campaign *
                </label>
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select a campaign</option>
                  {campaigns
                    .filter((c) => c.status === "active")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title} — {c.commission_amount} {c.commission_asset}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Client Identifier *
                </label>
                <input
                  type="text"
                  value={referralHash}
                  onChange={(e) => setReferralHash(e.target.value)}
                  placeholder="e.g., client email, phone, or reference ID"
                  className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  required
                />
                <p className="text-xs text-zinc-400 mt-1">
                  This identifier will be hashed before storage
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  placeholder="Additional context about this referral..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowSubmitForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Referral"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loadingData ? (
        <LoadingState message="Loading referrals..." />
      ) : referrals.length === 0 ? (
        <EmptyState
          icon="🔗"
          title="No referrals yet"
          description="Submit your first referral to start earning commissions"
        />
      ) : (
        <div className="space-y-4">
          {referrals.map((referral) => (
            <Card key={referral.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-white font-mono truncate">
                        {referral.referral_hash.slice(0, 30)}
                        {referral.referral_hash.length > 30 ? "..." : ""}
                      </p>
                      <Badge variant={statusVariant(referral.status)}>
                        {referral.status}
                      </Badge>
                      {referral.disputed && (
                        <Badge variant="danger">Disputed</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>
                        Campaign:{" "}
                        {referral.campaigns?.title ||
                          referral.campaign_id.slice(0, 8)}
                      </span>
                      <span>
                        {new Date(referral.created_at).toLocaleDateString()}
                      </span>
                      {referral.stellar_tx_hash && (
                        <span className="font-mono">
                          TX: {referral.stellar_tx_hash.slice(0, 10)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Business verify button */}
                    {referral.status === "pending" &&
                      isBusinessForReferral(referral) && (
                        <Button
                          size="sm"
                          onClick={() => handleVerify(referral)}
                          disabled={actionLoading === referral.id}
                        >
                          {actionLoading === referral.id
                            ? "Verifying..."
                            : "Verify Sale"}
                        </Button>
                      )}

                    {/* Claim commission button */}
                    {referral.status === "verified" && !referral.paid && (
                      <Button
                        size="sm"
                        onClick={() => handleClaim(referral)}
                        disabled={actionLoading === referral.id}
                      >
                        {actionLoading === referral.id
                          ? "Claiming..."
                          : "Claim Commission"}
                      </Button>
                    )}

                    {/* Dispute button */}
                    {referral.status !== "paid" &&
                      !referral.disputed &&
                      referral.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() =>
                            setDisputeId(
                              disputeId === referral.id ? null : referral.id
                            )
                          }
                        >
                          Dispute
                        </Button>
                      )}

                    {/* Admin resolve buttons */}
                    {referral.disputed && user?.role === "admin" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          onClick={() => handleResolve(referral, true)}
                          disabled={actionLoading === referral.id}
                        >
                          Favor Agent
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleResolve(referral, false)}
                          disabled={actionLoading === referral.id}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dispute form */}
                {disputeId === referral.id && (
                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={disputeReason}
                        onChange={(e) => setDisputeReason(e.target.value)}
                        placeholder="Reason for dispute..."
                        className="flex-1 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none"
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          const ref = referrals.find((r) => r.id === disputeId);
                          if (ref) handleDispute(ref);
                        }}
                        disabled={actionLoading === referral.id}
                      >
                        Submit Dispute
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
