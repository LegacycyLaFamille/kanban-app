import { type KeyboardEvent, useId, useRef } from "react";

import { Card, Text, View } from "reshaped";

import { LoginForm } from "../../auth/components/LoginForm";
import { RegisterForm } from "../../auth/components/RegisterForm";

import authStyles from "../../auth/pages/AuthPage.module.css";
import styles from "./AuthPanel.module.css";

export type AuthTab = "signin" | "register";

interface AuthPanelProps {
  tab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  // Shown above the sign-in form once an account was just created.
  justRegistered: boolean;
  onRegistered: () => void;
  onSignedIn: () => void;
}

const TABS: { id: AuthTab; label: string }[] = [
  { id: "signin", label: "Sign in" },
  { id: "register", label: "Create account" },
];

// Sign in and sign up side by side, as an ARIA tabs widget: arrow keys move
// between the two tabs, Tab moves into the active form.
export function AuthPanel({
  tab,
  onTabChange,
  justRegistered,
  onRegistered,
  onSignedIn,
}: AuthPanelProps) {
  const baseId = useId();
  const tabRefs = useRef<Record<AuthTab, HTMLButtonElement | null>>({
    signin: null,
    register: null,
  });

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys = ["ArrowLeft", "ArrowRight", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();

    const index = TABS.findIndex(({ id }) => id === tab);
    let next = index;
    if (event.key === "ArrowLeft")
      next = (index - 1 + TABS.length) % TABS.length;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = TABS.length - 1;

    const nextTab = TABS[next].id;
    onTabChange(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  return (
    <Card padding={6} className={styles.panel}>
      <View gap={6}>
        <div
          role="tablist"
          aria-label="Account access"
          className={styles.tabs}
          onKeyDown={handleKeyDown}
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              ref={(element) => {
                tabRefs.current[id] = element;
              }}
              type="button"
              role="tab"
              id={`${baseId}-${id}-tab`}
              aria-selected={tab === id}
              aria-controls={`${baseId}-${id}-panel`}
              tabIndex={tab === id ? 0 : -1}
              className={styles.tab}
              onClick={() => onTabChange(id)}
            >
              {label}
            </button>
          ))}
          <span
            className={styles.indicator}
            data-tab={tab}
            aria-hidden="true"
          />
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-signin-panel`}
          aria-labelledby={`${baseId}-signin-tab`}
          hidden={tab !== "signin"}
          className={styles.tabPanel}
        >
          <View gap={5}>
            <Text color="neutral-faded">
              Welcome back. Pick up right where your team left off.
            </Text>

            {justRegistered && (
              <div className={authStyles.successMessage} role="status">
                Your account has been created. You can now sign in.
              </div>
            )}

            <LoginForm onSuccess={onSignedIn} />
          </View>
        </div>

        <div
          role="tabpanel"
          id={`${baseId}-register-panel`}
          aria-labelledby={`${baseId}-register-tab`}
          hidden={tab !== "register"}
          className={styles.tabPanel}
        >
          <View gap={5}>
            <Text color="neutral-faded">
              Free, and ready in under a minute.
            </Text>

            <RegisterForm onSuccess={onRegistered} />
          </View>
        </div>
      </View>
    </Card>
  );
}
