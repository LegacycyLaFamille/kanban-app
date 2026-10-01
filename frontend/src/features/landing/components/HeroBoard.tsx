import styles from "./HeroBoard.module.css";

interface MockCard {
  title: string;
  tag: string;
  tone: "low" | "medium" | "high";
  avatar: string;
}

const COLUMNS: { title: string; cards: MockCard[] }[] = [
  {
    title: "To Do",
    cards: [
      { title: "Invite the design team", tag: "Low", tone: "low", avatar: "M" },
      {
        title: "Write release notes",
        tag: "Medium",
        tone: "medium",
        avatar: "J",
      },
    ],
  },
  {
    title: "In Progress",
    cards: [
      { title: "Board per project", tag: "High", tone: "high", avatar: "A" },
    ],
  },
  {
    title: "Done",
    cards: [
      {
        title: "Roles & invitations",
        tag: "Medium",
        tone: "medium",
        avatar: "L",
      },
      { title: "Live notifications", tag: "High", tone: "high", avatar: "M" },
    ],
  },
];

// A looping, purely decorative Kanban: one card travels To Do → In Progress
// → Done, and a notification pops when it lands. Hidden from assistive
// technologies; the surrounding copy says the same thing in words.
export function HeroBoard() {
  return (
    <div className={styles.window} aria-hidden="true">
      <div className={styles.chrome}>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.chromeTitle}>Website relaunch · Sprint 12</span>
        <span className={styles.bell}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
            <path
              d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className={styles.bellBadge}>1</span>
        </span>
      </div>

      <div className={styles.columns}>
        {COLUMNS.map((column, columnIndex) => (
          <div key={column.title} className={styles.column}>
            <div className={styles.columnHeader}>
              <span className={styles.columnTitle}>{column.title}</span>
              <span className={styles.columnCount}>{column.cards.length}</span>
            </div>

            {/* Where the travelling card rests in this column. */}
            <div className={styles.slot} />

            {column.cards.map((card, cardIndex) => (
              <div
                key={card.title}
                className={styles.card}
                style={{
                  animationDelay: `${0.6 + columnIndex * 0.15 + cardIndex * 0.1}s`,
                }}
              >
                <span className={styles.cardTitle}>{card.title}</span>
                <span className={styles.cardMeta}>
                  <span className={styles.tag} data-tone={card.tone}>
                    {card.tag}
                  </span>
                  <span className={styles.avatar}>{card.avatar}</span>
                </span>
              </div>
            ))}
          </div>
        ))}

        <div className={styles.traveller}>
          <span className={styles.cardTitle}>Ship the landing page</span>
          <span className={styles.cardMeta}>
            <span className={styles.statusStack}>
              <span className={styles.status} data-step="todo">
                To do
              </span>
              <span className={styles.status} data-step="progress">
                In progress
              </span>
              <span className={styles.status} data-step="done">
                Done ✓
              </span>
            </span>
            <span className={styles.avatar}>Y</span>
          </span>
          <svg
            className={styles.cursor}
            viewBox="0 0 24 24"
            width="22"
            height="22"
          >
            <path
              d="M4 2.5 19 12l-6.6 1.6L9 20.5Z"
              fill="#ffffff"
              stroke="#18181b"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className={styles.toast}>
        <span className={styles.toastIcon}>✓</span>
        <span>
          <strong>Ship the landing page</strong> is done
          <span className={styles.toastSub}>2 teammates notified</span>
        </span>
      </div>
    </div>
  );
}
