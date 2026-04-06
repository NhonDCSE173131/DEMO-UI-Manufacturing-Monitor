import { buildApiUrl } from '@/lib/api/client';
import type {
  ImportEntityType,
  ImportExecutionSummary,
  ImportValidationIssue,
  ImportValidationSummary,
  ImportValidateType,
  MachineImportMode,
} from '@/types/machine-import';

type RawApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
} | T;

class ImportApiError extends Error {
  status?: number;
  path?: string;

  constructor(message: string, options?: { status?: number; path?: string }) {
    super(message);
    this.name = 'ImportApiError';
    this.status = options?.status;
    this.path = options?.path;
  }
}

const toIssues = (errors: unknown): ImportValidationIssue[] => {
  if (!Array.isArray(errors)) return [];
  return errors.map((error, index) => {
    const rowIndex = Number((error as Record<string, unknown>)?.rowIndex ?? (error as Record<string, unknown>)?.row ?? index + 1);
    const message = String((error as Record<string, unknown>)?.message ?? 'Unknown import error');
    const field = (error as Record<string, unknown>)?.field;
    return {
      rowIndex: Number.isFinite(rowIndex) ? rowIndex : index + 1,
      message,
      field: typeof field === 'string' ? field : undefined,
    };
  });
};

const unwrap = async <T>(response: Response, path: string): Promise<T> => {
  const contentType = response.headers.get('content-type') || '';
  let payload: RawApiResponse<T> | null = null;
  let textBody = '';

  try {
    if (contentType.includes('application/json')) {
      payload = (await response.json()) as RawApiResponse<T>;
    } else {
      textBody = await response.text();
    }
  } catch {
    textBody = '';
  }

  if (!response.ok) {
    const message = (payload as { message?: string } | null)?.message || textBody || 'Request failed';
    throw new ImportApiError(`${message} (HTTP ${response.status})`, {
      status: response.status,
      path,
    });
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data;
  }

  if (payload !== null) {
    return payload as T;
  }

  throw new ImportApiError('Empty response body from import endpoint', {
    status: response.status,
    path,
  });
};

const postImportForm = async <T>(path: string, formData: FormData): Promise<T> => {
  const response = await fetch(buildApiUrl(path), {
    method: 'POST',
    body: formData,
    cache: 'no-store',
  });

  return unwrap<T>(response, path);
};

const shouldTryFallback = (error: unknown): boolean => {
  if (!(error instanceof ImportApiError)) return false;
  if (error.status === 404 || error.status === 405) return true;
  const msg = error.message.toLowerCase();
  return msg.includes('unsupported') || msg.includes('not found') || msg.includes('no handler');
};

const normalizeValidation = (payload: unknown): ImportValidationSummary => {
  const record = (payload || {}) as Record<string, unknown>;
  const totalRows = Number(record.totalRows ?? record.total ?? 0);
  const validRows = Number(record.successRows ?? record.validRows ?? record.valid ?? 0);
  const invalidRows = Number(record.failedRows ?? record.invalidRows ?? record.invalid ?? 0);
  return {
    totalRows: Number.isFinite(totalRows) ? totalRows : 0,
    validRows: Number.isFinite(validRows) ? validRows : 0,
    invalidRows: Number.isFinite(invalidRows) ? invalidRows : 0,
    errors: toIssues(record.errors),
  };
};

const normalizeExecution = (payload: unknown): ImportExecutionSummary => {
  const record = (payload || {}) as Record<string, unknown>;
  const successCount = Number(record.successRows ?? record.successCount ?? record.imported ?? 0);
  const failureCount = Number(record.failedRows ?? record.failureCount ?? record.failed ?? 0);
  return {
    successCount: Number.isFinite(successCount) ? successCount : 0,
    failureCount: Number.isFinite(failureCount) ? failureCount : 0,
    errors: toIssues(record.errors),
  };
};

export const machineImportsApi = {
  async validateImport(type: ImportEntityType, file: File): Promise<ImportValidationSummary> {
    const formData = new FormData();
    formData.append('file', file);
    const validateType: ImportValidateType =
      type === 'machines' ? 'MACHINE' : type === 'profiles' ? 'PROFILE' : 'MAPPING';
    formData.append('type', validateType);

    const data = await postImportForm<unknown>('/api/v1/machine-imports/validate', formData);
    return normalizeValidation(data);
  },

  async importCsv(type: ImportEntityType, file: File, mode: MachineImportMode = 'CREATE_ONLY'): Promise<ImportExecutionSummary> {
    const formData = new FormData();
    formData.append('file', file);
    if (type === 'machines') {
      formData.append('mode', mode);
    }

    const candidatePaths =
      type === 'profiles'
        ? ['/api/v1/machine-imports/profiles', '/api/v1/machine-imports/profile']
        : type === 'mappings'
          ? ['/api/v1/machine-imports/mappings', '/api/v1/machine-imports/mapping']
          : ['/api/v1/machine-imports/machines'];

    let lastError: unknown;
    for (const path of candidatePaths) {
      try {
        const data = await postImportForm<unknown>(path, formData);
        return normalizeExecution(data);
      } catch (error) {
        lastError = error;
        if (!shouldTryFallback(error) || path === candidatePaths[candidatePaths.length - 1]) {
          throw error;
        }
      }
    }

    throw (lastError ?? new ImportApiError('Import failed'));
  },
};

