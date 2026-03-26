# API List cho UI (RMSys Backend)

Tai lieu nay tong hop nhanh tat ca API hien tai de team UI tich hop.

## 1) Base URL va tai lieu OpenAPI

- Local base URL: `http://localhost:8080`
- API docs JSON: `GET /api-docs`
- Swagger UI: `GET /swagger-ui.html`
- Tat ca endpoint business hien tai dung prefix: `/api/v1`

## 2) Response format chung

Phan lon API tra ve theo wrapper `ApiResponse<T>`:

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "errorCode": null,
  "timestamp": "2026-03-27T08:00:00Z"
}
```

### Pagination format

Cac API lich su co phan trang tra ve `PageResponse<T>` trong `data`:

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 120,
  "totalPages": 6
}
```

## 3) Error format chung

Khi loi, backend tra ve:

```json
{
  "success": false,
  "message": "Validation failed",
  "errorCode": "VALIDATION_ERROR",
  "data": {
    "fieldName": "error message"
  },
  "timestamp": "2026-03-27T08:00:00Z"
}
```

Error code thuong gap:

- `VALIDATION_ERROR` (400)
- `MALFORMED_JSON` (400)
- `INVALID_PARAMETER_TYPE` (400)
- `*_NOT_FOUND` (404), vi du: `MACHINE_NOT_FOUND`
- `UNAUTHORIZED` (401)
- `INTERNAL_ERROR` (500)

## 4) Auth/Gateway note

- Nhom API ingest can header `X-Ingest-Key` neu backend co cau hinh `APP_INGEST_API_KEY`.
- Neu backend khong set key (`app.ingest.api-key` rong) thi ingest API cho goi khong can header.

## 5) API theo nhom

## Dashboard

### `GET /api/v1/dashboard/overview`
- Muc dich: Lay tong quan KPI dashboard.
- Query: khong co.
- Response `data`: `DashboardOverviewResponse`
  - `totalMachines`, `onlineMachines`, `runningMachines`, `criticalAlarms`, `plantPowerKw`, `todayEnergyKwh`, `todayOee`, `abnormalStops`, `topRiskMachines[]`.

## Machines

### `GET /api/v1/machines`
- Muc dich: Lay danh sach may.
- Response `data`: `MachineDetailResponse[]`.

### `GET /api/v1/machines/{machineId}`
- Muc dich: Chi tiet 1 may.
- Path param: `machineId` (UUID).
- Response `data`: `MachineDetailResponse`.

### `GET /api/v1/machines/{machineId}/latest`
- Muc dich: Snapshot telemetry moi nhat cua 1 may.
- Path param: `machineId` (UUID).
- Response `data`: `MachineSnapshotResponse`.

### `GET /api/v1/machines/snapshots`
- Muc dich: Snapshot moi nhat tat ca may.
- Response `data`: `MachineSnapshotResponse[]`.

## History (theo machine)

### `GET /api/v1/machines/{machineId}/telemetry/history`
- Muc dich: Lay du lieu chart telemetry.
- Path param: `machineId` (UUID).
- Query:
  - `from` (Instant, bat buoc)
  - `to` (Instant, bat buoc)
  - `interval` (mac dinh `raw`): `raw|1m|5m|15m|30m|1h|6h|12h|1d`
  - `aggregation` (mac dinh `avg`): `avg|min|max|last`
- Response `data`: `TelemetrySeriesResponse` (co `points[]`).

### `GET /api/v1/machines/{machineId}/alarms/history`
- Muc dich: Lich su alarm theo may.
- Query:
  - `from` (Instant, optional)
  - `to` (Instant, optional)
  - `page` (default `0`)
  - `size` (default `20`)
- Response `data`: `PageResponse<AlarmResponse>`.

### `GET /api/v1/machines/{machineId}/downtime/history`
- Muc dich: Lich su downtime theo may.
- Query:
  - `from` (Instant, optional)
  - `to` (Instant, optional)
  - `page` (default `0`)
  - `size` (default `20`)
- Response `data`: `PageResponse<DowntimeHistoryPointResponse>`.

## Alarms

### `GET /api/v1/alarms/active`
- Muc dich: Danh sach alarm dang active.
- Response `data`: `AlarmResponse[]`.

### `GET /api/v1/alarms/history`
- Muc dich: Lich su alarm toan he thong.
- Query: `page` (default `0`), `size` (default `20`).
- Response `data`: `PageResponse<AlarmResponse>`.

### `POST /api/v1/alarms/{alarmId}/acknowledge`
- Muc dich: Ack alarm.
- Path param: `alarmId` (UUID).
- Body:

```json
{
  "acknowledgedBy": "operator-a"
}
```

- Response: `ApiResponse<Void>` (message: `Alarm acknowledged`).

## OEE / Energy / Maintenance / Tools / Settings

### `GET /api/v1/oee/overview`
- Response `data`: `OeeOverviewResponse`.

### `GET /api/v1/energy/overview`
- Response `data`: `EnergyOverviewResponse`.

### `GET /api/v1/maintenance/overview`
- Response `data`: `MaintenanceOverviewResponse`.

### `GET /api/v1/tools/overview`
- Response `data`: `ToolOverviewResponse`.

### `GET /api/v1/tools/machines/{machineId}`
- Path param: `machineId` (UUID).
- Response `data`: `ToolOverviewResponse`.

### `GET /api/v1/settings/thresholds`
- Response `data`: `ThresholdResponse`.

## Export

### `POST /api/v1/exports/telemetry`
- Muc dich: Tao job export telemetry async.
- Body (`ExportRequestDto`):

```json
{
  "machineId": "c7d5f3a3-2bf8-4f82-9f0a-5dbeea3f92d2",
  "from": "2026-03-26T00:00:00Z",
  "to": "2026-03-27T00:00:00Z",
  "metrics": ["powerKw", "temperatureC"],
  "interval": "1m",
  "aggregation": "avg",
  "format": "csv",
  "timezone": "Asia/Ho_Chi_Minh"
}
```

- Note:
  - `machineId`, `from`, `to` bat buoc.
  - `metrics` null => lay tat ca metrics.
  - `format` hien tai ho tro `csv`.
- Response `data`: `ExportJobResponse` (status ban dau thuong `PENDING`).

### `GET /api/v1/exports/{jobId}`
- Muc dich: Poll trang thai job export.
- Response `data`: `ExportJobResponse` (`PENDING|PROCESSING|COMPLETED|FAILED`).

### `GET /api/v1/exports/{jobId}/download`
- Muc dich: Download file CSV khi job `COMPLETED`.
- Response: **raw file** `text/csv` (khong dung `ApiResponse`).

## Realtime (SSE)

### `GET /api/v1/realtime/stream`
- Muc dich: Subscribe realtime stream.
- Query:
  - `machineId` (optional): UUID hoac machine code
  - `topics` (optional, default `all`), vi du: `all`, `telemetry`, `alarm`, `machine.connection`, `heartbeat`
  - `sinceEventId` (optional), vi du `evt-123`
- Header:
  - `Last-Event-ID` (optional, de replay su kien thieu)
- Content-Type: `text/event-stream`
- Event data envelope (`SseEventEnvelope`):

```json
{
  "eventId": "evt-101",
  "eventType": "telemetry.updated",
  "machineId": "c7d5f3a3-2bf8-4f82-9f0a-5dbeea3f92d2",
  "sourceTs": "2026-03-27T07:59:58Z",
  "receivedAt": "2026-03-27T07:59:59Z",
  "sequence": 101,
  "quality": "GOOD",
  "payload": {}
}
```

### `GET /api/v1/realtime/health`
- Muc dich: Health cua realtime registry.
- Response (Map): `activeSubscribers`, `replayBufferSize`, `latestSequence`.

## Ingest

Luu y: Nhom nay co the yeu cau header `X-Ingest-Key`.

### `POST /api/v1/ingest/telemetry`
- Body: `IngestTelemetryRequest`.
- Bat buoc: `machineId` hoac `machineCode`.
- Cac field so duoc validate `>= 0`; mot so field co range:
  - `remainingToolLifePct`, `toolWearPercent`, `maintenanceHealthScore`, `lubricationLevelPct`: `0..100`
  - `powerFactor`: `0..1`
- Response: `ApiResponse<Void>` (message: `Telemetry ingested`).

### `POST /api/v1/ingest/telemetry/by-code`
- Body: `IngestTelemetryByCodeRequest`.
- Bat buoc: `machineCode`.
- Response: `ApiResponse<Void>` (message: `Telemetry ingested`).

### `POST /api/v1/ingest/alarm`
- Body (`NormalizedAlarmDto`):

```json
{
  "machineId": "c7d5f3a3-2bf8-4f82-9f0a-5dbeea3f92d2",
  "alarmCode": "A-001",
  "alarmType": "SAFETY",
  "severity": "CRITICAL",
  "message": "Emergency stop",
  "startedAt": "2026-03-27T08:00:00Z"
}
```

- Bat buoc: `machineId`, `alarmCode`, `alarmType`, `severity`, `message`.
- Response: `ApiResponse<Void>` (message: `Alarm ingested`).

### `POST /api/v1/ingest/downtime`
- Body (`NormalizedDowntimeDto`):

```json
{
  "machineId": "c7d5f3a3-2bf8-4f82-9f0a-5dbeea3f92d2",
  "reasonCode": "DT-PLANNED",
  "reasonGroup": "MAINTENANCE",
  "startedAt": "2026-03-27T08:00:00Z",
  "plannedStop": true,
  "abnormalStop": false,
  "notes": "Oil change"
}
```

- Bat buoc: `machineId`, `reasonCode`, `reasonGroup`.
- Response: `ApiResponse<Void>` (message: `Downtime ingested`).

### `POST /api/v1/ingest/connection-status`
- Body (`IngestConnectionStatusRequest`):

```json
{
  "machineId": "c7d5f3a3-2bf8-4f82-9f0a-5dbeea3f92d2",
  "machineCode": "CNC-01",
  "connectionStatus": "ONLINE",
  "ts": "2026-03-27T08:00:00Z",
  "metadata": {
    "source": "collector-1"
  }
}
```

- Bat buoc: `connectionStatus` va (`machineId` hoac `machineCode`).
- Response: `ApiResponse<Void>` (message: `Connection status ingested`).

## 6) UI integration checklist nhanh

- Dung wrapper `ApiResponse` cho tat ca API JSON (tru `download` va `realtime/stream`).
- Khi phan trang, doc du lieu trong `data.content`.
- Parse thoi gian theo ISO-8601 UTC.
- Tai cac API ingest, gui `X-Ingest-Key` neu backend yeu cau.
- SSE can reconnect va gui lai `Last-Event-ID` de replay event.

