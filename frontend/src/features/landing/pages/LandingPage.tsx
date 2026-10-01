import { Fragment, type ReactNode, useRef, useState } from "react";

import { Link, useNavigate } from "react-router-dom";

import { AppLogo } from "../../../shared/components/AppLogo/AppLogo";
import { useAuth } from "../../auth/hooks/useAuth";
import { AuthPanel, type AuthTab } from "../components/AuthPanel";
import { HeroBoard } from "../components/HeroBoard";
import { useRevealOnScroll } from "../hooks/useRevealOnScroll";

import styles from "./LandingPage.module.css";

const AUTH_SECTION_ID = "get-started";

const HEADLINE = ["Plan", "it.", "Move", "it.", "Ship", "it."];

const FEATURES: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: "A board for every stream",
    text: "Split a project into as many boards as you need. Each one keeps its own To Do, In Progress and Done.",
    icon: (
      <>
        <rect x="3" y="4" width="5" height="16" rx="1.5" />
        <rect x="10" y="4" width="5" height="11" rx="1.5" />
        <rect x="17" y="4" width="4" height="7" rx="1.5" />
      </>
    ),
  },
  {
    title: "Roles that make sense",
    text: "Invite teammates by email as Editors or Viewers. Everyone sees what they should, and changes only what they may.",
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M17 11l1.5 1.5L22 9" />
      </>
    ),
  },
  {
    title: "Notified, not nagged",
    text: "Assignments, status changes and completions land in your inbox the moment they happen.",
    icon: (
      <>
        <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </>
    ),
  },
  {
    title: "Your tasks, one list",
    text: "Everything assigned to you, across every project, grouped and sorted in My Tasks.",
    icon: (
      <>
        <path d="M9 6h12M9 12h12M9 18h12" />
        <path d="M3.5 6l1 1 2-2M3.5 12l1 1 2-2M3.5 18l1 1 2-2" />
      </>
    ),
  },
  {
    title: "Drag it, or press Enter",
    text: "Move cards with the mouse, or entirely from the keyboard. Built against the RGAA accessibility standard.",
    icon: (
      <>
        <rect x="2.5" y="6" width="19" height="12" rx="2" />
        <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
      </>
    ),
  },
  {
    title: "Your data stays yours",
    text: "Export everything you own in one click: projects, boards and tasks, whenever you want.",
    icon: (
      <>
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </>
    ),
  },
];

const STEPS = [
  {
    title: "Create a project",
    text: "Name it, describe it, add a first board. Thirty seconds, tops.",
  },
  {
    title: "Bring your team",
    text: "Send invitations, pick a role for each teammate, assign the first tasks.",
  },
  {
    title: "Ship and get notified",
    text: "Drag cards to Done. Everyone involved hears about it instantly.",
  },
];

const STACK = [
  "React",
  "TypeScript",
  "Express",
  "PostgreSQL",
  "Prisma",
  "RabbitMQ",
  "OpenTelemetry",
  "Grafana",
  "Docker",
];

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const pageRef = useRef<HTMLDivElement>(null);
  useRevealOnScroll(pageRef);

  const [isPaused, setIsPaused] = useState(false);
  const [authTab, setAuthTab] = useState<AuthTab>("register");
  const [justRegistered, setJustRegistered] = useState(false);

  // Header and hero buttons: pick the right tab, then bring the panel in view.
  function openAuth(tab: AuthTab) {
    setAuthTab(tab);
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    document.getElementById(AUTH_SECTION_ID)?.scrollIntoView?.({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
  }

  function handleRegistered() {
    setJustRegistered(true);
    setAuthTab("signin");
  }

  return (
    <div
      ref={pageRef}
      className={styles.page}
      data-paused={isPaused ? "true" : undefined}
    >
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>

      <div className={styles.backdrop} aria-hidden="true">
        <span className={styles.blob} />
        <span className={styles.blob} />
        <span className={styles.blob} />
        <span className={styles.grid} />
      </div>

      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <AppLogo />
          <span>Kanban App</span>
        </Link>

        <nav aria-label="Landing" className={styles.nav}>
          <a href="#features" className={styles.navLink}>
            Features
          </a>
          <a href="#how-it-works" className={styles.navLink}>
            How it works
          </a>
        </nav>

        <div className={styles.headerActions}>
          {isAuthenticated ? (
            <Link to="/projects" className={styles.buttonPrimary}>
              Open my workspace
            </Link>
          ) : (
            <>
              <button
                type="button"
                className={styles.buttonGhost}
                onClick={() => openAuth("signin")}
              >
                Sign in
              </button>
              <button
                type="button"
                className={styles.buttonPrimary}
                onClick={() => openAuth("register")}
              >
                Get started
              </button>
            </>
          )}
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className={styles.main}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.eyebrowDot} aria-hidden="true" />
              From a legacy to-do list to a modern Kanban
            </p>

            <h1 id="hero-title" className={styles.title}>
              {HEADLINE.map((word, index) => (
                <Fragment key={`${word}-${index}`}>
                  <span
                    className={styles.word}
                    data-accent={index % 2 === 1 ? "true" : undefined}
                    style={{ animationDelay: `${0.15 + index * 0.09}s` }}
                  >
                    {word}
                  </span>{" "}
                </Fragment>
              ))}
            </h1>

            <p className={styles.lead}>
              Kanban App keeps your team&apos;s work visible: projects split
              into boards, tasks that move from To Do to Done, and everyone
              notified when something changes.
            </p>

            <div className={styles.heroActions}>
              {isAuthenticated ? (
                <Link to="/projects" className={styles.buttonPrimaryLarge}>
                  Go to my projects
                  <span aria-hidden="true"> →</span>
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.buttonPrimaryLarge}
                    onClick={() => openAuth("register")}
                  >
                    Create a free account
                    <span aria-hidden="true"> →</span>
                  </button>
                  <button
                    type="button"
                    className={styles.buttonGhostLarge}
                    onClick={() => openAuth("signin")}
                  >
                    I already have an account
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              className={styles.motionToggle}
              aria-pressed={isPaused}
              onClick={() => setIsPaused((paused) => !paused)}
            >
              <span aria-hidden="true">{isPaused ? "▶" : "❚❚"}</span>
              Pause animations
            </button>
          </div>

          <div className={styles.heroVisual}>
            <HeroBoard />
          </div>
        </section>

        <section className={styles.stack} aria-label="Built with">
          <div className={styles.marquee}>
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                className={styles.marqueeTrack}
                aria-hidden={copy === 1 ? "true" : undefined}
              >
                {STACK.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ))}
          </div>
        </section>

        <section
          id="features"
          className={styles.section}
          aria-labelledby="features-title"
        >
          <div className={styles.sectionHeader} data-reveal>
            <p className={styles.kicker}>Features</p>
            <h2 id="features-title" className={styles.sectionTitle}>
              Everything a team needs. Nothing it doesn&apos;t.
            </h2>
          </div>

          <ul className={styles.features}>
            {FEATURES.map((feature, index) => (
              <li
                key={feature.title}
                className={styles.feature}
                data-reveal
                style={{ transitionDelay: `${(index % 3) * 0.08}s` }}
              >
                <span className={styles.featureIcon}>
                  <Icon>{feature.icon}</Icon>
                </span>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureText}>{feature.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="how-it-works"
          className={styles.section}
          aria-labelledby="steps-title"
        >
          <div className={styles.sectionHeader} data-reveal>
            <p className={styles.kicker}>How it works</p>
            <h2 id="steps-title" className={styles.sectionTitle}>
              Three steps from idea to done.
            </h2>
          </div>

          <ol className={styles.steps} data-reveal>
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className={styles.step}
                style={{ transitionDelay: `${0.15 + index * 0.15}s` }}
              >
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <h3 className={styles.featureTitle}>{step.title}</h3>
                <p className={styles.featureText}>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id={AUTH_SECTION_ID}
          className={styles.cta}
          aria-labelledby="cta-title"
        >
          <div className={styles.ctaCopy} data-reveal>
            <p className={styles.kicker}>Get started</p>
            <h2 id="cta-title" className={styles.sectionTitle}>
              {isAuthenticated
                ? "You're all set."
                : "Your next sprint starts here."}
            </h2>
            <p className={styles.lead}>
              {isAuthenticated
                ? `Signed in as ${user?.name ?? user?.email ?? "you"}. Your projects are waiting.`
                : "Create an account in seconds, or sign in to pick up where your team left off."}
            </p>
            <ul className={styles.checks}>
              <li>Unlimited projects and boards</li>
              <li>Editor and Viewer roles</li>
              <li>Real-time notifications</li>
            </ul>
          </div>

          <div className={styles.ctaPanel} data-reveal>
            {isAuthenticated ? (
              <Link to="/projects" className={styles.buttonPrimaryLarge}>
                Open my workspace
                <span aria-hidden="true"> →</span>
              </Link>
            ) : (
              <AuthPanel
                tab={authTab}
                onTabChange={setAuthTab}
                justRegistered={justRegistered}
                onRegistered={handleRegistered}
                onSignedIn={() => navigate("/projects", { replace: true })}
              />
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Kanban App</span>
        <span>Built by LegacycyLaFamille</span>
      </footer>
    </div>
  );
}
