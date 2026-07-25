"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/wallet";
import { useContract, type Transaction } from "@/hooks/contract";
import { Card, CardHeader, CardContent, Badge, LoadingState, EmptyState } from "@/components/ui";

function statusVariant(status: string) {
  switch (status) {
    case "confirmed":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "failed":
      return "danger" as const;
    default:
      return "default" as const;
  }
}

function typeLabel(type: string) {
  switch (type) {
    case "escrow_fund":
      return "Escrow Fund";
    case "commission_payout":
      return "Commission Payout";
    case "refund":
      return "Refund";
    default:
      return type;
  }
}

export default function CommissionsPage() {
  const { connected } = useWallet();
  const { getMyTransactions } = useContract();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  async function loadTransactions() {
    setLoadingData(true);
    const data = await getMyTransactions();
    setTransactions(data || []);
    setLoadingData(false);
  }

  const totalPaid = transactions
    .filter(
      (t) => t.transaction_type === "commission_payout" && t.status === "confirmed"
    )
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalFunded = transactions
    .filter(
      (t) => t.transaction_type === "escrow_fund" && t.status === "confirmed"
    )
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">
          Please connect your wallet to view commissions.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Commission History
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Track all commission payouts and escrow activity
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Commissions Paid</p>
          <p className="text-2xl font-bold text-green-600 mt-1">
            {totalPaid.toLocaleString()} USDC
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Escrow Funded</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {totalFunded.toLocaleString()} USDC
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Transactions</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-white mt-1">
            {transactions.length}
          </p>
        </Card>
      </div>

      {loadingData ? (
        <LoadingState message="Loading transactions..." />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon="💳"
          title="No transactions yet"
          description="Your Stellar transactions will appear here once you fund escrow or receive commissions"
        />
      ) : (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-zinc-900 dark:text-white">
              All Transactions
            </h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="text-left py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">
                      Type
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">
                      Amount
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-zinc-500 dark:text-zinc-400">
                      Stellar TX
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className="border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                    >
                      <td className="py-3 px-2">
                        <span className="text-zinc-900 dark:text-white">
                          {typeLabel(tx.transaction_type)}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium text-zinc-900 dark:text-white">
                        {tx.amount.toLocaleString()} {tx.asset_code}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={statusVariant(tx.status)}>
                          {tx.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-zinc-500 dark:text-zinc-400">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        {tx.stellar_tx_hash ? (
                          <a
                            href={`https://stellar.expert/testnet/tx/${tx.stellar_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 font-mono text-xs"
                          >
                            {tx.stellar_tx_hash.slice(0, 10)}...
                          </a>
                        ) : (
                          <span className="text-zinc-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
