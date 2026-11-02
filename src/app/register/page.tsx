import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Register your college</h1>
      <p className="mb-8 text-slate-600">
        Creates a new isolated tenant with an admin account.
      </p>
      <Suspense>
        <RegisterForm />
      </Suspense>
    </main>
  );
}
