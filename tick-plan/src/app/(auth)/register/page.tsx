import { redirect } from "next/navigation";

import { getSession } from "@/src/lib/auth";
import RegisterForm from "@/src/components/RegisterForm";

export default async function RegisterPage() {
  if (await getSession()) redirect("/");
  return <RegisterForm />;
}