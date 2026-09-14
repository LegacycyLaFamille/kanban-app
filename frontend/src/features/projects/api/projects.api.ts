import type { CreateProjectPayload, Project } from "../types/project.types";

const MOCK_DELAY = 450;

let mockProjects: Project[] = [
  {
    id: "project-1",
    name: "Kanban Platform",
    description: "Main project for the new Kanban application.",
    status: "ACTIVE",
    taskCount: 12,
    progress: 75,
    members: [
      {
        id: "user-1",
        name: "Mathis",
        initials: "MZ",
      },
      {
        id: "user-2",
        name: "Alice",
        initials: "AL",
      },
      {
        id: "user-3",
        name: "Louis",
        initials: "LO",
      },
    ],
    updatedAt: "2026-09-09T08:30:00.000Z",
  },
  {
    id: "project-2",
    name: "Mobile App",
    description: "Companion mobile application.",
    status: "ACTIVE",
    taskCount: 8,
    progress: 40,
    members: [
      {
        id: "user-1",
        name: "Mathis",
        initials: "MZ",
      },
      {
        id: "user-4",
        name: "Emma",
        initials: "EM",
      },
    ],
    updatedAt: "2026-09-08T14:10:00.000Z",
  },
  {
    id: "project-3",
    name: "Website Redesign",
    description: "New marketing website and branding.",
    status: "ACTIVE",
    taskCount: 6,
    progress: 20,
    members: [
      {
        id: "user-2",
        name: "Alice",
        initials: "AL",
      },
      {
        id: "user-5",
        name: "Maxime",
        initials: "MA",
      },
    ],
    updatedAt: "2026-09-07T11:45:00.000Z",
  },
  {
    id: "project-4",
    name: "DevOps",
    description: "Infrastructure and deployment.",
    status: "ACTIVE",
    taskCount: 4,
    progress: 50,
    members: [
      {
        id: "user-3",
        name: "Louis",
        initials: "LO",
      },
      {
        id: "user-5",
        name: "Maxime",
        initials: "MA",
      },
    ],
    updatedAt: "2026-09-06T09:20:00.000Z",
  },
  {
    id: "project-5",
    name: "Documentation",
    description: "Technical and user documentation.",
    status: "ACTIVE",
    taskCount: 10,
    progress: 30,
    members: [
      {
        id: "user-1",
        name: "Mathis",
        initials: "MZ",
      },
    ],
    updatedAt: "2026-09-05T16:30:00.000Z",
  },
  {
    id: "project-6",
    name: "Research",
    description: "Exploration and prototypes.",
    status: "ARCHIVED",
    taskCount: 5,
    progress: 10,
    members: [
      {
        id: "user-4",
        name: "Emma",
        initials: "EM",
      },
    ],
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
];

function delay(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY);
  });
}

export async function getProjects(): Promise<Project[]> {
  await delay();

  return structuredClone(mockProjects);
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<Project> {
  await delay();

  const project: Project = {
    id: crypto.randomUUID(),
    name: payload.name,
    description: payload.description ?? "",
    status: "ACTIVE",
    taskCount: 0,
    progress: 0,
    members: [],
    updatedAt: new Date().toISOString(),
  };

  mockProjects = [project, ...mockProjects];

  return structuredClone(project);
}

/*
 * When the real backend is available, the implementation can become:
 *
 * export async function getProjects(): Promise<Project[]> {
 *   const response = await fetch('/api/projects');
 *
 *   if (!response.ok) {
 *     throw new Error('Unable to fetch projects');
 *   }
 *
 *   return response.json();
 * }
 *
 * export async function createProject(
 *   payload: CreateProjectPayload
 * ): Promise<Project> {
 *   const response = await fetch('/api/projects', {
 *     method: 'POST',
 *     headers: {
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify(payload),
 *   });
 *
 *   if (!response.ok) {
 *     throw new Error('Unable to create project');
 *   }
 *
 *   return response.json();
 * }
 */
