import { useAuth } from "../../auth/hooks/useAuth";

import { AccountStats } from "../components/AccountStats";
import { DangerZone } from "../components/DangerZone";
import { DataExportSection } from "../components/DataExportSection";
import { ProfileDetailsForm } from "../components/ProfileDetailsForm";

import styles from "./ProfilePage.module.css";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  const initials =
    parts.length > 1
      ? `${parts[0]![0]}${parts[parts.length - 1]![0]}`
      : (parts[0]?.slice(0, 2) ?? "");

  return initials.toUpperCase() || "?";
}

export function ProfilePage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        <header className={styles.header}>
          <div className={styles.avatar} aria-hidden="true">
            {getInitials(user.name)}
          </div>

          <div className={styles.identity}>
            <h1 className={styles.name}>{user.name}</h1>

            <p className={styles.email}>{user.email}</p>
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.column}>
            <div className={styles.details}>
              <ProfileDetailsForm user={user} />
            </div>

            <div className={styles.danger}>
              <DangerZone email={user.email} />
            </div>
          </div>

          <div className={styles.column}>
            <div className={styles.overview}>
              <AccountStats memberSince={user.createdAt} />
            </div>

            <div className={styles.data}>
              <DataExportSection />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
