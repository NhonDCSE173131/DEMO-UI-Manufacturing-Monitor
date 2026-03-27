# UI — Phân công chốt cho DEMO-UI-Manufacturing-Monitor

## Mục tiêu chốt

UI chỉ có một vai trò duy nhất:

- gọi API backend
- subscribe realtime từ backend
- map dữ liệu về model hiển thị
- render dashboard, chart, table, detail page, filter, export button

UI **không được** tự tính analytics nữa.

Từ thời điểm này, mọi giá trị như OEE, energy tổng, trend, cost, maintenance risk, machine health, alarm summary, abnormal stop, export data đều phải lấy từ backend.

---

## Quyết định chốt vai trò

### UI làm

1. render dữ liệu backend trả về
2. filter / sort / search / phân trang
3. hiển thị trạng thái realtime
4. gọi export endpoint của backend
5. hiển thị loading / empty / degraded / offline / error state
6. map DTO từ BE sang model UI nếu cần

### UI không làm

1. không tự tính KPI dashboard
2. không tự tính OEE trung bình
3. không tự tính energy cost
4. không tự sinh trend chart bằng `Math.random()`
5. không tự build JSON snapshot để coi như export chính thức
6. không suy đoán machine health từ field lẻ
7. không dùng mock logic khi đang ở chế độ kết nối backend thật

---

## Những gì phải sửa ngay trong repo UI

## 1. Dừng tự tính analytics ở page/dashboard

Trang dashboard hiện đang có xu hướng cộng lại từ list machine để ra:

- total power
- total energy
- total production
- total good
- total ng
- average OEE
- running / fault / idle machine count

**Chốt sửa:** dashboard page chỉ dùng `GET /api/v1/dashboard/overview` cho các KPI tổng hợp.

List machine chỉ dùng để hiển thị danh sách và card chi tiết, không dùng làm nguồn tính dashboard KPI nữa.

## 2. Dừng sinh trend giả ở page/energy

Trang energy hiện không được tự sinh series bằng random hay dao động giả.

**Chốt sửa:** chart energy chỉ lấy từ:

- `GET /api/v1/analytics/energy/trend`
- `GET /api/v1/analytics/energy/by-area`
- `GET /api/v1/analytics/energy/by-machine`
- `GET /api/v1/analytics/energy/cost`

## 3. Dừng sinh trend giả ở page/oee

Trang OEE hiện không được tự dựng data bằng random.

**Chốt sửa:** toàn bộ số sau phải lấy từ backend:

- avg OEE
- avg availability
- avg performance
- avg quality
- trend theo range
- ranking theo máy
- loss breakdown

## 4. Dừng export JSON tự dựng ở browser

Export trong UI không được tạo file chính từ state hiện có của browser.

**Chốt sửa:** nút export chỉ làm một trong hai việc:

- gọi download trực tiếp từ backend
- gọi backend tạo report rồi tải file về

---

## Cách UI phải dùng backend từ nay

## 1. Dashboard page

### Data source bắt buộc

- `GET /api/v1/dashboard/overview`
- `GET /api/v1/machines`
- `GET /api/v1/alarms/active`
- `GET /api/v1/realtime/stream`

### Quy tắc dùng dữ liệu

- KPI tổng lấy từ `dashboard/overview`
- danh sách máy lấy từ `machines`
- alarm panel lấy từ `alarms/active`
- realtime chỉ patch vào state hiển thị hiện tại

## 2. Machine detail page

### Data source bắt buộc

- `GET /api/v1/machines/{machineId}`
- `GET /api/v1/machines/{machineId}/latest`
- `GET /api/v1/machines/{machineId}/telemetry/history`
- `GET /api/v1/machines/{machineId}/alarms/history`
- `GET /api/v1/machines/{machineId}/downtime/history`
- `GET /api/v1/realtime/stream?machineId={machineId}`

### Quy tắc dùng dữ liệu

- detail header lấy từ machine detail
- chart lịch sử lấy từ history endpoint
- alarm table lấy từ alarm history
- realtime chỉ cập nhật live badge / latest value / thêm điểm mới nếu nằm trong time window hiện tại

## 3. Energy page

### Data source bắt buộc

- `GET /api/v1/analytics/energy/overview`
- `GET /api/v1/analytics/energy/trend`
- `GET /api/v1/analytics/energy/by-area`
- `GET /api/v1/analytics/energy/by-machine`
- `GET /api/v1/analytics/energy/cost`
- `GET /api/v1/realtime/stream?topics=telemetry,connection`

### Quy tắc dùng dữ liệu

- card tổng lấy từ overview
- line chart lấy từ trend
- pie/bar lấy từ by-area hoặc by-machine
- cost lấy từ endpoint cost
- không được cộng từ machine list nữa

## 4. OEE page

### Data source bắt buộc

- `GET /api/v1/analytics/oee/overview`
- `GET /api/v1/analytics/oee/trend`
- `GET /api/v1/analytics/oee/by-machine`
- `GET /api/v1/analytics/oee/losses`
- `GET /api/v1/realtime/stream?topics=telemetry,alarm,connection`

### Quy tắc dùng dữ liệu

- card OEE lấy từ overview
- chart trend lấy từ trend
- machine ranking lấy từ by-machine
- loss chart lấy từ losses

## 5. Settings page

### Data source bắt buộc

- `GET /api/v1/settings/ui-thresholds`

UI không tự ghép từ `thresholds[]` nữa.

---

## Realtime — UI phải theo contract của backend

## 1. UI phải nghe named SSE events

UI phải bỏ cách chỉ nghe `source.onmessage`.

UI phải subscribe theo event name:

- `machine-telemetry-updated`
- `alarm-created`
- `alarm-updated`
- `downtime-created`
- `machine-connection-changed`
- `heartbeat.ping`

## 2. UI phải lưu `Last-Event-ID`

UI phải lưu `eventId` cuối cùng đã nhận.

Khi reconnect:

- truyền `sinceEventId`
- hoặc gửi `Last-Event-ID`

để backend replay phần event bị lỡ.

## 3. UI phải patch qua mapper, không merge payload thô

Mọi realtime payload phải đi qua mapper:

- envelope -> event type
- payload -> model UI
- machine patch -> reducer chuẩn

Không được merge thẳng object raw vào state machine nếu chưa map field.

## 4. UI phải tách live state và history state

UI phải có hai lớp dữ liệu:

- **history state**: dữ liệu query theo khoảng thời gian
- **live state**: dữ liệu realtime vừa mới đến

### Quy tắc hiển thị

- khi user đang xem lịch sử 8h sáng đến 12h trưa, UI vẫn có thể nhận realtime mới
- realtime mới chỉ cập nhật badge live/latest panel
- chỉ append vào chart nếu timestamp mới nằm trong cửa sổ thời gian đang xem
- nếu user bấm “Go to live” thì chart mới nhảy theo realtime hoàn toàn

---

## UI phải bỏ hẳn các kiểu xử lý sau

- tự cộng `displayMachines.reduce(...)` để làm KPI thật
- dùng `Math.random()` tạo trend chart trong chế độ backend mode
- export snapshot JSON từ browser làm output chính
- tự suy ra severity hoặc risk level từ dữ liệu thô khi backend đã có field tổng hợp

---

## Cấu trúc kỹ thuật nên có trong UI

## 1. API layer

Mỗi màn phải có API module rõ:

- `dashboard.api.ts`
- `machines.api.ts`
- `energy.api.ts`
- `oee.api.ts`
- `maintenance.api.ts`
- `settings.api.ts`
- `export.api.ts`
- `realtime.api.ts`

## 2. Mapper layer

Phải có mapper rõ ràng:

- dashboard response -> ui dashboard model
- machine detail response -> ui machine model
- telemetry history response -> chart point model
- realtime envelope -> ui event model

## 3. Store / state

Phải tách:

- `serverState`: dữ liệu lấy từ BE
- `liveState`: dữ liệu realtime chưa chắc đã đồng bộ hoàn toàn với query hiện tại
- `uiState`: filter, tab, selected range, selected machine

---

## Tiêu chí hoàn thành của UI

UI được coi là hoàn thành vai trò khi đạt đủ các điều kiện sau:

1. Không còn `Math.random()` trong chart khi chạy backend mode.
2. Không còn business KPI tính bằng `reduce()` từ machine list để hiển thị số tổng chính.
3. Nút export gọi backend endpoint thay vì dựng file chính ở client.
4. Realtime dùng named events và reconnect/replay được.
5. Detail page vừa xem lịch sử vừa nhận realtime mà không phá chart hiện tại.
6. UI chuyển sang fail-safe state rõ ràng khi backend chậm hoặc stream mất kết nối.
7. Toàn bộ màn analytics dùng số liệu backend trả ra.

---

## Checklist triển khai cho UI team

### Bước 1
- sửa `useRealtimeStream` theo named event + replay
- thêm mapper cho realtime envelope

### Bước 2
- sửa dashboard page để chỉ dùng `dashboard/overview`
- bỏ tự tính KPI tổng từ machine list

### Bước 3
- sửa energy page để dùng analytics endpoints
- bỏ trend random

### Bước 4
- sửa OEE page để dùng analytics endpoints
- bỏ trend random và các số tổng tự tính

### Bước 5
- sửa machine detail page theo history endpoints của backend
- tách history state và live state

### Bước 6
- sửa export button để gọi BE export API

### Bước 7
- dọn toàn bộ mock fallback business logic khỏi chế độ backend thật

---

## Kết luận chốt cho UI team

UI không còn là nơi “phân tích bổ sung”.

UI chỉ là lớp tiêu thụ dữ liệu:

- lấy dữ liệu đã phân tích từ backend
- hiển thị đẹp, rõ, realtime
- cho người dùng lọc, xem lịch sử, export

Mọi con số nghiệp vụ phải tin theo backend.
