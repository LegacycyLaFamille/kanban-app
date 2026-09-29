import { httpClient } from "../../../shared/api";

import type { AuthUser } from "../../auth/types/auth.types";

import type {
  ProfileStats,
  UpdateProfilePayload,
} from "../types/profile.types";

export function updateCurrentUser(
  payload: UpdateProfilePayload,
): Promise<AuthUser> {
  return httpClient.patch<AuthUser, UpdateProfilePayload>("/auth/me", payload);
}

export function getProfileStats(): Promise<ProfileStats> {
  return httpClient.get<ProfileStats>("/auth/me/stats");
}
