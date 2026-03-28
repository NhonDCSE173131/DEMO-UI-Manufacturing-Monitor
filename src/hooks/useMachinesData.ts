import { useCallback, useEffect, useMemo, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
import { appEnv } from '@/lib/config/env';
import { useMachineStore } from '@/lib/store';
import { useRealtimeStore } from '@/lib/realtime-store';
import type { Machine, MachineEvent } from '@/types';
import {
  applyMachineImageOverrides,
  getMachineImageOverrideChangeEvent,
  getMachineImageOverrideStorageKey,
  loadMachineImageOverrides,
  removeMachineImageOverride,
  saveMachineImageOverride,
  type MachineImageOverride,
} from '@/lib/machine-image-overrides';

export const useMachinesData = () => {
  const { machines: storeMachines, events: storeEvents } = useMachineStore();
  const { snapshotsByMachineId } = useRealtimeStore();
  const [machines, setMachines] = useState<Machine[]>(
    appEnv.useMock ? applyMachineImageOverrides(storeMachines) : [],
  );
  const [events, setEvents] = useState<MachineEvent[]>(appEnv.useMock ? storeEvents : []);
  const [imageOverrides, setImageOverrides] = useState<Record<string, MachineImageOverride>>(loadMachineImageOverrides());
  const [loading, setLoading] = useState(!appEnv.useMock);
  const [error, setError] = useState<string | null>(null);

  const syncImageOverrides = useCallback(() => {
    const overrides = loadMachineImageOverrides();
    setImageOverrides(overrides);
    setMachines((prev) => applyMachineImageOverrides(prev, overrides));
  }, []);

  const load = useCallback(async () => {
    if (appEnv.useMock) return;
    setLoading(true);
    setError(null);
    try {
      const [apiMachines, apiSnapshots] = await Promise.all([
        machinesApi.getMachines(),
        machinesApi.getMachineSnapshots().catch(() => []),
      ]);
      const snapshotsById = new Map(apiSnapshots.map((machine) => [machine.id, machine]));
      const mergedMachines = apiMachines.map((machine) => ({
        ...machine,
        ...(snapshotsById.get(machine.id) || {}),
      }));
      const overrides = loadMachineImageOverrides();
      setImageOverrides(overrides);
      setMachines(applyMachineImageOverrides(mergedMachines, overrides));
      setEvents([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Khong tai duoc du lieu may');
      setMachines([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (appEnv.useMock) {
      const overrides = loadMachineImageOverrides();
      setImageOverrides(overrides);
      setMachines(applyMachineImageOverrides(storeMachines, overrides));
      setEvents(storeEvents);
    }
  }, [storeEvents, storeMachines]);

  // Apply realtime patches on top of machines
  useEffect(() => {
    if (!appEnv.useMock && Object.keys(snapshotsByMachineId).length > 0) {
      setMachines((prev) =>
        prev.map((machine) => {
          const rtPatch = snapshotsByMachineId[machine.id];
          if (rtPatch) {
            return { ...machine, ...rtPatch };
          }
          return machine;
        }),
      );
    }
  }, [snapshotsByMachineId]);

  useEffect(() => {
    const handleChanged = () => syncImageOverrides();
    const handleStorage = (event: StorageEvent) => {
      if (event.key === getMachineImageOverrideStorageKey()) {
        syncImageOverrides();
      }
    };

    window.addEventListener(getMachineImageOverrideChangeEvent(), handleChanged as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(getMachineImageOverrideChangeEvent(), handleChanged as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncImageOverrides]);

  const applyMachinePatch = useCallback((machineId: string, updates: Partial<Machine>) => {
    setMachines((prev) => prev.map((machine) => (machine.id === machineId ? { ...machine, ...updates } : machine)));
  }, []);

  const appendEvent = useCallback((event: MachineEvent) => {
    setEvents((prev) => {
      const next = [event, ...prev.filter((item) => item.id !== event.id)];
      return next.slice(0, 100);
    });
  }, []);

  const saveMachineImage = useCallback(
    async (machineId: string, image: string, fileName?: string) => {
      const override = saveMachineImageOverride(machineId, image, fileName);
      setImageOverrides((prev) => ({ ...prev, [machineId]: override }));
      setMachines((prev) => prev.map((machine) => (machine.id === machineId ? { ...machine, image } : machine)));
      return override;
    },
    [],
  );

  const resetMachineImage = useCallback(
    async (machineId: string) => {
      removeMachineImageOverride(machineId);
      setImageOverrides((prev) => {
        const next = { ...prev };
        delete next[machineId];
        return next;
      });
      await load();
    },
    [load],
  );

  return useMemo(
    () => ({
      machines,
      events,
      imageOverrides,
      loading,
      error,
      refresh: load,
      usingMock: appEnv.useMock,
      applyMachinePatch,
      appendEvent,
      saveMachineImage,
      resetMachineImage,
    }),
    [events, machines, imageOverrides, loading, error, load, applyMachinePatch, appendEvent, saveMachineImage, resetMachineImage],
  );
};

