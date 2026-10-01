import { httpClient } from "../../../shared/api";

import type {
  ProjectInvitation,
  ProjectPermission,
  ProjectRole,
  ProjectTeam,
  TeamUser,
} from "../types/team.types";

function projectEndpoint(projectId: string): string {
  return `/projects/${encodeURIComponent(projectId)}`;
}

export function getProjectTeam(projectId: string): Promise<ProjectTeam> {
  return httpClient.get<ProjectTeam>(`${projectEndpoint(projectId)}/team`);
}

export function toTeamUsers(team: ProjectTeam): TeamUser[] {
  const users: TeamUser[] = team.members.map((member) => ({
    userId: member.userId,
    name: member.name,
    email: member.email,
    role: "member",
  }));

  return team.owner ? [{ ...team.owner, role: "owner" }, ...users] : users;
}

export function getPermission(
  team: ProjectTeam,
  userId: string,
): ProjectPermission | null {
  if (team.owner?.userId === userId) return "owner";

  const member = team.members.find((m) => m.userId === userId);
  if (!member) return null;
  return member.role === "EDITOR" ? "editor" : "viewer";
}

// --- Project owner side -------------------------------------------------

export function getProjectInvitations(
  projectId: string,
): Promise<ProjectInvitation[]> {
  return httpClient.get<ProjectInvitation[]>(
    `${projectEndpoint(projectId)}/invitations`,
  );
}

export function inviteToProject(
  projectId: string,
  email: string,
  role: ProjectRole = "VIEWER",
): Promise<ProjectInvitation> {
  return httpClient.post<
    ProjectInvitation,
    { email: string; role: ProjectRole }
  >(`${projectEndpoint(projectId)}/invitations`, { email, role });
}

export function updateMemberRole(
  projectId: string,
  memberUserId: string,
  role: ProjectRole,
): Promise<void> {
  return httpClient.patch<void, { role: ProjectRole }>(
    `${projectEndpoint(projectId)}/members/${encodeURIComponent(memberUserId)}`,
    { role },
  );
}

export function cancelProjectInvitation(
  projectId: string,
  invitationId: string,
): Promise<void> {
  return httpClient.delete(
    `${projectEndpoint(projectId)}/invitations/${encodeURIComponent(invitationId)}`,
  );
}

export function removeProjectMember(
  projectId: string,
  memberUserId: string,
): Promise<void> {
  return httpClient.delete(
    `${projectEndpoint(projectId)}/members/${encodeURIComponent(memberUserId)}`,
  );
}

// --- Invitee side -------------------------------------------------------

export function getMyInvitations(): Promise<ProjectInvitation[]> {
  return httpClient.get<ProjectInvitation[]>("/invitations");
}

export function acceptInvitation(
  invitationId: string,
): Promise<{ projectId: string }> {
  return httpClient.post<{ projectId: string }>(
    `/invitations/${encodeURIComponent(invitationId)}/accept`,
  );
}

export function declineInvitation(invitationId: string): Promise<void> {
  return httpClient.post<void>(
    `/invitations/${encodeURIComponent(invitationId)}/decline`,
  );
}
