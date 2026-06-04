import { Heart, MessageSquare, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-linear-to-b from-white via-violet-50/30 to-white">

      <section className="relative overflow-hidden">
        <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute right-20 top-40 h-96 w-96 rounded-full bg-purple-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-6 py-24">

          <div className="text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-5 py-2 text-sm font-medium text-violet-700">
              <Heart className="h-4 w-4" />
              Support Testiva
            </div>

            <h1 className="mt-8 text-6xl font-bold tracking-tight">
              Help Us Build Something Great
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600">
              Testiva is being built with a simple mission:
              making software testing faster, smarter, and more
              accessible through AI.
            </p>
          </div>

          <div className="mt-16 rounded-4xl border bg-white p-10 shadow-xl">

            <h2 className="text-3xl font-bold text-center">
              A Note From The Founder
            </h2>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Every feature, every workflow, and every improvement in
              Testiva comes from listening to real users.
            </p>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              We're still in the early stages of our journey, and
              your support means everything. Whether you're a student,
              developer, startup founder, or QA engineer, your feedback
              helps shape the future of the platform.
            </p>

            <p className="mt-4 text-lg leading-8 text-slate-600">
              If Testiva has helped you save time, improve testing, or
              simply made your workflow easier, consider sharing it with
              others or sending us your thoughts.
            </p>

            <p className="mt-6 font-medium text-violet-700">
              Thank you for being part of this journey ❤️
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">

            <div className="rounded-3xl border bg-white p-8">
              <Sparkles className="h-10 w-10 text-violet-600" />

              <h3 className="mt-4 text-xl font-bold">
                Share Feedback
              </h3>

              <p className="mt-3 text-muted-foreground">
                Found a bug? Have a feature request?
                We'd love to hear from you.
              </p>

              <Button className="mt-6 bg-violet-600 hover:bg-violet-700">
                Send Feedback
              </Button>
            </div>

            <div className="rounded-3xl border bg-white p-8">
              <MessageSquare className="h-10 w-10 text-violet-600" />

              <h3 className="mt-4 text-xl font-bold">
                Contact Us
              </h3>

              <p className="mt-3 text-muted-foreground">
                Need help or have questions?
                Reach out directly and we'll get back to you.
              </p>

              <Button
                variant="outline"
                className="mt-6"
              >
                Contact Support
              </Button>
            </div>

          </div>

          <div className="mt-16 text-center text-sm text-muted-foreground">
            Built with passion for developers, testers, and innovators.
          </div>

        </div>
      </section>

    </main>
  );
}

