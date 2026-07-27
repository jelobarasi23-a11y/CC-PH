import { Client as ContractClient, networks } from "contract";
import * as freighter from "@stellar/freighter-api";
import { rpc } from "@stellar/stellar-sdk";

const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
  "Test SDF Network ; September 2015";
const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  networks.testnet.contractId;

export const sorobanRpc = new rpc.Server(RPC_URL);

/**
 * Get a Freighter-compatible signTransaction function.
 */
function getFreighterSigner(): (xdr: string, opts?: { networkPassphrase?: string; address?: string; submit?: boolean; submitUrl?: string }) => Promise<{ signedTxXdr: string; signerAddress?: string }> {
  return (xdr: string, opts?: { networkPassphrase?: string; address?: string }) =>
    freighter.signTransaction(xdr, {
      networkPassphrase: opts?.networkPassphrase || NETWORK_PASSPHRASE,
    }) as Promise<{ signedTxXdr: string; signerAddress?: string }>;
}

/**
 * Initialize the Soroban contract client with Freighter for wallet signing.
 * @param publicKey - The user's Stellar public key (from Freighter)
 */
export function getSorobanClient(publicKey: string): ContractClient {
  return new ContractClient({
    rpcUrl: RPC_URL,
    contractId: CONTRACT_ADDRESS,
    networkPassphrase: NETWORK_PASSPHRASE,
    publicKey,
    signTransaction: getFreighterSigner(),
  });
}

/**
 * Initialize a read-only Soroban contract client (no signing needed).
 */
export function getSorobanReadOnlyClient(): ContractClient {
  return new ContractClient({
    rpcUrl: RPC_URL,
    contractId: CONTRACT_ADDRESS,
    networkPassphrase: NETWORK_PASSPHRASE,
  });
}

export { CONTRACT_ADDRESS, NETWORK_PASSPHRASE, RPC_URL };
