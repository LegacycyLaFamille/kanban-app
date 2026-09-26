import { useState } from "react";

import { Button, Card, Text, View } from "reshaped";

import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import { ProjectForm } from "../components/ProjectForm";
import { useProjectDetails } from "../hooks/useProjectDetails";

import type { CreateProjectPayload } from "../types/project-api.types";

import styles from "./ProjectDetailsPage.module.css";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function ProjectDetailsPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const { user } = useAuth();

  const {
    project,
    isLoading,
    notFound,
    error,
    isSaving,
    isDeleting,
    mutationError,
    reload,
    saveProject,
    removeProject,
    resetMutationError,
  } = useProjectDetails(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  if (isLoading) {
    return (
      <section className={styles.page}>
        <div className={styles.state} role="status">
          Loading project...
        </div>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className={styles.page}>
        <div className={styles.state}>
          <h1>Project not found</h1>

          <p>This project does not exist or is no longer available.</p>

          <Button onClick={() => navigate("/projects")}>
            Back to projects
          </Button>
        </div>
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className={styles.page}>
        <div className={styles.state}>
          <h1>Unable to load project</h1>

          <p role="alert">{error || "The project could not be loaded."}</p>

          <Button
            variant="outline"
            onClick={() => {
              void reload();
            }}
          >
            Retry
          </Button>
        </div>
      </section>
    );
  }

  const isOwner = user?.id === project.ownerId;

  function openEditForm() {
    resetMutationError();
    setIsConfirmingDelete(false);
    setIsEditing(true);
  }

  function openDeleteConfirmation() {
    resetMutationError();
    setIsEditing(false);
    setIsConfirmingDelete(true);
  }

  async function handleSave(payload: CreateProjectPayload): Promise<boolean> {
    const updatedProject = await saveProject(payload);

    if (!updatedProject) {
      return false;
    }

    setIsEditing(false);

    return true;
  }

  async function handleDelete(): Promise<void> {
    const deleted = await removeProject();

    if (deleted) {
      navigate("/projects", { replace: true });
    }
  }

  return (
    <section className={styles.page}>
      <View gap={7}>
        <button
          type="button"
          className={styles.back}
          onClick={() => navigate("/projects")}
        >
          ← Back to projects
        </button>

        <header className={styles.header}>
          <div className={styles.projectHeading}>
            <div className={styles.projectIcon} aria-hidden="true">
              <span />
              <span />
            </div>

            <div>
              <div className={styles.titleLine}>
                <h1>{project.name}</h1>
              </div>

              <p className={styles.description}>
                {project.description || "No description provided."}
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            {isOwner && (
              <>
                <Button
                  variant="outline"
                  disabled={isSaving || isDeleting}
                  onClick={openEditForm}
                >
                  Edit project
                </Button>

                <Button
                  variant="outline"
                  disabled={isSaving || isDeleting}
                  onClick={openDeleteConfirmation}
                >
                  Delete project
                </Button>
              </>
            )}

            {project.boards.length > 0 && (
              <Button
                color="primary"
                onClick={() => navigate(`/projects/${project.id}/kanban`)}
              >
                Open board
              </Button>
            )}
          </div>
        </header>

        {isEditing && isOwner && (
          <Card padding={5}>
            <ProjectForm
              key={project.id}
              title="Edit project"
              submitLabel="Save changes"
              initialValues={{
                name: project.name,
                description: project.description,
              }}
              isSubmitting={isSaving}
              serverError={mutationError}
              onSubmit={handleSave}
              onCancel={() => {
                resetMutationError();
                setIsEditing(false);
              }}
            />
          </Card>
        )}

        {isConfirmingDelete && isOwner && (
          <Card padding={5}>
            <View gap={3}>
              <div role="group" aria-label={`Delete project ${project.name}`}>
                <Text weight="bold">Delete project?</Text>

                <p className={styles.description}>
                  Are you sure you want to delete "{project.name}"? This action
                  cannot be undone.
                </p>
              </div>

              {mutationError && (
                <p role="alert" className={styles.description}>
                  {mutationError}
                </p>
              )}

              <div className={styles.actions}>
                <Button
                  variant="outline"
                  disabled={isDeleting}
                  onClick={() => {
                    resetMutationError();
                    setIsConfirmingDelete(false);
                  }}
                >
                  Cancel
                </Button>

                <Button
                  color="critical"
                  loading={isDeleting}
                  loadingAriaLabel="Deleting project"
                  onClick={() => {
                    void handleDelete();
                  }}
                >
                  Confirm deletion
                </Button>
              </div>
            </View>
          </Card>
        )}

        <div className={styles.mainGrid}>
          <div className={styles.mainColumn}>
            <Card padding={5}>
              <View gap={4}>
                <Text weight="bold">Project overview</Text>

                <p className={styles.description}>
                  {project.description || "No description provided."}
                </p>
              </View>
            </Card>

            <Card padding={5}>
              <View gap={4}>
                <div className={styles.sectionHeader}>
                  <Text weight="bold">Boards</Text>

                  <Text color="neutral-faded">
                    {project.boards.length}{" "}
                    {project.boards.length === 1 ? "board" : "boards"}
                  </Text>
                </div>

                {project.boards.length === 0 ? (
                  <div className={styles.empty}>No boards yet.</div>
                ) : (
                  <div className={styles.memberList}>
                    {project.boards.map((board) => (
                      <div key={board.id} className={styles.member}>
                        <div className={styles.avatar} aria-hidden="true">
                          {board.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <strong>{board.name}</strong>

                          <span>Created {formatDate(board.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </View>
            </Card>
          </div>

          <aside className={styles.sideColumn}>
            <Card padding={5}>
              <View gap={4}>
                <Text weight="bold">Project information</Text>

                <div className={styles.information}>
                  <div>
                    <span>Owner</span>

                    <strong>{isOwner ? user?.name : project.ownerId}</strong>
                  </div>

                  <div>
                    <span>Created</span>

                    <strong>{formatDate(project.createdAt)}</strong>
                  </div>

                  <div>
                    <span>Project ID</span>

                    <strong>{project.id}</strong>
                  </div>
                </div>
              </View>
            </Card>
          </aside>
        </div>
      </View>
    </section>
  );
}
