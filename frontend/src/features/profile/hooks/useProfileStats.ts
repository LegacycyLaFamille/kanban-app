import { useCallback, useEffect, useState } from "react";

import { getProfileStats } from "../api/profile.api";

import type { ProfileStats } from "../types/profile.types";

const LOAD_ERROR = "Unable to load your activity.";

export function useProfileStats() {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getProfileStats()
      .then((response) => {
        if (!cancelled) {
          setStats(response);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(LOAD_ERROR);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const reload = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      setStats(await getProfileStats());
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    stats,
    isLoading,
    error,
    reload,
  };
}
