import { Button, Card, Text, View } from "reshaped";

import { useNavigate, useParams } from "react-router-dom";

import { useProjectDetails } from "../hooks/useProjectDetails";

import type { TaskPriority, TaskStatus } from "../types/project.types";

import styles from "./ProjectDetailsPage.module.css";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function getStatusLabel(status: TaskStatus) {
  switch (status) {
    case "IN_PROGRESS":
      return "In progress";

    case "DONE":
      return "Done";

    case "TODO":
    default:
      return "Todo";
  }
}

function getPriorityLabel(priority: TaskPriority) {
  return priority.charAt(0) + priority.slice(1).toLowerCase();
}

export function ProjectDetailsPage() {
  const navigate = useNavigate();

  const { projectId } = useParams<{ projectId: string }>();

  const { project, isLoading, notFound, error, reload } =
    useProjectDetails(projectId);

  if (isLoading) {
    return (
      <section className={styles.page}>
        <div className={styles.state}>Loading project...</div>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className={styles.page}>
        <div className={styles.state}>
          <h1>Project not found</h1>

          <p>This project does not exist or is no longer available.</p>

          <Button onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </div>
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className={styles.page}>
        <div className={styles.state}>
          <h1>Unable to load project</h1>

          <p>{error}</p>

          <Button
            variant="outline"
            onClick={() => {
              void reload();
            }}
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const totalTasks =
    project.taskSummary.todo +
    project.taskSummary.inProgress +
    project.taskSummary.done;

  return (
    <section className={styles.page}>
      <View gap={7}>
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate("/projects")}
        >
          ← Back to projects
        </button>

        <header className={styles.header}>
          <div className={styles.projectHeading}>
            <div className={styles.projectIcon}>
              <span />
              <span />
            </div>

            <div>
              <div className={styles.titleLine}>
                <h1>{project.name}</h1>

                <span
                  className={
                    project.status === "ACTIVE"
                      ? styles.statusActive
                      : styles.statusArchived
                  }
                >
                  {project.status === "ACTIVE" ? "Active" : "Archived"}
                </span>
              </div>

              <p className={styles.description}>{project.description}</p>
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="outline">Edit project</Button>

            <Button
              color="primary"
              onClick={() => navigate(`/projects/${project.id}/kanban`)}
            >
              Open board
            </Button>
          </div>
        </header>

        <div className={styles.statsGrid}>
          <Card padding={4}>
            <div className={styles.stat}>
              <span>Total tasks</span>
              <strong>{totalTasks}</strong>
            </div>
          </Card>

          <Card padding={4}>
            <div className={styles.stat}>
              <span>Todo</span>
              <strong>{project.taskSummary.todo}</strong>
            </div>
          </Card>

          <Card padding={4}>
            <div className={styles.stat}>
              <span>In progress</span>
              <strong>{project.taskSummary.inProgress}</strong>
            </div>
          </Card>

          <Card padding={4}>
            <div className={styles.stat}>
              <span>Done</span>
              <strong>{project.taskSummary.done}</strong>
            </div>
          </Card>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.mainColumn}>
            <Card padding={5}>
              <View gap={4}>
                <div className={styles.sectionHeader}>
                  <div>
                    <Text weight="bold">Project progress</Text>

                    <Text color="neutral-faded">Overall task completion</Text>
                  </div>

                  <strong className={styles.progressPercent}>
                    {project.progress}%
                  </strong>
                </div>

                <div
                  className={styles.progressTrack}
                  aria-label={`${project.progress}% completed`}
                >
                  <div
                    className={styles.progressValue}
                    style={{
                      width: `${project.progress}%`,
                    }}
                  />
                </div>

                <div className={styles.progressLegend}>
                  <span>{project.taskSummary.done} completed</span>

                  <span>{totalTasks - project.taskSummary.done} remaining</span>
                </div>
              </View>
            </Card>

            <Card padding={5}>
              <View gap={4}>
                <div className={styles.sectionHeader}>
                  <div>
                    <Text weight="bold">Recent tasks</Text>

                    <Text color="neutral-faded">
                      Latest tasks from this project
                    </Text>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => navigate(`/projects/${project.id}/kanban`)}
                  >
                    View board
                  </Button>
                </div>

                {project.recentTasks.length === 0 ? (
                  <div className={styles.empty}>No tasks yet.</div>
                ) : (
                  <div className={styles.taskList}>
                    {project.recentTasks.map((task) => (
                      <div key={task.id} className={styles.task}>
                        <div className={styles.taskMain}>
                          <strong>{task.title}</strong>

                          {task.deadline && (
                            <span>Due {formatDate(task.deadline)}</span>
                          )}
                        </div>

                        <div className={styles.taskMetadata}>
                          <span
                            className={`${styles.priority} ${
                              styles[`priority${task.priority}`]
                            }`}
                          >
                            {getPriorityLabel(task.priority)}
                          </span>

                          <span
                            className={`${styles.taskStatus} ${
                              styles[`status${task.status}`]
                            }`}
                          >
                            {getStatusLabel(task.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </View>
            </Card>
          </div>

          <aside className={styles.sideColumn}>
            <Card padding={5}>
              <View gap={4}>
                <Text weight="bold">Project information</Text>

                <div className={styles.information}>
                  <div>
                    <span>Owner</span>
                    <strong>{project.owner.name}</strong>
                  </div>

                  <div>
                    <span>Created</span>
                    <strong>{formatDate(project.createdAt)}</strong>
                  </div>

                  <div>
                    <span>Last updated</span>
                    <strong>{formatDate(project.updatedAt)}</strong>
                  </div>

                  {project.deadline && (
                    <div>
                      <span>Deadline</span>
                      <strong>{formatDate(project.deadline)}</strong>
                    </div>
                  )}
                </div>
              </View>
            </Card>

            <Card padding={5}>
              <View gap={4}>
                <div className={styles.sectionHeader}>
                  <div>
                    <Text weight="bold">Members</Text>

                    <Text color="neutral-faded">
                      {project.members.length}{" "}
                      {project.members.length === 1 ? "member" : "members"}
                    </Text>
                  </div>

                  <Button variant="ghost">Manage</Button>
                </div>

                <div className={styles.memberList}>
                  {project.members.map((member) => (
                    <div key={member.id} className={styles.member}>
                      <div className={styles.avatar}>{member.initials}</div>

                      <div>
                        <strong>{member.name}</strong>

                        <span>
                          {member.id === project.owner.id ? "Owner" : "Member"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </View>
            </Card>
          </aside>
        </div>
      </View>
    </section>
  );
}
