import * as freighter from "@stellar/freighter-api";

export async function isWalletConnected(): Promise<boolean> {
  try {
    const { isConnected } = await freighter.isConnected();
    return isConnected;
  } catch {
    return false;
  }
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const { address } = await freighter.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

export async function requestWalletAccess(): Promise<string | null> {
  try {
    await freighter.requestAccess();
    const { address } = await freighter.getAddress();
    return address || null;
  } catch {
    return null;
  }
}

export async function signAndSendTransaction(
  signedXdr: string
): Promise<{ hash: string; result: string }> {
  const networkPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
    "Test SDF Network ; September 2015";

  try {
    const result = await freighter.signTransaction(signedXdr, {
      networkPassphrase,
    });
    return { hash: "", result: result.signedTxXdr };
  } catch (error) {
    throw new Error(
      `Transaction signing failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function signTransactionWithFreighter(
  xdr: string
): Promise<string> {
  const networkPassphrase =
    process.env.NEXT_PUBLIC_STELLAR_NETWORK ||
    "Test SDF Network ; September 2015";

  const result = await freighter.signTransaction(xdr, {
    networkPassphrase,
  });

  return result.signedTxXdr;
}
