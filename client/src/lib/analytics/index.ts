import { supabase } from "@/lib/supabase/client";

type EventName =
  | "wallet_connected"
  | "wallet_authentication_success"
  | "wallet_authentication_failed"
  | "campaign_created"
  | "campaign_funded"
  | "referral_submitted"
  | "referral_verified"
  | "dispute_opened"
  | "dispute_resolved"
  | "commission_paid"
  | "commission_claim_failed"
  | "transaction_failed"
  | "feedback_submitted"
  | "page_viewed";

export async function trackEvent(
  eventName: EventName,
  walletAddress?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await supabase.from("analytics_events").insert({
      event_name: eventName,
      wallet_address: walletAddress || null,
      metadata: metadata || null,
    });
  } catch {
    // Analytics should not break the app
  }
}
