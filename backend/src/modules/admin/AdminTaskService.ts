import type { AdminProjectTasks } from "./AdminTask.js";
import type { AdminTaskRepository } from "./AdminTaskRepository.js";
import type { TaskRepository } from "../tasks/TaskRepository.js";
import type { ProjectRepository } from "../projects/ProjectRepository.js";
import { Task } from "../tasks/Task.js";
import type { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";

export class AdminTaskService {
  constructor(
    private readonly adminTaskRepository: AdminTaskRepository,
    private readonly taskRepository: TaskRepository,
    private readonly projectRepository: ProjectRepository,
    private readonly projectAccessGuard: ProjectAccessGuard,
  ) {}

  /** All tasks across all projects, grouped by project. Admin-only (enforced by the requireAdmin route guard). */
  async listAll(): Promise<AdminProjectTasks[]> {
    return this.adminTaskRepository.findAllGroupedByProject();
  }

  /**
   * Assigns (assigneeId set) or clears (assigneeId null) a task's assignee.
   *
   * Decision: the assignee must already have access to the task's project
   * (owner or ProjectMember) — assigning to someone with no project access
   * would create a task that nobody but an admin could ever see, breaking
   * the existing ProjectAccessGuard invariant that only a project's
   * owner/members can view or act on its tasks. This reuses
   * ProjectAccessGuard.getAccessRole() as a read-only membership check on
   * the *target* user, not the acting admin — it does not extend or bypass
   * ProjectAccessGuard's own authorization semantics, which stay
   * per-project and unmodified. To assign to someone new, add them as a
   * project member first via POST /projects/:projectId/members.
   */
  async assign(taskId: string, assigneeId: string | null): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error("Not found");

    if (assigneeId !== null) {
      const project = await this.projectRepository.findById(task.projectId);
      if (!project) throw new Error("Not found");

      const role = await this.projectAccessGuard.getAccessRole(
        project,
        assigneeId,
      );
      if (!role) {
        throw new Error("Assignee is not a member of this project");
      }
    }

    const updatedTask = new Task(
      task.id,
      task.title,
      task.description,
      task.projectId,
      task.status,
      task.priority,
      task.deadline,
      task.createdAt,
      task.boardId,
      assigneeId,
    );

    return this.taskRepository.save(updatedTask);
  }
}
