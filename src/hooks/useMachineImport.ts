'use client';

import { useState, useCallback } from 'react';
import { machineImportsApi } from '@/lib/api/machine-imports';
import type { CsvPreviewData, ImportEntityType, ImportExecutionSummary, ImportValidationSummary, MachineImportMode } from '@/types/machine-import';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface ParseResult {
  preview: CsvPreviewData;
  errors: string[];
}

const REQUIRED_HEADERS: Record<ImportEntityType, string[]> = {
  machines: ['machine_code', 'machine_name', 'protocol', 'profile_code'],
  profiles: ['profile_code', 'profile_name', 'protocol'],
  mappings: ['profile_code', 'logical_key', 'area', 'address', 'data_type'],
};

export function useMachineImport() {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  const [preview, setPreview] = useState<CsvPreviewData | null>(null);
  const [validationResult, setValidationResult] = useState<ImportValidationSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((file: File, type: ImportEntityType): Promise<ParseResult> => {
    const errors: string[] = [];
    const parsedRows: string[][] = [];

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

          if (lines.length < 2) {
            errors.push(t.validation.fileInsufficientRows);
            resolve({ preview: { headers: [], rows: [], totalRows: 0 }, errors });
            return;
          }

          const headers = lines[0].split(',').map((h) => h.trim());
          const normalizedHeaders = headers.map((h) => h.toLowerCase());
          const missing = REQUIRED_HEADERS[type].filter((header) => !normalizedHeaders.includes(header));
          if (missing.length > 0) {
            errors.push(`${selectedLanguage === 'vi' ? 'Thieu cot bat buoc' : 'Missing required headers'}: ${missing.join(', ')}`);
            resolve({ preview: { headers, rows: [], totalRows: 0 }, errors });
            return;
          }
          for (let i = 1; i < lines.length; i++) {
            parsedRows.push(lines[i].split(',').map((c) => c.trim()));
          }

          resolve({ preview: { headers, rows: parsedRows, totalRows: parsedRows.length }, errors });
        } catch (err) {
          errors.push(`${t.errors.parseFileFailed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          resolve({ preview: { headers: [], rows: [], totalRows: 0 }, errors });
        }
      };

      reader.onerror = () => {
        errors.push(t.validation.cannotReadFile);
        resolve({ preview: { headers: [], rows: [], totalRows: 0 }, errors });
      };

      reader.readAsText(file);
    });
  }, [selectedLanguage, t.errors.parseFileFailed, t.validation.cannotReadFile, t.validation.fileInsufficientRows]);

  const parseFile = useCallback(
    async (file: File, type: ImportEntityType): Promise<ParseResult> => {
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'csv') {
        return parseCSV(file, type);
      } else {
        return {
          preview: { headers: [], rows: [], totalRows: 0 },
          errors: [selectedLanguage === 'vi' ? 'Chi ho tro file .csv' : 'Only .csv files are supported'],
        };
      }
    },
    [parseCSV, selectedLanguage],
  );

  const validateImport = useCallback(async (file: File, type: ImportEntityType): Promise<ImportValidationSummary> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await machineImportsApi.validateImport(type, file);
      setValidationResult(result);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.importFailed;
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [t.errors.importFailed]);

  const submitImport = useCallback(async (file: File, type: ImportEntityType, mode: MachineImportMode = 'CREATE_ONLY'): Promise<ImportExecutionSummary> => {
    setIsLoading(true);
    setError(null);
    try {
      return await machineImportsApi.importCsv(type, file, mode);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.importFailed;
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [t.errors.importFailed]);

  return {
    preview,
    setPreview,
    validationResult,
    setValidationResult,
    isLoading,
    error,
    parseFile,
    validateImport,
    submitImport,
  };
}


