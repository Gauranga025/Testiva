"use client";
import Image from "next/image";
import Link from "next/link";

import {
    SignedIn,
    SignedOut,
    UserButton,
} from "@clerk/nextjs";

import { Button } from "@/components/ui/button";

export default function Header() {
    return (
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">

                <Link
                    href="/"
                    className="flex items-center gap-2"
                >
                    <Image
                        src="/TestivaLogo.png"
                        alt="Testiva Logo"
                        width={40}
                        height={40}
                        className="object-contain"
                        priority
                    />

                    <span className="font-bold text-xl">
                        Testiva
                    </span>
                </Link>

                <nav className="hidden md:flex gap-8 text-sm">
                    <a href="#features">Features</a>
                    <a href="#how-it-works">How it Works</a>
                    <a href="#stats">Stats</a>
                    <a href="#testimonial">Testimonials</a>
                </nav>

                <div className="flex items-center gap-3">
                    <SignedOut>
                        <Button
                            variant="outline"
                            asChild
                        >
                            <Link href="/sign-in">
                                Sign In
                            </Link>
                        </Button>

                        <Button
                            asChild
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            <Link href="/sign-up">
                                Get Started
                            </Link>
                        </Button>
                    </SignedOut>

                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                </div>
            </div>
        </header>
    );
}