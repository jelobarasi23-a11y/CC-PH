"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  isWalletConnected,
  getWalletAddress,
  requestWalletAccess,
} from "@/lib/freighter";
import { supabase } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/analytics";

interface WalletContextType {
  address: string | null;
  connected: boolean;
  loading: boolean;
  user: UserProfile | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshUser: () => Promise<void>;
}

export interface UserProfile {
  id: string;
  wallet_address: string;
  full_name: string | null;
  role: string;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  loading: false,
  user: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  refreshUser: async () => {},
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  const fetchOrCreateUser = useCallback(async (walletAddr: string) => {
    const { data: existing } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddr)
      .single();

    if (existing) {
      setUser(existing);
      return existing;
    }

    const { data: newUser } = await supabase
      .from("users")
      .insert({ wallet_address: walletAddr, role: "agent" })
      .select()
      .single();

    if (newUser) {
      setUser(newUser);
      trackEvent("wallet_authentication_success", walletAddr);
    }
    return newUser;
  }, []);

  const connectWallet = useCallback(async () => {
    setLoading(true);
    try {
      const addr = await requestWalletAccess();
      if (addr) {
        setAddress(addr);
        setConnected(true);
        await fetchOrCreateUser(addr);
        trackEvent("wallet_connected", addr);
      }
    } catch (error) {
      trackEvent(
        "wallet_authentication_failed",
        undefined,
        { error: String(error) }
      );
    } finally {
      setLoading(false);
    }
  }, [fetchOrCreateUser]);

  const disconnectWallet = useCallback(() => {
    setAddress(null);
    setConnected(false);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (address) {
      await fetchOrCreateUser(address);
    }
  }, [address, fetchOrCreateUser]);

  // Check wallet connection on mount
  useEffect(() => {
    async function checkConnection() {
      const connected = await isWalletConnected();
      if (connected) {
        const addr = await getWalletAddress();
        if (addr) {
          setAddress(addr);
          setConnected(true);
          await fetchOrCreateUser(addr);
        }
      }
    }
    checkConnection();
  }, [fetchOrCreateUser]);

  return (
    <WalletContext.Provider
      value={{
        address,
        connected,
        loading,
        user,
        connectWallet,
        disconnectWallet,
        refreshUser,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
