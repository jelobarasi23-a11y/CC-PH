import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { rating, feedback, category, wallet_address } =
      await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get user
    let userId = null;
    if (wallet_address) {
      const { data: user } = await admin
        .from("users")
        .select("id")
        .eq("wallet_address", wallet_address)
        .single();
      userId = user?.id || null;
    }

    const { error } = await admin.from("feedback").insert({
      user_id: userId,
      rating: parseInt(rating),
      feedback: feedback?.trim() || null,
      category: category || null,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Submit feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("feedback")
      .select("id, rating, feedback, category, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Get feedback error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
