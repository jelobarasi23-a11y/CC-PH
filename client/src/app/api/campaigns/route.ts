import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("campaigns")
      .select("*, organizations(name, wallet_address)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Get campaigns error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const {
      title,
      description,
      commission_amount,
      max_referrals,
      organization_id,
      wallet_address,
    } = await request.json();

    // Validate
    if (!title || title.trim().length < 3) {
      return NextResponse.json(
        { error: "Title must be at least 3 characters" },
        { status: 400 }
      );
    }
    if (!commission_amount || commission_amount <= 0) {
      return NextResponse.json(
        { error: "Commission amount must be positive" },
        { status: 400 }
      );
    }
    if (!max_referrals || max_referrals <= 0) {
      return NextResponse.json(
        { error: "Max referrals must be positive" },
        { status: 400 }
      );
    }
    if (!organization_id) {
      return NextResponse.json(
        { error: "Organization is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify wallet owns the organization
    const { data: org } = await admin
      .from("organizations")
      .select("id, wallet_address")
      .eq("id", organization_id)
      .single();

    if (!org || org.wallet_address !== wallet_address) {
      return NextResponse.json(
        { error: "Not authorized to create campaigns for this organization" },
        { status: 403 }
      );
    }

    const { data, error } = await admin
      .from("campaigns")
      .insert({
        title: title.trim(),
        description: description?.trim() || null,
        commission_amount: parseFloat(commission_amount),
        commission_asset: "USDC",
        max_referrals: parseInt(max_referrals),
        organization_id,
        status: "draft",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Create campaign error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
