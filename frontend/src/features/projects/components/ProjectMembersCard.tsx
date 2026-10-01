import { useId, useState, type FormEvent } from "react";
import {
  Button,
  Card,
  Select,
  Skeleton,
  Text,
  TextField,
  View,
} from "reshaped";

import { ErrorState, LoadingState } from "../../../shared/components/Feedback";
import type { useProjectTeam } from "../hooks/useProjectTeam";
import type { ProjectRole } from "../types/team.types";
import { PROJECT_ROLES as ROLES, ROLE_LABELS } from "../utils/projectRoles";

import styles from "./ProjectMembersCard.module.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "?"
  );
}

type ProjectMembersCardProps = {
  isOwner: boolean;
  // Loaded by the page, which also needs the team to compute permissions.
  teamState: ReturnType<typeof useProjectTeam>;
};

export function ProjectMembersCard({
  isOwner,
  teamState,
}: ProjectMembersCardProps) {
  const {
    team,
    invitations,
    isLoading,
    error,
    isMutating,
    mutationError,
    reload,
    invite,
    cancelInvitation,
    removeMember,
    changeRole,
    resetMutationError,
  } = teamState;

  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ProjectRole>("VIEWER");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailId = useId();
  const emailErrorId = useId();

  const memberCount = team ? team.members.length + (team.owner ? 1 : 0) : 0;

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = email.trim();
    setSentTo(null);

    if (!EMAIL_PATTERN.test(trimmed)) {
      setEmailError("Enter a valid email address.");
      return;
    }

    setEmailError(null);

    if (await invite(trimmed, inviteRole)) {
      setSentTo(trimmed);
      setEmail("");
    }
  }

  return (
    <Card padding={5}>
      <View gap={4}>
        <div className={styles.member}>
          <Text as="h2" weight="bold">
            Members
          </Text>
          <View.Item grow />
          {team && <Text color="neutral-faded">{memberCount}</Text>}
        </div>

        {isLoading && (
          <LoadingState label="Loading members" className={styles.list}>
            <Skeleton height={9} borderRadius="medium" />
            <Skeleton height={9} borderRadius="medium" />
          </LoadingState>
        )}

        {!isLoading && error && (
          <ErrorState
            message={error}
            retryLabel="Retry loading members"
            onRetry={reload}
          />
        )}

        {!isLoading && !error && team && (
          <ul className={styles.list} aria-label="Project members">
            {team.owner && (
              <li className={styles.member}>
                <div
                  className={`${styles.avatar} ${styles.ownerAvatar}`}
                  aria-hidden="true"
                >
                  {initials(team.owner.name)}
                </div>
                <div className={styles.details}>
                  <strong>{team.owner.name}</strong>
                  <span>{team.owner.email}</span>
                </div>
                <span className={`${styles.role} ${styles.ownerRole}`}>
                  Owner
                </span>
              </li>
            )}

            {team.members.map((member) => (
              <li key={member.id} className={styles.member}>
                <div className={styles.avatar} aria-hidden="true">
                  {initials(member.name)}
                </div>
                <div className={styles.details}>
                  <strong>{member.name}</strong>
                  <span>{member.email}</span>
                </div>
                {isOwner ? (
                  <>
                    <div className={styles.roleSelect}>
                      <Select
                        name={`role-${member.userId}`}
                        size="small"
                        value={member.role}
                        disabled={isMutating}
                        inputAttributes={{
                          "aria-label": `Role of ${member.name}`,
                        }}
                        onChange={({ value }) => {
                          if (value !== member.role) {
                            void changeRole(
                              member.userId,
                              value as ProjectRole,
                            );
                          }
                        }}
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button
                      size="small"
                      variant="ghost"
                      color="critical"
                      disabled={isMutating}
                      attributes={{ "aria-label": `Remove ${member.name}` }}
                      onClick={() => void removeMember(member.userId)}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <span
                    className={`${styles.role} ${member.role === "EDITOR" ? styles.editorRole : ""}`}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                )}
              </li>
            ))}

            {team.members.length === 0 && (
              <li>
                <Text color="neutral-faded" variant="caption-1">
                  {isOwner
                    ? "Invite people by email to collaborate on this project."
                    : "No other members yet."}
                </Text>
              </li>
            )}
          </ul>
        )}

        {isOwner && invitations.length > 0 && (
          <View gap={3}>
            <h3 className={styles.sectionTitle}>Pending invitations</h3>
            <ul className={styles.list} aria-label="Pending invitations">
              {invitations.map((invitation) => (
                <li key={invitation.id} className={styles.member}>
                  <div
                    className={`${styles.avatar} ${styles.pendingAvatar}`}
                    aria-hidden="true"
                  >
                    {initials(invitation.invitee.name)}
                  </div>
                  <div className={styles.details}>
                    <strong>{invitation.invitee.name}</strong>
                    <span>
                      {invitation.invitee.email} ·{" "}
                      {ROLE_LABELS[invitation.role]}
                    </span>
                  </div>
                  <Button
                    size="small"
                    variant="ghost"
                    disabled={isMutating}
                    attributes={{
                      "aria-label": `Cancel invitation for ${invitation.invitee.email}`,
                    }}
                    onClick={() => void cancelInvitation(invitation.id)}
                  >
                    Cancel
                  </Button>
                </li>
              ))}
            </ul>
          </View>
        )}

        {isOwner && mutationError && !emailError && (
          <p role="alert" className={`${styles.message} ${styles.error}`}>
            {mutationError}
          </p>
        )}

        {isOwner && (
          <form
            className={styles.inviteForm}
            onSubmit={(event) => void handleInvite(event)}
            noValidate
          >
            <label htmlFor={emailId} className={styles.sectionTitle}>
              Email address to invite
            </label>
            <TextField
              id={emailId}
              name="invite-email"
              placeholder="colleague@example.com"
              value={email}
              hasError={Boolean(emailError)}
              inputAttributes={{
                type: "email",
                "aria-invalid": Boolean(emailError),
                "aria-describedby": emailError ? emailErrorId : undefined,
              }}
              onChange={({ value }) => {
                setEmail(value);
                setEmailError(null);
                setSentTo(null);
                resetMutationError();
              }}
            />

            <div className={styles.inviteRow}>
              <div
                className={styles.roleToggle}
                role="group"
                aria-label="Access for the invited member"
              >
                {ROLES.map((role) => (
                  <Button
                    key={role}
                    size="small"
                    variant={inviteRole === role ? "solid" : "outline"}
                    color={inviteRole === role ? "primary" : "neutral"}
                    attributes={{ "aria-pressed": inviteRole === role }}
                    onClick={() => setInviteRole(role)}
                  >
                    {ROLE_LABELS[role]}
                  </Button>
                ))}
              </div>
              <Button type="submit" color="primary" loading={isMutating}>
                Invite
              </Button>
            </div>

            {emailError && (
              <p
                id={emailErrorId}
                role="alert"
                className={`${styles.message} ${styles.error}`}
              >
                {emailError}
              </p>
            )}

            {sentTo && (
              <p
                role="status"
                className={`${styles.message} ${styles.success}`}
              >
                Invitation sent to {sentTo}.
              </p>
            )}
          </form>
        )}
      </View>
    </Card>
  );
}
