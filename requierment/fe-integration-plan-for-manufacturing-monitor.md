# FE Integration Blueprint - DEMO-UI-Manufacturing-Monitor <-> Back-End-Manufacturing-Monitor

> Tai lieu nay nang cap ban ke hoach tich hop FE-BE theo huong "san sang production": ro hop dong du lieu, ro cach ghep REST + SSE, ro cach test, ro tieu chi nghiem thu.

---

## 1) Muc tieu va pham vi

### 1.1 Muc tieu
- FE dung API that lam nguon du lieu mac dinh, khong phu thuoc mock trong luong chinh.
- Moi man hinh co day du chuc nang can co theo BE hien tai: Dashboard, Machines, Energy, OEE, Tools, Maintenance, Alarms, Settings.
- Realtime dung SSE dung cach (snapshot truoc, stream sau), co kha nang reconnect va resume.
- Chuan hoa toan bo giao dien: 100% Viet hoa, bo loc thoi gian dong nhat tren tat ca chart, don vi hien thi thay doi theo moc thoi gian va metric.

### 1.2 In scope
- Tich hop API REST, SSE, Export job.
- Refactor data layer FE (api client, mapper, hooks/query, store UI nhe).
- Chuan hoa i18n, error handling, caching policy, pagination policy.
- Bo sung logging/metrics FE va test strategy.

### 1.3 Out of scope (tam thoi)
- Viet moi backend endpoint ngoai pham vi da co.
- Thay doi lon UX/visual design khong lien quan tich hop.
- Mo rong prediction nang cao neu BE chua tra du lieu thuc.

---

## 2) Nguyen tac tich hop bat buoc

1. Snapshot truoc, realtime sau: moi page phai load du lieu ban dau bang REST truoc khi mo SSE.
2. Chart phai co bo loc thoi gian: bat ky chart nao hien thi tren web deu phai co time-range filter.
3. Time range doc lap theo bang/chart: moi widget/chart duoc giu moc thoi gian rieng, khong ep dong bo toan trang.
4. Unit dong bo voi time range va metric: doi moc thoi gian thi unit/aggregation label phai doi theo (VD: kW trung binh 5 phut, kWh theo ngay, % theo ca).
5. 100% i18n: cam text hardcode trong `src/**/*.tsx`, ke ca tooltip, badge, modal nho.
6. Khong dung machine monolith: tach ViewModel theo page/use case.
7. Khong fake action ghi du lieu: neu BE chua co endpoint write thi de read-only/placeholder ro rang.

---

## 3) Kien truc FE de xuat (ban nang cap)

```text
src/
  app/
  components/
  hooks/
  lib/
    api/
      client.ts
      dashboard.ts
      machines.ts
      history.ts
      alarms.ts
      energy.ts
      oee.ts
      tools.ts
      maintenance.ts
      settings.ts
      realtime.ts
      export.ts
    mappers/
      dashboard.mapper.ts
      machine.mapper.ts
      alarm.mapper.ts
      history.mapper.ts
      realtime.mapper.ts
    domain/
      status.ts
      units.ts
      errors.ts
      auth.ts
    config/
      machine-presentation.ts
      feature-flags.ts
    store/
      ui-store.ts
      filters-store.ts
      stream-store.ts
  types/
    api.ts
    vm.ts
```

### 3.1 API layer
- Quan ly base URL, auth header, timeout, retry policy.
- Unwrap envelope `ApiResponse<T>` mot cach thong nhat.
- Chuan hoa loi ve mot kieu `AppError`.

### 3.2 Mapper layer
- Map response BE sang ViewModel theo tung page.
- Chuan hoa enum trang thai, label, unit, precision.

### 3.3 Query/hooks layer
- Encapsulate fetch + cache + retry + stale logic.
- Hook rieng cho tung ngu canh: dashboard, machine detail, history, alarms, export, realtime.

### 3.4 UI store layer
- Chi giu state UI nhe: language, sidebar, selected machine, time-range cua tung widget, stream state.
- Khong giu business data server dai han trong store.

---

## 4) Hop dong du lieu (Data Contract)

### 4.1 Envelope response chuan

```json
{
  "success": true,
  "message": "OK",
  "data": {},
  "errorCode": null,
  "timestamp": "2026-03-26T12:00:00Z",
  "traceId": "optional-correlation-id"
}
```

### 4.2 Api client de xuat
```ts
export async function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init })
  const json = await res.json()

  if (!res.ok || !json?.success) {
    const error = new Error(json?.message || 'Request failed') as Error & {
      code?: string
      traceId?: string
      status?: number
    }
    error.code = json?.errorCode
    error.traceId = json?.traceId
    error.status = res.status
    throw error
  }

  return json.data as T
}
```

### 4.3 Chuan loi FE (Error taxonomy)
- `NETWORK_ERROR`: mat mang, DNS, timeout.
- `AUTH_ERROR`: 401/403.
- `VALIDATION_ERROR`: 400/422.
- `NOT_FOUND`: 404.
- `CONFLICT_ERROR`: 409.
- `SERVER_ERROR`: 5xx.
- `UPSTREAM_ERROR`: envelope `success=false` nhung HTTP 200.

### 4.4 Versioning va compatibility
- Uu tien prefix `/api/v1`.
- Khong xoa field dot ngot; neu can doi nghia field, them field moi + deprecate co canh bao.
- Mapper FE phai co fallback cho field optional/null.

---

## 5) Mapping page FE -> API BE (cap nhat day du)

## 5.1 Dashboard (`/`)

### API
- `GET /api/v1/dashboard/overview`
- `GET /api/v1/machines/snapshots`
- `GET /api/v1/alarms/active`
- `GET /api/v1/energy/overview`
- `GET /api/v1/oee/overview`
- `GET /api/v1/maintenance/overview`

### Chuc nang bat buoc
- KPI tong quan + machine tiles + active alarms.
- Cac chart tren dashboard phai co bo loc thoi gian rieng.
- Co trang thai freshness du lieu (`lastUpdated`, `stale`, `offline`).

### Realtime
- SSE topics: `telemetry,alarm,connection`.
- Cap nhat card may va active alarms theo event.

## 5.2 Machines (`/machines`)

### API
- `GET /api/v1/machines`
- `GET /api/v1/machines/{machineId}`
- `GET /api/v1/machines/{machineId}/latest`
- `GET /api/v1/machines/{machineId}/telemetry/history?from=&to=&interval=&aggregation=`
- `GET /api/v1/machines/{machineId}/alarms/history?from=&to=&page=&size=`
- `GET /api/v1/machines/{machineId}/downtime/history?from=&to=&page=&size=`
- `GET /api/v1/realtime/stream?machineId=...&topics=telemetry,alarm,connection`

### Chuc nang bat buoc
- Machine detail co phan tich OEE va San luong day du.
- Module "Phan tich OEE thoi gian thuc" phai hien thi ty le (%) cho Availability/Performance/Quality/OEE, khong chi hien thi mot gia tri OEE tong.
- Cac chart telemetry/OEE/san luong deu co time-range filter rieng.

### Luu y trang thai
- Tach ro `machineState`, `connectionState`, `connectionStatus`, `dataFreshness`.
- Khong duoc suy dien "khong co event moi" = "may dang on".

## 5.3 Energy (`/energy`)

### API
- `GET /api/v1/energy/overview`
- `GET /api/v1/machines/{machineId}/telemetry/history` (metrics power/voltage/current)
- `POST /api/v1/exports/telemetry`

### Chuc nang bat buoc
- KPI tong + bang theo may + chart drill-down.
- Moi chart co bo loc thoi gian, unit dung theo metric (`kW`, `kWh`, `V`, `A`).

## 5.4 OEE (`/oee`)

### API
- `GET /api/v1/oee/overview`
- `GET /api/v1/machines/snapshots`
- `GET /api/v1/realtime/stream?topics=telemetry,connection`

### Chuc nang bat buoc
- Overall OEE + A/P/Q breakdown theo ty le.
- Ranking theo may + trend theo moc thoi gian.
- Moi chart co bo loc thoi gian.

## 5.5 Tools (`/tools`)

### API
- `GET /api/v1/tools/overview`
- `GET /api/v1/tools/machines/{machineId}`

### Chuc nang bat buoc
- Dashboard tool wear va replacement recommendation read-only neu chua co write API.
- Chart usage/life cycle co bo loc thoi gian.

## 5.6 Maintenance (`/maintenance`)

### API
- `GET /api/v1/maintenance/overview`
- (tuy chon) `GET /api/v1/machines/{id}/latest`

### Chuc nang bat buoc
- Summary + danh sach task + next service.
- Neu chua co endpoint write, nut action de disabled + thong bao ro.

## 5.7 Alarms (`/alarms`)

### API
- `GET /api/v1/alarms/active`
- `GET /api/v1/alarms/history?page=&size=`
- `POST /api/v1/alarms/{alarmId}/acknowledge`
- `GET /api/v1/realtime/stream?topics=alarm,connection`

### Chuc nang bat buoc
- Active/History tach tab ro.
- Acknowledge goi API that va optimistic update an toan.
- Chart/timeline alarm co bo loc thoi gian.

## 5.8 Settings (`/settings`)

### API
- `GET /api/v1/settings/thresholds`
- (neu co) `PUT/PATCH /api/v1/settings/thresholds`

### Chuc nang bat buoc
- UI preferences giu local.
- System thresholds lay tu BE.
- Neu khong co write endpoint: read-only + explain ro cho user.

---

## 6) Chinh sach Auth, Role, va Quyen

### 6.1 Auth
- Ho tro Bearer token.
- Neu co refresh token: co silent refresh va retry 1 lan.
- Neu het han: redirect dang nhap + clear state nhay cam.

### 6.2 Role/Permission
- Chuan hoa `userRole` trong store/type de tranh loi TS (`userRole`, `setUserRole`).
- Role de xuat: `admin`, `engineer`, `operator`, `viewer`.
- Gate action write (ack alarm, settings update, export nhay cam) theo role.

### 6.3 Security hardening
- Khong log token vao console.
- Sanitize message loi tu server truoc khi hien thi.
- Gioi han tan suat action nhay cam (ack/export) neu can.

---

## 7) Caching, Pagination, Retry, va Performance

### 7.1 Caching policy
- `overview/snapshot`: stale-time ngan (5-30s), co background revalidate.
- `history`: cache theo key `(machineId, from, to, interval, aggregation)`.
- `settings`: stale-time dai hon.

### 7.2 Pagination policy
- Endpoint lich su uu tien page-size hoac cursor nhat quan.
- FE wrapper chuan: `{items, page, size, total}` hoac `{items, nextCursor}`.

### 7.3 Retry/backoff
- GET: retry toi da 2-3 lan voi exponential backoff.
- POST/PATCH: khong retry mu, chi retry khi idempotent.

### 7.4 Performance budget
- First meaningful render dashboard < 2.5s trong LAN.
- Event-to-UI update realtime P95 < 1.5s.
- Khong de memory tang vo han khi append chart live (gioi han diem hien thi).

---

## 8) Realtime SSE - Quy trinh chuan

### 8.1 Endpoint
- `GET /api/v1/realtime/stream`
- Query: `machineId`, `topics`, `sinceEventId`
- Header: `Last-Event-ID`
- Health: `GET /api/v1/realtime/health`

### 8.2 Hook de xuat: `useRealtimeStream()`
Input:
- `machineId?`
- `topics[]`
- `enabled`
- `onEvent`

Behavior bat buoc:
- mo `EventSource`, parse envelope event, luu `lastEventId`
- reconnect co backoff
- resume bang `Last-Event-ID`/`sinceEventId`
- expose stream state: `connecting | live | degraded | disconnected`

### 8.3 Merge rule
- Dang xem history frozen: khong auto append, hien badge "Co du lieu moi".
- Dang live mode: append diem moi > diem cuoi.
- Neu gap event out-of-order: sap xep theo timestamp/eventId.

---

## 9) I18n va Viet hoa 100%

### 9.1 Quy dinh bat buoc
- Khong hardcode text trong `src/**/*.tsx`.
- Tat ca text (title, subtitle, button, empty state, tooltip, badge, modal) phai qua key i18n.
- Locale nguon: `vi`.
- `en` chi la fallback, khong duoc loi key.

### 9.2 Checklist quet i18n
- Quet toan bo `src/**/*.tsx` de tim string hardcode.
- Quet ca `aria-label`, `title`, `placeholder`, `toast`, thong bao loi.
- Dung key namespace ro rang theo page/component.

### 9.3 Loi hydration lien quan date/time
- Khong render truc tiep gio he thong trong SSR neu co khac biet locale/timezone.
- Dung client-only clock (`useEffect`) hoac render placeholder on server.
- Chuan hoa format ngay gio theo locale `vi-VN` phia client.

---

## 10) Chuan hoa Unit va Time-range

### 10.1 Don vi domain
- Power: `kW`
- Energy: `kWh`
- Voltage: `V`
- Current: `A`
- Temperature: `degC`
- Vibration: `mm/s`
- Runtime: `h`
- OEE va A/P/Q: `%`

### 10.2 Mapping time-range -> aggregation -> label
- `15m`, `1h`: aggregation `avg`, label "trung binh".
- `24h`, `7d`: aggregation `hourly/daily`.
- `30d`: aggregation `daily/weekly` tuy endpoint.

### 10.3 Quy tac UI
- Moi chart co bo loc rieng.
- Doi moc thoi gian -> doi nhan truc, precision, unit label neu can.
- Hien thi ro `from - to` va timezone.

---

## 11) Observability va van hanh

### 11.1 Logging
- FE log co cau truc: `event`, `page`, `machineId`, `traceId`, `durationMs`, `status`.
- Khong log PII/token.

### 11.2 Metrics toi thieu
- API success rate theo endpoint.
- API latency P50/P95.
- SSE reconnect count, disconnect duration.
- Ty le loi map du lieu (mapper errors).

### 11.3 Correlation FE-BE
- Truyen/nhan `traceId` de doi soat loi xuyen he thong.

---

## 12) Ke hoach trien khai theo giai doan

## Phase 1 - Foundation (P1)
- Tao `apiClient`, unwrap envelope, error taxonomy.
- Them env:
  - `NEXT_PUBLIC_API_BASE_URL`
  - `NEXT_PUBLIC_USE_MOCK=false`
- Tach mock mode va api mode.
- Tao hooks cot song: dashboard, machines, alarms, realtime.

## Phase 2 - Core pages (P2)
- Dashboard dung API that + SSE.
- Machines list/detail/latest/history that.
- Alarms active/history/ack that.
- Settings thresholds read from BE.

## Phase 3 - Specialist pages (P3)
- Energy: overview + history + export job.
- OEE: overview + A/P/Q ratio + trend.
- Tools/Maintenance: doc data that, action write neu co.

## Phase 4 - Hardening (P4)
- Hoan tat i18n 100%.
- Chuan hoa time-range cho tat ca chart.
- Observability, retry tuning, performance tuning.
- UAT + release checklist.

---

## 13) Test strategy

### 13.1 Unit test
- `apiClient` unwrap + error mapping.
- Mapper BE -> VM.
- Time-range/unit mapping.
- SSE event parser va merge rule.

### 13.2 Integration test
- Dashboard goi dung endpoint va render dung state.
- Machine detail load history roi mo stream.
- Alarm acknowledge optimistic update + rollback khi fail.
- Export flow: create job -> polling -> download.

### 13.3 E2E/UAT
- Mat stream ma UI khong vo.
- Dang xem history thi live khong cuong ep chart nhay.
- 100% text hien thi la tieng Viet co dau.
- Moi chart tren web deu co bo loc thoi gian.

---

## 14) Acceptance criteria (DoD) dinh luong

1. 100% page chinh dung API that khi `NEXT_PUBLIC_USE_MOCK=false`.
2. 100% chart co time-range filter va hoat dong doc lap.
3. 100% text UI thong qua i18n key, khong con text hardcode trong `src/**/*.tsx`.
4. Ty le loi API P95 < 2% trong moi truong UAT on dinh.
5. Realtime reconnect thanh cong >= 99% truong hop dut ket noi ngan.
6. Khong con loi hydration do clock/date render lech SSR-client.
7. TypeScript clean cho store role (`userRole`, `setUserRole`) va cac type lien quan.

---

## 15) Rui ro va giam thieu

- BE tra field chua day du -> mapper fallback + UI placeholder ro nghia.
- SSE khong on dinh -> co health check, reconnect backoff, snapshot refetch dinh ky.
- Sai don vi/aggregation -> domain unit map tap trung (`units.ts`).
- Regression i18n -> them lint/check script phat hien hardcoded string.

---

## 16) Cong viec uu tien tiep theo (de xuat thuc thi ngay)

- Viet `api client` + `AppError` + env config.
- Refactor `Machines detail` truoc (vi nhieu chart + OEE/san luong + realtime).
- Chuan hoa bo loc thoi gian cho tat ca chart component dung chung.
- Quet i18n toan bo `src/**/*.tsx`, thay text hardcode bang key `vi.json`.
- Them test cho merge history + live va hydration-safe clock.

---

## 17) Ket luan

UI hien tai da co nen tot, khong can lam lai tu dau. Huong dung la nang cap data layer va quy trinh tich hop de khop BE that, giu trai nghiem hien co, mo rong de dang, va dam bao van hanh on dinh trong moi truong thuc te.
