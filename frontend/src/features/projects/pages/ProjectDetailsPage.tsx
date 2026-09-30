import { useState } from "react";

import { Button, Card, Text, View } from "reshaped";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../auth/hooks/useAuth";

import { BoardForm } from "../components/BoardForm";
import { ProjectForm } from "../components/ProjectForm";

import { useBoards } from "../hooks/useBoards";
import { useProjectDetails } from "../hooks/useProjectDetails";

import type {
  CreateBoardPayload,
  CreateProjectPayload,
  ProjectBoard,
} from "../types/project-api.types";

import boardLinkStyles from "../components/BoardLink.module.css";
import styles from "./ProjectDetailsPage.module.css";

type BoardFormState =
  { kind: "create" } | { kind: "edit"; board: ProjectBoard };

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

  const {
    boards,
    isLoading: boardsLoading,
    error: boardsError,
    isMutating: isMutatingBoard,
    mutationError: boardMutationError,
    reload: reloadBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    resetMutationError: resetBoardMutationError,
  } = useBoards(projectId);

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [boardForm, setBoardForm] = useState<BoardFormState | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<ProjectBoard | null>(null);

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

  function openEditProject() {
    resetMutationError();
    resetBoardMutationError();

    setBoardForm(null);
    setBoardToDelete(null);
    setIsConfirmingDelete(false);
    setIsEditing(true);
  }

  function openDeleteProject() {
    resetMutationError();
    resetBoardMutationError();

    setBoardForm(null);
    setBoardToDelete(null);
    setIsEditing(false);
    setIsConfirmingDelete(true);
  }

  function openCreateBoard() {
    resetBoardMutationError();

    setIsEditing(false);
    setIsConfirmingDelete(false);
    setBoardToDelete(null);
    setBoardForm({ kind: "create" });
  }

  function openEditBoard(board: ProjectBoard) {
    resetBoardMutationError();

    setIsEditing(false);
    setIsConfirmingDelete(false);
    setBoardToDelete(null);
    setBoardForm({ kind: "edit", board });
  }

  function openDeleteBoard(board: ProjectBoard) {
    resetBoardMutationError();

    setIsEditing(false);
    setIsConfirmingDelete(false);
    setBoardForm(null);
    setBoardToDelete(board);
  }

  async function handleSaveProject(
    payload: CreateProjectPayload,
  ): Promise<boolean> {
    const updatedProject = await saveProject(payload);

    if (!updatedProject) {
      return false;
    }

    setIsEditing(false);
    return true;
  }

  async function handleDeleteProject(): Promise<void> {
    const deleted = await removeProject();

    if (deleted) {
      navigate("/projects", { replace: true });
    }
  }

  async function handleBoardSubmit(
    payload: CreateBoardPayload,
  ): Promise<boolean> {
    if (!boardForm) {
      return false;
    }

    const result =
      boardForm.kind === "create"
        ? await createBoard(payload)
        : await updateBoard(boardForm.board.id, payload);

    if (!result) {
      return false;
    }

    setBoardForm(null);
    return true;
  }

  async function handleDeleteBoard(): Promise<void> {
    if (!boardToDelete) {
      return;
    }

    const deleted = await deleteBoard(boardToDelete.id);

    if (deleted) {
      setBoardToDelete(null);
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
                  onClick={openEditProject}
                >
                  Edit project
                </Button>

                <Button
                  variant="outline"
                  color="critical"
                  disabled={isSaving || isDeleting}
                  onClick={openDeleteProject}
                >
                  Delete project
                </Button>
              </>
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
              onSubmit={handleSaveProject}
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
                    void handleDeleteProject();
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

                  <div className={styles.actions}>
                    {!boardsLoading && !boardsError && (
                      <Text color="neutral-faded">
                        {boards.length}{" "}
                        {boards.length === 1 ? "board" : "boards"}
                      </Text>
                    )}

                    {isOwner && !boardForm && (
                      <Button
                        variant="ghost"
                        disabled={boardsLoading || isMutatingBoard}
                        onClick={openCreateBoard}
                      >
                        + New board
                      </Button>
                    )}
                  </div>
                </div>

                {isOwner && boardForm && (
                  <BoardForm
                    key={
                      boardForm.kind === "create"
                        ? "create-board"
                        : boardForm.board.id
                    }
                    title={
                      boardForm.kind === "create"
                        ? "Create board"
                        : "Rename board"
                    }
                    submitLabel={
                      boardForm.kind === "create"
                        ? "Create board"
                        : "Save changes"
                    }
                    initialName={
                      boardForm.kind === "edit" ? boardForm.board.name : ""
                    }
                    isSubmitting={isMutatingBoard}
                    serverError={boardMutationError}
                    onSubmit={handleBoardSubmit}
                    onCancel={() => {
                      resetBoardMutationError();
                      setBoardForm(null);
                    }}
                  />
                )}

                {isOwner && boardToDelete && (
                  <div
                    role="group"
                    aria-label={`Delete board ${boardToDelete.name}`}
                  >
                    <Text weight="bold">
                      Delete board "{boardToDelete.name}"?
                    </Text>

                    <p className={styles.description}>
                      This action cannot be undone.
                    </p>

                    {boardMutationError && (
                      <p role="alert" className={styles.description}>
                        {boardMutationError}
                      </p>
                    )}

                    <div className={styles.actions}>
                      <Button
                        variant="outline"
                        disabled={isMutatingBoard}
                        onClick={() => {
                          resetBoardMutationError();
                          setBoardToDelete(null);
                        }}
                      >
                        Cancel
                      </Button>

                      <Button
                        color="critical"
                        loading={isMutatingBoard}
                        loadingAriaLabel="Deleting board"
                        onClick={() => {
                          void handleDeleteBoard();
                        }}
                      >
                        Confirm board deletion
                      </Button>
                    </div>
                  </div>
                )}

                {boardsLoading && (
                  <div className={styles.empty} role="status">
                    Loading boards...
                  </div>
                )}

                {!boardsLoading && boardsError && (
                  <div className={styles.empty}>
                    <p role="alert">{boardsError}</p>

                    <Button
                      variant="outline"
                      onClick={() => {
                        void reloadBoards();
                      }}
                    >
                      Retry loading boards
                    </Button>
                  </div>
                )}

                {!boardsLoading && !boardsError && boards.length === 0 && (
                  <div className={styles.empty}>No boards yet.</div>
                )}

                {!boardsLoading && !boardsError && boards.length > 0 && (
                  <div className={styles.memberList}>
                    {boards.map((board) => (
                      <div key={board.id} className={styles.member}>
                        <Link
                          className={boardLinkStyles.link}
                          to={`/projects/${encodeURIComponent(project.id)}/kanban?boardId=${encodeURIComponent(board.id)}`}
                          aria-label={`Open board ${board.name}`}
                        >
                          <div className={styles.avatar} aria-hidden="true">
                            {board.name.charAt(0).toUpperCase()}
                          </div>

                          <div className={boardLinkStyles.details}>
                            <strong>{board.name}</strong>
                            <span>Created {formatDate(board.createdAt)}</span>
                          </div>
                        </Link>

                        {isOwner && (
                          <div className={styles.actions}>
                            <Button
                              variant="ghost"
                              disabled={isMutatingBoard}
                              onClick={() => openEditBoard(board)}
                            >
                              Rename {board.name}
                            </Button>

                            <Button
                              variant="ghost"
                              color="critical"
                              disabled={isMutatingBoard}
                              onClick={() => openDeleteBoard(board)}
                            >
                              Delete {board.name}
                            </Button>
                          </div>
                        )}
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
