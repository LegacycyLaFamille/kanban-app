import type { ReactNode } from "react";

import { Reshaped } from "reshaped";

import "reshaped/themes/slate/theme.css";

import { AuthProvider } from "../../features/auth/context/AuthProvider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Reshaped theme="slate" defaultColorMode="dark">
      <AuthProvider>{children}</AuthProvider>
    </Reshaped>
  );
}
