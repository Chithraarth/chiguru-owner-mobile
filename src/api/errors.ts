export const ApiErrorCode = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  NO_SEATS_AVAILABLE: "NO_SEATS_AVAILABLE",
  ESTATE_LIMIT_REACHED: "ESTATE_LIMIT_REACHED",
  ALREADY_MANAGER: "ALREADY_MANAGER",
  DEVICE_LIMIT: "device_limit",
} as const;

export class ApiError extends Error {
  status: number;
  code?: string;
  body: unknown;

  constructor(status: number, message: string, code?: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.body = body;
  }

  is(code: string) {
    return this.code === code;
  }
}

export function isAuthRequired(err: unknown): err is ApiError {
  return err instanceof ApiError && (err.status === 401 || err.is(ApiErrorCode.AUTH_REQUIRED));
}

export function isSubscriptionRequired(err: unknown): err is ApiError {
  return err instanceof ApiError && err.is(ApiErrorCode.SUBSCRIPTION_REQUIRED);
}
