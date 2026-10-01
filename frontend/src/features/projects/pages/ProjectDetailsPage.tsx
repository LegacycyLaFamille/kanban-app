import { useState } from "react";

import { Button, Card, Skeleton, Text, View } from "reshaped";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/Feedback";

import { useAuth } from "../../auth/hooks/useAuth";

import { BoardForm } from "../components/BoardForm";
import { ProjectForm } from "../components/ProjectForm";
import { ProjectMembersCard } from "../components/ProjectMembersCard";

import { getPermission } from "../api/team.api";
import { useBoards } from "../hooks/useBoards";
import { useProjectDetails } from "../hooks/useProjectDetails";
import { useProjectTeam } from "../hooks/useProjectTeam";

import type {
  CreateBoardPayload,
  CreateProjectPayload,
  ProjectBoard,
} from "../types/project-api.types";

import boardLinkStyles from "../components/BoardLink.module.css";
import styles from "./ProjectDetailsPage.module.css";

type BoardFormState =
  { kind: "create" } | { kind: "edit"; board: ProjectBoard };

const BOARD_PLACEHOLDERS = ["first", "second", "third"];

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

  // Pending invitations are only listed for the owner.
  const teamState = useProjectTeam(projectId, {
    withInvitations: Boolean(project && user?.id === project.ownerId),
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const [boardForm, setBoardForm] = useState<BoardFormState | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<ProjectBoard | null>(null);

  if (isLoading) {
    return (
      <section className={styles.page}>
        <LoadingState label="Loading project">
          <View gap={7}>
            <Skeleton height={20} borderRadius="medium" />

            <div className={styles.mainGrid}>
              <Skeleton height={80} borderRadius="medium" />
              <Skeleton height={50} borderRadius="medium" />
            </div>
          </View>
        </LoadingState>
      </section>
    );
  }

  if (notFound) {
    return (
      <section className={styles.page}>
        <EmptyState
          size="page"
          title="Project not found"
          description="This project does not exist or is no longer available."
          action={
            <Button onClick={() => navigate("/projects")}>
              Back to projects
            </Button>
          }
        />
      </section>
    );
  }

  if (error || !project) {
    return (
      <section className={styles.page}>
        <ErrorState
          size="page"
          title="Unable to load project"
          message={error || "The project could not be loaded."}
          onRetry={() => {
            void reload();
          }}
          action={
            <Button variant="ghost" onClick={() => navigate("/projects")}>
              Back to projects
            </Button>
          }
        />
      </section>
    );
  }

  const isOwner = user?.id === project.ownerId;
  // Owner or EDITOR member: may manage boards (project settings and members
  // stay owner-only).
  const permission =
    teamState.team && user ? getPermission(teamState.team, user.id) : null;
  const canEditBoards = isOwner || permission === "editor";

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
        <Link to="/projects" className={styles.back}>
          <span aria-hidden="true">←</span> Back to projects
        </Link>

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

                    {canEditBoards && !boardForm && (
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

                {canEditBoards && boardForm && (
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

                {canEditBoards && boardToDelete && (
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
                  <LoadingState
                    label="Loading boards"
                    className={styles.memberList}
                  >
                    {BOARD_PLACEHOLDERS.map((key) => (
                      <Skeleton key={key} height={9} borderRadius="medium" />
                    ))}
                  </LoadingState>
                )}

                {!boardsLoading && boardsError && (
                  <ErrorState
                    message={boardsError}
                    retryLabel="Retry loading boards"
                    onRetry={() => {
                      void reloadBoards();
                    }}
                  />
                )}

                {!boardsLoading && !boardsError && boards.length === 0 && (
                  <EmptyState
                    title="No boards yet."
                    description={
                      canEditBoards
                        ? "Create a board to start adding tasks."
                        : "The project owner has not created any boards yet."
                    }
                    action={
                      canEditBoards &&
                      !boardForm && (
                        <Button
                          variant="outline"
                          disabled={isMutatingBoard}
                          onClick={openCreateBoard}
                        >
                          Create your first board
                        </Button>
                      )
                    }
                  />
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

                        {canEditBoards && (
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
                    <strong>
                      {teamState.team?.owner?.name ??
                        (isOwner ? user?.name : project.ownerId)}
                    </strong>
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

            <ProjectMembersCard isOwner={isOwner} teamState={teamState} />
          </aside>
        </div>
      </View>
    </section>
  );
}
