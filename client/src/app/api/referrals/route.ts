import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get("wallet_address");

    const admin = createAdminClient();

    let query = admin
      .from("referrals")
      .select("*, campaigns(title, commission_amount, commission_asset, organizations(wallet_address, name)), users(wallet_address, full_name)")
      .order("created_at", { ascending: false });

    if (walletAddress) {
      // Get user ID from wallet address
      const { data: user } = await admin
        .from("users")
        .select("id")
        .eq("wallet_address", walletAddress)
        .single();

      if (user) {
        query = query.eq("agent_id", user.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Get referrals error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { campaign_id, referral_hash, notes, wallet_address } =
      await request.json();

    if (!campaign_id || !referral_hash) {
      return NextResponse.json(
        { error: "Campaign ID and referral hash are required" },
        { status: 400 }
      );
    }

    if (referral_hash.trim().length < 1 || referral_hash.trim().length > 256) {
      return NextResponse.json(
        { error: "Referral identifier must be between 1 and 256 characters" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get user
    const { data: user } = await admin
      .from("users")
      .select("id")
      .eq("wallet_address", wallet_address)
      .single();

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get campaign
    const { data: campaign } = await admin
      .from("campaigns")
      .select("id, status, max_referrals")
      .eq("id", campaign_id)
      .single();

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    if (campaign.status !== "active") {
      return NextResponse.json(
        { error: "Campaign is not active" },
        { status: 400 }
      );
    }

    // Hash the referral identifier
    const hashedRef = crypto
      .createHash("sha256")
      .update(referral_hash.trim().toLowerCase())
      .digest("hex");

    // Check for duplicate
    const { data: existing } = await admin
      .from("referrals")
      .select("id")
      .eq("campaign_id", campaign_id)
      .eq("referral_hash", hashedRef)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "This referral has already been submitted for this campaign" },
        { status: 409 }
      );
    }

    // Check referral count
    const { count } = await admin
      .from("referrals")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id);

    if (count && count >= campaign.max_referrals) {
      return NextResponse.json(
        { error: "Campaign has reached maximum referrals" },
        { status: 400 }
      );
    }

    const { data, error } = await admin
      .from("referrals")
      .insert({
        campaign_id,
        agent_id: user.id,
        referral_hash: hashedRef,
        status: "pending",
        notes: notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Create referral error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
