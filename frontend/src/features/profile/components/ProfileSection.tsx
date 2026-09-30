import { type ReactNode, useId } from "react";

import { Card, Text, View } from "reshaped";

import styles from "./ProfileSections.module.css";

interface ProfileSectionProps {
  title: string;
  description: string;
  tone?: "default" | "critical";
  className?: string;
  children: ReactNode;
}

export function ProfileSection({
  title,
  description,
  tone = "default",
  className,
  children,
}: ProfileSectionProps) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={className}>
      <Card
        padding={0}
        className={tone === "critical" ? styles.dangerCard : styles.card}
      >
        <View gap={5} className={styles.cardBody}>
          <View gap={1}>
            <Text
              as="h2"
              variant="featured-5"
              weight="bold"
              color={tone === "critical" ? "critical" : undefined}
              attributes={{ id: headingId }}
            >
              {title}
            </Text>

            <Text variant="body-2" color="neutral-faded">
              {description}
            </Text>
          </View>

          {children}
        </View>
      </Card>
    </section>
  );
}
