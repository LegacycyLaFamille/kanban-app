import { AuthLayout } from "../../../app/layouts/AuthLayout.tsx";
import { LoginForm } from "../../../shared/components/LoginForm.tsx";

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
