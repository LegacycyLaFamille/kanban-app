// GET /admin/system (backend AdminSystemService).

export type SystemHealth = "ok" | "degraded" | "down";

export type BrokerState =
  "disabled" | "connecting" | "connected" | "disconnected" | "closed";

export interface QueueStatus {
  name: string;
  role: "consumer" | "retry" | "dead_letter";
  messages: number | null;
  consumers: number | null;
}

export interface RecentProblem {
  time: string;
  level: "warn" | "error" | "fatal";
  component?: string;
  message: string;
}

export interface SystemStatus {
  checkedAt: string;
  status: SystemHealth;
  warnings: string[];
  application: {
    version: string;
    nodeVersion: string;
    environment: string;
    startedAt: string;
    uptimeSeconds: number;
    memory: { rssBytes: number; heapUsedBytes: number };
  };
  database: { status: "up" | "down"; latencyMs: number | null };
  broker: {
    state: BrokerState;
    connectedAt?: string;
    reconnectAttempt?: number;
  };
  queues: QueueStatus[];
  events: {
    since: string;
    published: { success: number; failure: number };
    consumed: {
      success: number;
      retry: number;
      dead_letter: number;
      unreadable: number;
    };
  };
  activity: {
    users: number;
    newUsersLast7Days: number;
    projects: number;
    tasks: {
      total: number;
      todo: number;
      inProgress: number;
      done: number;
      overdue: number;
      createdLast24Hours: number;
    };
    unreadNotifications: number;
  } | null;
  recentProblems: RecentProblem[];
  links: { grafanaDashboard: string | null };
}
