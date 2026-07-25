"use client";

import { useState } from "react";
import { useWallet } from "@/hooks/wallet";
import { Card, CardHeader, CardContent, Button } from "@/components/ui";
import { useToast } from "@/hooks/toast";

const categories = [
  { value: "wallet_onboarding", label: "Wallet Onboarding" },
  { value: "referral_submission", label: "Referral Submission" },
  { value: "business_verification", label: "Business Verification" },
  { value: "commission_tracking", label: "Commission Tracking" },
  { value: "mobile_usability", label: "Mobile Usability" },
  { value: "general", label: "General" },
];

export default function FeedbackPage() {
  const { address } = useWallet();
  const { addToast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [category, setCategory] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      addToast("Please select a rating", "error");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          feedback: feedbackText,
          category,
          wallet_address: address,
        }),
      });

      if (!res.ok) throw new Error("Failed to submit feedback");

      setSubmitted(true);
      addToast("Thank you for your feedback!", "success");
    } catch (err) {
      addToast(
        err instanceof Error ? err.message : "Failed to submit feedback",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Feedback
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Help us improve CommissionChain PH
        </p>
      </div>

      {submitted ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
            Thank you!
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">
            Your feedback helps us build a better experience for Philippine
            sales agents and businesses.
          </p>
          <Button
            onClick={() => {
              setSubmitted(false);
              setRating(0);
              setFeedbackText("");
              setCategory("");
            }}
            variant="secondary"
            className="mt-6"
          >
            Submit Another
          </Button>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                  How would you rate your experience? *
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="text-3xl transition-transform hover:scale-110"
                    >
                      {star <= (hoveredRating || rating) ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Select a category</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Your Feedback
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us about your experience..."
                  rows={4}
                  className="w-full px-4 py-2.5 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
