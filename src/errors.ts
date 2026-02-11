// ── Error codes ───────────────────────────────────────

export enum ErrorCode {
  // Auth
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_CREDENTIALS = "INVALID_CREDENTIALS",
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  UNAUTHENTICATED = "UNAUTHENTICATED",
  UNAUTHORIZED = "UNAUTHORIZED",

  // Resource
  NOT_FOUND = "NOT_FOUND",

  // Generic
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// ── HTTP-style status map (useful for REST or logging) ─

const STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_CREDENTIALS]: 401,
  [ErrorCode.EMAIL_ALREADY_EXISTS]: 409,
  [ErrorCode.UNAUTHENTICATED]: 401,
  [ErrorCode.UNAUTHORIZED]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.INTERNAL_ERROR]: 500,
};

// ── Custom error class ────────────────────────────────

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = STATUS_MAP[code];
  }
}

// ── Factory helpers ───────────────────────────────────

export function validationError(message: string) {
  return new AppError(ErrorCode.VALIDATION_ERROR, message);
}

export function invalidCredentials(
  message = "Invalid email or password."
) {
  return new AppError(ErrorCode.INVALID_CREDENTIALS, message);
}

export function emailAlreadyExists(
  message = "A user with this email already exists."
) {
  return new AppError(ErrorCode.EMAIL_ALREADY_EXISTS, message);
}

export function unauthenticated(
  message = "You must be logged in to perform this action."
) {
  return new AppError(ErrorCode.UNAUTHENTICATED, message);
}

export function unauthorized(
  message = "You do not have permission to perform this action."
) {
  return new AppError(ErrorCode.UNAUTHORIZED, message);
}

export function notFound(resource: string) {
  return new AppError(ErrorCode.NOT_FOUND, `${resource} not found.`);
}

export function internalError(
  message = "An unexpected error occurred."
) {
  return new AppError(ErrorCode.INTERNAL_ERROR, message);
}
