import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-3xl font-bold text-slate-900">Sign in to CampusConnect</h1>
      <p className="mb-8 text-slate-600">
        Use your college slug unless you are a platform super admin.
      </p>
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
