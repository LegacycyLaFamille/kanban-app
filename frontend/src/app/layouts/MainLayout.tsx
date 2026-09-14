import { Outlet } from "react-router-dom";

import { AppSidebar } from "./AppSidebar";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  return (
    <div className={styles.layout}>
      <AppSidebar />

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
