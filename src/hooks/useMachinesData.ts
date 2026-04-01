import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { machinesApi } from '@/lib/api/machines';
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

const DEFAULT_POLL_MS = 90_000; // SSE là nguồn live chính, REST chỉ refresh nền

/**
 * Kiểm tra live data available (pure function, không phụ thuộc store).
 * - ONLINE + freshness ≤ 30 → live
 * - UNSTABLE + freshness ≤ 45 → live (nhưng UI cảnh báo)
 * - STALE / OFFLINE → không live
 */
const computeLiveDataAvailable = (
  connState: Machine['connectionState'] | undefined,
  freshness: number | undefined,
  unstableFlag?: boolean,
): boolean => {
  if (!connState) return false;
  if (connState !== 'ONLINE' && connState !== 'UNSTABLE') return false;
  if (unstableFlag || connState === 'UNSTABLE') return freshness === undefined || freshness <= 45;
  return freshness === undefined || freshness <= 30;
};

export const useMachinesData = (pollIntervalMs: number = DEFAULT_POLL_MS) => {
  const { snapshotsByMachineId, connectionStateByMachineId, lastSeenByMachineId, dataFreshnessByMachineId } = useRealtimeStore();

  // REST baseline: dữ liệu gốc từ API, KHÔNG lẫn realtime
  const [restMachines, setRestMachines] = useState<Machine[]>([]);
  const [events, setEvents] = useState<MachineEvent[]>([]);
  const [imageOverrides, setImageOverrides] = useState<Record<string, MachineImageOverride>>(loadMachineImageOverrides());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  const syncImageOverrides = useCallback(() => {
    const overrides = loadMachineImageOverrides();
    setImageOverrides(overrides);
    setRestMachines((prev) => applyMachineImageOverrides(prev, overrides));
  }, []);

  // load() chỉ fetch REST, KHÔNG đọc realtime store → deps = []
  const load = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);
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
      setRestMachines(applyMachineImageOverrides(mergedMachines, overrides));
      if (!initialLoadDone.current) setEvents([]);
      initialLoadDone.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được dữ liệu máy');
      if (!initialLoadDone.current) {
        setRestMachines([]);
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Lần đầu load — chỉ chạy 1 lần (load giờ stable identity)
  useEffect(() => {
    load();
  }, [load]);

  // Polling tự động - refresh REST data định kỳ
  useEffect(() => {
    if (pollIntervalMs <= 0) return;
    const timer = setInterval(() => { void load(); }, pollIntervalMs);
    return () => clearInterval(timer);
  }, [load, pollIntervalMs]);

  // ═══ machines = REST baseline + realtime overlay (useMemo) ═══
  // Mỗi khi REST hoặc realtime store thay đổi, machines tự tính lại.
  // Realtime luôn ưu tiên hơn REST vì nó mới hơn.
  const machines = useMemo(() => {
    return restMachines.map((machine) => {
      const rtPatch = snapshotsByMachineId[machine.id];
      const connState = connectionStateByMachineId[machine.id] ?? machine.connectionState;
      const lastSeenAt = lastSeenByMachineId[machine.id] ?? machine.lastSeenAt;
      const freshness = dataFreshnessByMachineId[machine.id] ?? machine.dataFreshnessSec;
      const connectionUnstable = (rtPatch?.connectionUnstable as boolean | undefined) ?? machine.connectionUnstable;
      return {
        ...machine,
        ...(rtPatch || {}),
        connectionState: connState,
        lastSeenAt,
        dataFreshnessSec: freshness,
        connectionUnstable,
        liveDataAvailable: computeLiveDataAvailable(connState, freshness, connectionUnstable),
      };
    });
  }, [restMachines, snapshotsByMachineId, connectionStateByMachineId, lastSeenByMachineId, dataFreshnessByMachineId]);

  // Image override sync
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
    setRestMachines((prev) => prev.map((machine) => (machine.id === machineId ? { ...machine, ...updates } : machine)));
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
      setRestMachines((prev) => prev.map((machine) => (machine.id === machineId ? { ...machine, image } : machine)));
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
      applyMachinePatch,
      appendEvent,
      saveMachineImage,
      resetMachineImage,
    }),
    [events, machines, imageOverrides, loading, error, load, applyMachinePatch, appendEvent, saveMachineImage, resetMachineImage],
  );
};
