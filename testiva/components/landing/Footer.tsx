export default function Footer() {
  return (
    <footer className="border-t py-10">
      <div className="mx-auto max-w-7xl px-6">

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">

          <div>
            <h3 className="font-bold">
              Testiva
            </h3>
          </div>

          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#">Docs</a>
            <a href="#">Blog</a>
            <a href="#">Contact</a>
          </div>

        </div>

      </div>
    </footer>
  );
}