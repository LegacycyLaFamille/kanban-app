import type {
  AssignedTask,
  AssignedTaskFilter,
  TaskRepository,
} from "./TaskRepository.js";
import { Task } from "./Task.js";
import type { ProjectAccessGuard } from "../../shared/security/ProjectAccessGuard.js";
import { randomUUID } from "node:crypto";
import type { EventBus } from "../../shared/events/EventBus.js";
import { createEvent } from "../../shared/events/DomainEvent.js";
import { publishSafely } from "../../shared/events/publishSafely.js";
import {
  changedTaskFields,
  isCompletion,
  type TaskCompletedEvent,
  type TaskCreatedEvent,
  type TaskUpdatedEvent,
} from "./task.events.js";

export interface CreateTaskDto {
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline?: string | null;
  boardId?: string | null;
}

export interface updateTaskDto {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  deadline?: string | null;
  boardId?: string | null;
  assigneeId?: string | null;
}

export class TaskService {
  constructor(
    private readonly taskRepository: TaskRepository,
    private readonly projectAccessGuard: ProjectAccessGuard,
    private readonly eventBus: EventBus,
  ) {}

  /** Owner or member of the parent project. */
  async read(projectId: string, userid: string): Promise<Task[]> {
    await this.projectAccessGuard.assertCanView(projectId, userid);

    const tasks = await this.taskRepository.findByProjectId(projectId);

    if (!tasks) {
      return [];
    }
    return tasks;
  }

  /**
   * Tasks assigned to the user across all projects, limited to projects the
   * user is owner or member of (checked by the repository query).
   */
  readAssigned(
    userId: string,
    filter: AssignedTaskFilter = {},
  ): Promise<AssignedTask[]> {
    return this.taskRepository.findAssignedTo(userId, filter);
  }

  /** Owner or member of the parent project. */
  async readSingle(taskId: string, userid: string): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Not found");
    }
    await this.projectAccessGuard.assertCanView(task.projectId, userid);
    return task;
  }

  /** Owner of the parent project only. */
  async create(
    projectId: string,
    userid: string,
    data: CreateTaskDto,
  ): Promise<Task> {
    await this.projectAccessGuard.assertIsOwner(projectId, userid);

    const newTask = new Task(
      randomUUID(),
      data.title,
      data.description,
      projectId,
      data.status,
      data.priority,
      data.deadline ? new Date(data.deadline) : null,
      new Date(),
      data.boardId ? data.boardId : null,
    );
    const res = await this.taskRepository.save(newTask);
    if (!res) {
      throw new Error("Task not created");
    }

    const event: TaskCreatedEvent = createEvent(
      "task.created",
      {
        taskId: res.id,
        projectId: res.projectId,
        boardId: res.boardId,
        title: res.title,
        status: res.status,
        priority: res.priority,
      },
      { actorId: userid },
    );
    await publishSafely(this.eventBus, event);
    return res;
  }

  /**
   * Owner of the parent project only. A non-null assigneeId must be the
   * project's owner or a member, same rule as AdminTaskService.assign.
   */
  async update(
    taskId: string,
    userid: string,
    data: updateTaskDto,
  ): Promise<Task> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new Error("Not found");
    const project = await this.projectAccessGuard.assertIsOwner(
      task.projectId,
      userid,
    );

    if (data.assigneeId) {
      const role = await this.projectAccessGuard.getAccessRole(
        project,
        data.assigneeId,
      );
      if (!role) throw new Error("Assignee is not a member of this project");
    }

    const updatedTask = new Task(
      task.id,
      data.title ?? task.title,
      data.description ?? task.description,
      task.projectId,
      data.status ?? task.status,
      data.priority ?? task.priority,
      data.deadline !== undefined
        ? data.deadline
          ? new Date(data.deadline)
          : null
        : task.deadline,
      task.createdAt,
      data.boardId !== undefined ? data.boardId : task.boardId,
      data.assigneeId !== undefined ? data.assigneeId : task.assigneeId,
    );

    await this.taskRepository.save(updatedTask);
    await this.publishUpdateEvents(task, updatedTask, userid);
    return updatedTask;
  }

  /** Owner of the parent project only. */
  async delete(taskId: string, userid: string): Promise<void> {
    const task = await this.taskRepository.findById(taskId);
    if (!task) {
      throw new Error("Not found");
    }
    await this.projectAccessGuard.assertIsOwner(task.projectId, userid);
    await this.taskRepository.delete(task);
  }

  // Published only once the update is persisted, and only for real changes
  // so that resending the same payload has no side effect.
  private async publishUpdateEvents(
    before: Task,
    after: Task,
    actorId: string,
  ): Promise<void> {
    const changes = changedTaskFields(before, after);
    if (changes.length === 0) return;

    const updated: TaskUpdatedEvent = createEvent(
      "task.updated",
      {
        taskId: after.id,
        projectId: after.projectId,
        title: after.title,
        changes,
        previousStatus: before.status,
        status: after.status,
      },
      { actorId },
    );
    await publishSafely(this.eventBus, updated);

    if (isCompletion(before, after)) {
      const completed: TaskCompletedEvent = createEvent(
        "task.completed",
        {
          taskId: after.id,
          projectId: after.projectId,
          title: after.title,
          previousStatus: before.status,
        },
        { actorId },
      );
      await publishSafely(this.eventBus, completed);
    }
  }
}
