import { Zap, BrainCircuit, ShieldCheck } from "lucide-react";

export default function WhyTestiva() {
  const benefits = [
    {
      icon: Zap,
      title: "10x Faster Testing",
      description:
        "Generate comprehensive test cases in seconds instead of spending hours manually writing them.",
    },
    {
      icon: BrainCircuit,
      title: "AI-Powered Intelligence",
      description:
        "Transform requirements and user stories into actionable test scenarios automatically.",
    },
    {
      icon: ShieldCheck,
      title: "Higher Quality Releases",
      description:
        "Catch bugs earlier and improve release confidence with intelligent test coverage.",
    },
  ];

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold text-center mb-12">
          Why Teams Choose Testiva
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;

            return (
              <div
                key={benefit.title}
                className="bg-white rounded-3xl p-8 border"
              >
                <Icon className="h-10 w-10 text-violet-600 mb-4" />

                <h3 className="font-semibold text-lg">
                  {benefit.title}
                </h3>

                <p className="text-muted-foreground mt-3">
                  {benefit.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}