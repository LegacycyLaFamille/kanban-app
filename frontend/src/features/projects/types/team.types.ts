// VIEWER reads the project, EDITOR also manages its boards and tasks.
export type ProjectRole = "VIEWER" | "EDITOR";

// What the current user may do on a project.
export type ProjectPermission = "owner" | "editor" | "viewer";

// Mirrors GET /projects/:projectId/team (dates as ISO strings).
export type ProjectTeamOwner = {
  userId: string;
  name: string;
  email: string;
};

export type ProjectTeamMember = {
  // ProjectMember id.
  id: string;
  userId: string;
  name: string;
  email: string;
  joinedAt: string;
  role: ProjectRole;
};

export type ProjectTeam = {
  // null only if the owner account no longer exists.
  owner: ProjectTeamOwner | null;
  members: ProjectTeamMember[];
};

// Owner first, then members: everyone a task can be assigned to.
export type TeamUser = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "member";
};

export type ProjectInvitation = {
  id: string;
  createdAt: string;
  role: ProjectRole;
  project: { id: string; name: string };
  invitee: { id: string; name: string; email: string };
  inviter: { id: string; name: string };
};
