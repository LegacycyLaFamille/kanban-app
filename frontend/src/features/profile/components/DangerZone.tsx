import { useState } from "react";

import { Button } from "reshaped";

import type { ChangePasswordFormValues } from "../types/profile.types";

import { ChangePasswordModal } from "./ChangePasswordModal";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { ProfileSection } from "./ProfileSection";

import styles from "./ProfileSections.module.css";

interface DangerZoneProps {
  email: string;
  onChangePassword?: (values: ChangePasswordFormValues) => Promise<void>;
  onDeleteAccount?: () => Promise<void>;
}

type ActiveModal = "password" | "delete" | null;

export function DangerZone({
  email,
  onChangePassword,
  onDeleteAccount,
}: DangerZoneProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const closeModal = () => setActiveModal(null);

  return (
    <ProfileSection
      title="Danger zone"
      description="Sensitive actions that affect your account security and data."
      tone="critical"
    >
      <div className={styles.dangerRow}>
        <div>
          <h3>Change password</h3>

          <p>Choose a new password used to sign in to your account.</p>
        </div>

        <Button variant="outline" onClick={() => setActiveModal("password")}>
          Change password
        </Button>
      </div>

      <div className={styles.dangerRow}>
        <div>
          <h3>Delete account</h3>

          <p>Permanently remove your account and all the data you own.</p>
        </div>

        <Button color="critical" onClick={() => setActiveModal("delete")}>
          Delete account
        </Button>
      </div>

      <ChangePasswordModal
        active={activeModal === "password"}
        onClose={closeModal}
        onConfirm={onChangePassword}
      />

      <DeleteAccountModal
        active={activeModal === "delete"}
        email={email}
        onClose={closeModal}
        onConfirm={onDeleteAccount}
      />
    </ProfileSection>
  );
}
