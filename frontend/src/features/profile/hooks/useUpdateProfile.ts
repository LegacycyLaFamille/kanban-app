import { useCallback, useState } from "react";

import { ApiError } from "../../../shared/api";

import { useAuth } from "../../auth/hooks/useAuth";

import { updateCurrentUser } from "../api/profile.api";

import type {
  ProfileFieldErrors,
  UpdateProfilePayload,
} from "../types/profile.types";

function toFieldErrors(error: ApiError): ProfileFieldErrors {
  return {
    name: error.details?.name?.[0],
    email: error.details?.email?.[0],
  };
}

export function useUpdateProfile() {
  const { refreshUser } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFieldErrors>({});

  const submit = useCallback(
    async (payload: UpdateProfilePayload): Promise<boolean> => {
      try {
        setIsSubmitting(true);
        setError(null);
        setFieldErrors({});

        await updateCurrentUser(payload);
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.details) {
          setFieldErrors(toFieldErrors(requestError));
        } else {
          setError("Unable to update your profile. Please try again.");
        }

        setIsSubmitting(false);

        return false;
      }

      await refreshUser().catch(() => undefined);

      setIsSubmitting(false);

      return true;
    },
    [refreshUser],
  );

  const clearFieldError = useCallback((field: keyof ProfileFieldErrors) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  }, []);

  return {
    submit,
    isSubmitting,
    error,
    fieldErrors,
    clearFieldError,
  };
}
