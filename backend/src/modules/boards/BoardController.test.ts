import assert from "node:assert/strict";
import { test } from "node:test";

import type { Request, Response } from "express";

import { BoardController } from "./BoardController.js";
import type { BoardService } from "./BoardService.js";

function createResponse() {
  const state: {
    status: number;
    body: unknown;
  } = {
    status: 200,
    body: undefined,
  };

  const response = {
    status(code: number) {
      state.status = code;
      return response;
    },

    json(body: unknown) {
      state.body = body;
      return response;
    },

    send() {
      return response;
    },
  } as unknown as Response;

  return { response, state };
}

function createRequest<TParams, TBody>(params: TParams, body: TBody) {
  return {
    userId: "user-1",
    params,
    body,
  } as unknown as Request<TParams, unknown, TBody>;
}

test("returns an empty array for a project without boards", async () => {
  const service = {
    getProjectBoards: async () => [],
  } as unknown as BoardService;

  const controller = new BoardController(service);
  const { response, state } = createResponse();

  const handler = controller.getBoardsByProject;

  await handler(createRequest({ projectId: "project-1" }, undefined), response);

  assert.equal(state.status, 200);
  assert.deepEqual(state.body, []);
});

test("passes the URL projectId to BoardService.create", async () => {
  let receivedData: unknown;

  const board = {
    id: "board-1",
    name: "Development",
    projectId: "project-1",
  };

  const service = {
    create: async (_userId: string, data: unknown) => {
      receivedData = data;
      return board;
    },
  } as unknown as BoardService;

  const controller = new BoardController(service);
  const { response, state } = createResponse();

  await controller.createBoard(
    createRequest({ projectId: "project-1" }, { name: "Development" }),
    response,
  );

  assert.deepEqual(receivedData, {
    name: "Development",
    projectId: "project-1",
  });

  assert.equal(state.status, 201);
  assert.deepEqual(state.body, board);
});

test("passes the URL boardId to BoardService.update", async () => {
  let receivedData: unknown;

  const board = {
    id: "board-1",
    name: "Backlog",
    projectId: "project-1",
  };

  const service = {
    update: async (_userId: string, data: unknown) => {
      receivedData = data;
      return board;
    },
  } as unknown as BoardService;

  const controller = new BoardController(service);
  const { response, state } = createResponse();

  await controller.updateBoard(
    createRequest({ boardId: "board-1" }, { name: "Backlog" }),
    response,
  );

  assert.deepEqual(receivedData, {
    id: "board-1",
    name: "Backlog",
  });

  assert.equal(state.status, 200);
  assert.deepEqual(state.body, board);
});
