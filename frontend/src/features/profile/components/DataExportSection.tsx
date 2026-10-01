import { useEffect, useState } from "react";

import { Button } from "reshaped";

import { saveFile } from "../../../shared/utils/saveFile";

import { downloadPersonalData } from "../api/dataExport.api";

import { DataExportModal } from "./DataExportModal";
import { ProfileSection } from "./ProfileSection";

import styles from "./ProfileSections.module.css";

const SUCCESS_MESSAGE_DURATION = 5000;

export function DataExportSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExported, setIsExported] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handlePersonalDataDownload() {
    try {
      setIsDownloading(true);
      setIsExported(false);
      setDownloadError(null);

      const blob = await downloadPersonalData();
      const date = new Date().toISOString().slice(0, 10);

      saveFile(blob, `kanban-personal-data-${date}.json`);
      setIsExported(true);
    } catch {
      setDownloadError(
        "Unable to download your personal data. Please try again.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

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
      description="Download a copy of the projects, boards and tasks you own, or of all the personal data we hold about you."
    >
      <div aria-live="polite">
        {isExported && (
          <div className={styles.successMessage} role="status">
            Your export has been downloaded.
          </div>
        )}
      </div>

      {downloadError && (
        <div className={styles.errorMessage} role="alert">
          {downloadError}
        </div>
      )}

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

        <Button
          variant="ghost"
          loading={isDownloading}
          loadingAriaLabel="Downloading your personal data"
          onClick={handlePersonalDataDownload}
        >
          Download my personal data
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
