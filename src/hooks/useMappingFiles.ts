import { useEffect, useState } from 'react';
import type { ImportedMappingFile } from '@/types/machine-config';
import { buildApiUrl } from '@/lib/api/client';

interface UseMappingFilesReturn {
  files: ImportedMappingFile[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useMappingFiles(profileCode?: string): UseMappingFilesReturn {
  const [files, setFiles] = useState<ImportedMappingFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeFile = (input: unknown): ImportedMappingFile | null => {
    const item = (input || {}) as Record<string, unknown>;
    const importType = String(item.importType || '').toUpperCase();
    if (importType !== 'MAPPING' && importType !== 'MAPPINGS') return null;

    const fileId = String(item.fileId || item.batchId || '').trim();
    if (!fileId) return null;

    const totalRows = Number(item.totalRows || 0);
    const successRows = Number(item.successRows || 0);
    const failedRows = Number(item.failedRows || 0);
    const rawStatus = String(item.status || '').toUpperCase();
    let normalizedStatus: string;
    if (!rawStatus) {
      normalizedStatus = totalRows > 0
        ? (failedRows > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED')
        : 'PENDING';
    } else if (['SUCCESS', 'DONE', 'READY', 'FINISHED'].includes(rawStatus)) {
      normalizedStatus = failedRows > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';
    } else {
      normalizedStatus = rawStatus;
    }

    return {
      fileId,
      batchId: String(item.batchId || fileId),
      fileName: String(item.fileName || item.originalFileName || fileId),
      importType: importType as ImportedMappingFile['importType'],
      uploadedAt: String(item.uploadedAt || item.createdAt || ''),
      uploadedBy: String(item.uploadedBy || 'system'),
      status: normalizedStatus as ImportedMappingFile['status'],
      profileCode: String(item.profileCode || ''),
      profileId: item.profileId ? String(item.profileId) : undefined,
      totalRows,
      successRows,
      failedRows,
    };
  };

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ type: 'MAPPING' });
      if (profileCode) params.append('profileCode', profileCode);

      const response = await fetch(buildApiUrl(`/api/v1/machine-imports/files?${params.toString()}`));
      if (!response.ok) {
        setError(`Failed to fetch mapping files (${response.status})`);
        setFiles([]);
        return;
      }

      const data = await response.json();
      if (!data.success || !Array.isArray(data.data)) {
        setFiles([]);
        return;
      }

      const mergedById = new Map<string, ImportedMappingFile>();
      data.data
        .map(normalizeFile)
        .filter((item: ImportedMappingFile | null): item is ImportedMappingFile => item !== null)
        .forEach((file: ImportedMappingFile) => {
          if (!mergedById.has(file.fileId)) {
            mergedById.set(file.fileId, file);
          }
        });

      setFiles(Array.from(mergedById.values()));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [profileCode]);

  return {
    files,
    isLoading,
    error,
    refetch: fetchFiles,
  };
}

