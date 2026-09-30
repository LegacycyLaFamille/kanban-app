export type ApiErrorDetails = Record<string, string[] | undefined>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: ApiErrorDetails | undefined;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: ApiErrorDetails,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
