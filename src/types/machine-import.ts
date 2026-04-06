export type ImportEntityType = 'machines' | 'profiles' | 'mappings';
export type ImportValidateType = 'MACHINE' | 'PROFILE' | 'MAPPING';
export type MachineImportMode = 'CREATE_ONLY' | 'UPSERT';

export interface CsvPreviewData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

export interface ImportValidationIssue {
  rowIndex: number;
  message: string;
  field?: string;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportValidationIssue[];
}

export interface ImportExecutionSummary {
  successCount: number;
  failureCount: number;
  errors: ImportValidationIssue[];
}

