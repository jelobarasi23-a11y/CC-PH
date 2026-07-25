import * as StellarSdk from "@stellar/stellar-sdk";

const RPC_URL =
  process.env.NEXT_PUBLIC_STELLAR_RPC_URL ||
  "https://soroban-testnet.stellar.org";
const HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
  "https://horizon-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
  "Test SDF Network ; September 2015";

export const rpcServer = new StellarSdk.rpc.Server(RPC_URL);
export const horizonServer = new StellarSdk.Horizon.Server(HORIZON_URL);

export { NETWORK_PASSPHRASE };

export async function getAccountBalance(
  address: string,
  assetCode: string,
  issuer: string
): Promise<string> {
  try {
    const account = await horizonServer.loadAccount(address);
    const balance = account.balances.find(
      (b) =>
        b.asset_type !== "native" &&
        "asset_code" in b &&
        b.asset_code === assetCode &&
        "asset_issuer" in b &&
        b.asset_issuer === issuer
    );
    return balance ? balance.balance : "0";
  } catch {
    return "0";
  }
}

export async function getTransactionDetails(hash: string) {
  try {
    const response = await horizonServer
      .transactions()
      .transaction(hash)
      .call();
    return response;
  } catch {
    return null;
  }
}
