import { Card, Text, View } from "reshaped";
import { Link } from "react-router-dom";

import type { ProjectResponse } from "../types/project-api.types";

import styles from "./ProjectCard.module.css";

type ProjectCardProps = {
  project: ProjectResponse;
  accentIndex: number;
};

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function ProjectCard({ project, accentIndex }: ProjectCardProps) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className={styles.wrapper}
      aria-label={`Open project ${project.name}`}
      style={{
        display: "block",
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <Card padding={4}>
        <View gap={4}>
          <View direction="row" align="center">
            <div
              className={`${styles.projectIcon} ${styles[`accent${accentIndex % 5}`]}`}
              aria-hidden="true"
            >
              <span />
              <span />
            </div>
          </View>

          <View gap={1}>
            <Text weight="bold">
              <span className={styles.title}>{project.name}</span>
            </Text>

            <Text color="neutral-faded">
              <span className={styles.description}>
                {project.description || "No description provided."}
              </span>
            </Text>
          </View>

          <div className={styles.metadata}>
            <span>
              {project.boards.length}{" "}
              {project.boards.length === 1 ? "board" : "boards"}
            </span>

            <strong>{formatDate(project.createdAt)}</strong>
          </div>
        </View>
      </Card>
    </Link>
  );
}
