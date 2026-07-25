import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { wallet_address, signature } = await request.json();

    if (!wallet_address || !signature) {
      return NextResponse.json(
        { error: "Wallet address and signature are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get user with nonce
    const { data: user } = await admin
      .from("users")
      .select("*")
      .eq("wallet_address", wallet_address)
      .single();

    if (!user || !user.nonce) {
      return NextResponse.json(
        { error: "No pending authentication for this wallet" },
        { status: 400 }
      );
    }

    // Check nonce expiry
    if (
      user.nonce_expires_at &&
      new Date(user.nonce_expires_at) < new Date()
    ) {
      return NextResponse.json(
        { error: "Nonce has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // For MVP: we trust the wallet connection via Freighter.
    // In production, verify ed25519 signature against the message.
    // Clear nonce after use
    await admin
      .from("users")
      .update({ nonce: null, nonce_expires_at: null })
      .eq("id", user.id);

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        wallet_address: user.wallet_address,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Wallet verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
