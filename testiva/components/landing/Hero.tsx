import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-linear-to-br from-violet-50 via-white to-purple-50">
      
      {/* Background blobs */}
      <div className="absolute top-20 left-20 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl" />
      <div className="absolute bottom-20 right-20 h-96 w-96 rounded-full bg-purple-400/20 blur-3xl" />

      <div className="mx-auto max-w-7xl px-6 py-10 lg:py-10">
        <div className="grid items-center gap-16 lg:grid-cols-2">

          {/* Left */}
          <div className="max-w-xl">
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-slate-900 lg:text-7xl">
              AI-Powered Testing
              <br />
              for Modern Teams
            </h1>

            <p className="mt-6 text-lg leading-8 text-slate-600">
              Generate, manage and execute intelligent test cases
              in minutes. Let AI handle quality assurance while
              your team focuses on building great products.
            </p>

            <div className="mt-10 flex gap-4">
              <Button
                size="lg"
                className="bg-violet-600 hover:bg-violet-700 shadow-lg"
              >
                <Link href="/workspace">
                Get Started
                </Link>
              </Button>

              <Button
                size="lg"
                variant="outline"
              >
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Right */}
          <div className="relative">

            {/* Glow */}
            <div className="absolute inset-0 bg-violet-400/20 blur-3xl" />

            {/* Floating Ball */}
            <div className="absolute -left-10 top-1/2 h-16 w-16 rounded-full bg-linear-to-br from-violet-400 to-purple-600 shadow-2xl" />

            <div className="absolute right-0 top-10 h-24 w-24 rounded-full bg-linear-to-br from-violet-400 to-purple-600 shadow-2xl" />

            <div className="relative rounded-4xl border bg-white p-4 shadow-[0_25px_80px_rgba(139,92,246,0.15)]">
              <Image
                src="/DashboardPreview.png"
                alt="Dashboard Preview"
                width={800}
                height={600}
                className="rounded-2xl"
                priority
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}