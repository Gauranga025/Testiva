"use client";

import { UserButton } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";

export default function WorkspaceHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-violet-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-8">

        {/* Logo */}
        <Link
          href="/workspace"
          className="flex items-center gap-3"
        >
          <Image
            src="/TestivaLogo.png"
            alt="Testiva"
            width={42}
            height={42}
            className="object-contain"
          />

          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Testiva
            </h1>

            <p className="text-xs text-violet-600">
              AI Testing Platform
            </p>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50/50 p-1">
          <Link
            href="/workspace"
            className="rounded-full px-5 py-2 text-sm font-medium text-violet-700 bg-white shadow-sm"
          >
            Workspace
          </Link>

          <Link
            href="/pricing"
            className="rounded-full px-5 py-2 text-sm font-medium text-slate-600 transition hover:text-violet-700"
          >
            Pricing
          </Link>

          <Link
            href="/support"
            className="rounded-full px-5 py-2 text-sm font-medium text-slate-600 transition hover:text-violet-700"
          >
            Support
          </Link>
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-4">

          <div className="hidden md:flex items-center rounded-full border border-violet-200 bg-violet-50 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />

            <span className="ml-2 text-sm font-medium text-violet-700">
              Pro Plan
            </span>
          </div>

          <UserButton
            appearance={{
              elements: {
                avatarBox:
                  "h-10 w-10 ring-2 ring-violet-200",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}