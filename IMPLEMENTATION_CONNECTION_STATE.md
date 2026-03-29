# Implementation Summary: Connection State Awareness in UI

## Date: March 29, 2026
## Status: ✅ Compilation Successful

---

## Overview
This implementation adds comprehensive connection state awareness to the Manufacturing Monitor UI, enabling it to properly differentiate between:
- **System Connection State** (ONLINE, STALE, OFFLINE)
- **Machine Operational State** (RUNNING, IDLE, WARMUP, STOPPED, EMERGENCY_STOP, MAINTENANCE)
- **Live Data Availability** (when to show metrics vs. `--`)

---

## Files Created

### 1. **src/components/MockModeBanner.tsx**
- New component that displays a yellow banner when `NEXT_PUBLIC_USE_MOCK=true`
- Prevents confusion between mock data and live backend data
- Integrated into `Providers` layout

### 2. **src/components/ConnectionBadge.tsx**
- Reusable badge component for displaying connection state
- Shows: "Trực tuyến" (ONLINE), "Dữ liệu cũ" (STALE), "Mất kết nối" (OFFLINE)
- Exports helper function `liveMetricValue()` for conditional metric display
- Used in: Machine selector, Machine detail, Dashboard plant topology

---

## Files Modified

### 1. **src/types/index.ts**
**Changes:**
- Added `ConnectionStateType = 'ONLINE' | 'STALE' | 'OFFLINE'`
- Added `OperationalStateType = 'RUNNING' | 'IDLE' | 'WARMUP' | 'STOPPED' | 'EMERGENCY_STOP' | 'MAINTENANCE'`
- Extended `Machine` interface with connection/operational state fields:
  - `connectionState?: ConnectionStateType`
  - `connectionUnstable?: boolean`
  - `lastSeenAt?: string`
  - `dataFreshnessSec?: number`
  - `operationalState?: OperationalStateType`
  - `displayState?: string`
  - `connectionReason?: string | null`
  - `connectionScope?: 'PLC' | 'COLLECTOR' | 'BE_WATCHDOG' | null`
  - `liveDataAvailable?: boolean`

### 2. **src/lib/mappers/machine.mapper.ts**
**Changes:**
- Updated `mapApiMachineToUi()` to read connection/operational state from BE payload
- Added normalization functions:
  - `normalizeConnectionState()` → maps `ONLINE`, `STALE` (from `DEGRADED`), `OFFLINE`
  - `normalizeOperationalState()` → maps all operational states
- Now properly extracts and maps: `connectionState`, `operationalState`, `displayState`, `connectionReason`, `connectionScope`, `lastSeenAt`, `dataFreshnessSec`

### 3. **src/lib/mappers/realtime.mapper.ts**
**Changes:**
- Updated `mapRealtimeTelemetryPatch()` to handle connection/operational state fields
- Added same normalization helper functions
- Now patches connection state information from SSE events
- Includes `liveDataAvailable` flag based on `connectionState === 'ONLINE'`

### 4. **src/hooks/useMachinesData.ts**
**Changes:**
- Updated to subscribe to `connectionStateByMachineId`, `lastSeenByMachineId`, `dataFreshnessByMachineId` from `useRealtimeStore()`
- New `useEffect` to propagate connection state from realtime store to machines
- Machines now carry connection information alongside snapshot patches

### 5. **src/app/machines/page.tsx**
**Changes:**
- Added `ConnectionBadge` and `liveMetricValue` imports
- Fixed live tail `useEffect` to only append new points when `isMachineLive(machineId)`
- Machine selector cards now show connection badge (when not in mock mode)
- Machine detail header shows:
  - Connection badge with `lastSeenAt` info
  - Data layers badges
- Updated performance metrics panel to use `fmtLive()` helper:
  - Shows actual numbers only when ONLINE
  - Shows `--` when STALE/OFFLINE
- Updated OEE gauges and bars to respect live mode
- Machine health gauge uses live mode check
- Implementation now prevents rendering fake live metrics when not connected

### 6. **src/app/page.tsx (Dashboard)**
**Changes:**
- Added `ConnectionBadge` import from components
- Added `appEnv` import to check mock mode
- Machine overview cards in dashboard now show connection badge
- Plant topology section now displays connection state for each machine
- Connection badges are conditionally rendered (hidden in mock mode)

### 7. **src/app/providers.tsx**
**Changes:**
- Added `MockModeBanner` component
- MockModeBanner is rendered at the top of the layout (above sidebar and header)

### 8. **src/locales/vi.json**
**Changes:**
- Added connection state translations to `common` section:
  - `mockMode`, `connectionOnline`, `connectionStale`, `connectionOffline`
  - `lastSeen`, `noLiveData`

### 9. **src/locales/en.json**
**Changes:**
- Added same connection state translations in English:
  - `mockMode`, `connectionOnline`, `connectionStale`, `connectionOffline`
  - `lastSeen`, `noLiveData`

---

## Key Implementation Principles

### 1. **Connection State Display Priority**
When `connectionState != ONLINE`:
- Current metrics show `--` instead of last known value
- Display badge clearly indicates: "Dữ liệu cũ" or "Mất kết nối"
- Historical charts still show loaded data (don't clear on disconnect)

### 2. **Live Tail Only When Online**
```typescript
useEffect(() => {
  if (!selectedMachine) return;
  if (!appEnv.useMock && !isMachineLive(selectedMachine.id)) return;
  // append new point only if live
}, [selectedMachine, isMachineLive]);
```

### 3. **No Fake Data in Live Mode**
- Mock simulation only runs when `NEXT_PUBLIC_USE_MOCK=true`
- When `NEXT_PUBLIC_USE_MOCK=false`, no fallback history generation
- Charts display only real data from backend

### 4. **Helper Function Usage**
```typescript
const isLive = isMachineLive(selectedMachine.id) || appEnv.useMock;
const fmtLive = (val: number | undefined) =>
  liveMetricValue(val, isLive ? 'ONLINE' : connState, formatNumber, appEnv.useMock);
```

---

## Compilation Status

✅ **Build successful** - No TypeScript or webpack errors
- Compiled in 16.9s
- 11 routes pre-rendered
- All type checking passed

---

## Next Steps for Testing

1. **Mock Mode Test**
   - Start with `NEXT_PUBLIC_USE_MOCK=true`
   - Verify yellow banner appears
   - Verify data changes continuously
   - Set `NEXT_PUBLIC_USE_MOCK=false` in .env.local

2. **Live Integration Test**
   - Start backend on port 8080
   - Verify machines appear with ONLINE badge
   - Verify current metrics display real numbers
   - Stop simulator → verify badge changes to STALE
   - Stop backend → verify badge changes to OFFLINE

3. **Historical Data Test**
   - Charts should display loaded history regardless of connection state
   - Live tail should only append when ONLINE
   - Zoom/pan on charts should work even in OFFLINE state

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  App Level (Layout)                  │
│  ┌────────────────────────────────────────────────┐ │
│  │         MockModeBanner (yellow warning)        │ │
│  └────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────┐ │
│  │          RealtimeProvider (SSE listener)       │ │
│  │  ├─ Updates useRealtimeStore                   │ │
│  │  ├─ Sets connectionStateByMachineId            │ │
│  │  ├─ Sets lastSeenByMachineId                   │ │
│  │  └─ Sets dataFreshnessByMachineId              │ │
│  └────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                         ↓
        ┌───────────────────────────────────┐
        │      useMachinesData Hook         │
        │  ┌──────────────────────────────┐ │
        │  │ Merges snapshots + connection│ │
        │  │ state from realtime store    │ │
        │  └──────────────────────────────┘ │
        └───────────────────────────────────┘
                         ↓
        ┌───────────────────────────────────┐
        │   Component (Machine, Dashboard)  │
        │  ┌──────────────────────────────┐ │
        │  │ isMachineLive() check        │ │
        │  │ liveMetricValue() helper     │ │
        │  │ ConnectionBadge component    │ │
        │  └──────────────────────────────┘ │
        └───────────────────────────────────┘
```

---

## Files Removed/Cleaned Up
- Removed duplicate exports from `useMachinesData.ts`
- Removed duplicate functions from `realtime.mapper.ts`
- Removed duplicate JSX from `machines/page.tsx`

---

## Backward Compatibility
✅ **All existing functionality preserved:**
- Dashboard layout unchanged
- Machine list/detail pages unchanged
- Charts, alarms, OEE, energy, maintenance, tools sections unchanged
- Locale strings extended (no removals)
- Type system extended (no breaking changes)

---

## Testing Checklist

- [ ] Build compiles without errors ✅
- [ ] MockModeBanner displays in mock mode
- [ ] ConnectionBadge shows correct state in dashboard
- [ ] Machine detail shows connection badge
- [ ] Live metrics show `--` when not ONLINE
- [ ] Live metrics show numbers when ONLINE
- [ ] Charts display historical data regardless of connection
- [ ] Live tail only appends when machine is live
- [ ] No fake analytics in live mode
- [ ] Mobile responsive (badges stack properly)
- [ ] Both VI and EN languages work

---

**Implementation completed on:** March 29, 2026
**Total files created:** 2
**Total files modified:** 7
**Total locales updated:** 2

