import { useMemo, useState } from "react";

import { Button, Card, Text, View } from "reshaped";

import { useNavigate } from "react-router-dom";

import { ProjectCard } from "../components/ProjectCard";
import { ProjectForm } from "../components/ProjectForm";
import { useProjects } from "../hooks/useProjects";

import type {
  CreateProjectPayload,
  ProjectResponse,
} from "../types/project-api.types";

import styles from "./ProjectsPage.module.css";

type ProjectSort = "NEWEST" | "OLDEST" | "NAME";

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
            <Text weight="bold">
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
          <div className={styles.state} role="status">
            Loading projects...
          </div>
        )}

        {!isLoading && error && (
          <div className={styles.state}>
            <p role="alert">{error}</p>

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

        {!isLoading && !error && filteredProjects.length === 0 && (
          <div className={styles.state}>
            {projects.length === 0
              ? "No projects yet. Create your first project."
              : "No projects match your search."}
          </div>
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
