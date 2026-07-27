"use client";

import { useState, useCallback } from "react";
import { useWallet } from "./wallet";
import { getSorobanClient, getSorobanReadOnlyClient } from "@/lib/stellar/soroban";
import type { Campaign as OnChainCampaign, Referral as OnChainReferral } from "contract";

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

/** Convert a hex string to a Buffer for Soroban Bytes type */
function hexToBytes(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex");
}

/** Convert USDC amount (human-readable) to i128 (6 decimal places) */
function toI128(value: number): bigint {
  return BigInt(Math.round(value * 1_000_000));
}

export function useContract() {
  const { address } = useWallet();
  const [loading, setLoading] = useState(false);

  // ──────────────────────────────────────────
  //  ON-CHAIN + OFF-CHAIN: Create Campaign
  // ──────────────────────────────────────────
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
        if (!address) throw new Error("Wallet not connected");

        const asset = process.env.NEXT_PUBLIC_USDC_ISSUER || "";

        // 1. Create on-chain campaign via Soroban
        const client = getSorobanClient(address);
        const tx = await client.create_campaign({
          business: address,
          commission_amount: toI128(data.commission_amount),
          asset: asset,
          max_referrals: data.max_referrals,
        });
        const { result: sorobanCampaignId } = await tx.signAndSend();

        // 2. Sync to Supabase
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            wallet_address: address,
            soroban_campaign_id: sorobanCampaignId.toString(),
            soroban_contract_address: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
          }),
        });
        const dbResult = await res.json();
        if (!res.ok) throw new Error(dbResult.error || "Failed to sync campaign to database");
        return { ...dbResult, soroban_campaign_id: sorobanCampaignId.toString() };
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  // ──────────────────────────────────────────
  //  ON-CHAIN + OFF-CHAIN: Fund Campaign
  // ──────────────────────────────────────────
  const fundCampaign = useCallback(
    async (sorobanCampaignId: string, amount: number) => {
      setLoading(true);
      try {
        if (!address) throw new Error("Wallet not connected");

        // 1. Fund on-chain escrow via Soroban
        const client = getSorobanClient(address);
        const tx = await client.fund_campaign({
          business: address,
          campaign_id: BigInt(sorobanCampaignId),
          amount: toI128(amount),
        });
        await tx.signAndSend();

        // 2. Sync to Supabase
        const res = await fetch(`/api/campaigns/${sorobanCampaignId}/fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address }),
        });
        const dbResult = await res.json();
        if (!res.ok) throw new Error(dbResult.error || "Failed to sync funding to database");
        return dbResult;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  // ──────────────────────────────────────────
  //  ON-CHAIN + OFF-CHAIN: Submit Referral
  // ──────────────────────────────────────────
  const submitReferral = useCallback(
    async (data: {
      campaign_id: string;
      referral_hash: string;
      notes?: string;
    }) => {
      setLoading(true);
      try {
        if (!address) throw new Error("Wallet not connected");

        // Hash the referral identifier to match what the contract expects
        const hashBytes = hexToBytes(data.referral_hash);

        // 1. Submit on-chain referral via Soroban
        const client = getSorobanClient(address);
        const tx = await client.submit_referral({
          agent: address,
          campaign_id: BigInt(data.campaign_id),
          referral_hash: hashBytes,
        });
        await tx.signAndSend();

        // 2. Sync to Supabase
        const res = await fetch("/api/referrals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, wallet_address: address }),
        });
        const dbResult = await res.json();
        if (!res.ok) throw new Error(dbResult.error || "Failed to sync referral to database");
        return dbResult;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  // ──────────────────────────────────────────
  //  ON-CHAIN + OFF-CHAIN: Verify Referral
  // ──────────────────────────────────────────
  const verifyReferral = useCallback(
    async (dbReferralId: string, sorobanCampaignId: string, referralHash: string) => {
      setLoading(true);
      try {
        if (!address) throw new Error("Wallet not connected");

        const hashBytes = hexToBytes(referralHash);

        // 1. Verify on-chain via Soroban
        const client = getSorobanClient(address);
        const tx = await client.verify_referral({
          business: address,
          campaign_id: BigInt(sorobanCampaignId),
          referral_hash: hashBytes,
        });
        await tx.signAndSend();

        // 2. Sync to Supabase
        const res = await fetch(`/api/referrals/${dbReferralId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address }),
        });
        const dbResult = await res.json();
        if (!res.ok) throw new Error(dbResult.error || "Failed to sync verification");
        return dbResult;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  // ──────────────────────────────────────────
  //  ON-CHAIN + OFF-CHAIN: Open Dispute
  // ──────────────────────────────────────────
  const disputeReferral = useCallback(
    async (
      dbReferralId: string,
      reason: string,
      sorobanCampaignId: string,
      referralHash: string
    ) => {
      setLoading(true);
      try {
        if (!address) throw new Error("Wallet not connected");

        const hashBytes = hexToBytes(referralHash);

        // 1. Open dispute on-chain via Soroban
        const client = getSorobanClient(address);
        const tx = await client.open_dispute({
          disputant: address,
          campaign_id: BigInt(sorobanCampaignId),
          referral_hash: hashBytes,
        });
        await tx.signAndSend();

        // 2. Sync to Supabase
        const res = await fetch(`/api/referrals/${dbReferralId}/dispute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address, reason }),
        });
        const dbResult = await res.json();
        if (!res.ok) throw new Error(dbResult.error || "Failed to sync dispute");
        return dbResult;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  // ──────────────────────────────────────────
  //  ON-CHAIN + OFF-CHAIN: Resolve Dispute
  // ──────────────────────────────────────────
  const resolveDispute = useCallback(
    async (
      dbReferralId: string,
      inFavorOfAgent: boolean,
      sorobanCampaignId: string,
      referralHash: string
    ) => {
      setLoading(true);
      try {
        if (!address) throw new Error("Wallet not connected");

        const hashBytes = hexToBytes(referralHash);

        // 1. Resolve dispute on-chain via Soroban
        const client = getSorobanClient(address);
        const tx = await client.resolve_dispute({
          resolver: address,
          campaign_id: BigInt(sorobanCampaignId),
          referral_hash: hashBytes,
          in_favor_of_agent: inFavorOfAgent,
        });
        await tx.signAndSend();

        // 2. Sync to Supabase
        const res = await fetch(`/api/referrals/${dbReferralId}/resolve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address, in_favor_of_agent: inFavorOfAgent }),
        });
        const dbResult = await res.json();
        if (!res.ok) throw new Error(dbResult.error || "Failed to sync dispute resolution");
        return dbResult;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  // ──────────────────────────────────────────
  //  ON-CHAIN + OFF-CHAIN: Claim Commission
  // ──────────────────────────────────────────
  const claimCommission = useCallback(
    async (dbReferralId: string, sorobanCampaignId: string, referralHash: string) => {
      setLoading(true);
      try {
        if (!address) throw new Error("Wallet not connected");

        const hashBytes = hexToBytes(referralHash);

        // 1. Claim on-chain via Soroban
        const client = getSorobanClient(address);
        const tx = await client.claim_commission({
          agent: address,
          campaign_id: BigInt(sorobanCampaignId),
          referral_hash: hashBytes,
        });
        await tx.signAndSend();

        // 2. Sync to Supabase
        const res = await fetch(`/api/referrals/${dbReferralId}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: address }),
        });
        const dbResult = await res.json();
        if (!res.ok) throw new Error(dbResult.error || "Failed to sync claim");
        return dbResult;
      } finally {
        setLoading(false);
      }
    },
    [address]
  );

  // ──────────────────────────────────────────
  //  READ: Get Campaigns (Supabase metadata)
  // ──────────────────────────────────────────
  const getCampaigns = useCallback(async () => {
    const res = await fetch("/api/campaigns");
    if (!res.ok) return [];
    return res.json();
  }, []);

  // ──────────────────────────────────────────
  //  READ: Get On-Chain Campaign
  // ──────────────────────────────────────────
  const getOnChainCampaign = useCallback(
    async (sorobanCampaignId: number): Promise<OnChainCampaign | null> => {
      try {
        const client = getSorobanReadOnlyClient();
        const { result } = await client.get_campaign({
          campaign_id: BigInt(sorobanCampaignId),
        });
        return result;
      } catch {
        return null;
      }
    },
    []
  );

  // ──────────────────────────────────────────
  //  READ: Get On-Chain Referral
  // ──────────────────────────────────────────
  const getOnChainReferral = useCallback(
    async (
      sorobanCampaignId: number,
      referralHash: string
    ): Promise<OnChainReferral | null> => {
      try {
        const client = getSorobanReadOnlyClient();
        const hashBytes = hexToBytes(referralHash);
        const { result } = await client.get_referral({
          campaign_id: BigInt(sorobanCampaignId),
          referral_hash: hashBytes,
        });
        return result;
      } catch {
        return null;
      }
    },
    []
  );

  // ──────────────────────────────────────────
  //  READ: Get On-Chain Campaign Count
  // ──────────────────────────────────────────
  const getOnChainCampaignCount = useCallback(async (): Promise<number> => {
    try {
      const client = getSorobanReadOnlyClient();
      const { result } = await client.get_campaign_count();
      return Number(result);
    } catch {
      return 0;
    }
  }, []);

  // ──────────────────────────────────────────
  //  READ: Supabase queries
  // ──────────────────────────────────────────
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
    getOnChainCampaign,
    getOnChainReferral,
    getOnChainCampaignCount,
  };
}

export type { Campaign, Referral, Transaction };
