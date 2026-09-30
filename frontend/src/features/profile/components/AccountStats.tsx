import { Button, Skeleton } from "reshaped";

import { useNavigate } from "react-router-dom";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/Feedback";

import { useProfileStats } from "../hooks/useProfileStats";

import { ProfileSection } from "./ProfileSection";

import styles from "./ProfileSections.module.css";

interface AccountStatsProps {
  memberSince?: string | undefined;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const numberFormatter = new Intl.NumberFormat("en-GB");

const STAT_PLACEHOLDERS = ["projects", "tasks", "in-progress", "completed"];

export function AccountStats({ memberSince }: AccountStatsProps) {
  const navigate = useNavigate();

  const { stats, isLoading, error, reload } = useProfileStats();

  const statItems = stats
    ? [
        { label: "Projects", value: stats.projectCount },
        { label: "Tasks", value: stats.taskCount },
        { label: "In progress", value: stats.tasksByStatus.IN_PROGRESS ?? 0 },
        { label: "Completed", value: stats.tasksByStatus.DONE ?? 0 },
      ]
    : [];

  return (
    <ProfileSection
      title="Account overview"
      description="A summary of your activity across the projects you own."
    >
      {memberSince && (
        <dl className={styles.memberSince}>
          <dt>Member since</dt>

          <dd>
            <time dateTime={memberSince}>
              {dateFormatter.format(new Date(memberSince))}
            </time>
          </dd>
        </dl>
      )}

      {isLoading && (
        <LoadingState
          label="Loading your activity"
          className={styles.statsGrid}
        >
          {STAT_PLACEHOLDERS.map((key) => (
            <Skeleton key={key} height={19} borderRadius="medium" />
          ))}
        </LoadingState>
      )}

      {!isLoading && error && (
        <ErrorState
          message={error}
          onRetry={() => {
            void reload();
          }}
        />
      )}

      {!isLoading && !error && stats?.projectCount === 0 && (
        <EmptyState
          title="You don't own any projects yet."
          action={
            <Button variant="outline" onClick={() => navigate("/projects")}>
              Go to projects
            </Button>
          }
        />
      )}

      {!isLoading && !error && stats && stats.projectCount > 0 && (
        <dl className={styles.statsGrid}>
          {statItems.map((item) => (
            <div key={item.label} className={styles.stat}>
              <dt>{item.label}</dt>

              <dd>{numberFormatter.format(item.value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </ProfileSection>
  );
}
