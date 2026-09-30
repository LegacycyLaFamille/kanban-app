import { type FormEvent, useState } from "react";

import { Button, Card, FormControl, Text, TextField, View } from "reshaped";

import { Link, useNavigate } from "react-router-dom";

import { AppLogo } from "../../../shared/components/AppLogo/AppLogo";

import { useRegister } from "../hooks/useRegister";

import type { AuthFieldErrors, RegisterFormValues } from "../types/auth.types";

import { hasAuthErrors, validateRegister } from "../validation/auth.validation";

import styles from "./AuthPage.module.css";

export function RegisterPage() {
  const navigate = useNavigate();

  const { submit, isSubmitting, error: requestError } = useRegister();

  const [values, setValues] = useState<RegisterFormValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<AuthFieldErrors>({});

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationErrors = validateRegister(values);

    setErrors(validationErrors);

    if (hasAuthErrors(validationErrors)) {
      return;
    }

    const success = await submit({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    });

    if (!success) {
      return;
    }

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
                <Text variant="featured-3" weight="bold">
                  Create your account
                </Text>

                <Text color="neutral-faded">
                  Create an account to start managing your projects.
                </Text>
              </View>
            </div>

            {requestError && (
              <div className={styles.errorMessage} role="alert">
                {requestError}
              </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <FormControl hasError={Boolean(errors.name)}>
                <FormControl.Label>Name</FormControl.Label>

                <TextField
                  name="name"
                  value={values.name}
                  placeholder="Your name"
                  inputAttributes={{
                    autoComplete: "name",
                  }}
                  onChange={({ value }) => {
                    setValues((current) => ({
                      ...current,
                      name: value,
                    }));

                    setErrors((current) => ({
                      ...current,
                      name: undefined,
                    }));
                  }}
                />

                {errors.name && (
                  <FormControl.Error>{errors.name}</FormControl.Error>
                )}
              </FormControl>

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
                  placeholder="Minimum 8 characters"
                  inputAttributes={{
                    type: "password",
                    autoComplete: "new-password",
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

              <FormControl hasError={Boolean(errors.confirmPassword)}>
                <FormControl.Label>Confirm password</FormControl.Label>

                <TextField
                  name="confirmPassword"
                  value={values.confirmPassword}
                  placeholder="Repeat your password"
                  inputAttributes={{
                    type: "password",
                    autoComplete: "new-password",
                  }}
                  onChange={({ value }) => {
                    setValues((current) => ({
                      ...current,
                      confirmPassword: value,
                    }));

                    setErrors((current) => ({
                      ...current,
                      confirmPassword: undefined,
                    }));
                  }}
                />

                {errors.confirmPassword && (
                  <FormControl.Error>
                    {errors.confirmPassword}
                  </FormControl.Error>
                )}
              </FormControl>

              <Button
                color="primary"
                fullWidth
                loading={isSubmitting}
                loadingAriaLabel="Creating account"
                onClick={() => {}}
                attributes={{
                  type: "submit",
                }}
              >
                Create account
              </Button>
            </form>

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
