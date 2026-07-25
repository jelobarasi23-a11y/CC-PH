"use client";

import { useState, useCallback } from "react";
import { useWallet } from "./wallet";
import { supabase } from "@/lib/supabase/client";

interface Campaign {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  commission_amount: number;
  commission_asset: string;
  escrow_amount: number;
  max_referrals: number;
  status: string;
  soroban_campaign_id: string | null;
  soroban_contract_address: string | null;
  created_at: string;
  updated_at: string;
  organizations?: { name: string; wallet_address: string };
}

interface Referral {
  id: string;
  campaign_id: string;
  agent_id: string | null;
  referral_hash: string;
  status: string;
  verified_at: string | null;
  verified_by: string | null;
  disputed: boolean;
  dispute_reason: string | null;
  paid: boolean;
  paid_at: string | null;
  stellar_tx_hash: string | null;
  soroban_tx_hash: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  campaigns?: Campaign;
  users?: { wallet_address: string; full_name: string | null };
}

interface Transaction {
  id: string;
  wallet_address: string;
  stellar_tx_hash: string | null;
  transaction_type: string;
  amount: number;
  asset_code: string;
  status: string;
  campaign_id: string | null;
  referral_id: string | null;
  created_at: string;
}

export function useContract() {
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);

  const createCampaign = useCallback(
    async (data: {
      title: string;
      description: string;
      commission_amount: number;
      max_referrals: number;
      organization_id: string;
    }) => {
      setLoading(true);
      try {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, wallet_address: address }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to create campaign");
        return result;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const fundCampaign = useCallback(
    async (campaignId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/campaigns/${campaignId}/fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to fund campaign");
        return result;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const submitReferral = useCallback(
    async (data: { campaign_id: string; referral_hash: string; notes?: string }) => {
      setLoading(true);
      try {
        const res = await fetch("/api/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, wallet_address: address }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to submit referral");
        return result;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const verifyReferral = useCallback(
    async (referralId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/referrals/${referralId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to verify referral");
        return result;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const disputeReferral = useCallback(
    async (referralId: string, reason: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/referrals/${referralId}/dispute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address, reason }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to open dispute");
        return result;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const resolveDispute = useCallback(
    async (referralId: string, inFavorOfAgent: boolean) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/referrals/${referralId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            wallet_address: address,
            in_favor_of_agent: inFavorOfAgent,
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to resolve dispute");
        return result;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const claimCommission = useCallback(
    async (referralId: string) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/referrals/${referralId}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || "Failed to claim commission");
        return result;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  const getCampaigns = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    if (!res.ok) return [];
    return res.json();
  }, []);

  const getMyReferrals = useCallback(async () => {
    const res = await fetch(`/api/referrals?wallet_address=${address}`);
    if (!res.ok) return [];
    return res.json();
  }, [address]);

  const getMyTransactions = useCallback(async () => {
    const res = await fetch(`/api/transactions?wallet_address=${address}`);
    if (!res.ok) return [];
    return res.json();
  }, [address]);

  return {
    loading,
    createCampaign,
    fundCampaign,
    submitReferral,
    verifyReferral,
    disputeReferral,
    resolveDispute,
    claimCommission,
    getCampaigns,
    getMyReferrals,
    getMyTransactions,
  };
}

export type { Campaign, Referral, Transaction };
