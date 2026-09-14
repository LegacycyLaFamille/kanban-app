import { useMemo, useState } from "react";

import { Button, Text, View } from "reshaped";

import { useNavigate } from "react-router-dom";

import { ProjectCard } from "../components/ProjectCard";
import { useProjects } from "../hooks/useProjects";

import type { Project, ProjectStatus } from "../types/project.types";

import styles from "./ProjectsPage.module.css";

type ProjectFilter = "ALL" | ProjectStatus;

type ProjectSort = "UPDATED" | "NAME" | "PROGRESS";

export function ProjectsPage() {
  const navigate = useNavigate();

  const { projects, isLoading, isCreating, error, reload, createProject } =
    useProjects();

  const [filter, setFilter] = useState<ProjectFilter>("ALL");

  const [search, setSearch] = useState("");

  const [sort, setSort] = useState<ProjectSort>("UPDATED");

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return [...projects]
      .filter((project) => {
        if (filter !== "ALL" && project.status !== filter) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return (
          project.name.toLowerCase().includes(normalizedSearch) ||
          project.description.toLowerCase().includes(normalizedSearch)
        );
      })
      .sort((a, b) => {
        switch (sort) {
          case "NAME":
            return a.name.localeCompare(b.name);

          case "PROGRESS":
            return b.progress - a.progress;

          case "UPDATED":
          default:
            return (
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        }
      });
  }, [filter, projects, search, sort]);

  const activeCount = projects.filter(
    (project) => project.status === "ACTIVE",
  ).length;

  const archivedCount = projects.filter(
    (project) => project.status === "ARCHIVED",
  ).length;

  const handleProjectClick = (project: Project) => {
    navigate(`/projects/${project.id}`);
  };

  const handleCreateProject = async () => {
    const project = await createProject({
      name: "Untitled project",
      description: "New project",
    });

    if (project) {
      navigate(`/projects/${project.id}`);
    }
  };

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
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
            </div>

            <Button
              color="primary"
              loading={isCreating}
              loadingAriaLabel="Creating project"
              onClick={() => {
                void handleCreateProject();
              }}
            >
              + New Project
            </Button>
          </div>
        </header>

        <div className={styles.toolbar}>
          <div className={styles.filters}>
            <button
              type="button"
              className={filter === "ALL" ? styles.filterActive : styles.filter}
              onClick={() => setFilter("ALL")}
            >
              All
              <span>{projects.length}</span>
            </button>

            <button
              type="button"
              className={
                filter === "ACTIVE" ? styles.filterActive : styles.filter
              }
              onClick={() => setFilter("ACTIVE")}
            >
              Active
              <span>{activeCount}</span>
            </button>

            <button
              type="button"
              className={
                filter === "ARCHIVED" ? styles.filterActive : styles.filter
              }
              onClick={() => setFilter("ARCHIVED")}
            >
              Archived
              <span>{archivedCount}</span>
            </button>
          </div>

          <label className={styles.sort}>
            <span>Sort by</span>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as ProjectSort);
              }}
            >
              <option value="UPDATED">Last updated</option>

              <option value="NAME">Name</option>

              <option value="PROGRESS">Progress</option>
            </select>
          </label>
        </div>

        {isLoading && <div className={styles.state}>Loading projects...</div>}

        {!isLoading && error && (
          <div className={styles.state}>
            <p>{error}</p>

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
          <div className={styles.state}>No projects found.</div>
        )}

        {!isLoading && !error && filteredProjects.length > 0 && (
          <div className={styles.grid}>
            {filteredProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                accentIndex={index}
                onClick={handleProjectClick}
              />
            ))}
          </div>
        )}
      </View>
    </section>
  );
}
