import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Tapas Manna",
    role: "Project Manager",
    company: "ADS WEB SOLUTIONS",
    review:
      "Testiva reduced our manual testing workload by over 70%. The AI-generated test cases are surprisingly accurate.",
  },
  {
    name: "Ravi Roshan Kumar",
    role: "FoogFunction",
    company: "FoogFunction Pvt Ltd",
    review:
      "As a founder, I don't come from a software testing background. Testiva made it easy to validate our product quality without hiring a dedicated QA team, saving both time and operational costs.",
  },
  {
    name: "Anshu Priyam Pal",
    role: "Computer Science Student",
    company: "NIT Rourkela",
    review:
      "Testiva helped me understand software testing much better. Generating test cases became incredibly fast, allowing me to focus more on development and learning new concepts.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-24 bg-linear-to-b from-white to-violet-50/40" id = 'testimonial'>
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-14">
          <span className="inline-flex rounded-full border bg-violet-50 px-4 py-1 text-sm font-medium text-violet-700">
            Testimonials
          </span>

          <h2 className="mt-4 text-4xl font-bold tracking-tight">
            Loved by Engineering Teams
          </h2>

          <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
            Thousands of developers and QA engineers use Testiva to
            accelerate testing and improve release quality.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card
              key={testimonial.name}
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white"
            >
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, index) => (
                    <Star
                      key={index}
                      className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>

                <p className="text-muted-foreground leading-relaxed">
                  "{testimonial.review}"
                </p>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-linear-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {testimonial.name.charAt(0)}
                  </div>

                  <div>
                    <div className="font-semibold">
                      {testimonial.name}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>

                    <div className="text-xs text-violet-600 font-medium">
                      {testimonial.company}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}