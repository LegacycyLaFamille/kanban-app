import { afterEach, describe, expect, it, vi } from "vitest";

import {
  renderHook,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import {
  acceptInvitation,
  declineInvitation,
  getMyInvitations,
} from "../api/team.api";
import { useMyInvitations } from "../hooks/useMyInvitations";
import type { ProjectInvitation } from "../types/team.types";

import { PendingInvitations } from "./PendingInvitations";

vi.mock("../api/team.api", () => ({
  getMyInvitations: vi.fn(),
  acceptInvitation: vi.fn(),
  declineInvitation: vi.fn(),
}));

const invitation: ProjectInvitation = {
  id: "inv-1",
  createdAt: "2026-10-01T10:00:00.000Z",
  role: "EDITOR",
  project: { id: "project-1", name: "Kanban" },
  invitee: { id: "user-3", name: "Carol", email: "carol@example.com" },
  inviter: { id: "owner-1", name: "Alice" },
};

describe("PendingInvitations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing without invitations", () => {
    const { container } = render(
      <PendingInvitations
        invitations={[]}
        pendingId={null}
        error={null}
        onAccept={vi.fn()}
        onDecline={vi.fn()}
      />,
    );

    expect(container.textContent).toBe("");
  });

  it("shows each invitation with accept and decline actions", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onDecline = vi.fn();

    render(
      <Reshaped theme="slate" defaultColorMode="dark">
        <PendingInvitations
          invitations={[invitation]}
          pendingId={null}
          error={null}
          onAccept={onAccept}
          onDecline={onDecline}
        />
      </Reshaped>,
    );

    expect(screen.getByText("Kanban")).toBeTruthy();
    expect(screen.getByText("Invited by Alice · Can edit")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: "Accept invitation to Kanban" }),
    );
    expect(onAccept).toHaveBeenCalledWith("inv-1");

    await user.click(
      screen.getByRole("button", { name: "Decline invitation to Kanban" }),
    );
    expect(onDecline).toHaveBeenCalledWith("inv-1");
  });
});

describe("useMyInvitations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("accepts an invitation and refreshes the caller", async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([invitation]);
    vi.mocked(acceptInvitation).mockResolvedValue({ projectId: "project-1" });
    const onAccepted = vi.fn();

    const { result } = renderHook(() => useMyInvitations(onAccepted));

    await waitFor(() => {
      expect(result.current.invitations).toHaveLength(1);
    });

    await act(async () => {
      await result.current.accept("inv-1");
    });

    expect(acceptInvitation).toHaveBeenCalledWith("inv-1");
    expect(onAccepted).toHaveBeenCalledTimes(1);
    expect(result.current.invitations).toEqual([]);
  });

  it("declines an invitation without refreshing the projects", async () => {
    vi.mocked(getMyInvitations).mockResolvedValue([invitation]);
    vi.mocked(declineInvitation).mockResolvedValue(undefined);
    const onAccepted = vi.fn();

    const { result } = renderHook(() => useMyInvitations(onAccepted));

    await waitFor(() => {
      expect(result.current.invitations).toHaveLength(1);
    });

    await act(async () => {
      await result.current.decline("inv-1");
    });

    expect(declineInvitation).toHaveBeenCalledWith("inv-1");
    expect(onAccepted).not.toHaveBeenCalled();
    expect(result.current.invitations).toEqual([]);
  });
});
