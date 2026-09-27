import { Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../../features/auth/hooks/useAuth";

import { AppSidebar } from "./AppSidebar";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const navigate = useNavigate();

  const { user, signOut } = useAuth();

  const handleLogout = () => {
    void signOut().finally(() => {
      navigate("/login", { replace: true });
    });
  };

  return (
    <div className={styles.layout}>
      <AppSidebar
        {...(user && { userName: user.name, userEmail: user.email })}
        onLogout={handleLogout}
      />

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
