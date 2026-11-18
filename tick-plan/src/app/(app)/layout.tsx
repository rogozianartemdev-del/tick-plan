import { redirect } from "next/navigation";

import { getSession } from "@/src/lib/auth";
import Header from "@/src/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <>
      <Header name={session.user.name ?? ""} email={session.user.email ?? ""} />
      {children}
    </>
  );
}