import type { Machine } from '@/types';

export interface MachineImageOverride {
  image: string;
  source: 'local';
  updatedAt: string;
  fileName?: string;
}

const STORAGE_KEY = 'machine-image-overrides';
const CHANGE_EVENT = 'machine-image-overrides-changed';

const isBrowser = () => typeof window !== 'undefined';

export const getMachineImageOverrideStorageKey = () => STORAGE_KEY;
export const getMachineImageOverrideChangeEvent = () => CHANGE_EVENT;

export const loadMachineImageOverrides = (): Record<string, MachineImageOverride> => {
  if (!isBrowser()) return {};

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, MachineImageOverride>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const persistOverrides = (overrides: Record<string, MachineImageOverride>) => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
};

const emitOverrideChanged = (machineId: string) => {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { machineId } }));
};

export const saveMachineImageOverride = (machineId: string, image: string, fileName?: string) => {
  const overrides = loadMachineImageOverrides();
  overrides[machineId] = {
    image,
    source: 'local',
    updatedAt: new Date().toISOString(),
    fileName,
  };
  persistOverrides(overrides);
  emitOverrideChanged(machineId);
  return overrides[machineId];
};

export const removeMachineImageOverride = (machineId: string) => {
  const overrides = loadMachineImageOverrides();
  if (!(machineId in overrides)) return;
  delete overrides[machineId];
  persistOverrides(overrides);
  emitOverrideChanged(machineId);
};

export const applyMachineImageOverrides = (
  machines: Machine[],
  overrides: Record<string, MachineImageOverride> = loadMachineImageOverrides(),
): Machine[] => {
  if (!Array.isArray(machines) || machines.length === 0) return machines;

  return machines.map((machine) => {
    const override = overrides[machine.id];
    return override ? { ...machine, image: override.image } : machine;
  });
};

