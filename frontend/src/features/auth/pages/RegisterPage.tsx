import { Card, Text, View } from "reshaped";

import { Link, useNavigate } from "react-router-dom";

import { AppLogo } from "../../../shared/components/AppLogo/AppLogo";

import { RegisterForm } from "../components/RegisterForm";

import styles from "./AuthPage.module.css";

export function RegisterPage() {
  const navigate = useNavigate();

  function handleSuccess() {
    navigate("/login", {
      replace: true,
      state: {
        registered: true,
      },
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
                  Create your account
                </Text>

                <Text color="neutral-faded">
                  Create an account to start managing your projects.
                </Text>
              </View>
            </div>

            <RegisterForm onSuccess={handleSuccess} />

            <Text color="neutral-faded" variant="caption-1">
              We use your name and email only to run your account. See our{" "}
              <Link to="/privacy" className={styles.link}>
                Privacy policy
              </Link>
              .
            </Text>

            <div className={styles.footer}>
              <Text color="neutral-faded">
                Already have an account?{" "}
                <Link to="/login" className={styles.link}>
                  Sign in
                </Link>
              </Text>
            </div>
          </View>
        </Card>
      </div>
    </main>
  );
}
