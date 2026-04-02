import { apiClient } from '@/lib/api/client';
import type {
  CreateMachinePayload,
  MachineConfigResponse,
  MachineProfileResponse,
  ConnectionTestResult,
  ImportResult,
  ImportMode,
} from '@/types/machine-config';

/**
 * Machine Configuration Management API
 * Handles creation, update, deletion, and testing of machine configurations
 */

export const machineConfigApi = {
  // ========== Machine Config CRUD ==========

  async getMachineConfigs(): Promise<MachineConfigResponse[]> {
    const data = await apiClient.get<MachineConfigResponse[]>('/api/v1/machines/config');
    return data || [];
  },

  async getMachineConfig(id: string): Promise<MachineConfigResponse> {
    return apiClient.get<MachineConfigResponse>(`/api/v1/machines/config/${id}`);
  },

  async createMachineConfig(payload: CreateMachinePayload): Promise<MachineConfigResponse> {
    return apiClient.post<MachineConfigResponse>('/api/v1/machines/config', payload);
  },

  async updateMachineConfig(id: string, payload: Partial<CreateMachinePayload>): Promise<MachineConfigResponse> {
    return apiClient.put<MachineConfigResponse>(`/api/v1/machines/config/${id}`, payload);
  },

  async deleteMachineConfig(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/machines/config/${id}`);
  },

  // ========== Machine Profile Management ==========

  async getMachineProfiles(): Promise<MachineProfileResponse[]> {
    try {
      const data = await apiClient.get<MachineProfileResponse[]>('/api/v1/machine-profiles');
      return data || [];
    } catch {
      return [];
    }
  },

  async getMachineProfile(id: string): Promise<MachineProfileResponse> {
    return apiClient.get<MachineProfileResponse>(`/api/v1/machine-profiles/${id}`);
  },

  // ========== Machine Connection Operations ==========

  async testMachineConnection(id: string): Promise<ConnectionTestResult> {
    return apiClient.post<ConnectionTestResult>(`/api/v1/machines/${id}/test-connection`, {});
  },

  async connectMachine(id: string): Promise<{ message: string; isConnected: boolean }> {
    return apiClient.post<{ message: string; isConnected: boolean }>(`/api/v1/machines/${id}/connect`, {});
  },

  async disconnectMachine(id: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/api/v1/machines/${id}/disconnect`, {});
  },

  async reconnectMachine(id: string): Promise<{ message: string; isConnected: boolean }> {
    return apiClient.post<{ message: string; isConnected: boolean }>(`/api/v1/machines/${id}/reconnect`, {});
  },

  // ========== Bulk Import ==========

  async importMachineConfigs(formData: FormData, mode: ImportMode = 'create-only'): Promise<ImportResult> {
    // Add mode to formData
    formData.append('importMode', mode);

    // Use fetch directly for FormData
    const response = await fetch('/api/v1/machines/import', {
      method: 'POST',
      body: formData,
      headers: {
        // Don't set Content-Type, browser will set it with boundary for FormData
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Import failed');
    }

    return response.json() as Promise<ImportResult>;
  },
};

/**
 * Machine Profile API
 * Handles profile management for machine data mapping
 */

export const machineProfileApi = {
  async getProfiles(): Promise<MachineProfileResponse[]> {
    try {
      const data = await apiClient.get<MachineProfileResponse[]>('/api/v1/machine-profiles');
      return data || [];
    } catch {
      return [];
    }
  },

  async getProfile(id: string): Promise<MachineProfileResponse> {
    return apiClient.get<MachineProfileResponse>(`/api/v1/machine-profiles/${id}`);
  },

  async createProfile(payload: Partial<MachineProfileResponse>): Promise<MachineProfileResponse> {
    return apiClient.post<MachineProfileResponse>('/api/v1/machine-profiles', payload);
  },

  async updateProfile(id: string, payload: Partial<MachineProfileResponse>): Promise<MachineProfileResponse> {
    return apiClient.put<MachineProfileResponse>(`/api/v1/machine-profiles/${id}`, payload);
  },

  async deleteProfile(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/machine-profiles/${id}`);
  },
};

