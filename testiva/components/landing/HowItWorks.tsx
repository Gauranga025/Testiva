import {
  Link2,
  FileText,
  BarChart3,
} from "lucide-react";

const steps = [
  {
    title: "Connect Repository",
    icon: Link2,
  },
  {
    title: "Generate Test Cases",
    icon: FileText,
  },
  {
    title: "Run & Analyze",
    icon: BarChart3,
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-24"
    >
      <div className="max-w-6xl mx-auto px-6">

        <h2 className="text-center text-4xl font-bold mb-16">
          How It Works
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="text-center"
              >
                <div className="mx-auto h-16 w-16 rounded-2xl bg-violet-100 flex items-center justify-center">
                  <Icon className="h-8 w-8 text-violet-600" />
                </div>

                <h3 className="mt-5 font-semibold">
                  {step.title}
                </h3>

                <p className="text-sm text-muted-foreground mt-2">
                  Automated workflow powered by AI.
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}