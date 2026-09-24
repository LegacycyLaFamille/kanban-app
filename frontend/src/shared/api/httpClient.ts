import { ApiError } from "./ApiError";

import type { ApiErrorResponse, RequestOptions } from "./api.types";

const API_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

interface RequestConfig extends RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
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

async function request<T>(
  endpoint: string,
  config: RequestConfig = {},
): Promise<T> {
  let response = await executeRequest(endpoint, config);

  if (response.status === 401 && !config.skipAuthRefresh) {
    const refreshed = await refreshSession();

    if (refreshed) {
      response = await executeRequest(endpoint, config);
    }
  }

  if (!response.ok) {
    throw await createApiError(response);
  }

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
