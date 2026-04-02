'use client';

import { useState, useCallback } from 'react';
import { machineConfigApi } from '@/lib/api/machine-config';
import { validateImportRow } from '@/lib/machine-config-normalizer';
import type { ImportMachineRow, ImportResult, ImportMode, MachineProtocol } from '@/types/machine-config';
import { useMachineStore } from '@/lib/store';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';

interface ParseResult {
  rows: ImportMachineRow[];
  errors: string[];
}

export function useMachineImport() {
  const { selectedLanguage } = useMachineStore();
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const t = messages.machineManagement;

  const validationMessages = {
    machineCodeRequired: t.validation.machineCodeRequired,
    machineCodeFormatInvalid: t.validation.machineCodeFormatInvalid,
    machineNameRequired: t.validation.machineNameRequired,
    protocolInvalid: t.validation.protocolInvalid,
    hostRequired: t.validation.hostRequired,
    hostInvalid: t.validation.hostInvalid,
    portInvalid: t.validation.portInvalid,
    profileRequired: t.validation.profileRequired,
  };

  const [importRows, setImportRows] = useState<ImportMachineRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseCSV = useCallback((file: File): Promise<ParseResult> => {
    const errors: string[] = [];
    const rows: ImportMachineRow[] = [];

    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const lines = content.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

          if (lines.length < 2) {
            errors.push(t.validation.fileInsufficientRows);
            resolve({ rows: [], errors });
            return;
          }

          // Parse header
          const headerLine = lines[0];
          const headers = headerLine.split(',').map((h) => h.trim().toLowerCase());

          // Find required column indices
          const codeIdx = headers.indexOf('machinecode');
          const nameIdx = headers.indexOf('machinename');
          const protocolIdx = headers.indexOf('protocol');
          const hostIdx = headers.indexOf('host');
          const portIdx = headers.indexOf('port');
          const profileIdx = headers.indexOf('profilecode');
          const descIdx = headers.indexOf('description');

          if (codeIdx === -1 || nameIdx === -1 || hostIdx === -1 || protocolIdx === -1 || profileIdx === -1) {
            errors.push(t.validation.fileMissingRequiredColumns);
            resolve({ rows: [], errors });
            return;
          }

          // Parse data rows
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const cells = line.split(',').map((c) => c.trim());

            if (cells.length < 6) {
              errors.push(t.validation.rowNotEnoughColumns.replace('{{row}}', String(i + 1)));
              continue;
            }

            const machineCode = cells[codeIdx];
            const machineName = cells[nameIdx];
            const protocol = cells[protocolIdx];
            const host = cells[hostIdx];
            const port = cells[portIdx];
            const profileCode = cells[profileIdx];
            const description = descIdx !== -1 ? cells[descIdx] : undefined;

            const rowErrors = validateImportRow(i + 1, machineCode, machineName, protocol, host, port, profileCode, validationMessages);

            rows.push({
              rowIndex: i + 1,
              machineCode,
              machineName,
              protocol: protocol as MachineProtocol,
              host,
              port,
              profileCode,
              description,
              isValid: rowErrors.length === 0,
              errors: rowErrors,
            });
          }

          resolve({ rows, errors });
        } catch (err) {
          errors.push(`${t.errors.parseFileFailed}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          resolve({ rows: [], errors });
        }
      };

      reader.onerror = () => {
        errors.push(t.validation.cannotReadFile);
        resolve({ rows: [], errors });
      };

      reader.readAsText(file);
    });
  }, [t.errors.parseFileFailed, t.validation.cannotReadFile, t.validation.fileInsufficientRows, t.validation.fileMissingRequiredColumns, t.validation.rowNotEnoughColumns, validationMessages]);

  const parseJSON = useCallback((file: File): Promise<ParseResult> => {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);
          const rows: ImportMachineRow[] = [];
          const errors: string[] = [];

          if (!Array.isArray(data)) {
            errors.push(t.validation.jsonMustBeArray);
            resolve({ rows: [], errors });
            return;
          }

          data.forEach((item, index) => {
            const rowErrors = validateImportRow(
              index + 1,
              item.machineCode || '',
              item.machineName || '',
              item.protocol || '',
              item.host || '',
              item.port || '',
              item.profileCode || '',
              validationMessages,
            );

            rows.push({
              rowIndex: index + 1,
              machineCode: item.machineCode || '',
              machineName: item.machineName || '',
              protocol: item.protocol as MachineProtocol,
              host: item.host || '',
              port: item.port || '',
              profileCode: item.profileCode || '',
              description: item.description,
              isValid: rowErrors.length === 0,
              errors: rowErrors,
            });
          });

          resolve({ rows, errors });
        } catch (err) {
          resolve({
            rows: [],
            errors: [`${t.errors.parseFileFailed}: ${err instanceof Error ? err.message : 'Unknown error'}`],
          });
        }
      };

      reader.onerror = () => {
        resolve({
          rows: [],
          errors: [t.validation.cannotReadFile],
        });
      };

      reader.readAsText(file);
    });
  }, [t.errors.parseFileFailed, t.validation.cannotReadFile, t.validation.jsonMustBeArray, validationMessages]);

  const parseFile = useCallback(
    async (file: File): Promise<ParseResult> => {
      const ext = file.name.toLowerCase().split('.').pop();

      if (ext === 'csv') {
        return parseCSV(file);
      } else if (ext === 'json') {
        return parseJSON(file);
      } else {
        return {
          rows: [],
          errors: [t.errors.unsupportedFile],
        };
      }
    },
    [parseCSV, parseJSON, t.errors.unsupportedFile],
  );

  const submitImport = useCallback(async (file: File, rows: ImportMachineRow[], mode: ImportMode = 'create-only'): Promise<ImportResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Thêm dữ liệu hàng hợp lệ
      const validRows = rows.filter((r) => r.isValid);
      formData.append('machines', JSON.stringify(validRows));

      return await machineConfigApi.importMachineConfigs(formData, mode);
    } catch (err) {
      const message = err instanceof Error ? err.message : t.errors.importFailed;
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [t.errors.importFailed]);

  return {
    importRows,
    setImportRows,
    isLoading,
    error,
    parseFile,
    submitImport,
  };
}


