import { machineConfigsApi, machineProfilesApi } from '@/lib/api/machine-configs';
import { machineImportsApi } from '@/lib/api/machine-imports';
import type {
  CreateMachinePayload,
  MachineConfigResponse,
  MachineProfileResponse,
  ConnectionTestResult,
  ImportResult,
  ImportMode,
} from '@/types/machine-config';
import type { ImportEntityType } from '@/types/machine-import';

/**
 * Machine Configuration Management API
 * Handles creation, update, deletion, and testing of machine configurations
 */

export const machineConfigApi = {
  async getMachineConfigs(): Promise<MachineConfigResponse[]> {
    return machineConfigsApi.getMachineConfigs();
  },

  async getMachineConfig(id: string): Promise<MachineConfigResponse> {
    return machineConfigsApi.getMachineConfig(id);
  },

  async createMachineConfig(payload: CreateMachinePayload): Promise<MachineConfigResponse> {
    return machineConfigsApi.createMachineConfig(payload);
  },

  async updateMachineConfig(id: string, payload: Partial<CreateMachinePayload>): Promise<MachineConfigResponse> {
    return machineConfigsApi.updateMachineConfig(id, payload);
  },

  async deleteMachineConfig(id: string): Promise<void> {
    return machineConfigsApi.deleteMachineConfig(id);
  },

  async getMachineProfiles(): Promise<MachineProfileResponse[]> {
    return machineProfilesApi.getProfiles();
  },

  async getMachineProfile(id: string): Promise<MachineProfileResponse> {
    const profiles = await machineProfilesApi.getProfiles();
    const found = profiles.find((profile) => profile.id === id);
    if (!found) throw new Error('Profile not found');
    return found;
  },

  async testMachineConnection(id: string): Promise<ConnectionTestResult> {
    return machineConfigsApi.testMachineConnection(id);
  },

  async connectMachine(id: string): Promise<{ message: string; isConnected: boolean }> {
    return machineConfigsApi.connectMachine(id);
  },

  async disconnectMachine(id: string): Promise<{ message: string }> {
    return machineConfigsApi.disconnectMachine(id);
  },

  async reconnectMachine(id: string): Promise<{ message: string; isConnected: boolean }> {
    return machineConfigsApi.connectMachine(id);
  },

  async importMachineConfigs(formData: FormData, _mode: ImportMode = 'create-only'): Promise<ImportResult> {
    const file = formData.get('file');
    if (!(file instanceof File)) throw new Error('Missing import file');
    const type = (formData.get('importType') as ImportEntityType) || 'machines';
    const result = await machineImportsApi.importCsv(type, file);
    return {
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors.map((error) => ({
        rowIndex: error.rowIndex,
        machineCode: '',
        message: error.message,
      })),
    };
  },
};

/**
 * Machine Profile API
 * Handles profile management for machine data mapping
 */

export const machineProfileApi = {
  async getProfiles(): Promise<MachineProfileResponse[]> {
    return machineProfilesApi.getProfiles();
  },

  async getProfile(id: string): Promise<MachineProfileResponse> {
    return machineConfigApi.getMachineProfile(id);
  },

  async createProfile(payload: Partial<MachineProfileResponse>): Promise<MachineProfileResponse> {
    throw new Error(`Profile creation is not supported from UI yet: ${payload.profileCode || ''}`.trim());
  },

  async updateProfile(id: string, payload: Partial<MachineProfileResponse>): Promise<MachineProfileResponse> {
    throw new Error(`Profile update is not supported from UI yet: ${id}`);
  },

  async deleteProfile(id: string): Promise<void> {
    throw new Error(`Profile delete is not supported from UI yet: ${id}`);
  },
};

