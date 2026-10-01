export type ExportFormat = "csv" | "json";

export type ExportLayout = "single" | "per-project";

export interface ExportTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExportBoard {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: ExportTask[];
}

export interface ExportProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
  boards: ExportBoard[];
  unassignedTasks: ExportTask[];
}

export interface ExportOptions {
  format: ExportFormat;
  layout: ExportLayout;
  projectIds?: string[] | undefined;
}

export interface ExportFile {
  filename: string;
  contentType: string;
  content: Uint8Array;
}

// Everything the application stores about one person (GDPR art. 15 and 20).
// Other people are only referenced by id, never by name or email.
export interface PersonalData {
  account: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: Date;
    updatedAt: Date;
  };
  ownedProjects: { id: string; name: string; createdAt: Date }[];
  memberships: {
    projectId: string;
    projectName: string;
    role: string;
    joinedAt: Date;
  }[];
  assignedTasks: {
    id: string;
    title: string;
    projectId: string;
    status: string;
    priority: string;
    deadline: Date | null;
  }[];
  receivedInvitations: PersonalDataInvitation[];
  sentInvitations: PersonalDataInvitation[];
  notifications: {
    id: string;
    type: string;
    projectId: string;
    taskTitle: string | null;
    changes: string[];
    readAt: Date | null;
    createdAt: Date;
  }[];
}

export interface PersonalDataInvitation {
  projectId: string;
  projectName: string;
  role: string;
  createdAt: Date;
}
