import { type FormEvent, useState } from "react";

import {
  Button,
  Checkbox,
  Modal,
  Radio,
  RadioGroup,
  Skeleton,
  View,
} from "reshaped";

import { useDataExport } from "../hooks/useDataExport";
import { useOwnedProjects } from "../hooks/useOwnedProjects";

import type {
  DataExportOptions,
  ExportFormat,
  ExportLayout,
  ExportScope,
} from "../types/profile.types";

import styles from "./ProfileSections.module.css";

interface DataExportModalProps {
  active: boolean;
  onClose: () => void;
  onExported: () => void;
}

export function DataExportModal({
  active,
  onClose,
  onExported,
}: DataExportModalProps) {
  return (
    <Modal active={active} onClose={onClose} size="520px" padding={6}>
      <DataExportForm onClose={onClose} onExported={onExported} />
    </Modal>
  );
}

interface DataExportFormProps {
  onClose: () => void;
  onExported: () => void;
}

function DataExportForm({ onClose, onExported }: DataExportFormProps) {
  const { projects, isLoading, error: loadError, reload } = useOwnedProjects();

  const { exportData, isExporting, error: exportError } = useDataExport();

  const [scope, setScope] = useState<ExportScope>("all");
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [layout, setLayout] = useState<ExportLayout>("single");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const hasProjects = projects.length > 0;
  const selectedCount = selectedIds.size;
  const allSelected = hasProjects && selectedCount === projects.length;

  const canExport =
    !isLoading &&
    !loadError &&
    hasProjects &&
    (scope === "all" || selectedCount > 0);

  function toggleProject(projectId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(projectId);
      } else {
        next.delete(projectId);
      }

      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(
      checked ? new Set(projects.map((project) => project.id)) : new Set(),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canExport || isExporting) {
      return;
    }

    const options: DataExportOptions =
      scope === "selected" && !allSelected
        ? { format, layout, projectIds: [...selectedIds] }
        : { format, layout };

    if (await exportData(options)) {
      onExported();
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <View gap={1}>
        <Modal.Title>Export your data</Modal.Title>

        <Modal.Subtitle>
          Download a copy of the projects you own, with their boards and tasks.
          People are listed by their role (owner or member), never by name or
          email.
        </Modal.Subtitle>
      </View>

      {exportError && (
        <div className={styles.errorMessage} role="alert">
          {exportError}
        </div>
      )}

      <fieldset className={styles.fieldset}>
        <legend>Projects</legend>

        {isLoading && (
          <View gap={2} attributes={{ "aria-label": "Loading your projects" }}>
            <Skeleton height={6} borderRadius="medium" />
            <Skeleton height={6} borderRadius="medium" />
          </View>
        )}

        {!isLoading && loadError && (
          <div className={styles.state}>
            <p role="alert">{loadError}</p>

            <Button
              variant="outline"
              onClick={() => {
                void reload();
              }}
            >
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !loadError && !hasProjects && (
          <p className={styles.hint}>
            You don&apos;t own any projects yet, so there is nothing to export.
          </p>
        )}

        {!isLoading && !loadError && hasProjects && (
          <>
            <RadioGroup
              name="scope"
              value={scope}
              onChange={({ value }) => setScope(value as ExportScope)}
            >
              <View gap={2}>
                <Radio value="all">
                  All owned projects ({projects.length})
                </Radio>

                <Radio value="selected">Select projects</Radio>
              </View>
            </RadioGroup>

            {scope === "selected" && (
              <div className={styles.projectPicker}>
                <div className={styles.projectPickerHeader}>
                  <Checkbox
                    name="selectAll"
                    checked={allSelected}
                    indeterminate={selectedCount > 0 && !allSelected}
                    onChange={({ checked }) => toggleAll(checked)}
                  >
                    Select all
                  </Checkbox>

                  <span aria-live="polite">
                    {selectedCount === 0
                      ? "Select at least one project to export."
                      : `${selectedCount} of ${projects.length} selected`}
                  </span>
                </div>

                <ul
                  className={styles.projectList}
                  aria-label="Projects to export"
                >
                  {projects.map((project) => (
                    <li key={project.id}>
                      <Checkbox
                        name="projectIds"
                        value={project.id}
                        checked={selectedIds.has(project.id)}
                        onChange={({ checked }) =>
                          toggleProject(project.id, checked)
                        }
                      >
                        <span className={styles.breakAnywhere}>
                          {project.name}
                        </span>
                      </Checkbox>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>File type</legend>

        <RadioGroup
          name="format"
          value={format}
          onChange={({ value }) => setFormat(value as ExportFormat)}
        >
          <View gap={3}>
            <Radio value="csv">
              <span className={styles.optionLabel}>CSV</span>
              <span className={styles.optionDescription}>
                Opens in Excel, Google Sheets or Numbers.
              </span>
            </Radio>

            <Radio value="json">
              <span className={styles.optionLabel}>JSON</span>
              <span className={styles.optionDescription}>
                Structured data for developers and other apps.
              </span>
            </Radio>
          </View>
        </RadioGroup>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <legend>Files</legend>

        <RadioGroup
          name="layout"
          value={layout}
          onChange={({ value }) => setLayout(value as ExportLayout)}
        >
          <View gap={3}>
            <Radio value="single">
              <span className={styles.optionLabel}>Single file</span>
              <span className={styles.optionDescription}>
                All selected projects in one file.
              </span>
            </Radio>

            <Radio value="per-project">
              <span className={styles.optionLabel}>One file per project</span>
              <span className={styles.optionDescription}>
                Downloaded together as a .zip archive.
              </span>
            </Radio>
          </View>
        </RadioGroup>
      </fieldset>

      <div className={styles.dialogActions}>
        <Button
          variant="outline"
          color="neutral"
          disabled={isExporting}
          onClick={onClose}
        >
          Cancel
        </Button>

        <Button
          color="primary"
          disabled={!canExport}
          loading={isExporting}
          loadingAriaLabel="Preparing your export"
          type="submit"
        >
          Export
        </Button>
      </div>
    </form>
  );
}
