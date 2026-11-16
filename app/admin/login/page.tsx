import type { Metadata } from "next";
import { LoginForm } from "@/app/admin/login/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Admin login</h1>
      {isSupabaseConfigured() ? (
        <LoginForm />
      ) : (
        <p>Supabase is not set up yet, so there is nothing to log in to. See the README.</p>
      )}
    </div>
  );
}
