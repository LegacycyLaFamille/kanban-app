import { Card, Text, View } from "reshaped";

import type { Project } from "../types/project.types";

import styles from "./ProjectCard.module.css";

type ProjectCardProps = {
  project: Project;
  accentIndex: number;
  onClick?: (project: Project) => void;
};

export function ProjectCard({
  project,
  accentIndex,
  onClick,
}: ProjectCardProps) {
  const visibleMembers = project.members.slice(0, 3);
  const remainingMembers = Math.max(
    project.members.length - visibleMembers.length,
    0,
  );

  return (
    <article className={styles.wrapper} onClick={() => onClick?.(project)}>
      <Card padding={4}>
        <View gap={4}>
          <View direction="row" align="center">
            <div
              className={`${styles.projectIcon} ${
                styles[`accent${accentIndex % 5}`]
              }`}
              aria-hidden="true"
            >
              <span />
              <span />
            </div>

            <View.Item grow />

            <button
              type="button"
              className={styles.moreButton}
              aria-label={`Open ${project.name} menu`}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              •••
            </button>
          </View>

          <View gap={1}>
            <Text weight="bold">
              <span className={styles.title}>{project.name}</span>
            </Text>

            <Text color="neutral-faded">
              <span className={styles.description}>{project.description}</span>
            </Text>
          </View>

          <View gap={3}>
            <div className={styles.metadata}>
              <span>{project.taskCount} tasks</span>

              <span>
                {project.members.length}{" "}
                {project.members.length === 1 ? "member" : "members"}
              </span>

              <strong>{project.progress}%</strong>
            </div>

            <div
              className={styles.progressTrack}
              aria-label={`${project.progress}% completed`}
            >
              <div
                className={styles.progressValue}
                style={{
                  width: `${project.progress}%`,
                }}
              />
            </div>

            <div className={styles.members}>
              {visibleMembers.map((member) => (
                <div
                  key={member.id}
                  className={styles.avatar}
                  title={member.name}
                >
                  {member.initials}
                </div>
              ))}

              {remainingMembers > 0 && (
                <div className={styles.avatar}>+{remainingMembers}</div>
              )}
            </div>
          </View>
        </View>
      </Card>
    </article>
  );
}
