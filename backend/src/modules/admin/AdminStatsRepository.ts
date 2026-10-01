export interface AdminStats {
  users: number;
  newUsersLast7Days: number;
  projects: number;
  tasks: {
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    // Past their deadline and not done.
    overdue: number;
    createdLast24Hours: number;
  };
  unreadNotifications: number;
}

/** Application-wide counts for the admin system page. */
export interface AdminStatsRepository {
  stats(now: Date): Promise<AdminStats>;
}
