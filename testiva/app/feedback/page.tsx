"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Lightbulb,
  Bug,
  MessageSquare,
} from "lucide-react";

export default function FeedbackPage() {
  const [type, setType] =
    useState("Feature Request");

  const [message, setMessage] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        type,
        message,
      }),
    });

    setMessage("");
    setLoading(false);

    alert(
      "Thank you! Your feedback has been sent."
    );
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-white via-violet-50/30 to-white">
      <div className="mx-auto max-w-3xl px-6 py-24">

        <div className="text-center">

          <h1 className="text-5xl font-bold">
            Help Shape Testiva
          </h1>

          <p className="mt-4 text-muted-foreground">
            Every piece of feedback is read personally.
          </p>

        </div>

        <div className="mt-12 rounded-3xl border bg-white p-8 shadow-lg">

          <div className="grid grid-cols-3 gap-4">

            <button
              onClick={() =>
                setType(
                  "Feature Request"
                )
              }
              className={`rounded-2xl border p-4 ${
                type ===
                "Feature Request"
                  ? "border-violet-500 bg-violet-50"
                  : ""
              }`}
            >
              <Lightbulb className="mx-auto h-6 w-6" />

              <p className="mt-2 text-sm">
                Feature
              </p>
            </button>

            <button
              onClick={() =>
                setType("Bug Report")
              }
              className={`rounded-2xl border p-4 ${
                type === "Bug Report"
                  ? "border-violet-500 bg-violet-50"
                  : ""
              }`}
            >
              <Bug className="mx-auto h-6 w-6" />

              <p className="mt-2 text-sm">
                Bug
              </p>
            </button>

            <button
              onClick={() =>
                setType(
                  "General Feedback"
                )
              }
              className={`rounded-2xl border p-4 ${
                type ===
                "General Feedback"
                  ? "border-violet-500 bg-violet-50"
                  : ""
              }`}
            >
              <MessageSquare className="mx-auto h-6 w-6" />

              <p className="mt-2 text-sm">
                General
              </p>
            </button>

          </div>

          <textarea
            value={message}
            onChange={(e) =>
              setMessage(
                e.target.value
              )
            }
            placeholder="Tell us your thoughts..."
            rows={6}
            className="mt-6 w-full rounded-2xl border p-4"
          />

          <Button
            onClick={handleSubmit}
            disabled={
              loading ||
              !message.trim()
            }
            className="mt-6 bg-violet-600 hover:bg-violet-700"
          >
            {loading
              ? "Sending..."
              : "Send Feedback"}
          </Button>

        </div>

      </div>
    </main>
  );
}