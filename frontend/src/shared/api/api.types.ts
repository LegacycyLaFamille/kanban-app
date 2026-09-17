export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface RequestOptions {
  signal?: AbortSignal;
  headers?: HeadersInit;
}
