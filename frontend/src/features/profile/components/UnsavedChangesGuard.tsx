import { useEffect } from "react";

import { Button, Modal, View } from "reshaped";

import { useBlocker } from "react-router-dom";

import styles from "./ProfileSections.module.css";

interface UnsavedChangesGuardProps {
  when: boolean;
}

/**
 * Asks for confirmation before leaving the page with unsaved edits,
 * both for in-app navigation and for closing/reloading the tab.
 */
export function UnsavedChangesGuard({ when }: UnsavedChangesGuardProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [when]);

  const isBlocked = blocker.state === "blocked";

  return (
    <Modal
      active={isBlocked}
      onClose={() => blocker.reset?.()}
      size="420px"
      padding={6}
    >
      <View gap={5}>
        <View gap={2}>
          <Modal.Title>Discard unsaved changes?</Modal.Title>

          <Modal.Subtitle>
            You have edited your profile without saving. If you leave now, your
            changes will be lost.
          </Modal.Subtitle>
        </View>

        <div className={styles.dialogActions}>
          <Button
            variant="outline"
            color="neutral"
            onClick={() => blocker.reset?.()}
          >
            Keep editing
          </Button>

          <Button color="critical" onClick={() => blocker.proceed?.()}>
            Discard changes
          </Button>
        </div>
      </View>
    </Modal>
  );
}
