import { Card, Text, View } from "reshaped";

import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppLogo } from "../../../shared/components/AppLogo/AppLogo";

import { LoginForm } from "../components/LoginForm";

import styles from "./AuthPage.module.css";

interface LoginLocationState {
  registered?: boolean;

  from?: {
    pathname?: string;
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = location.state as LoginLocationState | null;

  function handleSuccess() {
    const redirectTo = locationState?.from?.pathname ?? "/projects";

    navigate(redirectTo, {
      replace: true,
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Card padding={6} className={styles.card}>
          <View gap={6}>
            <div className={styles.header}>
              <AppLogo />

              <View gap={1}>
                <Text as="h1" variant="featured-3" weight="bold">
                  Welcome back
                </Text>

                <Text color="neutral-faded">
                  Sign in to continue to your workspace.
                </Text>
              </View>
            </div>

            {locationState?.registered && (
              <div className={styles.successMessage}>
                Your account has been created. You can now sign in.
              </div>
            )}

            <LoginForm onSuccess={handleSuccess} />

            <div className={styles.footer}>
              <Text color="neutral-faded">
                Don't have an account?{" "}
                <Link to="/register" className={styles.link}>
                  Create an account
                </Link>
              </Text>
            </div>
          </View>
        </Card>
      </div>
    </main>
  );
}
