import { ApiError } from "./ApiError";

import type { ApiErrorResponse, RequestOptions } from "./api.types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

interface RequestConfig extends RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * Notified once a 401 survives a refresh attempt (or refresh wasn't
 * possible), i.e. the session is truly dead rather than just momentarily
 * expired. This is the single chokepoint for "the backend session is gone" —
 * every authenticated request passes through `send`, so features never need
 * their own 401-handling to keep auth state in sync.
 */
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

let refreshPromise: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function executeRequest(
  endpoint: string,
  config: RequestConfig,
): Promise<Response> {
  const { method = "GET", body, signal, headers } = config;

  return fetch(`${API_URL}${endpoint}`, {
    method,
    signal,
    credentials: "include",

    headers: {
      ...(body !== undefined
        ? {
            "Content-Type": "application/json",
          }
        : {}),

      ...headers,
    },

    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function send(
  endpoint: string,
  config: RequestConfig,
): Promise<Response> {
  let response = await executeRequest(endpoint, config);

  if (response.status === 401 && !config.skipAuthRefresh) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await executeRequest(endpoint, config);
    }

    if (response.status === 401) {
      sessionExpiredHandler?.();
    }
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

  return response;
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  const response = await send(endpoint, config);

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function createApiError(response: Response): Promise<ApiError> {
  try {
    const payload = (await response.json()) as ApiErrorResponse;

    return new ApiError(
      response.status,
      payload.error?.code ?? "UNKNOWN_ERROR",
      payload.error?.message ??
        response.statusText ??
        "An unexpected API error occurred.",
      payload.error?.details,
    );
  } catch {
    return new ApiError(
      response.status,
      "UNKNOWN_ERROR",
      response.statusText || "An unexpected API error occurred.",
    );
  }
}

export const httpClient = {
  get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: "GET",
      ...options,
    });
  },

  async getFile(endpoint: string, options?: RequestOptions): Promise<Blob> {
    const response = await send(endpoint, {
      method: "GET",
      ...options,
    });

    return response.blob();
  },

  post<TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return request<TResponse>(endpoint, {
      method: "POST",
      body,
      ...options,
    });
  },

  put<TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return request<TResponse>(endpoint, {
      method: "PUT",
      body,
      ...options,
    });
  },

  patch<TResponse, TBody = unknown>(
    endpoint: string,
    body?: TBody,
    options?: RequestOptions,
  ): Promise<TResponse> {
    return request<TResponse>(endpoint, {
      method: "PATCH",
      body,
      ...options,
    });
  },

  delete<T = void>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: "DELETE",
      ...options,
    });
  },
};
