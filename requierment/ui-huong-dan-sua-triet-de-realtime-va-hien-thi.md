# UI – Hướng dẫn sửa triệt để realtime, trạng thái kết nối, và hiển thị thông số đúng logic

## 1. Kết luận chốt cho UI

Ở thời điểm hiện tại, phần lỗi **nhìn thấy trên màn hình** chủ yếu nằm ở **UI**.

Backend hiện đã có những phần nền quan trọng cho realtime:
- SSE stream cho realtime
- machine connection state và watchdog stale/offline
- snapshot máy có `connectionState`, `lastSeenAt`, `dataFreshnessSec`
- analytics tổng hợp từ backend

Vì vậy, với các lỗi đang thấy như:
- mất realtime trên màn hình
- trạng thái cứ `connecting`
- thông số hiện `0`
- thông số cũ vẫn nằm đó dù máy đã mất dữ liệu live
- không phân biệt được mất kết nối ở PLC hay mất kết nối giữa UI với BE
- chart không chạy liên tục như chứng khoán

=> trọng tâm sửa hiện tại là **UI**.

---

## 2. Mục tiêu UI sau khi sửa

### 2.1. Giữ lại phần “Trạng Thái Hệ Thống / Trực tuyến”

Phần này là hợp lý và nên giữ.

Nhưng phải đổi ý nghĩa cho rõ:
- đây là **trạng thái kết nối UI ↔ BE realtime**
- không được hiểu nhầm là trạng thái PLC hay trạng thái vận hành máy

Ví dụ:
- `Trực tuyến` = UI đang nhận được realtime stream từ BE
- `Đang kết nối` = UI đang thử mở SSE tới BE
- `Mất kết nối BE` = UI không còn nhận stream từ BE

### 2.2. Bỏ chế độ so sánh

Bỏ hoàn toàn `Compare mode` ở dashboard.

Lý do:
- không phải nhu cầu chính hiện tại
- làm dashboard nặng và rối
- làm lệch focus khỏi bài toán quan trọng nhất là **realtime thông số**

### 2.3. Ưu tiên số 1 là realtime thông số

UI phải ưu tiên 3 việc:
1. thông số hiện tại phải đúng là **live**
2. mất dữ liệu live thì phải hiện **không có dữ liệu**, không hiện `0`
3. đổi trang/máy thì biểu đồ không bị reset kiểu “bắt đầu lại từ đầu” trong cùng một phiên chạy app

---

## 3. Logic đúng cần có ở UI

## 3.1. Phải tách 3 loại trạng thái khác nhau

UI hiện đang lẫn các loại trạng thái. Sau khi sửa phải tách rõ:

### A. Trạng thái kết nối UI ↔ BE
Đây là trạng thái của realtime stream toàn app.

Ví dụ:
- `connecting`
- `live`
- `degraded`
- `offline`

Hiển thị ở phần **Trạng Thái Hệ Thống / Trực tuyến**.

### B. Trạng thái kết nối PLC/collector ↔ BE theo từng máy
Đây là trạng thái dữ liệu nguồn của từng máy, lấy từ backend.

Ví dụ:
- `ONLINE`
- `STALE`
- `OFFLINE`
- `UNSTABLE`

Phải hiển thị ở card máy / trang chi tiết máy / biểu đồ máy.

### C. Trạng thái vận hành máy
Đây là trạng thái nghiệp vụ của máy.

Ví dụ:
- `RUNNING`
- `IDLE`
- `STOPPED`
- `FAULT`
- `MAINTENANCE`

**Không được map `ONLINE -> RUN` hoặc `OFFLINE -> STOP`.**

Đây là lỗi logic lớn và phải bỏ hẳn.

---

## 3.2. Khi nào hiển thị thông số, khi nào không hiển thị

### Được hiển thị thông số live khi:
- UI ↔ BE đang `live`
- máy đang `connectionState = ONLINE`
- `dataFreshnessSec` còn trong ngưỡng chấp nhận

### Không được hiển thị thông số live khi:
- UI mất kết nối với BE
- hoặc máy `STALE`
- hoặc máy `OFFLINE`
- hoặc dữ liệu quá cũ so với ngưỡng freshness

Khi đó:
- không hiển thị `0`
- không giữ số cũ như thể đang còn realtime
- hiển thị `--` hoặc `Không có dữ liệu live`
- hiển thị thêm badge/label nguyên nhân

Ví dụ:
- `Mất kết nối tới backend`
- `PLC/Collector không gửi dữ liệu`
- `Dữ liệu đã cũ 18s`

---

## 3.3. Quy tắc vàng về số liệu

### `0` chỉ được dùng khi backend trả đúng là 0 thật

Ví dụ:
- `rejectCount = 0`
- `powerKw = 0` trong trường hợp máy online nhưng đang idle thật

### `--` hoặc `No live data` dùng khi:
- field không có
- chưa có dữ liệu
- mất kết nối
- stale/offline
- UI chưa nhận được snapshot hợp lệ

Tuyệt đối không được dùng `?? 0` cho các field runtime quan trọng.

---

## 4. Kiến trúc UI sau khi sửa

## 4.1. Realtime phải là app-level, không phải page-level

UI đã có `RealtimeProvider` cấp app. Phải giữ hướng này.

Mọi page phải dùng chung một nguồn live.

Không để mỗi trang:
- tự mở stream riêng
- tự giữ dữ liệu riêng
- unmount là mất dòng dữ liệu

Mục tiêu:
- chuyển trang nhưng stream vẫn sống
- buffer vẫn còn
- quay lại máy cũ thì chart vẫn tiếp nối

---

## 4.2. Dữ liệu UI phải chia thành 3 lớp

### Lớp 1 – Catalog tĩnh
Dùng cho:
- id
- code
- name
- type
- vendor
- model
- plant/line/area

Nguồn:
- `/api/v1/machines`

### Lớp 2 – Snapshot runtime hiện tại
Dùng cho:
- power
- nhiệt độ
- rung động
- output/good/reject
- connectionState
- lastSeenAt
- dataFreshnessSec
- current alarms count nếu có

Nguồn chính:
- `/api/v1/machines/snapshots`
- cộng với realtime store

### Lớp 3 – Analytics
Dùng cho:
- OEE overview
- energy trend
- dashboard overview
- tổng hợp cảnh báo
- summary theo khoảng thời gian

Nguồn:
- các endpoint analytics/backend summary

**Không được dùng `/api/v1/machines` để đổ vào card runtime.**

---

## 4.3. Nguồn sự thật cho màn hình realtime

UI phải render theo thứ tự:

1. bootstrap bằng snapshot từ backend
2. sau đó patch bằng realtime store
3. nếu mất live thì giữ state kết nối, nhưng runtime value phải chuyển sang `--`
4. nếu kết nối lại thì tiếp tục append/live patch

---

## 5. Những lỗi hiện tại ở UI và cách sửa

## 5.1. Dashboard còn giữ Compare mode

### Vấn đề
Dashboard test branch vẫn có `compareMode` và phần UI tương ứng.

### Sửa
Trong `src/app/page.tsx`:
- xóa state `compareMode`
- xóa dropdown compare mode
- xóa phần export snapshot phụ thuộc compare mode nếu không còn cần
- toàn bộ dashboard tập trung vào:
  - trạng thái hệ thống realtime
  - KPI hiện tại
  - chart realtime
  - alarm/recent events

### Kết quả mong muốn
Dashboard gọn, tập trung vào dữ liệu thời gian thực.

---

## 5.2. Dashboard đang dùng sai nguồn dữ liệu runtime

### Vấn đề
`useMachinesData()` đang là nguồn chính cho nhiều phần hiển thị máy. Nhưng endpoint danh sách máy không phải endpoint runtime đầy đủ.

### Sửa
Sửa `useMachinesData()` hoặc tạo hook mới theo hướng:
- lấy catalog máy từ `/api/v1/machines`
- lấy snapshot runtime từ `/api/v1/machines/snapshots`
- merge 2 lớp dữ liệu theo `machineId`
- sau đó merge tiếp patch realtime từ store

### Kết quả mong muốn
Card máy và dashboard không còn dựa trên object “mỏng” thiếu dữ liệu.

---

## 5.3. Mapper đang ép giá trị thiếu thành 0

### Vấn đề
`machine.mapper.ts` đang fallback nhiều field về `0`.
Điều này làm UI không phân biệt được:
- số 0 thật
- không có dữ liệu
- mất kết nối
- stale

### Sửa
Trong `src/lib/mappers/machine.mapper.ts`:
- bỏ fallback `?? 0` cho runtime fields
- trả về `undefined | null` với field chưa có
- chỉ giữ `0` cho các field backend chắc chắn trả 0 thật

### Các field nên để `undefined/null` nếu không có:
- `powerKw`
- `temperatureC`
- `vibration`
- `oee`
- `availability`
- `performance`
- `quality`
- `energyTodayKwh`
- `energyMonthKwh`
- `machineHealth`
- `maintenanceDueDays`
- `anomalyScore`
- `toolLifeRemainingPct`
- `activeAlarms`

### Kết quả mong muốn
UI hiện `--` khi thiếu dữ liệu thay vì `0` giả.

---

## 5.4. Mapper đang lẫn connection state với machine state

### Vấn đề
Mapper hiện đang map kiểu:
- `ONLINE -> RUN`
- `OFFLINE -> STOP`

Đây là sai logic.

### Sửa
Trong `src/lib/mappers/machine.mapper.ts` và `src/lib/mappers/realtime.mapper.ts`:
- tách riêng `machineStatus`
- tách riêng `connectionState`
- không để `connectionStatus` ghi đè vào `status vận hành`

### Kết quả mong muốn
UI hiển thị đúng các case:
- máy dừng nhưng vẫn online
- máy running nhưng stream UI mất
- PLC mất kết nối với BE
- UI mất kết nối với BE

---

## 5.5. Realtime provider có nhưng page chưa thật sự dùng store live

### Vấn đề
UI đã có `RealtimeProvider` và realtime store, nhưng page dashboard vẫn đang lấy dữ liệu chính từ local hooks/REST.

### Sửa
Trong `src/app/page.tsx` và các page máy/energy/oee:
- lấy `connectionStatus`, `lastEventId`, `telemetrySeriesByMachineId`, `machinePatchById`, `connectionPatchById`, `activeEvents` từ realtime store
- lấy machine runtime cuối cùng từ store merge snapshot, không chỉ từ REST state
- chart realtime phải đọc từ `telemetrySeriesByMachineId`

### Kết quả mong muốn
SSE thực sự làm thay đổi giao diện.

---

## 5.6. Trạng thái “Trực tuyến” phải chỉ phản ánh UI ↔ BE

### Vấn đề
Người dùng dễ hiểu nhầm `Trực tuyến` là máy/PLC đang online.

### Sửa
Giữ widget này nhưng đổi nghĩa hiển thị rõ hơn:
- Tiêu đề: `Trạng Thái Hệ Thống`
- Nội dung chính: `Trực tuyến` / `Đang kết nối` / `Mất kết nối BE`
- phụ đề nhỏ: `Kênh realtime giữa UI và backend`

Machine cards riêng sẽ hiển thị:
- `PLC online`
- `STALE`
- `OFFLINE`
- `UNSTABLE`

### Kết quả mong muốn
Phân biệt rõ mất ở đâu.

---

## 5.7. Khi mất realtime không được hiện số cũ như vẫn còn live

### Vấn đề
Hiện tại người dùng có thể thấy số cũ đứng yên hoặc thậm chí hiện 0.
Điều này gây hiểu sai rằng hệ thống vẫn đang có dữ liệu.

### Sửa
Tạo helper chung:
- `isMachineLive(machine)`
- `shouldShowLiveMetrics(machine)`

Điều kiện hiển thị live:
- app realtime status = `live`
- machine connection state = `ONLINE`
- freshness trong ngưỡng

Nếu không đạt:
- card realtime values chuyển thành `--`
- chart live dừng append điểm mới
- badge hiển thị lý do mất dữ liệu
- timestamp cuối cùng vẫn được giữ riêng ở chỗ “lần cuối nhận dữ liệu”

### Kết quả mong muốn
Không còn tình trạng hiện lại số cũ như dữ liệu còn sống.

---

## 5.8. Chart phải chạy liên tục như chứng khoán trong cùng phiên app

### Vấn đề
Người dùng muốn chuyển từ máy A sang B rồi quay lại A thì chart A không bị bắt đầu lại từ đầu.

### Sửa
Dùng `telemetrySeriesByMachineId` trong realtime store như session cache.

Mỗi event realtime tới:
- append point vào buffer của machine tương ứng
- không reset buffer khi đổi route
- page chỉ đổi machine đang xem, không được xóa buffer của máy khác

Buffer đề xuất:
- 300–1000 điểm tùy range
- key theo `machineId`

### Kết quả mong muốn
Trong cùng một phiên mở app, chart liên tục như stock chart.

> Lưu ý: nếu người dùng F5 hoặc rời app lâu, để backfill hoàn toàn cần history API từ backend. Nhưng trong phạm vi sửa UI hiện tại, phải ít nhất đảm bảo **không restart khi chỉ đổi trang trong cùng phiên**.

---

## 5.9. Trục thời gian và đơn vị đo đang thiếu/không ổn định

### Vấn đề
Chart đang có hiện tượng mất đơn vị trục ngang hoặc nhãn thời gian không khớp range chọn.

### Sửa
Trong dashboard/chart config:
- trục X phải format theo `time range`
- `60s`: hiện `HH:mm:ss`
- `1h`: hiện `HH:mm`
- `1d`: hiện `HH:mm`
- `1w`: hiện `dd/MM HH:mm` hoặc `dd/MM`

Trục Y phải có formatter đúng đơn vị:
- công suất: `kW`
- năng lượng: `kWh`
- nhiệt độ: `°C`
- rung động: `mm/s`
- OEE: `%`

### Kết quả mong muốn
Chart đọc được ngay, không mơ hồ.

---

## 5.10. Không được dùng dữ liệu random để lấp chart chính

### Vấn đề
Một số chart fallback vẫn dùng dữ liệu sinh hoặc dữ liệu suy đoán cục bộ.

### Sửa
- Nếu backend chưa có analytics tương ứng: hiện `No data`
- Không tự sinh trend random cho chart chính
- Mock chỉ tồn tại trong mock mode riêng

### Kết quả mong muốn
Dashboard không tạo ảo giác là dữ liệu thật.

---

## 6. Hướng sửa theo file cụ thể

## 6.1. `src/app/page.tsx`

### Phải làm
- bỏ `compareMode`
- bỏ dropdown compare mode
- bỏ phần logic/export phụ thuộc compare mode
- giữ block `Trạng Thái Hệ Thống / Trực tuyến`
- đổi block này thành status của UI ↔ BE realtime
- dashboard cards không lấy runtime trực tiếp từ `/machines` nữa
- lấy machine live view từ snapshot + realtime store
- chart realtime dùng `telemetrySeriesByMachineId`
- không tự cộng số liệu runtime từ object thiếu field
- nơi nào field không có thì hiện `--`

### Kết quả
Dashboard đơn giản hơn, đúng trọng tâm realtime.

---

## 6.2. `src/hooks/useMachinesData.ts`

### Phải làm
- không coi `/api/v1/machines` là nguồn runtime chính
- sửa hook để:
  - fetch catalog
  - fetch snapshots
  - merge catalog + snapshot
- bổ sung khả năng nhận patch từ realtime store

### Kết quả
Danh sách máy có đủ runtime state để render.

---

## 6.3. `src/lib/mappers/machine.mapper.ts`

### Phải làm
- bỏ `?? 0` cho runtime/analytics fields
- trả `undefined` nếu backend chưa có
- tách `machineStatus` khỏi `connectionState`
- giữ `lastSeenAt`, `dataFreshnessSec`, `connectionUnstable`
- map đúng tên field BE hiện có, ví dụ:
  - `rejectCount`
  - `vibrationMmS`
  - `outputCount`
  - `goodCount`

### Kết quả
UI không còn biến thiếu dữ liệu thành 0 và không còn lẫn trạng thái.

---

## 6.4. `src/lib/mappers/realtime.mapper.ts`

### Phải làm
- patch realtime chỉ cập nhật những field thực sự có trong event
- không dùng `connectionStatus` để suy ra `machineStatus`
- nếu event là connection event thì cập nhật `connectionState`, `lastSeenAt`, `dataFreshnessSec`, `unstable`
- nếu event là telemetry event thì append point + patch snapshot live fields

### Kết quả
Realtime patch sạch và đúng nghiệp vụ.

---

## 6.5. `src/components/RealtimeProvider.tsx`

### Phải làm
- giữ provider ở app-level
- đảm bảo stream chỉ mở một lần cho toàn app
- lưu app-level connection status vào store
- bắt đầy đủ named events của backend:
  - telemetry
  - alarm
  - downtime
  - machine connection changed
  - machine connection reported/unstable nếu cần
- khi `onopen` -> app status `live`
- khi `onerror` -> app status `degraded/offline`
- không reset buffer khi đổi route

### Kết quả
Toàn app dùng chung một dòng realtime ổn định.

---

## 6.6. `src/lib/realtime-store.ts`

### Phải làm
Store phải giữ rõ:
- `appConnectionStatus`
- `lastEventId`
- `machinePatchById`
- `connectionStateByMachineId`
- `lastSeenByMachineId`
- `dataFreshnessByMachineId`
- `telemetrySeriesByMachineId`
- `activeAlarmEvents`

Bổ sung helper:
- `getMachineLiveView(machineId)`
- `isMachineLive(machineId)`
- `shouldShowLiveMetrics(machineId)`

### Kết quả
Page chỉ cần đọc store là có logic hiển thị đúng.

---

## 6.7. `src/hooks/useAlarmsData.ts`

### Phải làm
- REST là baseline
- realtime events là patch/update thêm
- không để alarm panel đứng yên nếu SSE đã có event mới

### Kết quả
Alarm panel thật sự realtime.

---

## 6.8. Machine detail pages / energy / OEE pages

### Phải làm
- machine detail page dùng machine live view từ store + snapshot
- chart realtime từng máy dùng buffer của máy đó
- energy và OEE page:
  - summary/trend dài hạn lấy từ analytics backend
  - widget realtime nhỏ dùng store nếu cần
- không dùng fallback random ở các chart chính

### Kết quả
Các page nhất quán, backend-driven, live đúng chỗ.

---

## 7. Logic hiển thị cụ thể cần chốt

## 7.1. Nếu UI mất kết nối với BE

Hiển thị:
- `Trạng Thái Hệ Thống: Mất kết nối backend`
- tất cả widget live hiện `--`
- hiện timestamp lần cuối nhận event toàn app
- chart giữ dữ liệu lịch sử đã có nhưng đánh dấu `Live paused`

Không được:
- hiện `0`
- giả vờ như số hiện tại vẫn còn live

---

## 7.2. Nếu UI vẫn nối BE nhưng PLC/máy mất dữ liệu

Hiển thị ở máy đó:
- badge `STALE` hoặc `OFFLINE`
- metrics runtime của máy đó thành `--`
- dòng phụ: `Lần cuối nhận dữ liệu: ...`
- nếu có `dataFreshnessSec`, hiển thị rõ `Dữ liệu cũ 18s / 34s`

Các máy khác vẫn live bình thường.

---

## 7.3. Nếu máy online nhưng đang idle/stop

Hiển thị:
- `Kết nối: ONLINE`
- `Trạng thái máy: IDLE/STOPPED`
- power có thể = 0 hoặc thấp nếu backend trả như vậy thật

Không được ghi nhãn mất kết nối.

---

## 8. Checklist triển khai theo thứ tự

### Giai đoạn 1 – Làm đúng logic hiển thị
1. bỏ compare mode
2. giữ `Trạng Thái Hệ Thống / Trực tuyến`
3. tách app connection state khỏi machine connection state
4. tách machine status khỏi connection state
5. bỏ fallback `0` ở mapper
6. đổi runtime widgets sang `--` khi mất live

### Giai đoạn 2 – Làm sống lại realtime thật
7. dashboard/page dùng realtime store thật
8. merge snapshot + realtime patch
9. alarm panel dùng realtime events
10. machine cards nhận connection/freshness đúng

### Giai đoạn 3 – Làm chart liên tục
11. chart đọc từ `telemetrySeriesByMachineId`
12. không reset buffer khi đổi route
13. trục thời gian/đơn vị đo chuẩn theo range
14. đánh dấu `live paused` khi stream dừng

### Giai đoạn 4 – Hoàn thiện UX
15. hiển thị rõ nguyên nhân mất kết nối ở đâu
16. thay `0` giả bằng `--`
17. bỏ mock/random khỏi chart chính
18. khôi phục những block UI cũ còn giá trị nhưng theo data flow mới

---

## 9. Kết luận chốt

Phần sửa hiện tại nên tập trung vào **UI**.

Mục tiêu cuối cùng là:
- giữ `Trạng Thái Hệ Thống / Trực tuyến`
- bỏ `Compare mode`
- ưu tiên realtime thông số
- phân biệt rõ:
  - UI mất kết nối với BE
  - PLC/collector mất kết nối với BE
  - máy dừng nhưng vẫn online
- mất dữ liệu live thì hiện `--`, không hiện `0`
- không dùng số cũ như thể realtime còn sống
- chart chạy liên tục trong cùng phiên app như stock chart

Đây là hướng đúng để UI ăn khớp với backend realtime hiện tại và không còn gây hiểu sai cho người dùng vận hành.
