import { useCallback, useEffect, useState } from "react";

import {
  cancelProjectInvitation,
  getProjectInvitations,
  getProjectTeam,
  inviteToProject,
  removeProjectMember,
  toTeamUsers,
  updateMemberRole,
} from "../api/team.api";
import type {
  ProjectInvitation,
  ProjectRole,
  ProjectTeam,
  TeamUser,
} from "../types/team.types";
import { projectErrorMessage } from "../utils/projectError";

type Options = {
  // Pending invitations are only visible to the project owner.
  withInvitations?: boolean;
};

export function useProjectTeam(
  projectId: string | undefined,
  { withInvitations = false }: Options = {},
) {
  const [team, setTeam] = useState<ProjectTeam | null>(null);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!projectId) return;

    let active = true;

    async function load(id: string) {
      try {
        const [loadedTeam, loadedInvitations] = await Promise.all([
          getProjectTeam(id),
          withInvitations ? getProjectInvitations(id) : Promise.resolve([]),
        ]);

        if (active) {
          setTeam(loadedTeam);
          setInvitations(loadedInvitations);
          setError(null);
        }
      } catch (requestError) {
        if (active) {
          setError(
            projectErrorMessage(
              requestError,
              "Unable to load project members.",
            ),
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    void load(projectId);

    return () => {
      active = false;
    };
  }, [projectId, withInvitations, reloadKey]);

  const reload = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  const runMutation = useCallback(
    async (action: () => Promise<void>, fallback: string) => {
      setIsMutating(true);
      setMutationError(null);

      try {
        await action();
        return true;
      } catch (requestError) {
        setMutationError(projectErrorMessage(requestError, fallback));
        return false;
      } finally {
        setIsMutating(false);
      }
    },
    [],
  );

  const invite = useCallback(
    (email: string, role: ProjectRole = "VIEWER") => {
      if (!projectId) return Promise.resolve(false);

      return runMutation(async () => {
        const invitation = await inviteToProject(projectId, email, role);
        setInvitations((current) => [...current, invitation]);
      }, "Unable to send the invitation.");
    },
    [projectId, runMutation],
  );

  const cancelInvitation = useCallback(
    (invitationId: string) => {
      if (!projectId) return Promise.resolve(false);

      return runMutation(async () => {
        await cancelProjectInvitation(projectId, invitationId);
        setInvitations((current) =>
          current.filter((invitation) => invitation.id !== invitationId),
        );
      }, "Unable to cancel the invitation.");
    },
    [projectId, runMutation],
  );

  const removeMember = useCallback(
    (memberUserId: string) => {
      if (!projectId) return Promise.resolve(false);

      return runMutation(async () => {
        await removeProjectMember(projectId, memberUserId);
        setTeam((current) =>
          current
            ? {
                ...current,
                members: current.members.filter(
                  (member) => member.userId !== memberUserId,
                ),
              }
            : current,
        );
      }, "Unable to remove the member.");
    },
    [projectId, runMutation],
  );

  const changeRole = useCallback(
    (memberUserId: string, role: ProjectRole) => {
      if (!projectId) return Promise.resolve(false);

      return runMutation(async () => {
        await updateMemberRole(projectId, memberUserId, role);
        setTeam((current) =>
          current
            ? {
                ...current,
                members: current.members.map((member) =>
                  member.userId === memberUserId ? { ...member, role } : member,
                ),
              }
            : current,
        );
      }, "Unable to change the member role.");
    },
    [projectId, runMutation],
  );

  const resetMutationError = useCallback(() => {
    setMutationError(null);
  }, []);

  const users: TeamUser[] = team ? toTeamUsers(team) : [];

  return {
    team,
    users,
    invitations,
    isLoading: Boolean(projectId) && isLoading,
    error,
    isMutating,
    mutationError,
    reload,
    invite,
    cancelInvitation,
    removeMember,
    changeRole,
    resetMutationError,
  };
}
