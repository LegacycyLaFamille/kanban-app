import { Accordion, Badge, Card, Table, Text, View } from "reshaped";

import { labelTable } from "../../../shared/utils/labelTable";

import { useMyTasks } from "../hooks/useMyTasks";
import type { MyTask } from "../types/myTasks.types";

import styles from "./MyTasksPage.module.css";

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

export function MyTasksPage() {
  const { projectGroups, isLoading, error } = useMyTasks();

  const totalTasks = projectGroups.reduce(
    (sum, group) => sum + group.tasks.length,
    0,
  );

  return (
    <section className={styles.page}>
      <View gap={6}>
        <header>
          <Text as="h1" variant="featured-2" weight="bold">
            My Tasks
          </Text>
          <Text color="neutral-faded">
            Tasks assigned to you across every project.
          </Text>
        </header>

        {error && (
          <Card padding={3}>
            <div role="alert">
              <Text color="critical">{error}</Text>
            </div>
          </Card>
        )}

        {isLoading && <Text color="neutral-faded">Loading your tasks...</Text>}

        {!isLoading && totalTasks === 0 && !error && (
          <Card padding={5}>
            <Text color="neutral-faded">
              You have no tasks assigned to you right now.
            </Text>
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
                      attributes={{ id: `my-tasks-${group.projectId}` }}
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
                    <div ref={labelTable(`my-tasks-${group.projectId}`)}>
                      <Table>
                        <Table.Head>
                          <Table.Row>
                            <Table.Heading>Title</Table.Heading>
                            <Table.Heading>Status</Table.Heading>
                            <Table.Heading>Priority</Table.Heading>
                            <Table.Heading>Deadline</Table.Heading>
                          </Table.Row>
                        </Table.Head>
                        <Table.Body>
                          {group.tasks.map((task: MyTask) => (
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
                            </Table.Row>
                          ))}
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
