"use client";

import Link from "next/link";
import { useWallet } from "@/hooks/wallet";
import { useState } from "react";

export default function Navbar() {
  const { address, connected, loading, user, connectWallet, disconnectWallet } =
    useWallet();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CC</span>
              </div>
              <span className="font-bold text-lg hidden sm:block">
                CommissionChain PH
              </span>
            </Link>

            {connected && (
              <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                <Link
                  href="/dashboard"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/campaigns"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Campaigns
                </Link>
                <Link
                  href="/referrals"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Referrals
                </Link>
                <Link
                  href="/commissions"
                  className="text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  Commissions
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {connected && address ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-xs font-mono">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  {address.slice(0, 6)}...{address.slice(-4)}
                </div>
                {user?.role && (
                  <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium capitalize">
                    {user.role}
                  </span>
                )}
                <button
                  onClick={disconnectWallet}
                  className="text-xs text-zinc-500 hover:text-red-600 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? "Connecting..." : "Connect Freighter"}
              </button>
            )}

            {/* Mobile menu toggle */}
            {connected && (
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-zinc-600 dark:text-zinc-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && connected && (
          <div className="md:hidden pb-4 space-y-2">
            <Link
              href="/dashboard"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Dashboard
            </Link>
            <Link
              href="/campaigns"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Campaigns
            </Link>
            <Link
              href="/referrals"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Referrals
            </Link>
            <Link
              href="/commissions"
              onClick={() => setMenuOpen(false)}
              className="block px-3 py-2 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Commissions
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
