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

      try {
        // Keeps the sidebar and every other consumer of the session in sync.
        await refreshUser();
      } catch {
        // The update itself succeeded; a failed refresh only leaves stale data.
      } finally {
        setIsSubmitting(false);
      }

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
