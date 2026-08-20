import JoinForm from "./JoinForm";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const params = await searchParams;
  const initialCode = (params.code ?? "").toUpperCase();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Gruppe beitreten</h1>
        <p className="mt-2 text-slate-600">
          Gib euren Rallye-Code ein und wählt einen Gruppennamen.
        </p>
      </div>
      <JoinForm initialCode={initialCode} />
    </main>
  );
}
