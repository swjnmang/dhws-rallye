import LoginForm from "./LoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const params = await searchParams;
  return <LoginForm invite={params.invite ?? null} />;
}
