import type { ReactNode } from "react";
import { Badge, MenuItem, Text, View } from "reshaped";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AppLogo } from "../../shared/components/AppLogo/AppLogo.tsx";

import styles from "./AppSidebar.module.css";

type AppSidebarProps = {
  userName?: string;
  userEmail?: string;
  isAdmin?: boolean;
  // Unread notifications, shown as a badge on the Notifications entry.
  notificationCount?: number;
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

// Admin-only nav items, appended to navigationItems when isAdmin is true.
const adminNavigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    path: "/admin/dashboard",
    icon: (
      <SidebarIcon>
        <path d="M9 11.5 11 13.5 15 9" />
        <path d="M12 3 4 6.5V11c0 4.5 3.2 8.4 8 9.5 4.8-1.1 8-5 8-9.5V6.5Z" />
      </SidebarIcon>
    ),
  },
  {
    label: "System",
    path: "/admin/system",
    icon: (
      <SidebarIcon>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </SidebarIcon>
    ),
  },
];

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
  isAdmin = false,
  notificationCount = 0,
  onLogout,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const items = isAdmin
    ? [...navigationItems, ...adminNavigationItems]
    : navigationItems;

  const isActive = (path: string) => {
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
            {items.map((item) => (
              <div key={item.path} className={styles.navigationItem}>
                <MenuItem
                  selected={isActive(item.path)}
                  attributes={{
                    "aria-current": isActive(item.path) ? "page" : undefined,
                  }}
                  startSlot={item.icon}
                  onClick={() => navigate(item.path)}
                >
                  <span className={styles.navigationLabel}>{item.label}</span>
                  {item.path === "/notifications" && notificationCount > 0 && (
                    <>
                      <span
                        className={styles.notificationBadge}
                        aria-hidden="true"
                      >
                        {notificationCount > 99 ? "99+" : notificationCount}
                      </span>
                      <span className="sr-only">
                        {`, ${notificationCount} unread notifications`}
                      </span>
                    </>
                  )}
                </MenuItem>
              </div>
            ))}
          </View>
        </nav>

        <View.Item grow />

        <View gap={1}>
          <MenuItem startSlot={<LogoutIcon />} onClick={handleLogout}>
            <span className={styles.navigationLabel}>Log out</span>
          </MenuItem>
        </View>

        <div className={styles.user}>
          <div className={styles.avatar} aria-hidden="true">
            {userName.charAt(0).toUpperCase()}
          </div>

          <div className={styles.userInformation}>
            <div className={styles.userNameRow}>
              <strong>{userName}</strong>
              {isAdmin && (
                <Badge size="small" color="primary" rounded>
                  Admin
                </Badge>
              )}
            </div>
            <span>{userEmail}</span>
          </div>
        </div>

        <nav className={styles.legalLinks} aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/legal-notice">Legal notice</Link>
        </nav>
      </View>
    </aside>
  );
}
