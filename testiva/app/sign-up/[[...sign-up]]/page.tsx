import { SignIn, SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function SignInPage() {
  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white overflow-hidden">

      {/* LEFT SIDE */}
      <section className="flex justify-center px-8 pt-8 pb-4">
        <div className="w-full max-w-md">


          {/* Clerk SignIn */}
          <div className="mt-6 flex justify-center">
            <SignUp
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