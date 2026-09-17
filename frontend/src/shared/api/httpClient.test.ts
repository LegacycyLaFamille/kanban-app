import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "./ApiError";
import { httpClient } from "./httpClient";

describe("httpClient", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("performs a GET request and deserializes JSON", async () => {
    const responseBody = [
      {
        id: "project-1",
        name: "Kanban Platform",
      },
    ];

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const result = await httpClient.get<typeof responseBody>("/projects");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects",
      expect.objectContaining({
        method: "GET",
        credentials: "include",
      }),
    );

    expect(result).toEqual(responseBody);
  });

  it("performs a POST request and serializes the body as JSON", async () => {
    const payload = {
      name: "Kanban Platform",
      description: "Project description",
    };

    const responseBody = {
      id: "project-1",
      ...payload,
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const result = await httpClient.post<typeof responseBody, typeof payload>(
      "/projects",
      payload,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      }),
    );

    expect(result).toEqual(responseBody);
  });

  it("performs a PATCH request", async () => {
    const payload = {
      name: "Updated project",
    };

    const responseBody = {
      id: "project-1",
      name: "Updated project",
    };

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const result = await httpClient.patch<typeof responseBody, typeof payload>(
      "/projects/project-1",
      payload,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/project-1",
      expect.objectContaining({
        method: "PATCH",
        credentials: "include",
        body: JSON.stringify(payload),
      }),
    );

    expect(result).toEqual(responseBody);
  });

  it("performs a DELETE request", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    );

    const result = await httpClient.delete("/projects/project-1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/projects/project-1",
      expect.objectContaining({
        method: "DELETE",
        credentials: "include",
      }),
    );

    expect(result).toBeUndefined();
  });

  it("sends authentication credentials with requests", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await httpClient.get("/test");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        credentials: "include",
      }),
    );
  });

  it("does not add Content-Type when no body is provided", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await httpClient.get("/test");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: {},
      }),
    );
  });

  it("converts API errors into ApiError", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "PROJECT_NOT_FOUND",
            message: "Project not found.",
          },
        }),
        {
          status: 404,
          statusText: "Not Found",
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    try {
      await httpClient.get("/projects/missing");

      throw new Error("Expected request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);

      expect(error).toMatchObject({
        status: 404,
        code: "PROJECT_NOT_FOUND",
        message: "Project not found.",
      });
    }
  });

  it("creates a fallback ApiError when the response is not valid JSON", async () => {
    fetchMock.mockResolvedValue(
      new Response("Internal Server Error", {
        status: 500,
        statusText: "Internal Server Error",
        headers: {
          "Content-Type": "text/plain",
        },
      }),
    );

    try {
      await httpClient.get("/broken");

      throw new Error("Expected request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);

      expect(error).toMatchObject({
        status: 500,
        code: "UNKNOWN_ERROR",
        message: "Internal Server Error",
      });
    }
  });

  it("supports custom request headers", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await httpClient.get("/test", {
      headers: {
        "X-Test-Header": "test-value",
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          "X-Test-Header": "test-value",
        }),
      }),
    );
  });

  it("supports AbortSignal", async () => {
    const controller = new AbortController();

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    await httpClient.get("/test", {
      signal: controller.signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        signal: controller.signal,
      }),
    );
  });
});
