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

    const { data: campaign } = await admin
      .from("campaigns")
      .select("*, organizations(wallet_address)")
      .eq("id", id)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const orgWallet = campaign.organizations?.wallet_address;
    if (orgWallet !== wallet_address) {
      return NextResponse.json(
        { error: "Not authorized to fund this campaign" },
        { status: 403 }
      );
    }

    const escrowAmount =
      campaign.commission_amount * campaign.max_referrals;

    // Update campaign status to active
    const { error } = await admin
      .from("campaigns")
      .update({
        status: "active",
        escrow_amount: escrowAmount,
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record the funding transaction
    await admin.from("transactions").insert({
      wallet_address,
      transaction_type: "escrow_fund",
      amount: escrowAmount,
      asset_code: campaign.commission_asset || "USDC",
      status: "pending",
      campaign_id: id,
    });

    return NextResponse.json({
      success: true,
      escrow_amount: escrowAmount,
      message: "Campaign funded. The blockchain transaction must be completed via Freighter.",
    });
  } catch (error) {
    console.error("Fund campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
