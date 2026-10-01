import { Accordion, Badge, Card, Select, Table, Text, View } from "reshaped";

import { labelTable } from "../../../shared/utils/labelTable";

import { useAdminTasks } from "../hooks/useAdminTasks";
import { useTaskAssignment } from "../hooks/useTaskAssignment";
import type { AdminTask } from "../types/admin.types";

import styles from "./AdminDashboardPage.module.css";

function statusColor(
  status: string,
): "neutral" | "warning" | "positive" | "critical" {
  switch (status) {
    case "IN_PROGRESS":
      return "warning";
    case "DONE":
      return "positive";
    case "TODO":
    default:
      return "neutral";
  }
}

function formatDeadline(deadline: string | null): string {
  if (!deadline) return "—";
  return new Date(deadline).toLocaleDateString();
}

export function AdminDashboardPage() {
  const {
    projectGroups,
    isLoading,
    error: fetchError,
    refetch,
  } = useAdminTasks();

  const {
    getEffectiveAssigneeId,
    isPending,
    assignTask,
    error: assignError,
  } = useTaskAssignment({
    onPersisted: refetch,
  });

  const totalTasks = projectGroups.reduce(
    (sum, group) => sum + group.tasks.length,
    0,
  );

  return (
    <section className={styles.page}>
      <View gap={6}>
        <header>
          <Text as="h1" variant="featured-2" weight="bold">
            All Tasks
          </Text>
          <Text color="neutral-faded">
            Admin overview of every task across every project.
          </Text>
        </header>

        {fetchError && (
          <Card padding={3}>
            <div role="alert">
              <Text color="critical">{fetchError}</Text>
            </div>
          </Card>
        )}

        {assignError && (
          <Card padding={3}>
            <div role="alert">
              <Text color="critical">{assignError}</Text>
            </div>
          </Card>
        )}

        {isLoading && <Text color="neutral-faded">Loading tasks...</Text>}

        {!isLoading && totalTasks === 0 && !fetchError && (
          <Card padding={5}>
            <Text color="neutral-faded">There are no tasks yet.</Text>
          </Card>
        )}

        {!isLoading &&
          projectGroups.map((group) => (
            <Card key={group.projectId} padding={4}>
              <Accordion defaultActive>
                <Accordion.Trigger>
                  <div className={styles.groupTrigger}>
                    <Text
                      weight="bold"
                      attributes={{ id: `admin-tasks-${group.projectId}` }}
                    >
                      {group.projectName}
                    </Text>
                    <Text color="neutral-faded" variant="caption-1">
                      {group.tasks.length}{" "}
                      {group.tasks.length === 1 ? "task" : "tasks"}
                    </Text>
                  </div>
                </Accordion.Trigger>

                <Accordion.Content>
                  <View paddingTop={4}>
                    <div ref={labelTable(`admin-tasks-${group.projectId}`)}>
                      <Table>
                        <Table.Head>
                          <Table.Row>
                            <Table.Heading>Title</Table.Heading>
                            <Table.Heading>Status</Table.Heading>
                            <Table.Heading>Priority</Table.Heading>
                            <Table.Heading>Deadline</Table.Heading>
                            <Table.Heading>Assignee</Table.Heading>
                          </Table.Row>
                        </Table.Head>
                        <Table.Body>
                          {group.tasks.map((task: AdminTask) => {
                            const effectiveAssigneeId = getEffectiveAssigneeId(
                              task.id,
                              task.assigneeId,
                            );
                            const pending = isPending(task.id);

                            return (
                              <Table.Row key={task.id}>
                                <Table.Cell>{task.title}</Table.Cell>
                                <Table.Cell>
                                  <Badge color={statusColor(task.status)}>
                                    {task.status}
                                  </Badge>
                                </Table.Cell>
                                <Table.Cell>{task.priority}</Table.Cell>
                                <Table.Cell>
                                  {formatDeadline(task.deadline)}
                                </Table.Cell>
                                <Table.Cell>
                                  <div className={styles.assigneeSelect}>
                                    <Select
                                      name={`assignee-${task.id}`}
                                      size="small"
                                      disabled={pending}
                                      value={effectiveAssigneeId ?? ""}
                                      inputAttributes={{
                                        "aria-label": `Assignee for ${task.title}`,
                                      }}
                                      onChange={({ value }) =>
                                        void assignTask(
                                          task.id,
                                          task.assigneeId,
                                          value === "" ? null : value,
                                        )
                                      }
                                    >
                                      <option value="">Unassigned</option>
                                      {group.assignableUsers.map((user) => (
                                        <option key={user.id} value={user.id}>
                                          {user.name}
                                        </option>
                                      ))}
                                    </Select>
                                  </div>
                                </Table.Cell>
                              </Table.Row>
                            );
                          })}
                        </Table.Body>
                      </Table>
                    </div>
                  </View>
                </Accordion.Content>
              </Accordion>
            </Card>
          ))}
      </View>
    </section>
  );
}
