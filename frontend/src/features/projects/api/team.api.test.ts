import { afterEach, describe, expect, it, vi } from "vitest";

import { httpClient } from "../../../shared/api";

import {
  acceptInvitation,
  cancelProjectInvitation,
  declineInvitation,
  getMyInvitations,
  getProjectInvitations,
  getProjectTeam,
  inviteToProject,
  removeProjectMember,
  toTeamUsers,
} from "./team.api";

describe("team.api", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the project team", async () => {
    const team = { owner: null, members: [] };
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue(team);

    await expect(getProjectTeam("project-1")).resolves.toEqual(team);
    expect(getSpy).toHaveBeenCalledWith("/projects/project-1/team");
  });

  it("lists the owner first, then the members", () => {
    expect(
      toTeamUsers({
        owner: { userId: "o", name: "Alice", email: "a@x.io" },
        members: [
          {
            id: "m",
            userId: "u",
            name: "Bob",
            email: "b@x.io",
            joinedAt: "2026-09-01T00:00:00.000Z",
            role: "VIEWER",
          },
        ],
      }),
    ).toEqual([
      { userId: "o", name: "Alice", email: "a@x.io", role: "owner" },
      { userId: "u", name: "Bob", email: "b@x.io", role: "member" },
    ]);
  });

  it("calls the owner-side invitation endpoints", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue([]);
    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue({});
    const deleteSpy = vi
      .spyOn(httpClient, "delete")
      .mockResolvedValue(undefined);

    await getProjectInvitations("project-1");
    await inviteToProject("project-1", "bob@example.com");
    await cancelProjectInvitation("project-1", "inv-1");
    await removeProjectMember("project-1", "user-2");

    expect(getSpy).toHaveBeenCalledWith("/projects/project-1/invitations");
    expect(postSpy).toHaveBeenCalledWith("/projects/project-1/invitations", {
      email: "bob@example.com",
      role: "VIEWER",
    });
    expect(deleteSpy).toHaveBeenCalledWith(
      "/projects/project-1/invitations/inv-1",
    );
    expect(deleteSpy).toHaveBeenCalledWith(
      "/projects/project-1/members/user-2",
    );
  });

  it("calls the invitee-side invitation endpoints", async () => {
    const getSpy = vi.spyOn(httpClient, "get").mockResolvedValue([]);
    const postSpy = vi.spyOn(httpClient, "post").mockResolvedValue(undefined);

    await getMyInvitations();
    await acceptInvitation("inv-1");
    await declineInvitation("inv-2");

    expect(getSpy).toHaveBeenCalledWith("/invitations");
    expect(postSpy).toHaveBeenCalledWith("/invitations/inv-1/accept");
    expect(postSpy).toHaveBeenCalledWith("/invitations/inv-2/decline");
  });
});
