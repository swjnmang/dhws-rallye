import Link from "next/link";
import JoinForm from "./JoinForm";
import BrandMark from "@/components/BrandMark";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const initialCode = (params.code ?? "").toUpperCase();

  return (
    <main className="flex flex-1 flex-col md:flex-row">
      <section className="ol-north-dark flex flex-col justify-between gap-8 bg-ink px-8 py-8 text-white md:w-[40%] md:max-w-[500px] md:px-12 md:py-14">
        <BrandMark tone="dark" />
        <div className="hidden flex-col gap-5 md:flex">
          <h2 className="font-display text-6xl font-extrabold uppercase leading-[0.92]">
            Auf die Rätsel,
            <br />
            fertig, los!
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-slate-300">
            Findet die Rätsel auf dem Grundriss, löst sie und sammelt XP für eure Gruppe.
          </p>
        </div>
        <p className="hidden text-sm text-slate-400 md:block">
          Lehrkraft?{" "}
          <Link href="/admin/login" className="font-semibold text-white hover:underline">
            Zum Login
          </Link>
        </p>
      </section>

      <section className="flex flex-1 items-center justify-center px-6 py-10 md:px-12">
        <div className="flex w-full max-w-lg flex-col gap-7">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">
              Gruppe beitreten
            </h1>
            <p className="text-lg text-slate-600">
              Gib euren Rallye-Code ein und wählt einen Gruppennamen.
            </p>
          </div>
          <JoinForm initialCode={initialCode} />
        </div>
      </section>
    </main>
  );
}
