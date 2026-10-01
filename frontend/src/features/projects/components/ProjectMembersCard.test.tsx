import { afterEach, describe, expect, it, vi } from "vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Reshaped } from "reshaped";

import { ApiError } from "../../../shared/api";
import {
  cancelProjectInvitation,
  getProjectInvitations,
  getProjectTeam,
  inviteToProject,
  removeProjectMember,
  updateMemberRole,
} from "../api/team.api";
import { useProjectTeam } from "../hooks/useProjectTeam";
import type { ProjectInvitation, ProjectTeam } from "../types/team.types";

import { ProjectMembersCard } from "./ProjectMembersCard";

vi.mock("../api/team.api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/team.api")>()),
  getProjectTeam: vi.fn(),
  getProjectInvitations: vi.fn(),
  inviteToProject: vi.fn(),
  cancelProjectInvitation: vi.fn(),
  removeProjectMember: vi.fn(),
  updateMemberRole: vi.fn(),
}));

const team: ProjectTeam = {
  owner: {
    userId: "owner-1",
    name: "Alice Martin",
    email: "alice@example.com",
  },
  members: [
    {
      id: "m-1",
      userId: "member-1",
      name: "Bob",
      email: "bob@example.com",
      joinedAt: "2026-09-01T00:00:00.000Z",
      role: "VIEWER",
    },
  ],
};

const invitation: ProjectInvitation = {
  id: "inv-1",
  createdAt: "2026-10-01T10:00:00.000Z",
  role: "EDITOR",
  project: { id: "project-1", name: "Kanban" },
  invitee: { id: "user-3", name: "Carol", email: "carol@example.com" },
  inviter: { id: "owner-1", name: "Alice Martin" },
};

function Harness({ isOwner }: { isOwner: boolean }) {
  const teamState = useProjectTeam("project-1", { withInvitations: isOwner });
  return <ProjectMembersCard isOwner={isOwner} teamState={teamState} />;
}

function renderCard(isOwner: boolean) {
  return render(
    <Reshaped theme="slate" defaultColorMode="dark">
      <Harness isOwner={isOwner} />
    </Reshaped>,
  );
}

describe("ProjectMembersCard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists the owner and the members", async () => {
    vi.mocked(getProjectTeam).mockResolvedValue(team);

    renderCard(false);

    const list = await screen.findByRole("list", { name: "Project members" });
    expect(within(list).getByText("Alice Martin")).toBeTruthy();
    expect(within(list).getByText("Owner")).toBeTruthy();
    expect(within(list).getByText("Bob")).toBeTruthy();
    expect(within(list).getByText("bob@example.com")).toBeTruthy();
  });

  it("hides owner-only controls from a member", async () => {
    vi.mocked(getProjectTeam).mockResolvedValue(team);

    renderCard(false);

    await screen.findByText("Bob");
    expect(screen.queryByLabelText("Email address to invite")).toBeNull();
    expect(screen.queryByRole("button", { name: "Remove Bob" })).toBeNull();
    expect(getProjectInvitations).not.toHaveBeenCalled();
  });

  it("lets the owner invite someone by email", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectTeam).mockResolvedValue(team);
    vi.mocked(getProjectInvitations).mockResolvedValue([]);
    vi.mocked(inviteToProject).mockResolvedValue(invitation);

    renderCard(true);

    await user.type(
      await screen.findByLabelText("Email address to invite"),
      "carol@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(inviteToProject).toHaveBeenCalledWith(
      "project-1",
      "carol@example.com",
      "VIEWER",
    );
    expect(
      await screen.findByText("Invitation sent to carol@example.com."),
    ).toBeTruthy();
    const pending = screen.getByRole("list", { name: "Pending invitations" });
    expect(within(pending).getByText("Carol")).toBeTruthy();
  });

  it("validates the email before calling the API", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectTeam).mockResolvedValue(team);
    vi.mocked(getProjectInvitations).mockResolvedValue([]);

    renderCard(true);

    await user.type(
      await screen.findByLabelText("Email address to invite"),
      "not-an-email",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeTruthy();
    expect(inviteToProject).not.toHaveBeenCalled();
  });

  it("shows the API error when the user does not exist", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectTeam).mockResolvedValue(team);
    vi.mocked(getProjectInvitations).mockResolvedValue([]);
    vi.mocked(inviteToProject).mockRejectedValue(
      new ApiError(404, "USER_NOT_FOUND", "No user found with this email."),
    );

    renderCard(true);

    await user.type(
      await screen.findByLabelText("Email address to invite"),
      "ghost@example.com",
    );
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(
      await screen.findByText("No user found with this email."),
    ).toBeTruthy();
  });

  it("lets the owner cancel an invitation and remove a member", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectTeam).mockResolvedValue(team);
    vi.mocked(getProjectInvitations).mockResolvedValue([invitation]);
    vi.mocked(cancelProjectInvitation).mockResolvedValue(undefined);
    vi.mocked(removeProjectMember).mockResolvedValue(undefined);

    renderCard(true);

    await user.click(
      await screen.findByRole("button", {
        name: "Cancel invitation for carol@example.com",
      }),
    );
    expect(cancelProjectInvitation).toHaveBeenCalledWith("project-1", "inv-1");
    await waitFor(() => {
      expect(screen.queryByText("Carol")).toBeNull();
    });

    await user.click(screen.getByRole("button", { name: "Remove Bob" }));
    expect(removeProjectMember).toHaveBeenCalledWith("project-1", "member-1");
    await waitFor(() => {
      expect(screen.queryByText("Bob")).toBeNull();
    });
  });

  it("invites with edit access when Can edit is selected", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectTeam).mockResolvedValue(team);
    vi.mocked(getProjectInvitations).mockResolvedValue([]);
    vi.mocked(inviteToProject).mockResolvedValue(invitation);

    renderCard(true);

    await user.type(
      await screen.findByLabelText("Email address to invite"),
      "carol@example.com",
    );
    const access = screen.getByRole("group", {
      name: "Access for the invited member",
    });
    await user.click(within(access).getByRole("button", { name: "Can edit" }));
    await user.click(screen.getByRole("button", { name: "Invite" }));

    expect(inviteToProject).toHaveBeenCalledWith(
      "project-1",
      "carol@example.com",
      "EDITOR",
    );
  });

  it("lets the owner change a member role", async () => {
    const user = userEvent.setup();
    vi.mocked(getProjectTeam).mockResolvedValue(team);
    vi.mocked(getProjectInvitations).mockResolvedValue([]);
    vi.mocked(updateMemberRole).mockResolvedValue(undefined);

    renderCard(true);

    await screen.findByText("Bob");
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Role of Bob" }),
      "Can edit",
    );

    expect(updateMemberRole).toHaveBeenCalledWith(
      "project-1",
      "member-1",
      "EDITOR",
    );
  });

  it("shows each member role to non-owners", async () => {
    vi.mocked(getProjectTeam).mockResolvedValue({
      ...team,
      members: [{ ...team.members[0]!, role: "EDITOR" }],
    });

    renderCard(false);

    const list = await screen.findByRole("list", { name: "Project members" });
    expect(within(list).getByText("Can edit")).toBeTruthy();
  });
});
