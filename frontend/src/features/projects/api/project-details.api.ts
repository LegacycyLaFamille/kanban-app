import { getProjects } from "./projects.api";

import type {
  Project,
  ProjectDetails,
  ProjectTaskPreview,
  ProjectTaskSummary,
} from "../types/project.types";

const TASK_SUMMARIES: Record<string, ProjectTaskSummary> = {
  "project-1": {
    todo: 2,
    inProgress: 1,
    done: 9,
  },
  "project-2": {
    todo: 3,
    inProgress: 2,
    done: 3,
  },
  "project-3": {
    todo: 4,
    inProgress: 1,
    done: 1,
  },
  "project-4": {
    todo: 1,
    inProgress: 1,
    done: 2,
  },
  "project-5": {
    todo: 5,
    inProgress: 2,
    done: 3,
  },
  "project-6": {
    todo: 3,
    inProgress: 1,
    done: 1,
  },
};

const RECENT_TASKS: Record<string, ProjectTaskPreview[]> = {
  "project-1": [
    {
      id: "task-1",
      title: "Implement authentication flow",
      status: "IN_PROGRESS",
      priority: "HIGH",
      deadline: "2026-09-12",
    },
    {
      id: "task-2",
      title: "Create project management interface",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      deadline: "2026-09-14",
    },
    {
      id: "task-3",
      title: "Configure PostgreSQL",
      status: "TODO",
      priority: "HIGH",
      deadline: "2026-09-15",
    },
    {
      id: "task-4",
      title: "Define frontend architecture",
      status: "DONE",
      priority: "MEDIUM",
    },
  ],
};

function getDefaultTasks(project: Project): ProjectTaskPreview[] {
  if (project.taskCount === 0) {
    return [];
  }

  return [
    {
      id: `${project.id}-task-1`,
      title: `Review ${project.name} requirements`,
      status: "IN_PROGRESS",
      priority: "MEDIUM",
    },
    {
      id: `${project.id}-task-2`,
      title: `Prepare next ${project.name} milestone`,
      status: "TODO",
      priority: "HIGH",
    },
  ];
}

export async function getProjectById(
  projectId: string,
): Promise<ProjectDetails | null> {
  /*
   * For now, getProjects() acts as our fake backend.
   *
   * Later this function will be replaced by:
   *
   * const response = await fetch(`/api/projects/${projectId}`);
   *
   * if (response.status === 404) {
   *   return null;
   * }
   *
   * if (!response.ok) {
   *   throw new Error('Unable to fetch project');
   * }
   *
   * return response.json();
   */

  const projects = await getProjects();

  const project = projects.find(
    (currentProject) => currentProject.id === projectId,
  );

  if (!project) {
    return null;
  }

  const owner = project.members[0] ?? {
    id: "unknown-owner",
    name: "Project owner",
    initials: "PO",
  };

  return {
    ...project,

    owner,

    createdAt: "2026-09-01T09:00:00.000Z",

    deadline:
      project.status === "ACTIVE" ? "2026-09-30T23:59:59.000Z" : undefined,

    taskSummary: TASK_SUMMARIES[project.id] ?? {
      todo: project.taskCount,
      inProgress: 0,
      done: 0,
    },

    recentTasks: RECENT_TASKS[project.id] ?? getDefaultTasks(project),
  };
}
