import type { ReactNode } from "react";
import { Reshaped } from "reshaped";

import "reshaped/themes/slate/theme.css";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Reshaped theme="slate" defaultColorMode="dark">
      {children}
    </Reshaped>
  );
}
