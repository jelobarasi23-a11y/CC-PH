"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/wallet";
import { useRouter } from "next/navigation";
import { useContract, type Campaign, type Referral, type Transaction } from "@/hooks/contract";
import { Card, CardHeader, CardContent, Badge, LoadingState, EmptyState } from "@/components/ui";

function StatCard({
  label,
  value,
  subtext,
  icon,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: string;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </Card>
  );
}

function statusVariant(status: string) {
  switch (status) {
    case "verified":
    case "paid":
    case "active":
    case "confirmed":
      return "success" as const;
    case "pending":
    case "draft":
      return "warning" as const;
    case "disputed":
    case "rejected":
    case "failed":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

export default function DashboardPage() {
  const { connected, address, user } = useWallet();
  const router = useRouter();
  const { getCampaigns, getMyReferrals, getMyTransactions } = useContract();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!connected) {
      router.push("/");
      return;
    }
    async function load() {
      setLoading(true);
      const [c, r, t] = await Promise.all([
        getCampaigns(),
        getMyReferrals(),
        getMyTransactions(),
      ]);
      setCampaigns(c || []);
      setReferrals(r || []);
      setTransactions(t || []);
      setLoading(false);
    }
    load();
  }, [connected, router, getCampaigns, getMyReferrals, getMyTransactions]);

  if (!connected) return null;

  const activeCampaigns = campaigns.filter((c) => c.status === "active").length;
  const totalEscrow = campaigns.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const pendingReferrals = referrals.filter((r) => r.status === "pending").length;
  const verifiedReferrals = referrals.filter((r) => r.status === "verified").length;
  const paidReferrals = referrals.filter((r) => r.status === "paid").length;
  const totalEarnings = transactions
    .filter((t) => t.transaction_type === "commission_payout" && t.status === "confirmed")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Welcome back, {user?.full_name || address?.slice(0, 8) + "..."}
        </p>
      </div>

      {loading ? (
        <LoadingState message="Loading dashboard..." />
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active Campaigns" value={activeCampaigns} icon="📋" />
            <StatCard label="Total Escrow" value={`${totalEscrow.toLocaleString()} USDC`} icon="🏦" />
            <StatCard label="Pending Referrals" value={pendingReferrals} icon="⏳" />
            <StatCard
              label="Total Earnings"
              value={`${totalEarnings.toLocaleString()} USDC`}
              subtext={`${paidReferrals} paid`}
              icon="💰"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Referrals */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">
                    Recent Referrals
                  </h2>
                  <a
                    href="/referrals"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    View all
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                {referrals.length === 0 ? (
                  <EmptyState
                    icon="📋"
                    title="No referrals yet"
                    description="Submit a referral to get started"
                  />
                ) : (
                  <div className="space-y-3">
                    {referrals.slice(0, 5).map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white truncate">
                            {r.referral_hash.slice(0, 20)}...
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">
                    Recent Transactions
                  </h2>
                  <a
                    href="/commissions"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    View all
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <EmptyState
                    icon="💳"
                    title="No transactions yet"
                    description="Your Stellar transactions will appear here"
                  />
                ) : (
                  <div className="space-y-3">
                    {transactions.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {t.transaction_type === "commission_payout"
                              ? "Commission Payout"
                              : t.transaction_type === "escrow_fund"
                                ? "Escrow Fund"
                                : "Refund"}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">
                            {t.amount} {t.asset_code}
                          </p>
                          <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Active Campaigns Quick View */}
          {campaigns.filter((c) => c.status === "active").length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-zinc-900 dark:text-white">
                    Active Campaigns
                  </h2>
                  <a
                    href="/campaigns"
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    View all
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {campaigns
                    .filter((c) => c.status === "active")
                    .slice(0, 3)
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg"
                      >
                        <h3 className="font-medium text-zinc-900 dark:text-white">
                          {c.title}
                        </h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                          {c.commission_amount} {c.commission_asset} per sale
                        </p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-zinc-400">
                            Escrow: {c.escrow_amount.toLocaleString()}
                          </span>
                          <Badge variant="success">Active</Badge>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
