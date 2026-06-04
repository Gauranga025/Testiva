import {
  BrainCircuit,
  Github,
  Bot,
  BarChart3,
  Workflow,
  ShieldCheck,
} from "lucide-react";

import { Card } from "@/components/ui/card";

const features = [
  {
    title: "AI Test Generation",
    icon: BrainCircuit,
  },
  {
    title: "Browser Automation",
    icon: Bot,
  },
  {
    title: "GitHub Integration",
    icon: Github,
  },
  {
    title: "Reporting",
    icon: BarChart3,
  },
  {
    title: "Workflow Ready",
    icon: Workflow,
  },
  {
    title: "Assertions Engine",
    icon: ShieldCheck,
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="py-24"
    >
      <div className="max-w-7xl mx-auto px-6">

        <h2 className="text-4xl font-bold mb-12">
          Features
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <Card
                key={feature.title}
                className="p-6 hover:shadow-lg transition"
              >
                <Icon className="h-10 w-10 text-violet-600 mb-4" />

                <h3 className="font-semibold">
                  {feature.title}
                </h3>

                <p className="text-sm text-muted-foreground mt-2">
                  Intelligent automation built for modern engineering teams.
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}