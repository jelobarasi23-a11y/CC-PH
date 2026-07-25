import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { wallet_address, reason } = await request.json();

    if (!wallet_address || !reason) {
      return NextResponse.json(
        { error: "Wallet address and reason are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: referral } = await admin
      .from("referrals")
      .select("status, paid, disputed")
      .eq("id", id)
      .single();

    if (!referral) {
      return NextResponse.json(
        { error: "Referral not found" },
        { status: 404 }
      );
    }

    if (referral.paid) {
      return NextResponse.json(
        { error: "Cannot dispute a paid referral" },
        { status: 400 }
      );
    }

    if (referral.disputed) {
      return NextResponse.json(
        { error: "Referral is already disputed" },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("referrals")
      .update({
        disputed: true,
        dispute_reason: reason.trim(),
        status: "disputed",
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Dispute referral error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
