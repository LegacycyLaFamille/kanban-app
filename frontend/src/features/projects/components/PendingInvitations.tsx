import { Button, Card, Text, View } from "reshaped";

import type { ProjectInvitation } from "../types/team.types";
import { ROLE_LABELS } from "../utils/projectRoles";

import styles from "./ProjectMembersCard.module.css";

type PendingInvitationsProps = {
  invitations: ProjectInvitation[];
  pendingId: string | null;
  error: string | null;
  onAccept: (invitationId: string) => void;
  onDecline: (invitationId: string) => void;
};

export function PendingInvitations({
  invitations,
  pendingId,
  error,
  onAccept,
  onDecline,
}: PendingInvitationsProps) {
  if (invitations.length === 0) return null;

  return (
    <Card padding={5}>
      <View gap={4}>
        <Text weight="bold">Project invitations ({invitations.length})</Text>

        {error && (
          <p role="alert" className={`${styles.message} ${styles.error}`}>
            {error}
          </p>
        )}

        <ul className={styles.list} aria-label="Project invitations">
          {invitations.map((invitation) => {
            const isPending = pendingId === invitation.id;

            return (
              <li key={invitation.id} className={styles.member}>
                <div
                  className={`${styles.avatar} ${styles.ownerAvatar}`}
                  aria-hidden="true"
                >
                  {invitation.project.name.charAt(0).toUpperCase()}
                </div>
                <div className={styles.details}>
                  <strong>{invitation.project.name}</strong>
                  <span>
                    Invited by {invitation.inviter.name} ·{" "}
                    {ROLE_LABELS[invitation.role]}
                  </span>
                </div>
                <Button
                  size="small"
                  variant="ghost"
                  disabled={pendingId !== null}
                  attributes={{
                    "aria-label": `Decline invitation to ${invitation.project.name}`,
                  }}
                  onClick={() => onDecline(invitation.id)}
                >
                  Decline
                </Button>
                <Button
                  size="small"
                  color="primary"
                  loading={isPending}
                  disabled={pendingId !== null && !isPending}
                  attributes={{
                    "aria-label": `Accept invitation to ${invitation.project.name}`,
                  }}
                  onClick={() => onAccept(invitation.id)}
                >
                  Accept
                </Button>
              </li>
            );
          })}
        </ul>
      </View>
    </Card>
  );
}
