import { apiClient } from '@/lib/api/client';
import type {
  ConnectionTestResult,
  CreateMachineProfilePayload,
  CreateMachinePayload,
  MachineConfigResponse,
  MachineProfileResponse,
  ProfileFieldMapping,
} from '@/types/machine-config';

type MachineConfigApiDto = {
  id: string;
  code: string;
  name: string;
  protocol: string;
  host?: string;
  port?: number;
  unitId?: number;
  pollIntervalMs?: number;
  autoConnect?: boolean;
  profileId?: string;
  profileCode?: string;
  mappingFileId?: string;
  isEnabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastConnectionStatus?: string;
  description?: string;
};

type ProfileApiDto = {
  id: string;
  profileCode: string;
  profileName: string;
  protocol: string;
  vendor?: string;
  model?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  mappings?: Array<{
    id?: string;
    logicalKey: string;
    area: 'COIL' | 'DISCRETE_INPUT' | 'HOLDING' | 'INPUT';
    addressStart: number;
    bitIndex?: number;
    dataType: string;
    scaleFactor?: number;
    unit?: string;
    byteOrder?: string;
    wordOrder?: string;
    isRequired?: boolean;
    description?: string;
  }>;
};

type ConnectionStatusDto = {
  machineId?: string;
  machineCode?: string;
  status?: string;
  lastError?: string | null;
};

const normalizeConnectionStatus = (status?: string): MachineConfigResponse['connectionStatus'] => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'ONLINE') return 'ONLINE';
  if (normalized === 'STALE') return 'STALE';
  if (normalized === 'OFFLINE' || normalized === 'DISCONNECTED') return 'OFFLINE';
  if (normalized === 'UNSTABLE') return 'UNSTABLE';
  if (normalized === 'BAD_CONFIG') return 'BAD_CONFIG';
  if (normalized === 'ERROR') return 'ERROR';
  return 'OFFLINE';
};

const mapMachineConfigDto = (dto: MachineConfigApiDto): MachineConfigResponse => ({
  id: dto.id,
  machineCode: dto.code,
  machineName: dto.name,
  description: dto.description,
  protocol: 'modbus-tcp',
  host: dto.host || '',
  port: dto.port || 502,
  unitId: dto.unitId,
  profileId: dto.profileId,
  profileCode: dto.profileCode || '-',
  mappingFileId: dto.mappingFileId,
  pollIntervalMs: dto.pollIntervalMs || 1000,
  enabled: dto.isEnabled !== false,
  autoConnect: dto.autoConnect === true,
  createdAt: dto.createdAt || new Date().toISOString(),
  updatedAt: dto.updatedAt || new Date().toISOString(),
  connectionStatus: normalizeConnectionStatus(dto.lastConnectionStatus),
  lastConnectionAttempt: dto.updatedAt,
});

const mapCreatePayloadToApi = (payload: CreateMachinePayload) => ({
  code: payload.machineCode,
  name: payload.machineName,
  protocol: payload.protocol,
  host: payload.host,
  port: payload.port,
  unitId: payload.unitId,
  pollIntervalMs: payload.pollIntervalMs,
  autoConnect: payload.autoConnect,
  profileId: payload.profileId,
  mappingFileId: payload.mappingFileId,
  description: payload.description,
});

const mapProfileDto = (dto: ProfileApiDto): MachineProfileResponse => ({
  id: dto.id,
  profileCode: dto.profileCode,
  profileName: dto.profileName,
  protocol: dto.protocol,
  vendor: dto.vendor,
  model: dto.model,
  description: dto.description,
  createdAt: dto.createdAt,
  updatedAt: dto.updatedAt,
  mappings: (dto.mappings || []).map((mapping): ProfileFieldMapping => ({
    id: mapping.id,
    logicalKey: mapping.logicalKey,
    area: mapping.area,
    addressStart: mapping.addressStart,
    bitIndex: mapping.bitIndex,
    dataType: mapping.dataType,
    scaleFactor: mapping.scaleFactor,
    unit: mapping.unit,
    byteOrder: mapping.byteOrder,
    wordOrder: mapping.wordOrder,
    isRequired: mapping.isRequired,
    description: mapping.description,
  })),
});

const mapConnectionResult = (dto: ConnectionStatusDto): ConnectionTestResult => {
  const status = (dto.status || '').toUpperCase();
  const isConnected = status === 'ONLINE' || status === 'STALE';
  return {
    machineId: dto.machineId || '',
    isConnected,
    message: dto.lastError || status || 'UNKNOWN',
  };
};

export const machineConfigsApi = {
  async getMachineConfigs(): Promise<MachineConfigResponse[]> {
    const data = await apiClient.get<MachineConfigApiDto[]>('/api/v1/machine-configs');
    return (data || []).map(mapMachineConfigDto);
  },

  async getMachineConfig(id: string): Promise<MachineConfigResponse> {
    const data = await apiClient.get<MachineConfigApiDto>(`/api/v1/machine-configs/${id}`);
    return mapMachineConfigDto(data);
  },

  async createMachineConfig(payload: CreateMachinePayload): Promise<MachineConfigResponse> {
    const data = await apiClient.post<MachineConfigApiDto>('/api/v1/machine-configs', mapCreatePayloadToApi(payload));
    return mapMachineConfigDto(data);
  },

  async updateMachineConfig(id: string, payload: Partial<CreateMachinePayload>): Promise<MachineConfigResponse> {
    const apiPayload = {
      ...(payload.machineCode ? { code: payload.machineCode } : {}),
      ...(payload.machineName ? { name: payload.machineName } : {}),
      ...(payload.protocol ? { protocol: payload.protocol } : {}),
      ...(payload.host ? { host: payload.host } : {}),
      ...(payload.port ? { port: payload.port } : {}),
      ...(payload.unitId ? { unitId: payload.unitId } : {}),
      ...(payload.pollIntervalMs ? { pollIntervalMs: payload.pollIntervalMs } : {}),
      ...(typeof payload.autoConnect === 'boolean' ? { autoConnect: payload.autoConnect } : {}),
      ...(payload.profileId ? { profileId: payload.profileId } : {}),
      ...(payload.mappingFileId ? { mappingFileId: payload.mappingFileId } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
    };
    const data = await apiClient.put<MachineConfigApiDto>(`/api/v1/machine-configs/${id}`, apiPayload);
    return mapMachineConfigDto(data);
  },

  async deleteMachineConfig(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/v1/machine-configs/${id}`);
  },

  async enableMachine(id: string): Promise<void> {
    await apiClient.patch<unknown>(`/api/v1/machine-configs/${id}/enable`, {});
  },

  async disableMachine(id: string): Promise<void> {
    await apiClient.patch<unknown>(`/api/v1/machine-configs/${id}/disable`, {});
  },

  async testMachineConnection(id: string): Promise<ConnectionTestResult> {
    const data = await apiClient.post<ConnectionStatusDto>(`/api/v1/machine-configs/${id}/test-connection`, {});
    return mapConnectionResult(data);
  },

  async connectMachine(id: string): Promise<{ message: string; isConnected: boolean }> {
    const data = await apiClient.post<ConnectionStatusDto>(`/api/v1/machine-configs/${id}/connect`, {});
    const mapped = mapConnectionResult(data);
    return { message: mapped.message, isConnected: mapped.isConnected };
  },

  async disconnectMachine(id: string): Promise<{ message: string }> {
    const data = await apiClient.post<ConnectionStatusDto>(`/api/v1/machine-configs/${id}/disconnect`, {});
    const mapped = mapConnectionResult(data);
    return { message: mapped.message };
  },
};

// Keep profile API separated because BE may expose it independently from machine-configs CRUD.
export const machineProfilesApi = {
  async getProfiles(): Promise<MachineProfileResponse[]> {
    try {
      const data = await apiClient.get<ProfileApiDto[]>('/api/v1/machine-profiles');
      return (data || []).map(mapProfileDto);
    } catch {
      return [];
    }
  },

  async createProfile(payload: CreateMachineProfilePayload): Promise<MachineProfileResponse> {
    const data = await apiClient.post<ProfileApiDto>('/api/v1/machine-profiles', payload);
    return mapProfileDto(data);
  },
};
