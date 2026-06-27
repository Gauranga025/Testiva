import { SignIn } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">

      {/* LEFT SIDE */}
      <section className="flex justify-center px-8 pt-8 pb-4">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <Image
              src="/TestivaLogo.png"
              alt="Testiva"
              width={48}
              height={48}
              priority
            />

            <h1 className="text-5xl font-extrabold tracking-tight">
              Testiva
            </h1>
          </div>

          {/* Badge */}
          <div className="flex justify-center">
            <div className="rounded-full bg-violet-100 px-4 py-1 text-sm font-medium text-violet-700">
              Test Smarter
            </div>
          </div>

          {/* Heading */}
          <div className="mt-5 text-center">
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
              Welcome to Testiva
            </h2>

            <p className="mt-3 text-lg text-slate-600">
              AI-powered testing built for modern developers.
            </p>
          </div>

          {/* Clerk SignIn */}
          <div className="mt-6 flex justify-center">
            <SignIn
              appearance={{
                elements: {
                  rootBox: "w-full",

                  card: `
                    w-full
                    rounded-3xl
                    border
                    border-slate-200
                    shadow-xl
                    scale-[0.95]
                  `,

                  header: "hidden",
                  footer: "hidden",

                  formButtonPrimary:
                    "bg-violet-600 hover:bg-violet-700",

                  socialButtonsBlockButton:
                    "rounded-xl",

                  formFieldInput:
                    "rounded-xl",

                  dividerLine:
                    "bg-slate-200",
                },
              }}
            />
          </div>
        </div>
      </section>

      {/* RIGHT SIDE */}
      {/* RIGHT SIDE */}
<section className="hidden lg:flex items-center justify-center bg-white">
  <Image
    src="/signin.png"
    alt="Testiva Illustration"
    width={1200}
    height={1200}
    className="w-full h-full object-contain"
    priority
  />
</section>
    </main>
  );
}