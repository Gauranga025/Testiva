export default function Stats() {
  const stats = [
    ["100+", "Tests Generated"],
    ["3+", "Teams"],
    ["90%", "Reliability"],
    ["50%", "Faster Releases"],
  ];

  return (
    <section className="py-20" id="stats">
      <div className="max-w-5xl mx-auto px-6">

        <div className="grid md:grid-cols-4 gap-8 text-center">
          {stats.map(([value, label]) => (
            <div key={label}>
              <div className="text-4xl font-bold">
                {value}
              </div>

              <div className="text-muted-foreground mt-2">
                {label}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}