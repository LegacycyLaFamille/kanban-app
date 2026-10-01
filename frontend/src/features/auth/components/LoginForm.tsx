import { type FormEvent, useState } from "react";

import { Button, FormControl, TextField } from "reshaped";

import { useLogin } from "../hooks/useLogin";

import type { AuthFieldErrors, LoginPayload } from "../types/auth.types";

import { hasAuthErrors, validateLogin } from "../validation/auth.validation";

import styles from "../pages/AuthPage.module.css";

interface LoginFormProps {
  // Called once the session is open; the caller decides where to go next.
  onSuccess: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { submit, isSubmitting, error: requestError } = useLogin();

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

    if (success) {
      onSuccess();
    }
  }

  return (
    <>
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
    </>
  );
}
