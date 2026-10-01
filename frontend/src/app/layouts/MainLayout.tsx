import { Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/hooks/useAuth";
import { UnreadNotificationsProvider } from "../../features/notifications/context/UnreadNotificationsProvider";
import { useUnreadNotifications } from "../../features/notifications/hooks/useUnreadNotifications";

import { AppSidebar } from "./AppSidebar";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  return (
    <UnreadNotificationsProvider>
      <MainLayoutContent />
    </UnreadNotificationsProvider>
  );
}

function MainLayoutContent() {
  const navigate = useNavigate();

  const { user, signOut } = useAuth();
  const { unreadCount } = useUnreadNotifications();

  const handleLogout = () => {
    void signOut().finally(() => {
      navigate("/login", { replace: true });
    });
  };

  return (
    <div className={styles.layout}>
      <AppSidebar
        {...(user && {
          userName: user.name,
          userEmail: user.email,
          isAdmin: user.role === "ADMIN",
        })}
        notificationCount={unreadCount}
        onLogout={handleLogout}
      />

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
