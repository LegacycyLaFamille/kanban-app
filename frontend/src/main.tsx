import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import { RouterProvider } from "react-router-dom";

import { router } from "./app/router";
import { AppProviders } from "./app/providers/AppProviders";
import {
  applyColorVision,
  readColorVision,
} from "./shared/preferences/colorVision";

import "./styles/index.css";

// Before the first render, so the chosen palette never flashes.
applyColorVision(readColorVision());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
