"use client";

import { WalletProvider } from "@/hooks/wallet";
import { ToastProvider } from "@/hooks/toast";
import Navbar from "@/components/Navbar";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider>
      <ToastProvider>
        <Navbar />
        <main className="flex-1">{children}</main>
      </ToastProvider>
    </WalletProvider>
  );
}
