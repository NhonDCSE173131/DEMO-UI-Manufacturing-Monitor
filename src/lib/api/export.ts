import { apiClient, buildApiUrl } from '@/lib/api/client';
import type { ExportJobResponse, ExportTelemetryRequest } from '@/types/api';

export const exportApi = {
  async createTelemetryExport(payload: ExportTelemetryRequest): Promise<ExportJobResponse> {
    return apiClient.post<ExportJobResponse>('/api/v1/exports/telemetry', payload);
  },

  async getExportJob(jobId: string): Promise<ExportJobResponse> {
    return apiClient.get<ExportJobResponse>(`/api/v1/exports/${jobId}`);
  },

  async downloadExportJob(jobId: string): Promise<Blob> {
    const response = await apiClient.getRaw(`/api/v1/exports/${jobId}/download`);
    return response.blob();
  },

  getExportDownloadUrl(jobId: string) {
    return buildApiUrl(`/api/v1/exports/${jobId}/download`);
  },
};

