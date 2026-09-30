export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, string[] | undefined>;
  };
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;

  /**
   * Prevents the client from trying to refresh the session
   * after a 401 response.
   *
   * Used by public authentication endpoints such as login.
   */
  skipAuthRefresh?: boolean;
}
