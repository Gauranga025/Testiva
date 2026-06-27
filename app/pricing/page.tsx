import { Check, Sparkles, Rocket, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PricingPage() {
  const features = [
    "Unlimited Projects",
    "AI Test Case Generation",
    "GitHub Repository Integration",
    "Browser Automation",
    "Execution Reports",
    "Playwright Test Generation",
    "CI/CD Ready Workflows",
    "Priority Feature Updates",
  ];

  return (
    <main className="min-h-screen bg-linear-to-b from-white via-violet-50/40 to-white">

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute left-20 top-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
        <div className="absolute right-20 top-40 h-96 w-96 rounded-full bg-purple-300/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-24">

          <div className="text-center">

            <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-5 py-2 text-sm font-medium text-violet-700">
              <Sparkles className="h-4 w-4" />
              Early Access Program
            </div>

            <h1 className="mt-8 text-6xl font-bold tracking-tight text-slate-900">
              Pricing
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-xl text-slate-600">
              Testiva is currently available completely free while we
              build the future of AI-powered software testing.
            </p>

          </div>
        </div>
      </section>

      {/* Main Pricing Card */}
      <section className="pb-20">
        <div className="mx-auto max-w-5xl px-6">

          <div className="relative overflow-hidden rounded-4xl border bg-white shadow-[0_20px_80px_rgba(139,92,246,0.12)]">

            <div className="absolute right-0 top-0 h-60 w-60 rounded-full bg-violet-100 blur-3xl" />

            <div className="relative p-10 lg:p-14">

              <div className="flex flex-col items-center text-center">

                <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-700">
                  🎉 Currently Free For Everyone
                </div>

                <h2 className="mt-6 text-4xl font-bold">
                  Early Access Plan
                </h2>

                <div className="mt-6">
                  <span className="text-7xl font-bold">$0</span>
                  <span className="text-muted-foreground text-xl">
                    /month
                  </span>
                </div>

                <p className="mt-4 max-w-xl text-muted-foreground">
                  Get full access to Testiva's AI-powered testing
                  platform at no cost during our early access phase.
                </p>

                <Button
                  className="mt-8 h-12 px-8 bg-violet-600 hover:bg-violet-700"
                >
                  Start Testing Free
                </Button>
              </div>

              <div className="mt-12 grid gap-4 md:grid-cols-2">
                {features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-3 rounded-xl border border-violet-100 p-4"
                  >
                    <Check className="h-5 w-5 text-violet-600" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Future Plans */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6">

          <div className="text-center">
            <h2 className="text-4xl font-bold">
              Future Plans
            </h2>

            <p className="mt-4 text-muted-foreground">
              Premium plans will be introduced after the official launch.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">

            <div className="rounded-3xl border bg-white p-8 opacity-70">
              <Rocket className="h-10 w-10 text-violet-600" />

              <h3 className="mt-5 text-2xl font-bold">
                Starter
              </h3>

              <p className="mt-2 text-muted-foreground">
                Perfect for students and indie developers.
              </p>

              <div className="mt-6 text-sm font-medium text-violet-600">
                Coming Soon
              </div>
            </div>

            <div className="rounded-3xl border-2 border-violet-300 bg-white p-8 shadow-lg">
              <Sparkles className="h-10 w-10 text-violet-600" />

              <h3 className="mt-5 text-2xl font-bold">
                Professional
              </h3>

              <p className="mt-2 text-muted-foreground">
                Advanced AI testing for growing teams.
              </p>

              <div className="mt-6 text-sm font-medium text-violet-600">
                Coming Soon
              </div>
            </div>

            <div className="rounded-3xl border bg-white p-8 opacity-70">
              <Building2 className="h-10 w-10 text-violet-600" />

              <h3 className="mt-5 text-2xl font-bold">
                Enterprise
              </h3>

              <p className="mt-2 text-muted-foreground">
                Security, scale, and dedicated support.
              </p>

              <div className="mt-6 text-sm font-medium text-violet-600">
                Coming Soon
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Founder Note */}
      <section className="pb-24">
        <div className="mx-auto max-w-4xl px-6">

          <div className="rounded-3xl border bg-violet-50 p-10 text-center">

            <h2 className="text-3xl font-bold">
              Why Is Testiva Free?
            </h2>

            <p className="mt-5 text-lg leading-8 text-slate-600">
              We're focused on building the best AI-powered testing
              platform possible. During our early access phase, every
              feature is available for free while we gather feedback
              from developers, students, startups, and engineering teams.
            </p>

            <p className="mt-4 font-medium text-violet-700">
              Join early. Help shape the future of software testing.
            </p>

          </div>
        </div>
      </section>

    </main>
  );
}