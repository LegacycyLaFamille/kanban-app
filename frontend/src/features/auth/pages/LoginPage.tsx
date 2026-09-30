import { type FormEvent, useState } from "react";

import { Button, Card, FormControl, Text, TextField, View } from "reshaped";

import { Link, useLocation, useNavigate } from "react-router-dom";

import { AppLogo } from "../../../shared/components/AppLogo/AppLogo";

import { useLogin } from "../hooks/useLogin";

import type { AuthFieldErrors, LoginPayload } from "../types/auth.types";

import { hasAuthErrors, validateLogin } from "../validation/auth.validation";

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

  const { submit, isSubmitting, error: requestError } = useLogin();

  const locationState = location.state as LoginLocationState | null;

  const [values, setValues] = useState<LoginPayload>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<AuthFieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateLogin(values);

    setErrors(validationErrors);

    if (hasAuthErrors(validationErrors)) {
      return;
    }

    const success = await submit({
      email: values.email.trim(),
      password: values.password,
    });

    if (!success) {
      return;
    }

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
                <Text variant="featured-3" weight="bold">
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

            {requestError && (
              <div className={styles.errorMessage} role="alert">
                {requestError}
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <FormControl hasError={Boolean(errors.email)}>
                <FormControl.Label>Email</FormControl.Label>

                <TextField
                  name="email"
                  value={values.email}
                  placeholder="you@example.com"
                  inputAttributes={{
                    type: "email",
                    autoComplete: "email",
                  }}
                  onChange={({ value }) => {
                    setValues((current) => ({
                      ...current,
                      email: value,
                    }));

                    setErrors((current) => ({
                      ...current,
                      email: undefined,
                    }));
                  }}
                />

                {errors.email && (
                  <FormControl.Error>{errors.email}</FormControl.Error>
                )}
              </FormControl>

              <FormControl hasError={Boolean(errors.password)}>
                <FormControl.Label>Password</FormControl.Label>

                <TextField
                  name="password"
                  value={values.password}
                  placeholder="Enter your password"
                  inputAttributes={{
                    type: "password",
                    autoComplete: "current-password",
                  }}
                  onChange={({ value }) => {
                    setValues((current) => ({
                      ...current,
                      password: value,
                    }));

                    setErrors((current) => ({
                      ...current,
                      password: undefined,
                    }));
                  }}
                />

                {errors.password && (
                  <FormControl.Error>{errors.password}</FormControl.Error>
                )}
              </FormControl>

              <Button
                color="primary"
                fullWidth
                loading={isSubmitting}
                loadingAriaLabel="Signing in"
                onClick={() => {}}
                attributes={{
                  type: "submit",
                }}
              >
                Sign in
              </Button>
            </form>

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
