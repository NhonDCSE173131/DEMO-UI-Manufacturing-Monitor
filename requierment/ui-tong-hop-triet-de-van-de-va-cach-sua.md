# UI Manufacturing Monitor – Tổng hợp toàn bộ vấn đề hiện tại và cách sửa triệt để

## 1. Mục tiêu của tài liệu

Tài liệu này chốt lại **toàn bộ vấn đề đang làm UI không khớp với BE/Simulator**, đồng thời đưa ra cách sửa theo hướng:

- **BE là nguồn sự thật duy nhất cho dữ liệu và phân tích**
- **UI chỉ consume, hiển thị, filter, điều hướng, export theo dữ liệu BE trả ra**
- **Realtime phải live thật, không bị `connecting` mãi, không reconnect vòng lặp**
- **Chart phải chạy liên tục như dashboard tài chính/chứng khoán, không restart khi đổi trang**
- **Field nào không có dữ liệu thì hiện `--` hoặc `No data`, không tự ép thành `0`**
- **Khôi phục các block UI cũ quan trọng đã bị mất ở branch `test`**

---

## 2. Kết luận chốt nhanh

### 2.1. UI hiện đang có 5 nhóm lỗi chính

1. **Realtime SSE chưa ổn định**
   - trạng thái thường chỉ là `connecting` / `degraded`
   - Network trong DevTools hay thấy request bị `canceled`
   - một phần do stream bị đóng/mở lại quá thường xuyên

2. **Chart chưa phải live chart liên tục**
   - realtime hiện chủ yếu mới patch snapshot/event
   - chưa có buffer time-series toàn app
   - khi đổi máy/đổi trang, chart có thể dựng lại thay vì nối tiếp

3. **Nhiều thông số bị hiện `0` sai bản chất**
   - có field thật sự chưa được BE trả ở endpoint UI đang gọi
   - có field BE đã có nhưng UI map sai tên field
   - có field UI đang fallback `0` thay vì `null/--`

4. **UI branch `test` đang mất một số giá trị/giao diện tốt của branch `main`**
   - nhiều block dashboard cũ chưa được mang lại
   - trục thời gian, đơn vị đo, compare mode, maintenance risk, alarm center, export snapshot... đang nghèo hơn hoặc mất hẳn

5. **Contract UI ↔ BE chưa dùng nhất quán**
   - UI đang gọi vài endpoint mà BE chưa expose
   - UI đang kỳ vọng vài shape response không khớp response thật của BE
   - UI có chỗ đang trộn dữ liệu realtime, analytics và machine detail theo cách chưa rõ ràng

---

## 3. Triệu chứng hiện tại và nguyên nhân gốc

## 3.1. Realtime luôn ở trạng thái `connecting` hoặc `degraded`

### Triệu chứng
- badge trạng thái realtime không lên `live`
- tab Network xuất hiện nhiều request SSE bị `canceled`
- cảm giác stream cứ reconnect liên tục

### Nguyên nhân gốc

#### A. Hook realtime phụ thuộc vào `topics` theo reference
Trong `useRealtimeStream`, `useEffect` phụ thuộc trực tiếp vào `topics`.
Nếu page truyền `topics` bằng một array tạo mới mỗi lần render, effect sẽ cleanup stream cũ rồi tạo stream mới liên tục.

#### B. Cleanup của hook đóng EventSource mỗi lần effect chạy lại
Hook hiện đóng connection trong cleanup, nên chỉ cần render lại sai thời điểm là stream bị cắt.

#### C. UI chưa chạy theo mô hình “một stream toàn app”
Mỗi page/component có thể tự giữ stream riêng. Khi unmount hoặc đổi route thì stream bị đóng.

### Chốt hướng sửa
- Không để từng page tự quản lý kết nối SSE kiểu rời rạc
- Tạo **global realtime store / provider** ở cấp app shell
- App chỉ có **một EventSource chính**
- Mọi page đọc dữ liệu từ store chung

---

## 3.2. Request `canceled` trong F12 có phải lỗi không?

### Kết luận
- `canceled` **không phải lúc nào cũng là lỗi**
- nhưng trong hệ thống hiện tại, nó là **dấu hiệu reconnect loop** nếu lặp nhiều và badge realtime không lên `live`

### Chốt hướng sửa
- giữ một stream ổn định toàn app
- tránh dependency không ổn định trong hook
- chỉ reconnect khi thật sự mất kết nối
- reconnect có backoff, nhưng không reset state hiển thị vô nghĩa

---

## 3.3. Chart không chạy liên tục như chứng khoán

### Triệu chứng
- chuyển từ máy A sang máy B rồi quay lại máy A, chart có cảm giác “bắt đầu lại”
- chart không giữ được dòng thời gian sống liên tục
- realtime chỉ làm mới card/snapshot, không kéo được line chart thật

### Nguyên nhân gốc

#### A. UI chưa giữ time-series buffer theo từng machine
Hiện UI chủ yếu giữ danh sách machine và event.
Chưa có store kiểu:
- `telemetrySeriesByMachine[machineId]`
- `lastEventId`
- `lastSnapshotByMachine`
- `seriesWindow`

#### B. Event realtime chưa được append vào chart buffer
Realtime hiện thiên về patch object machine hoặc append alarm event.
Chart analytics lại đang phụ thuộc vào dữ liệu fetch REST riêng.
Hai luồng này chưa nối thành một luồng liên tục.

#### C. Khi đổi trang hoặc unmount page, dữ liệu chart bị bỏ
Không có cơ chế app-level cache để giữ chart state sống liên tục.

### Chốt hướng sửa

UI phải có 2 tầng dữ liệu:

#### Tầng 1 – Snapshot/Status layer
Dùng cho:
- card máy
- trạng thái RUN/IDLE/FAULT
- công suất hiện tại
- nhiệt độ hiện tại
- alarm mới nhất

#### Tầng 2 – Time-series layer
Dùng cho:
- line chart realtime
- trend chart theo máy
- window 1m / 5m / 15m / 1h / 1d
- nối tiếp liên tục khi người dùng đổi trang rồi quay lại

### Cách làm chuẩn
- Khi mở app: load history ban đầu cho machine hoặc tập machine cần quan sát
- Sau đó SSE chỉ **append point mới** vào series buffer
- Khi quay lại máy cũ: đọc buffer đang có, không reset
- Nếu bị miss gap: gọi history API hoặc replay theo `sinceEventId`

---

## 3.4. Vì sao một số field trên UI chỉ hiện `0`

### Kết luận chốt
Đây **không phải chỉ do BE hoặc chỉ do UI**.
Nó đến từ 3 nhóm nguyên nhân:

#### Nhóm 1 – UI đang gọi endpoint không chứa field đó
Ví dụ:
- `/api/v1/machines` chỉ phù hợp cho machine master/detail cơ bản
- nhưng UI lại dùng nó như nguồn cho nhiều KPI runtime/analytics

Khi UI map object thiếu field, mapper tự đẩy thành `0`.

#### Nhóm 2 – UI map sai tên field
Ví dụ điển hình:
- BE snapshot dùng `vibrationMmS`, UI lại có chỗ mong `vibrationPct`
- BE snapshot có `rejectCount`, UI mapper lại ưu tiên `ngCount / rejectParts / badParts`

#### Nhóm 3 – Field đó thật sự chưa có ở endpoint BE đang dùng
Ví dụ machine snapshot hiện có:
- `powerKw`
- `temperatureC`
- `vibrationMmS`
- `outputCount`
- `goodCount`
- `rejectCount`
- `spindleSpeedRpm`
- `feedRateMmMin`

Nhưng không đồng nghĩa nó cũng trả luôn:
- `oee`
- `availability`
- `performance`
- `quality`
- `energyMonthKwh`
- `machineHealth`
- `maintenanceDueDays`
- `toolLifeRemainingPct`

Những field này hoặc phải lấy từ analytics endpoint, hoặc BE phải expose riêng.

### Quy tắc chốt bắt buộc

#### Không được ép `undefined` thành `0` nếu đó không phải số 0 thật
UI phải phân biệt rõ:
- `0 thật` → hiển thị `0`
- `không có dữ liệu` → hiển thị `--` hoặc `No data`

#### Không dùng `/api/v1/machines` để nuôi mọi card phân tích
Phân tầng dữ liệu phải rõ:
- `/machines` → machine master / summary nhẹ
- `/machines/{id}/latest` → snapshot hiện tại
- `/analytics/oee/*` → OEE
- `/analytics/energy/*` → energy
- `/machines/{id}/telemetry/history` → history cho chart theo máy
- `/machines/{id}/alarms/history` → lịch sử alarm theo máy

---

## 3.5. Vì sao UI branch `test` bị mất cảm giác “UI cũ”

### Kết luận
Branch `test` hiện không phải chỉ là “bản cũ + BE”, mà đang là một dashboard khác theo hướng backend-driven hơn.

### Những phần cần khôi phục từ branch `main`
UI cần mang trở lại các khối tốt sau:

- compare mode
- export snapshot
- hero KPI row giàu thông tin
- good/NG ratio
- alarm center trực quan hơn
- maintenance risk block
- time range selector rõ ràng
- format trục thời gian theo từng range
- unit formatter theo từng loại chart

### Chốt hướng sửa
Không thay trắng UI cũ bằng UI test.
Phải làm theo hướng:
- giữ layout và UX tốt của branch `main`
- thay nguồn dữ liệu từ mock/store sang BE thật
- chỉ refactor phần data layer, không phá UX đã tốt

---

## 4. Chốt vai trò của BE và UI

## 4.1. BE làm gì
BE là nơi:
- ingest dữ liệu từ PLC simulator / PLC thật
- chuẩn hóa dữ liệu
- kiểm tra duplicate / out-of-order / stale
- lưu history
- cập nhật machine status
- tính analytics
- phát sinh alarm / downtime / maintenance risk
- phát realtime SSE

## 4.2. UI làm gì
UI chỉ làm:
- gọi API đúng endpoint
- hiển thị dữ liệu BE
- giữ realtime store và chart buffer ở phía client
- filter, sort, search, grouping
- điều hướng page
- export file theo dữ liệu BE trả ra

## 4.3. UI không được làm gì nữa
UI **không được**:
- tự tính OEE chuẩn thay BE
- tự tính energy summary chuẩn thay BE
- tự sinh trend random trong mode thật
- tự đoán threshold chính thức
- lấy machine list rồi dùng nó thay cho analytics endpoint

---

## 5. Thiết kế dữ liệu chuẩn cho UI

## 5.1. Data sources phải tách lớp rõ ràng

### A. Machine master / summary
Dùng cho:
- danh sách máy
- tên máy, code, line, type, vendor, enabled

### B. Machine latest snapshot
Dùng cho:
- trạng thái hiện tại
- công suất hiện tại
- nhiệt độ hiện tại
- rung hiện tại
- output/good/reject hiện tại

### C. Analytics overview
Dùng cho:
- card KPI tổng quan
- OEE overview
- energy overview
- dashboard summary

### D. History / trend
Dùng cho:
- chart theo machine
- chart theo time range
- export CSV/XLSX/PDF

### E. Realtime event stream
Dùng cho:
- append điểm mới vào chart
- update snapshot
- hiển thị alarm/downtime mới

---

## 6. Chốt cách sửa realtime triệt để

## 6.1. Tạo một App-level Realtime Provider

### Bắt buộc
Tạo một provider hoặc store cấp app, ví dụ:
- `RealtimeProvider`
- `useRealtimeStore`

### Provider này chịu trách nhiệm
- mở **một** EventSource chính
- giữ `connectionStatus`
- giữ `lastEventId`
- giữ `lastMessageAt`
- reconnect logic
- dispatch event vào các store con

---

## 6.2. Tạo 3 vùng state riêng trong UI

### A. Snapshot store
Ví dụ:
- `machineSnapshotsById`
- `machineConnectionById`

### B. Event store
Ví dụ:
- `alarmEvents`
- `downtimeEvents`
- `systemEvents`

### C. Time-series store
Ví dụ:
- `telemetrySeries[machineId].power`
- `telemetrySeries[machineId].temperature`
- `telemetrySeries[machineId].vibration`
- `telemetrySeries[machineId].output`

### Quy tắc
- snapshot để render card nhanh
- time-series để render chart liên tục
- event store để render timeline/alarm table

---

## 6.3. Cách mở stream đúng

### Không mở stream ở từng page theo kiểu cục bộ
Sai hướng:
- page dashboard mở 1 stream
- page machine detail mở 1 stream khác
- đổi route là mất stream

### Đúng hướng
- app shell mở stream một lần
- page chỉ subscribe vào store
- page unmount không làm mất dữ liệu realtime chung

---

## 6.4. Cách dùng `lastEventId`

### Bắt buộc
- lưu `lastEventId` ở store dùng chung hoặc session storage
- reconnect phải gửi lại `sinceEventId`
- dùng replay của BE để nhận phần event đã lỡ

### Lợi ích
- refresh tab ít bị mất dữ liệu
- chart đỡ gãy đoạn
- route change ngắn hạn không làm mất continuity

---

## 6.5. Cách cập nhật chart không restart

Khi có event telemetry mới:

1. lấy `machineId`
2. convert payload thành telemetry point UI chuẩn
3. append vào series buffer của machine tương ứng
4. trim theo window đang giữ, ví dụ 300 điểm gần nhất
5. không reset toàn bộ chart data nếu chỉ thêm 1 điểm

### Quy tắc
- append incremental
- không rebuild cả dataset sau mỗi tick nếu không cần
- nếu event đến muộn: thêm cờ quality/out-of-order và chỉ merge vào history logic nếu cần

---

## 7. Chốt cách sửa vấn đề field bị 0

## 7.1. Nguyên tắc hiển thị

### Thay đổi bắt buộc ở mapper
Không dùng kiểu:
- `value || 0`

Phải dùng kiểu:
- nếu `value === 0` → giữ `0`
- nếu `value === undefined || value === null` → trả `undefined`

### UI render layer
- có value → format bình thường
- không có value → `--`

---

## 7.2. Phân loại field theo nguồn đúng

### Field nên lấy từ latest snapshot
- status
- mode
- powerKw
- temperatureC
- vibrationMmS
- outputCount
- goodCount
- rejectCount
- spindleSpeedRpm
- feedRateMmMin

### Field nên lấy từ analytics OEE
- oee
- availability
- performance
- quality
- losses
- trend OEE

### Field nên lấy từ analytics energy
- totalEnergyToday
- totalEnergyMonth
- currentPlantPower
- energy breakdown
- cost today / month
- trend energy

### Field cần endpoint machine-specific riêng
- telemetry history của máy
- alarm history của máy
- downtime history của máy
- tool life history của máy
- maintenance history của máy

---

## 7.3. Những field đang có nguy cơ lệch tên

UI phải rà soát và map chính xác ít nhất các cặp sau:

- `rejectCount` ↔ không được bỏ sót khi render `ngCount`
- `vibrationMmS` ↔ không được tự coi là `vibrationPct`
- `outputCount` ↔ nếu UI dùng `partCount` thì phải map rõ
- `machineState` ↔ `status`
- `connectionStatus` ↔ trạng thái kết nối, không phải trạng thái sản xuất
- `connectionState` ↔ trạng thái chất lượng kết nối
- `machineCode` ↔ `code`
- `machineName` ↔ `name`

---

## 8. Các endpoint UI phải dùng đúng vai trò

## 8.1. Những endpoint đã phù hợp để dùng

### Machine
- `GET /api/v1/machines`
- `GET /api/v1/machines/{machineId}`
- `GET /api/v1/machines/{machineId}/latest`
- `GET /api/v1/machines/{machineId}/summary`
- `GET /api/v1/machines/snapshots`

### Realtime
- `GET /api/v1/realtime/stream`
- `GET /api/v1/realtime/health`

### Analytics
- `GET /api/v1/analytics/oee/overview`
- `GET /api/v1/analytics/oee/trend`
- `GET /api/v1/analytics/oee/by-machine`
- `GET /api/v1/analytics/oee/losses`
- `GET /api/v1/analytics/energy/overview`
- `GET /api/v1/analytics/energy/trend`
- `GET /api/v1/analytics/energy/by-area`
- `GET /api/v1/analytics/energy/by-machine`
- `GET /api/v1/analytics/energy/cost`

---

## 8.2. Những endpoint UI đang mong đợi nhưng cần chốt lại với BE

UI hiện muốn dùng các endpoint như:
- `/api/v1/machines/{machineId}/telemetry/history`
- `/api/v1/machines/{machineId}/alarms/history`
- `/api/v1/machines/{machineId}/downtime/history`

### Chốt
Nếu BE chưa expose đủ, phải:
- hoặc BE bổ sung
- hoặc UI tạm ẩn tính năng tương ứng

UI không được tiếp tục giả định là endpoint đã tồn tại rồi silently fallback về 0.

---

## 8.3. Settings API phải sửa theo response thật

UI không được coi `/api/v1/settings/thresholds` là object phẳng nếu BE trả `ThresholdResponse` theo danh sách.

### Hướng chốt
- UI tạo adapter riêng cho settings response
- map response BE thật sang view model của form settings
- không gọi thẳng và dùng luôn kiểu cũ

---

## 9. Kế hoạch khôi phục UX của UI cũ

## 9.1. Không bỏ branch `main` cũ
Branch `main` đang có nhiều phần UX tốt hơn.
Cần dùng nó như nguồn tham chiếu để khôi phục:

- compare mode
- export snapshot
- rich KPI cards
- good/NG ratio
- alarm center
- maintenance risk
- time range selector rõ ràng
- formatter trục thời gian
- formatter đơn vị kW / kWh / % / phút / giờ / ngày

## 9.2. Chiến lược đúng
- giữ bố cục/UX tốt từ branch `main`
- thay data source từ mock/local state sang BE
- hợp nhất dần vào branch `test`

### Không làm theo hướng
- bỏ sạch UI cũ rồi dựng lại một UI nghèo hơn

---

## 10. Chốt vấn đề đơn vị đo và trục thời gian

## 10.1. Nguyên tắc
Trục X phải đổi theo time range người dùng chọn.
Ví dụ:
- `5m` → hiển thị mốc phút/giây ngắn
- `1h` → hiển thị mốc phút
- `1d` → hiển thị mốc giờ
- `7d` → hiển thị mốc ngày

## 10.2. Trục Y phải có formatter theo metric
Ví dụ:
- power → `kW`
- energy → `kWh`
- temperature → `°C`
- vibration → `mm/s`
- OEE → `%`
- downtime → `min` / `h` / `day` tùy range

## 10.3. Cấm để chart “trơ đơn vị”
Mọi chart phải có:
- title
- unit
- source data rõ
- time range rõ
- legend nếu có nhiều series

---

## 11. Chốt yêu cầu phối hợp với BE

UI chỉ sửa triệt để được nếu BE giữ ổn định các nguyên tắc sau:

1. BE tiếp tục là source of truth cho analytics
2. BE giữ event SSE nhất quán
3. BE có history endpoint cho chart nếu UI cần continuity dài
4. BE trả field name nhất quán, không đổi lung tung giữa các endpoint
5. BE phân biệt rõ snapshot / summary / analytics / history

---

## 12. Chốt yêu cầu phối hợp với Simulator

Simulator phải đảm bảo:
- gửi dữ liệu thật logic
- timestamp đúng
- machine identity đúng
- scenario đúng tính chất vật lý
- không gửi random vô nghĩa

Simulator không được trở thành nơi tính KPI cuối cùng cho UI.
Nó chỉ là nguồn dữ liệu thô/chuẩn hóa để BE phân tích.

---

## 13. Thứ tự sửa triệt để được khuyến nghị

## Giai đoạn 1 – Sửa hạ tầng realtime UI
1. tạo app-level realtime provider
2. gom EventSource về một chỗ
3. giữ `lastEventId`, `lastMessageAt`, `connectionStatus`
4. tạo store snapshot / events / time-series

## Giai đoạn 2 – Sửa mapper và cơ chế hiển thị `0`
5. bỏ fallback `|| 0` với field có thể thiếu
6. map lại đúng tên field snapshot
7. phân biệt `0 thật` và `không có dữ liệu`
8. đổi UI render `undefined` thành `--`

## Giai đoạn 3 – Sửa data flow của từng page
9. dashboard dùng overview + analytics + snapshots + realtime store
10. machine detail dùng latest + history + realtime append
11. energy page dùng analytics energy thật
12. OEE page dùng analytics OEE thật

## Giai đoạn 4 – Khôi phục UX cũ
13. đưa lại compare mode
14. đưa lại export snapshot
15. đưa lại maintenance risk
16. đưa lại alarm center
17. đưa lại formatter trục thời gian và đơn vị

## Giai đoạn 5 – Hoàn thiện chart liên tục
18. append point vào buffer thay vì rebuild chart
19. bù gap bằng replay hoặc history
20. giữ continuity khi đổi route và quay lại

---

## 14. Checklist chốt cuối cùng

### Bắt buộc phải có sau khi sửa xong
- [ ] Realtime badge lên `live` ổn định
- [ ] Network không còn reconnect loop vô nghĩa
- [ ] Không còn field bị `0` do thiếu data mà không phân biệt
- [ ] Chart không restart khi đổi trang/ngó máy khác rồi quay lại
- [ ] Trục X đổi đúng theo time range
- [ ] Trục Y luôn có đơn vị đúng
- [ ] Dashboard lấy số liệu chính từ BE, không tự random
- [ ] OEE page không tự tính chuẩn thay BE
- [ ] Energy page không tự tổng hợp chuẩn thay BE
- [ ] UI lấy lại được các block UX mạnh của branch `main`

---

## 15. Câu chốt để cả team thống nhất

Nếu muốn hệ thống này hoạt động như một nền tảng giám sát công nghiệp thực sự:

- **BE phải là nơi ingest + lưu + phân tích + cảnh báo + realtime**
- **UI phải là nơi hiển thị thông minh, không tự bịa số liệu**
- **Realtime phải được quản lý ở cấp app, không phải cấp page**
- **Chart phải dựa trên time-series buffer + history + replay, không dựa vào render lại từ đầu**
- **Mọi field thiếu dữ liệu phải được hiển thị như dữ liệu thiếu, không phải số 0 giả**

