import { useCallback, useState } from "react";

import { ApiError } from "../../../shared/api";

import { register } from "../api/auth.api";

import type { RegisterPayload } from "../types/auth.types";

export function useRegister() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: RegisterPayload): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setError(null);

        await register(payload);

        return true;
      } catch (requestError) {
        if (requestError instanceof ApiError) {
          setError(requestError.message);
        } else {
          setError("Unable to create your account. Please try again.");
        }

        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return {
    submit,
    isSubmitting,
    error,
  };
}
