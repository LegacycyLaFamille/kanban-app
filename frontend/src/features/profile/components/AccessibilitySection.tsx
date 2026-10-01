import { Radio, RadioGroup, View } from "reshaped";

import {
  type ColorVision,
  useColorVision,
} from "../../../shared/preferences/colorVision";
import { TaskCard } from "../../kanban/components/TaskCard";
import type { Task } from "../../kanban/types";

import { ProfileSection } from "./ProfileSection";

import styles from "./ProfileSections.module.css";

const DAY = 24 * 60 * 60 * 1000;

// Sample cards covering every priority and deadline colour.
function previewTasks(): Task[] {
  const now = Date.now();
  return [
    {
      id: "preview-high",
      title: "Fix the login bug",
      projectId: "preview",
      columnId: "in-progress",
      priority: "high",
      deadline: new Date(now - DAY).toISOString(),
    },
    {
      id: "preview-medium",
      title: "Review the release notes",
      projectId: "preview",
      columnId: "todo",
      priority: "medium",
      deadline: new Date(now + DAY).toISOString(),
    },
    {
      id: "preview-low",
      title: "Tidy the backlog",
      projectId: "preview",
      columnId: "todo",
      priority: "low",
      deadline: new Date(now + 14 * DAY).toISOString(),
    },
  ];
}

export function AccessibilitySection() {
  const [colorVision, setColorVision] = useColorVision();

  return (
    <ProfileSection
      title="Accessibility"
      description="Adjust how colours are used across the app. This setting is saved on this device."
    >
      <fieldset className={styles.fieldset}>
        <legend>Colour palette</legend>

        <RadioGroup
          name="colorVision"
          value={colorVision}
          onChange={({ value }) => setColorVision(value as ColorVision)}
        >
          <View gap={3}>
            <Radio value="default">
              <span className={styles.optionLabel}>Standard</span>
              <span className={styles.optionDescription}>
                Green, amber and red for low, medium and high.
              </span>
            </Radio>

            <Radio value="colorblind">
              <span className={styles.optionLabel}>Colour-blind friendly</span>
              <span className={styles.optionDescription}>
                Blue, yellow and pink, with patterns on the priority stripe.
                Distinguishable with protanopia, deuteranopia and tritanopia.
              </span>
            </Radio>
          </View>
        </RadioGroup>
      </fieldset>

      <div className={styles.palettePreview}>
        <p className={styles.hint}>Preview</p>
        <div className={styles.previewCards}>
          {previewTasks().map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </ProfileSection>
  );
}
