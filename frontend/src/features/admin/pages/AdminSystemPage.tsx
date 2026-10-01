import type { ReactNode } from "react";
import { Button, Card, Text, View } from "reshaped";

import { ErrorState, LoadingState } from "../../../shared/components/Feedback";

import { useSystemStatus } from "../hooks/useSystemStatus";
import type {
  BrokerState,
  QueueStatus,
  SystemHealth,
  SystemStatus,
} from "../types/system.types";

import styles from "./AdminSystemPage.module.css";

// Each state has a word and a symbol, never a colour alone (RGAA 3.1).
type Tone = "ok" | "warning" | "critical" | "neutral";

const HEALTH: Record<SystemHealth, { label: string; tone: Tone }> = {
  ok: { label: "All systems operational", tone: "ok" },
  degraded: { label: "Degraded", tone: "warning" },
  down: { label: "Down", tone: "critical" },
};

const SYMBOLS: Record<Tone, string> = {
  ok: "✓",
  warning: "!",
  critical: "✕",
  neutral: "•",
};

const BROKER: Record<BrokerState, { label: string; tone: Tone }> = {
  connected: { label: "Connected", tone: "ok" },
  connecting: { label: "Connecting", tone: "warning" },
  disconnected: { label: "Disconnected", tone: "critical" },
  closed: { label: "Closed", tone: "critical" },
  disabled: { label: "Not configured", tone: "warning" },
};

const QUEUE_ROLES: Record<QueueStatus["role"], string> = {
  consumer: "Notifications",
  retry: "Waiting for retry",
  dead_letter: "Failed for good",
};

function StatusText({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={styles.status} data-tone={tone}>
      <span className={styles.symbol} aria-hidden="true">
        {SYMBOLS[tone]}
      </span>
      {children}
    </span>
  );
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card padding={5} className={styles.section}>
      <View gap={4}>
        <View gap={1}>
          <Text as="h2" variant="featured-5" weight="bold">
            {title}
          </Text>
          {description && (
            <Text variant="body-2" color="neutral-faded">
              {description}
            </Text>
          )}
        </View>
        {children}
      </View>
    </Card>
  );
}

function Figures({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className={styles.figures}>
      {items.map(([label, value]) => (
        <div key={label} className={styles.figure}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Overview({ status }: { status: SystemStatus }) {
  const health = HEALTH[status.status];
  return (
    <div className={styles.overview} data-tone={health.tone}>
      <View gap={3}>
        <Text as="h2" variant="featured-4" weight="bold">
          <StatusText tone={health.tone}>{health.label}</StatusText>
        </Text>
        {status.warnings.length > 0 ? (
          <ul className={styles.warnings}>
            {status.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        ) : (
          <Text color="neutral-faded">
            Database, message broker and event queues are working normally.
          </Text>
        )}
      </View>
    </div>
  );
}

function Services({ status }: { status: SystemStatus }) {
  const broker = BROKER[status.broker.state];
  const { application, database } = status;
  return (
    <Section title="Services">
      <Figures
        items={[
          [
            "Database",
            database.status === "up" ? (
              <StatusText tone="ok">
                Up{database.latencyMs !== null && ` · ${database.latencyMs} ms`}
              </StatusText>
            ) : (
              <StatusText tone="critical">Unreachable</StatusText>
            ),
          ],
          [
            "Message broker",
            <StatusText tone={broker.tone}>
              {broker.label}
              {status.broker.reconnectAttempt
                ? ` · retry #${status.broker.reconnectAttempt}`
                : ""}
            </StatusText>,
          ],
          [
            "Backend version",
            `${application.version} (${application.environment})`,
          ],
          ["Running for", formatDuration(application.uptimeSeconds)],
          ["Memory", formatBytes(application.memory.rssBytes)],
          ["Node.js", application.nodeVersion],
        ]}
      />
    </Section>
  );
}

function Queues({ status }: { status: SystemStatus }) {
  return (
    <Section
      title="Event queues"
      description="RabbitMQ queues of the notification workflow. Messages waiting in “Failed for good” need someone to look at them."
    >
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <caption className="sr-only">Event queues</caption>
          <thead>
            <tr>
              <th scope="col">Queue</th>
              <th scope="col">Role</th>
              <th scope="col">Waiting messages</th>
              <th scope="col">Consumers</th>
            </tr>
          </thead>
          <tbody>
            {status.queues.map((queue) => {
              const stuck =
                queue.role === "dead_letter" && (queue.messages ?? 0) > 0;
              const unconsumed =
                queue.role === "consumer" && queue.consumers === 0;
              return (
                <tr key={queue.name}>
                  <th scope="row">
                    <code>{queue.name}</code>
                  </th>
                  <td>{QUEUE_ROLES[queue.role]}</td>
                  <td>
                    {queue.messages === null ? (
                      "Unknown"
                    ) : stuck ? (
                      <StatusText tone="critical">{queue.messages}</StatusText>
                    ) : (
                      queue.messages
                    )}
                  </td>
                  <td>
                    {queue.consumers === null ? (
                      "Unknown"
                    ) : unconsumed ? (
                      <StatusText tone="critical">None</StatusText>
                    ) : (
                      queue.consumers
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function Events({ status }: { status: SystemStatus }) {
  const { published, consumed, since } = status.events;
  return (
    <Section
      title="Events"
      description={`Since the backend started (${formatDateTime(since)}).`}
    >
      <Figures
        items={[
          ["Published", published.success],
          ["Failed to publish", published.failure],
          ["Processed", consumed.success],
          ["Retried", consumed.retry],
          ["Dead-lettered", consumed.dead_letter + consumed.unreadable],
        ]}
      />
    </Section>
  );
}

function Activity({ status }: { status: SystemStatus }) {
  const { activity } = status;
  return (
    <Section title="Activity">
      {activity ? (
        <Figures
          items={[
            ["Users", activity.users],
            ["New users (7 days)", activity.newUsersLast7Days],
            ["Projects", activity.projects],
            ["Tasks", activity.tasks.total],
            [
              "To Do / In Progress / Done",
              `${activity.tasks.todo} / ${activity.tasks.inProgress} / ${activity.tasks.done}`,
            ],
            ["Overdue tasks", activity.tasks.overdue],
            ["Tasks created (24 h)", activity.tasks.createdLast24Hours],
            ["Unread notifications", activity.unreadNotifications],
          ]}
        />
      ) : (
        <Text color="neutral-faded">
          Unavailable while the database is unreachable.
        </Text>
      )}
    </Section>
  );
}

function RecentProblems({ status }: { status: SystemStatus }) {
  return (
    <Section
      title="Recent warnings and errors"
      description="The last 20 logged by the backend since it started. Full logs are in Grafana."
    >
      {status.recentProblems.length === 0 ? (
        <Text color="neutral-faded">
          No warning or error since the backend started.
        </Text>
      ) : (
        <ul className={styles.problems}>
          {status.recentProblems.map((problem, index) => (
            <li key={`${problem.time}-${index}`} className={styles.problem}>
              <StatusText
                tone={problem.level === "warn" ? "warning" : "critical"}
              >
                {problem.level === "warn" ? "Warning" : "Error"}
              </StatusText>
              <time dateTime={problem.time} className={styles.problemTime}>
                {formatTime(problem.time)}
              </time>
              {problem.component && (
                <code className={styles.problemComponent}>
                  {problem.component}
                </code>
              )}
              <span className={styles.problemMessage}>{problem.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function Observability({ status }: { status: SystemStatus }) {
  const url = status.links.grafanaDashboard;
  return (
    <Section
      title="Metrics, logs and traces"
      description="History, latency per route, logs search, traces and alerts are in Grafana."
    >
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={styles.externalLink}
        >
          Open the Grafana dashboard
          <span className="sr-only"> (opens in a new tab)</span>
          <span aria-hidden="true"> ↗</span>
        </a>
      ) : (
        <Text color="neutral-faded">
          No Grafana address configured: set <code>GRAFANA_URL</code> on the
          backend to link it here.
        </Text>
      )}
    </Section>
  );
}

export function AdminSystemPage() {
  const {
    status,
    error,
    isLoading,
    isRefreshing,
    refresh,
    autoRefresh,
    setAutoRefresh,
  } = useSystemStatus();

  return (
    <section className={styles.page}>
      <View gap={6}>
        <header className={styles.header}>
          <View gap={1}>
            <Text as="h1" variant="featured-2" weight="bold">
              System status
            </Text>
            <Text color="neutral-faded">
              {status
                ? `Checked at ${formatTime(status.checkedAt)}.`
                : "Health of the backend and its dependencies."}
            </Text>
          </View>

          <div className={styles.controls}>
            <Button
              variant="outline"
              loading={isRefreshing}
              loadingAriaLabel="Refreshing"
              onClick={() => void refresh()}
            >
              Refresh
            </Button>
            <Button
              // Pressed state shown by the fill and the check mark too, not
              // only by aria-pressed.
              variant={autoRefresh ? "solid" : "outline"}
              color={autoRefresh ? "primary" : "neutral"}
              onClick={() => setAutoRefresh(!autoRefresh)}
              attributes={{ "aria-pressed": autoRefresh }}
            >
              <span aria-hidden="true">{autoRefresh ? "✓ " : ""}</span>
              Auto-refresh every 15 s
            </Button>
          </div>
        </header>

        {isLoading && <LoadingState label="Loading the system status" />}

        {error && (
          <ErrorState
            message={
              status
                ? `${error} The figures below are from ${formatTime(status.checkedAt)}.`
                : error
            }
            retryLabel="Retry"
            onRetry={() => void refresh()}
          />
        )}

        {status && (
          <>
            <Overview status={status} />
            <div className={styles.grid}>
              <Services status={status} />
              <Events status={status} />
            </div>
            <Queues status={status} />
            <div className={styles.grid}>
              <Activity status={status} />
              <Observability status={status} />
            </div>
            <RecentProblems status={status} />
          </>
        )}
      </View>
    </section>
  );
}
