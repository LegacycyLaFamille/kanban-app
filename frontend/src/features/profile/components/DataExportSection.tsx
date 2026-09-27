import { useEffect, useState } from "react";

import { Button } from "reshaped";

import { DataExportModal } from "./DataExportModal";
import { ProfileSection } from "./ProfileSection";

import styles from "./ProfileSections.module.css";

const SUCCESS_MESSAGE_DURATION = 5000;

export function DataExportSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExported, setIsExported] = useState(false);

  useEffect(() => {
    if (!isExported) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsExported(false);
    }, SUCCESS_MESSAGE_DURATION);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [isExported]);

  return (
    <ProfileSection
      title="Your data"
      description="Download a copy of the projects and tasks you own, as CSV or JSON."
    >
      <div aria-live="polite">
        {isExported && (
          <div className={styles.successMessage} role="status">
            Your export has been downloaded.
          </div>
        )}
      </div>

      <div className={styles.sectionAction}>
        <Button
          variant="outline"
          onClick={() => {
            setIsExported(false);
            setIsModalOpen(true);
          }}
        >
          Export my data
        </Button>
      </div>

      <DataExportModal
        active={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExported={() => {
          setIsModalOpen(false);
          setIsExported(true);
        }}
      />
    </ProfileSection>
  );
}
