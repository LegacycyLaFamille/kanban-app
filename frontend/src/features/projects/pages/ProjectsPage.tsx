import { useMemo, useState } from "react";

import { Button, Card, Skeleton, Text, View } from "reshaped";

import { useNavigate } from "react-router-dom";

import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "../../../shared/components/Feedback";

import { PendingInvitations } from "../components/PendingInvitations";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectForm } from "../components/ProjectForm";
import { useMyInvitations } from "../hooks/useMyInvitations";
import { useProjects } from "../hooks/useProjects";

import type {
  CreateProjectPayload,
  ProjectResponse,
} from "../types/project-api.types";

import styles from "./ProjectsPage.module.css";

type ProjectSort = "NEWEST" | "OLDEST" | "NAME";

const PROJECT_PLACEHOLDERS = ["first", "second", "third"];

export function ProjectsPage() {
  const navigate = useNavigate();

  const {
    projects,
    isLoading,
    isCreating,
    error,
    mutationError,
    reload,
    createProject,
    resetMutationError,
  } = useProjects();

  // Accepting an invitation adds a project: refresh the list.
  const invitations = useMyInvitations(reload);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<ProjectSort>("NEWEST");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...projects]
      .filter((project) => {
        return (
          project.name.toLowerCase().includes(normalizedSearch) ||
          project.description.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        switch (sort) {
          case "NAME":
            return a.name.localeCompare(b.name);

          case "OLDEST":
            return (
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

          case "NEWEST":
          default:
            return (
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        }
      });
  }, [projects, search, sort]);

  function openCreateForm() {
    resetMutationError();
    setIsCreateOpen(true);
  }

  function closeCreateForm() {
    resetMutationError();
    setIsCreateOpen(false);
  }

  async function handleCreateProject(
    payload: CreateProjectPayload,
  ): Promise<boolean> {
    const createdProject: ProjectResponse | null = await createProject(payload);

    if (!createdProject) {
      return false;
    }

    setIsCreateOpen(false);

    navigate(`/projects/${createdProject.id}`);

    return true;
  }

  return (
    <section className={styles.page}>
      <View gap={7}>
        <header className={styles.header}>
          <div>
            <Text as="h1" weight="bold">
              <span className={styles.pageTitle}>Projects</span>
            </Text>

            <Text color="neutral-faded">
              Manage your projects and keep your work organized.
            </Text>
          </div>

          <div className={styles.headerActions}>
            <div className={styles.search}>
              <span className={styles.searchIcon} aria-hidden="true">
                ⌕
              </span>

              <input
                type="search"
                value={search}
                placeholder="Search projects..."
                aria-label="Search projects"
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <Button
              color="primary"
              onClick={() => {
                if (isCreateOpen) {
                  closeCreateForm();
                } else {
                  openCreateForm();
                }
              }}
            >
              {isCreateOpen ? "Close form" : "+ New Project"}
            </Button>
          </div>
        </header>

        <PendingInvitations
          invitations={invitations.invitations}
          pendingId={invitations.pendingId}
          error={invitations.error}
          onAccept={(id) => void invitations.accept(id)}
          onDecline={(id) => void invitations.decline(id)}
        />

        {isCreateOpen && (
          <Card padding={5}>
            <ProjectForm
              title="Create project"
              submitLabel="Create project"
              isSubmitting={isCreating}
              serverError={mutationError}
              onSubmit={handleCreateProject}
              onCancel={closeCreateForm}
            />
          </Card>
        )}

        <div className={styles.toolbar}>
          <Text color="neutral-faded">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </Text>

          <label className={styles.sort}>
            <span>Sort by</span>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as ProjectSort);
              }}
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="NAME">Name</option>
            </select>
          </label>
        </div>

        {isLoading && (
          <LoadingState label="Loading projects" className={styles.grid}>
            {PROJECT_PLACEHOLDERS.map((key) => (
              <Skeleton key={key} height={45} borderRadius="medium" />
            ))}
          </LoadingState>
        )}

        {!isLoading && error && (
          <ErrorState
            size="page"
            title="Unable to load projects"
            message={error}
            onRetry={() => {
              void reload();
            }}
          />
        )}

        {!isLoading && !error && projects.length === 0 && (
          <EmptyState
            size="page"
            title="No projects yet"
            description="Create your first project to start organizing your work."
            action={
              !isCreateOpen && (
                <Button color="primary" onClick={openCreateForm}>
                  Create your first project
                </Button>
              )
            }
          />
        )}

        {!isLoading &&
          !error &&
          projects.length > 0 &&
          filteredProjects.length === 0 && (
            <EmptyState
              size="page"
              title="No projects match your search."
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          )}

        {!isLoading && !error && filteredProjects.length > 0 && (
          <div className={styles.grid}>
            {filteredProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                accentIndex={index}
              />
            ))}
          </div>
        )}
      </View>
    </section>
  );
}
