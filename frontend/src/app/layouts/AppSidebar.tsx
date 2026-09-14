import type { ReactNode } from "react";
import { MenuItem, Text, View } from "reshaped";
import { useLocation, useNavigate } from "react-router-dom";
import { AppLogo } from "../../shared/components/AppLogo/AppLogo.tsx";

import styles from "./AppSidebar.module.css";

type AppSidebarProps = {
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
};

type NavigationItem = {
  label: string;
  path: string;
  icon: ReactNode;
};

function SidebarIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
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

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: (
      <SidebarIcon>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </SidebarIcon>
    ),
  },
  {
    label: "Projects",
    path: "/projects",
    icon: (
      <SidebarIcon>
        <path d="M3 7.5h6l2 2h10v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M3 7.5V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2.5" />
      </SidebarIcon>
    ),
  },
  {
    label: "My Tasks",
    path: "/tasks",
    icon: (
      <SidebarIcon>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="m8 9 2 2 4-4" />
        <path d="M8 16h8" />
      </SidebarIcon>
    ),
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: (
      <SidebarIcon>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </SidebarIcon>
    ),
  },
  {
    label: "Profile",
    path: "/profile",
    icon: (
      <SidebarIcon>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </SidebarIcon>
    ),
  },
];

function SettingsIcon() {
  return (
    <SidebarIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1a1.7 1.7 0 0 0-.4-1.1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1a1.7 1.7 0 0 0 1.1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88L4.4 6.26l2.83-2.83.06.06A1.7 1.7 0 0 0 9 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1a1.7 1.7 0 0 0 .4 1.1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.1v4h-.1a1.7 1.7 0 0 0-1.1.4 1.7 1.7 0 0 0-.6 1.2Z" />
    </SidebarIcon>
  );
}

function LogoutIcon() {
  return (
    <SidebarIcon>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </SidebarIcon>
  );
}

export function AppSidebar({
  userName = "Current user",
  userEmail = "user@example.com",
  onLogout,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === "/";
    }

    return (
      location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
      return;
    }

    // Temporary behaviour until the authentication logout flow is implemented.
    navigate("/login");
  };

  return (
    <aside className={styles.sidebar}>
      <View height="100%" gap={4}>
        <div className={styles.brand}>
          <AppLogo />

          <Text weight="bold">
            <span className={styles.brandName}>Kanban App</span>
          </Text>
        </div>

        <nav className={styles.navigation} aria-label="Main navigation">
          <View gap={1}>
            {navigationItems.map((item) => (
              <MenuItem
                key={item.path}
                selected={isActive(item.path)}
                startSlot={item.icon}
                onClick={() => navigate(item.path)}
              >
                <span className={styles.navigationLabel}>{item.label}</span>
              </MenuItem>
            ))}
          </View>
        </nav>

        <View.Item grow />

        <View gap={1}>
          <MenuItem
            selected={isActive("/settings")}
            startSlot={<SettingsIcon />}
            onClick={() => navigate("/settings")}
          >
            <span className={styles.navigationLabel}>Settings</span>
          </MenuItem>

          <MenuItem startSlot={<LogoutIcon />} onClick={handleLogout}>
            <span className={styles.navigationLabel}>Log out</span>
          </MenuItem>
        </View>

        <div className={styles.user}>
          <div className={styles.avatar}>
            {userName.charAt(0).toUpperCase()}
          </div>

          <div className={styles.userInformation}>
            <strong>{userName}</strong>
            <span>{userEmail}</span>
          </div>
        </div>
      </View>
    </aside>
  );
}
