"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/wallet";

const features = [
  {
    icon: "🔒",
    title: "Pre-Funded Escrow",
    description:
      "Businesses deposit commission funds upfront, guaranteeing payout to verified agents.",
  },
  {
    icon: "🔗",
    title: "On-Chain Verification",
    description:
      "Soroban smart contracts validate referral ownership, authorization, and payout conditions.",
  },
  {
    icon: "💰",
    title: "Stellar Payouts",
    description:
      "Commission payments settle directly to agent Stellar wallets via USDC or other assets.",
  },
  {
    icon: "🛡️",
    title: "Dispute Protection",
    description:
      "Referrals can be disputed before payout, preventing fraudulent or duplicate claims.",
  },
  {
    icon: "📊",
    title: "Transparent Ledger",
    description:
      "All commission activity is auditable on-chain with wallet addresses and timestamps.",
  },
  {
    icon: "🇵🇭",
    title: "Built for PH SMEs",
    description:
      "Designed specifically for Philippine sales agents, freelancers, and referral partners.",
  },
];

const steps = [
  {
    step: "1",
    title: "Create Campaign",
    description:
      "Business creates a commission campaign with amount, asset, and referral capacity.",
  },
  {
    step: "2",
    title: "Fund Escrow",
    description:
      "Business deposits commission funds into the Soroban escrow contract.",
  },
  {
    step: "3",
    title: "Agent Submits Referral",
    description:
      "Sales agent connects Freighter wallet and submits a referral with client details.",
  },
  {
    step: "4",
    title: "Business Verifies Sale",
    description:
      "Business confirms the completed sale through the application.",
  },
  {
    step: "5",
    title: "Commission Released",
    description:
      "Soroban validates all conditions and releases the pre-funded commission to the agent.",
  },
];

export default function LandingPage() {
  const { connected, connectWallet, loading } = useWallet();

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-medium mb-6">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Built on Stellar Testnet
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 dark:text-white tracking-tight">
              Commission settlement,{" "}
              <span className="text-blue-600">powered by Stellar</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Philippine SMEs can pre-fund referral commissions, verify
              completed sales, and release transparent payouts to agents
              through Soroban smart contracts.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {connected ? (
                <Link
                  href="/dashboard"
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-center"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors"
                >
                  {loading ? "Connecting..." : "Connect Freighter Wallet"}
                </button>
              )}
              <a
                href="#how-it-works"
                className="w-full sm:w-auto px-8 py-3 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-medium rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-center"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="py-16 sm:py-24 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
              The Commission Problem
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400 text-lg">
              Freelance sales agents and referral partners in the Philippines
              rely on spreadsheets, chat messages, and manual records.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              "Disputes over referral ownership",
              "Duplicate referral claims",
              "Delayed commission payouts",
              "Unclear commission status",
              "Fraudulent or unauthorized approvals",
              "Uncertainty about payout reliability",
            ].map((problem) => (
              <div
                key={problem}
                className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg"
              >
                <span className="text-red-500 mt-0.5">✕</span>
                <span className="text-sm text-red-700 dark:text-red-300">
                  {problem}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
              How CommissionChain PH Solves This
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400 text-lg">
              Combining off-chain sale verification with on-chain commission
              settlement.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-16 sm:py-24 bg-white dark:bg-zinc-900"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-4 text-zinc-600 dark:text-zinc-400 text-lg">
              From campaign creation to Stellar payout in five steps.
            </p>
          </div>
          <div className="max-w-3xl mx-auto space-y-8">
            {steps.map((s) => (
              <div key={s.step} className="flex items-start gap-5">
                <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  {s.step}
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-900 dark:text-white">
                    {s.title}
                  </h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Ready to settle commissions transparently?
          </h2>
          <p className="mt-4 text-blue-100 text-lg">
            Connect your Freighter wallet and start using CommissionChain PH
            on Stellar Testnet.
          </p>
          <div className="mt-8">
            {connected ? (
              <Link
                href="/dashboard"
                className="inline-block px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="px-8 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-blue-50 disabled:bg-blue-200 transition-colors"
              >
                {loading ? "Connecting..." : "Connect Wallet to Get Started"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-900 text-zinc-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">CC</span>
              </div>
              <span className="font-medium text-white">
                CommissionChain PH
              </span>
            </div>
            <p className="text-sm">
              Stellar Builder Program Level 4 Submission &middot; Built on
              Stellar Testnet
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
