import RegisterForm from "./RegisterForm";

export default async function AdminRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  return <RegisterForm invite={params.invite ?? null} />;
}
