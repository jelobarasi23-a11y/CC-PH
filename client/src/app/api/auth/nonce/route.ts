import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { wallet_address } = await request.json();

    if (!wallet_address || typeof wallet_address !== "string") {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Generate nonce
    const nonce = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Upsert user with nonce
    const { data: user } = await admin
      .from("users")
      .select("id")
      .eq("wallet_address", wallet_address)
      .single();

    if (user) {
      await admin
        .from("users")
        .update({ nonce, nonce_expires_at: expiresAt })
        .eq("id", user.id);
    } else {
      await admin.from("users").insert({
        wallet_address,
        nonce,
        nonce_expires_at: expiresAt,
        role: "agent",
      });
    }

    const message = `Sign this message to authenticate with CommissionChain PH.\n\nNonce: ${nonce}\nWallet: ${wallet_address}\nTimestamp: ${new Date().toISOString()}`;

    return NextResponse.json({ message, nonce });
  } catch (error) {
    console.error("Nonce generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
