# UI API Gap Notes

Tai lieu nay ghi nhanh cac chuc nang UI hien co nhung backend API chua du hoac chua co thong tin schema day du de FE noi 100% theo contract that.

## 1) Chuc nang UI dang co nhung BE chua co write API ro rang

### 1.1 Hoan tat bao tri
- UI hien co: xac nhan da bao tri trong `src/app/maintenance/page.tsx`.
- API hien co trong tai lieu: **khong co** endpoint write maintenance completion.
- De xuat BE:
  - `POST /api/v1/maintenance/tasks/{taskId}/complete`
  - hoac `POST /api/v1/machines/{machineId}/maintenance/complete`

### 1.2 Xac nhan thay dao / thay tool
- UI hien co: thay dao trong `src/app/tools/page.tsx`.
- API hien co trong tai lieu: **khong co** endpoint write tool replacement.
- De xuat BE:
  - `POST /api/v1/tools/{toolId}/replace`

### 1.3 Tai anh may len server
- UI hien co: upload anh va luu tren trinh duyet tai `src/app/machines/page.tsx`.
- API hien co trong tai lieu: **khong co** endpoint upload/save image.
- De xuat BE:
  - `POST /api/v1/machines/{machineId}/image`
  - hoac presigned upload flow + `PATCH /api/v1/machines/{machineId}` de luu `imageUrl`

### 1.4 Acknowledge all alarms
- UI hien co: nut `Acknowledge All` trong machine detail.
- API hien co trong tai lieu: chi co `POST /api/v1/alarms/{alarmId}/acknowledge`.
- FE hien tai: lap tung alarmId de ack.
- De xuat BE (toi uu hon):
  - `POST /api/v1/alarms/acknowledge-batch`

### 1.5 Dashboard snapshot export
- UI hien co: export snapshot local JSON.
- API hien co trong tai lieu: chi co export telemetry async.
- De xuat BE neu can dong bo server-side:
  - `POST /api/v1/exports/dashboard-snapshot`

## 2) API co ton tai nhung tai lieu chua du field schema de FE map het UI hien tai

### 2.1 Energy overview
- API co: `GET /api/v1/energy/overview`
- Thieu: field-level schema cua `EnergyOverviewResponse`.
- He qua: FE chua map duoc toan bo KPI/chi phi/power quality mot cach chinh xac, hien van fallback tu machine data o mot so block.

### 2.2 OEE overview
- API co: `GET /api/v1/oee/overview`
- Thieu: field-level schema cua `OeeOverviewResponse`.
- He qua: FE chua map duoc full overview/ranking/trend thuoc route `/oee` chi bang contract van ban hien tai.

### 2.3 Maintenance overview
- API co: `GET /api/v1/maintenance/overview`
- Thieu: field-level schema cua `MaintenanceOverviewResponse`.
- He qua: FE chua thay read-model maintenance bang du lieu tong hop BE that cho tat ca block.

### 2.4 Tools overview
- API co: `GET /api/v1/tools/overview`, `GET /api/v1/tools/machines/{machineId}`
- Thieu: field-level schema cua `ToolOverviewResponse`.
- He qua: FE chua map full tool wear, wear trend, replacement history sang API that.

## 3) Cac diem FE da can chinh theo contract BE

Da duoc chinh trong code:
- Dung `ApiResponse<T>` unwrap thong nhat.
- Dung `PageResponse<T>` voi du lieu trong `data.content`.
- `Alarm acknowledge` gui body `{ acknowledgedBy }`.
- SSE parse theo `eventId`, `eventType`, `payload`, `sourceTs`.
- Machine detail chart history da doc tu `GET /api/v1/machines/{machineId}/telemetry/history`.

## 4) Kien nghi tiep theo

1. Bat backend local va kiem tra `GET /api-docs`.
2. Chot schema that cho:
   - `EnergyOverviewResponse`
   - `OeeOverviewResponse`
   - `MaintenanceOverviewResponse`
   - `ToolOverviewResponse`
3. Them write API cho maintenance/tool/image neu can van hanh that.
4. Neu muon FE production-ready hon nua, bo sung bulk ack va export snapshot server-side.

