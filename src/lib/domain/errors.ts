export type AppErrorCode =
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT_ERROR'
  | 'SERVER_ERROR'
  | 'UPSTREAM_ERROR'
  | 'UNKNOWN_ERROR';

export class AppError extends Error {
  code: AppErrorCode;
  status?: number;
  traceId?: string;

  constructor(message: string, code: AppErrorCode, status?: number, traceId?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.traceId = traceId;
  }
}

export const mapHttpStatusToCode = (status?: number): AppErrorCode => {
  if (!status) return 'NETWORK_ERROR';
  if (status === 401 || status === 403) return 'AUTH_ERROR';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT_ERROR';
  if (status === 400 || status === 422) return 'VALIDATION_ERROR';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN_ERROR';
};

