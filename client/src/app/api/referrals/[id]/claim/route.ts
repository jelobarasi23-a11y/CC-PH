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

    // Get referral with all context
    const { data: referral } = await admin
      .from("referrals")
      .select("*, campaigns(commission_amount, commission_asset, status, escrow_amount), users!agent_id(wallet_address)")
      .eq("id", id)
      .single();

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    // Verify the caller is the agent who owns the referral
    const agentWallet = referral.users?.wallet_address;
    if (agentWallet !== wallet_address) {
      return NextResponse.json(
        { error: "Only the referral owner can claim the commission" },
        { status: 403 }
      );
    }

    // Validate all conditions
    if (referral.status !== "verified") {
      return NextResponse.json(
        { error: "Referral must be verified before claiming" },
        { status: 400 }
      );
    }

    if (referral.paid) {
      return NextResponse.json(
        { error: "Commission has already been paid" },
        { status: 400 }
      );
    }

    if (referral.disputed) {
      return NextResponse.json(
        { error: "Cannot claim a disputed referral" },
        { status: 400 }
      );
    }

    if (referral.campaigns?.status !== "active") {
      return NextResponse.json(
        { error: "Campaign is not active" },
        { status: 400 }
      );
    }

    const campaign = referral.campaigns;
    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    const escrowAmount = campaign.escrow_amount || 0;
    const commissionAmount = campaign.commission_amount;

    if (escrowAmount < commissionAmount) {
      return NextResponse.json(
        { error: "Insufficient escrow balance for commission payout" },
        { status: 400 }
      );
    }

    // Mark as paid in database
    const { error: updateError } = await admin
      .from("referrals")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        status: "paid",
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Reduce escrow
    await admin
      .from("campaigns")
      .update({ escrow_amount: escrowAmount - commissionAmount })
      .eq("id", campaign.id);

    // Record transaction
    const { data: txData } = await admin
      .from("transactions")
      .insert({
        wallet_address: agentWallet,
        transaction_type: "commission_payout",
        amount: commissionAmount,
        asset_code: campaign.commission_asset || "USDC",
        status: "pending",
        campaign_id: campaign.id,
        referral_id: id,
      })
      .select()
      .single();

    return NextResponse.json({
      success: true,
      message: "Commission claim recorded. Complete the Stellar transaction via Freighter to receive payment.",
      amount: commissionAmount,
      asset: campaign.commission_asset,
      transaction_id: txData?.id,
    });
  } catch (error) {
    console.error("Claim commission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
