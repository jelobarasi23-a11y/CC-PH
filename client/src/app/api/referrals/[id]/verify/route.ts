import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { wallet_address } = await request.json();

    if (!wallet_address) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get referral with campaign info
    const { data: referral } = await admin
      .from("referrals")
      .select("*, campaigns(organization_id, organizations(wallet_address))")
      .eq("id", id)
      .single();

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Verify business authorization
    const orgWallet =
      referral.campaigns?.organizations?.wallet_address;
    if (orgWallet !== wallet_address) {
      return NextResponse.json(
        { error: "Only the campaign business can verify referrals" },
        { status: 403 }
      );
    }

    if (referral.status !== "pending") {
      return NextResponse.json(
        { error: "Referral cannot be verified in its current state" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("referrals")
      .update({
        status: "verified",
        verified_at: new Date().toISOString(),
        verified_by: wallet_address,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Verify referral error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
