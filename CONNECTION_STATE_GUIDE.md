# Connection State Awareness - User Guide

## Overview

The Manufacturing Monitor UI now properly displays and respects system connection state alongside machine operational state. This means you'll always know:
- Whether the UI is connected to the backend
- Whether real-time data is available
- Whether displayed metrics are live or cached

---

## Visual Indicators

### 1. **Mock Mode Banner** (Yellow)
```
⚠ Chế độ Mock đang bật — dữ liệu hiển thị là giả lập, không phải từ backend thật.
⚠ Mock Mode Active — data shown is simulated, not from a real backend.
```

**When you'll see it:**
- When `NEXT_PUBLIC_USE_MOCK=true` in `.env.local`
- UI is not connected to any backend
- Data is generated locally for demonstration

**What to do:**
- For real integration testing, set `NEXT_PUBLIC_USE_MOCK=false` in `.env.local`
- Ensure backend is running on port 8080

---

### 2. **Connection Badge** (Machine Level)

#### 🟢 ONLINE (Trực tuyến)
- Machine is actively sending data to the UI
- Real-time metrics are current
- Live tail chart is appending new data points
- Color: Green with pulsing dot

#### 🟡 STALE (Dữ liệu cũ)
- Backend was connected but data is no longer being updated
- Metrics may be older than 30 seconds
- Charts still show historical data, but not refreshing
- Color: Yellow/Orange

#### 🔴 OFFLINE (Mất kết nối)
- Machine has no connection to the backend
- PLC, collector, or backend watchdog has detected disconnection
- Current metrics display `--` (not zero, not last value)
- Charts can still show historical data loaded before disconnection
- Color: Red

---

## What Happens in Each State

### State: ONLINE ✅
```
Dashboard Card:
┌─────────────────────────────┐
│ Machine Name   [🟢 Online]  │
│ Current Power: 12.5 kW      │
│ OEE: 82%                    │
│ Temp: 45°C                  │
└─────────────────────────────┘

Chart: Live tail appending new points every second
Time Range: Can select 60s, 1h, 1d, 1w, 1m
```

**Behavior:**
- Metrics update in real-time
- Charts animate with new data
- Status indicators pulse
- All fields show actual numbers

---

### State: STALE 🟡
```
Dashboard Card:
┌──────────────────────────────────────┐
│ Machine Name   [🟡 Data Stale]      │
│ Current Power: -- 
│ OEE: --
│ Temp: --
│ Last updated: 2 minutes ago          │
└──────────────────────────────────────┘

Chart: Shows loaded history but no new data points appended
Time Range: Can still select ranges
```

**Behavior:**
- Current metrics show `--` (dash-dash) instead of numbers
- Historical charts still display loaded data
- No new points are added to charts
- Shows "Last seen" timestamp
- Status is warning yellow

---

### State: OFFLINE 🔴
```
Dashboard Card:
┌──────────────────────────────────────┐
│ Machine Name   [🔴 Disconnected]    │
│ Current Power: --
│ OEE: --
│ Temp: --
│ Last connected: 5 minutes ago        │
└──────────────────────────────────────┘

Chart: Shows historical data already loaded
Time Range: Can still select ranges
```

**Behavior:**
- No real-time updates
- Current metrics show `--`
- Charts display only historical data
- No new data appended
- Status is error red
- Can still zoom/pan charts

---

## Common Scenarios

### Scenario 1: Starting Up

```
1. Open UI with NEXT_PUBLIC_USE_MOCK=false
   → See yellow banner? No, mock is OFF
   → All machines show [🔴 OFFLINE]
   
2. Start Backend (port 8080)
   → Machines change to [🟢 ONLINE]
   → Current metrics now show numbers
   → Charts start updating

3. Start PLC Simulator
   → No change (already ONLINE)
   → Data values change as simulator sends new telemetry
```

---

### Scenario 2: Network Interruption

```
1. UI connected to Backend, all [🟢 ONLINE]
   ↓
2. Network hiccup (30 seconds no data)
   → Machines change to [🟡 STALE]
   → Current metrics show `--`
   → Charts stop updating
   ↓
3. Network recovers
   → Machines return to [🟢 ONLINE]
   → Current metrics show numbers again
   → Charts resume updating
```

---

### Scenario 3: Backend Maintenance

```
1. All machines [🟢 ONLINE]
   ↓
2. Backend stops gracefully
   → Within 1-2 seconds: change to [🟡 STALE]
   → Within 30 seconds: change to [🔴 OFFLINE]
   ↓
3. Backend restarts
   → Machines return to [🟢 ONLINE]
   → Historical charts still show previous data
   → New real-time updates begin
```

---

## Understanding the `--` Display

When you see `--` in place of a metric:

```
❌ WRONG INTERPRETATION:
"The machine is not running" or "No data"

✅ CORRECT INTERPRETATION:
"We don't have current/live data for this metric right now"

WHY THIS MATTERS:
- Prevents confusion between "no value" and "machine not connected"
- Historical data still visible in charts
- You're not misled into thinking the machine is OFF when it's just disconnected
```

---

## Features Still Work When Disconnected

✅ **Available:**
- View historical charts (zoom, pan, time range selection)
- Review past alarms and events
- Check maintenance schedules
- Export historical data
- Change language/settings

❌ **Not Available:**
- Real-time metrics on cards
- Live chart tail animation
- Current power/temp/vibration readings
- Live OEE updates

---

## Environment Configuration

### For Development (Mock Mode)

**.env.local:**
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=true
```

**Result:**
- Yellow "Mock Mode" banner appears
- Machines simulate running
- Data changes continuously
- Good for UI development without backend

---

### For Integration Testing (Real Backend)

**.env.local:**
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_USE_MOCK=false
```

**Prerequisites:**
- Backend running on port 8080
- PLC/Simulator running (if needed)
- Network connectivity verified

---

### For Production

**.env.production:**
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.yourcompany.com
NEXT_PUBLIC_USE_MOCK=false
```

**Ensure:**
- No mock mode banner visible
- Only real backend connection
- HTTPS used for security

---

## Troubleshooting

### Problem: All machines show [🔴 OFFLINE]

**Check:**
1. Is `NEXT_PUBLIC_USE_MOCK=false`?
   - If true, set to false in .env.local
   
2. Is backend running?
   - `curl http://localhost:8080/api/health` should respond
   
3. Is `NEXT_PUBLIC_API_BASE_URL` correct?
   - Check it matches your backend URL
   
4. Firewall blocking port 8080?
   - Check network connectivity

---

### Problem: Some machines show [🟡 STALE] but others [🟢 ONLINE]

**Cause:** 
- Some machines aren't sending data to backend
- Simulator only running certain machines
- PLC connection issues for specific machines

**Solution:**
- Check backend logs for which machines sent data
- Verify simulator is configured for all machines
- Check PLC connectivity per machine

---

### Problem: Charts not updating with new data

**Check:**
1. Is machine [🟢 ONLINE]?
   - If STALE/OFFLINE, no updates expected
   
2. Is it been less than 1 second since last point?
   - Charts don't add duplicate timestamps
   
3. Try refreshing (F5) page
   - May help with SSE reconnection

---

### Problem: Mock Mode banner won't go away

**Solution:**
1. Open `.env.local`
2. Find `NEXT_PUBLIC_USE_MOCK`
3. Change to `NEXT_PUBLIC_USE_MOCK=false`
4. Save file
5. Restart dev server: `npm run dev`
6. Clear browser cache (Ctrl+Shift+Delete)

---

## Advanced: Connection State Details

For developers integrating with the connection state system:

### Machine Connection State Object

```typescript
interface MachineConnectionState {
  connectionState: 'ONLINE' | 'STALE' | 'OFFLINE'
  lastSeenAt: string // ISO timestamp
  dataFreshnessSec: number // seconds since last data
  connectionReason?: string // why disconnected (optional)
  connectionScope?: 'PLC' | 'COLLECTOR' | 'BE_WATCHDOG' // where it failed
}
```

### Using in Components

```typescript
import { liveMetricValue } from '@/components/ConnectionBadge';

// Show metric only if ONLINE, otherwise show '--'
const displayValue = liveMetricValue(
  machine.powerKw,
  machine.connectionState,
  (val) => formatNumber(val, 1),
  appEnv.useMock
);

// Check if we should append live data
const isLive = isMachineLive(machine.id);
if (isLive) {
  // append new point to chart
}
```

---

## Best Practices

### For Users

1. **Check connection badges first** when metrics seem wrong
2. **Understand `--` means "no live data"**, not "machine is off"
3. **Historical charts remain valuable** even when disconnected
4. **Don't assume zero = equipment failure**
5. **Look at `lastSeenAt` timestamp** to understand how stale data is

### For Operators

1. Teach team: "Dashed lines mean disconnected, not broken"
2. Check network status before assuming machine fault
3. Use charts to investigate historical issues during disconnections
4. Verify backend health before troubleshooting machines

### For Developers

1. Always check `connectionState` before relying on metrics
2. Don't use `value || 0` for missing metrics (use `value ?? '--'`)
3. Test with `NEXT_PUBLIC_USE_MOCK=false` for integration
4. SSE connection status is in `useRealtimeStore()`

---

## Summary

| Indicator | Meaning | Current Metrics | Charts | Live Tail |
|-----------|---------|-----------------|--------|-----------|
| 🟢 ONLINE | Live & Fresh | Show numbers | Update | Appending |
| 🟡 STALE | Data old | Show `--` | Static | Stopped |
| 🔴 OFFLINE | No connection | Show `--` | Static | Stopped |

**Remember:** Connection state ≠ Machine state. A machine can be OFF but still ONLINE to report that status.

---

For more technical details, see: `IMPLEMENTATION_CONNECTION_STATE.md`

