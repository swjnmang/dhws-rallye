import Link from "next/link";

export default function ImpressumPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-6 py-16">
      <Link href="/" className="self-start text-sm font-medium text-slate-500 hover:text-slate-900">
        ← Zurück
      </Link>
      <h1 className="text-2xl font-bold">Impressum</h1>

      <div className="flex flex-col gap-6 text-slate-700">
        <section>
          <h2 className="font-semibold text-slate-900">Angaben gemäß § 5 TMG</h2>
          <p className="mt-1">
            Jonathan Mangold
            <br />
            c/o Schenkenstraße 10
            <br />
            74544 Michelbach, Deutschland
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Vertreten durch</h2>
          <p className="mt-1">Jonathan Mangold</p>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">Kontakt</h2>
          <p className="mt-1">E-Mail: info@wss-digital.de</p>
        </section>

        <section>
          <h2 className="font-semibold text-slate-900">
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
          </h2>
          <p className="mt-1">Jonathan Mangold (Anschrift wie oben)</p>
        </section>
      </div>
    </main>
  );
}
