import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { wallet_address, in_favor_of_agent } = await request.json();

    if (!wallet_address || typeof in_favor_of_agent !== "boolean") {
      return NextResponse.json(
        { error: "Wallet address and resolution decision are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check user is admin
    const { data: user } = await admin
      .from("users")
      .select("role")
      .eq("wallet_address", wallet_address)
      .single();

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can resolve disputes" },
        { status: 403 }
      );
    }

    const { data: referral } = await admin
      .from("referrals")
      .select("disputed")
      .eq("id", id)
      .single();

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    if (!referral.disputed) {
      return NextResponse.json(
        { error: "No active dispute on this referral" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {
      disputed: false,
      dispute_resolved_at: new Date().toISOString(),
      dispute_resolved_by: wallet_address,
    };

    if (in_favor_of_agent) {
      updateData.status = "verified";
      updateData.verified_at = updateData.verified_at || new Date().toISOString();
    } else {
      updateData.status = "rejected";
    }

    const { error } = await admin
      .from("referrals")
      .update(updateData)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, resolved_in_favor: in_favor_of_agent });
  } catch (error) {
    console.error("Resolve dispute error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
