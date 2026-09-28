export type ProjectBoard = {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
};

export type ProjectResponse = {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  boards: ProjectBoard[];
};

export type CreateProjectPayload = {
  name: string;
  description: string;
};

export type UpdateProjectPayload = Partial<CreateProjectPayload>;

export type CreateBoardPayload = {
  name: string;
};

export type UpdateBoardPayload = {
  name: string;
};
