import { useCallback, useEffect, useState } from "react";

import { getOwnedProjects } from "../api/dataExport.api";

import type { OwnedProject } from "../types/profile.types";

const LOAD_ERROR = "Unable to load your projects.";

export function useOwnedProjects() {
  const [projects, setProjects] = useState<OwnedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getOwnedProjects()
      .then((response) => {
        if (!cancelled) {
          setProjects(response);
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

      setProjects(await getOwnedProjects());
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    projects,
    isLoading,
    error,
    reload,
  };
}
