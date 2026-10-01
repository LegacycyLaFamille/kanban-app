import { useCallback, useEffect, useState } from "react";

import {
  acceptInvitation,
  declineInvitation,
  getMyInvitations,
} from "../api/team.api";
import type { ProjectInvitation } from "../types/team.types";
import { projectErrorMessage } from "../utils/projectError";

// Invitations received by the current user. `onAccepted` lets the caller
// refresh its project list once the user has joined a project.
export function useMyInvitations(onAccepted?: () => void | Promise<void>) {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getMyInvitations()
      .then((loaded) => {
        if (active) setInvitations(loaded);
      })
      .catch(() => {
        // Secondary information on the page: stay silent, show nothing.
      });

    return () => {
      active = false;
    };
  }, []);

  const respond = useCallback(
    async (invitationId: string, accept: boolean) => {
      setPendingId(invitationId);
      setError(null);

      try {
        if (accept) {
          await acceptInvitation(invitationId);
        } else {
          await declineInvitation(invitationId);
        }

        setInvitations((current) =>
          current.filter((invitation) => invitation.id !== invitationId),
        );

        if (accept) await onAccepted?.();
      } catch (requestError) {
        setError(
          projectErrorMessage(
            requestError,
            accept
              ? "Unable to accept the invitation."
              : "Unable to decline the invitation.",
          ),
        );
      } finally {
        setPendingId(null);
      }
    },
    [onAccepted],
  );

  return {
    invitations,
    pendingId,
    error,
    accept: (invitationId: string) => respond(invitationId, true),
    decline: (invitationId: string) => respond(invitationId, false),
  };
}
