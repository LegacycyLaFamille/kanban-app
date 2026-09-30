import { useCallback, useState } from "react";

import { ApiError, toUserMessage } from "../../../shared/api";

import type { LoginPayload } from "../types/auth.types";

import { useAuth } from "./useAuth";

export function useLogin() {
  const { signIn } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: LoginPayload): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setError(null);

        await signIn(payload);

        return true;
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 401) {
          setError("Invalid email or password.");
        } else {
          setError(
            toUserMessage(requestError, "Unable to sign in. Please try again."),
          );
        }

        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [signIn],
  );

  return {
    submit,
    isSubmitting,
    error,
  };
}
