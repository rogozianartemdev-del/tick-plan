import LoginForm from "@/src/components/LoginForm";
import { getSession } from "@/src/lib/auth";
import { redirect } from "next/navigation";


export default async function LoginPage() {
  if (await getSession()) redirect("/");
  return <LoginForm />;
}