# YÊU CẦU COPILOT CODE WEB GIÁM SÁT NĂNG LƯỢNG + ROBOT/PLC

## 1) Mục tiêu dự án
Xây dựng **web dashboard công nghiệp** để giám sát 5 máy/cell sản xuất theo thời gian thực, theo phong cách **dark futuristic industrial** giống tinh thần ảnh tham khảo trong thư mục `assets/ui-reference-user.png`.

Web này không phải admin template thông thường. Nó phải nhìn như một **hệ thống điều hành xưởng / HMI web / IIoT dashboard**: rõ ràng, trực quan, ưu tiên trạng thái máy, OEE, cảnh báo, xu hướng điện năng, dữ liệu gia công, tuổi thọ dao cụ và bảo trì dự đoán.

## 2) Chức năng chính bắt buộc
Hệ thống phải có các chức năng sau:

1. **Giám sát hiệu quả sản xuất (OEE) theo thời gian thực**
   - OEE tổng
   - Availability
   - Performance
   - Quality
   - Good parts / NG parts
   - Cycle time thực tế vs cycle time chuẩn
   - Sản lượng theo ca / ngày / tuần

2. **Thu thập tham số gia công và dữ liệu cắt gọt**
   - Spindle speed / feed rate / cutting speed
   - Load trục chính / servo load / torque
   - Nhiệt độ motor / spindle / tủ điện
   - Rung động
   - Dòng điện / điện áp / công suất / kWh
   - Chương trình đang chạy / mã recipe / tool hiện tại

3. **Dự đoán tuổi thọ dao cụ và cảnh báo**
   - % tuổi thọ còn lại
   - RUL (remaining useful life) theo giờ hoặc theo số part
   - Cảnh báo vàng khi còn dưới ngưỡng
   - Cảnh báo đỏ khi sắp hết tuổi thọ
   - Danh sách dao cụ và trạng thái từng dao

4. **Dự đoán bảo trì máy và nhắc nhở**
   - Điểm sức khỏe máy (Machine Health Score)
   - Dự đoán số ngày còn lại tới bảo trì
   - Nhắc lịch bảo trì 3 ngày / 7 ngày / 14 ngày
   - Tổng hợp runtime, idle time, stop time, fault time

5. **Cảnh báo dừng máy bất thường theo thời gian**
   - Phát hiện downtime bất thường
   - Nhật ký sự kiện theo timeline
   - Phân loại nguyên nhân dừng máy
   - Pareto nguyên nhân dừng máy
   - Highlight máy đang fault / warning / maintenance overdue

## 3) Quy mô hệ thống
Có **5 máy/cell**. Mỗi máy có **trang chi tiết riêng**, nhưng cùng chung một layout dễ hiểu để người dùng nhìn vào là biết ngay:
- Máy đang chạy hay dừng
- OEE đang tốt hay xấu
- Điện năng hiện tại bao nhiêu
- Dao cụ còn bao lâu
- Có cảnh báo gì không
- Cần bảo trì khi nào

## 4) Mô hình 5 máy mẫu để dựng giao diện
Dùng mock data theo 5 máy dưới đây. Có thể đổi tên sau, nhưng trước mắt UI phải bám theo các loại máy này:

### Máy 01 — Robot hàn KUKA + PLC Siemens
- Loại: robot cell hàn
- Trọng tâm: trạng thái robot, cycle time, part count, điện năng, downtime, cảnh báo cell
- Hiển thị thêm: welding current, weld cycle, servo load

### Máy 02 — CNC phay + Sinumerik / PLC Siemens
- Loại: máy gia công cắt gọt
- Trọng tâm: spindle speed, feed rate, tool wear, load, vibration, OEE
- Hiển thị thêm: tool number, tool life, cutting time

### Máy 03 — CNC tiện + PLC Siemens
- Loại: máy tiện
- Trọng tâm: spindle load, dao cụ, nhiệt độ, power, downtime theo ca

### Máy 04 — Robot gắp/đặt kiểu Leantec / Innova + PLC Delta/Mitsubishi
- Loại: pick-and-place / assembly cell
- Trọng tâm: throughput, cycle, jam detection, sensor state, alarm, kWh

### Máy 05 — Cell cắt/đánh bóng/kiểm tra tự động
- Loại: cell gia công tự động có tool wear
- Trọng tâm: tốc độ, lực cắt giả lập, tool life, machine health, bảo trì dự đoán

## 5) Phong cách thiết kế mong muốn
### Tổng thể
- Nền tối xanh đậm / navy / black-blue
- Tạo cảm giác công nghiệp hiện đại, hơi futuristic nhưng không màu mè quá mức
- Card có viền sáng nhẹ màu cyan / electric blue
- Có glow nhẹ, bóng mờ, inner shadow, line grid mờ ở background
- Dùng typography rõ ràng, số liệu to, dễ đọc từ xa
- Ưu tiên hiển thị trạng thái bằng màu sắc + icon + số

### Màu sắc đề xuất
- Background chính: `#071426`, `#0A1B33`, `#08111F`
- Card nền: `rgba(8, 26, 51, 0.78)` hoặc `#0B213F`
- Viền card: `#1E90FF`, `#2CC8FF`
- Text chính: `#EAF4FF`
- Text phụ: `#8FB3D9`
- Running / Good: `#22C55E`
- Warning: `#FACC15`
- Fault / Alarm: `#EF4444`
- Info / KPI năng lượng: `#38BDF8`
- Accent phụ: `#8B5CF6`, `#06B6D4`

### Cảm giác giao diện
- Phải giống một **energy monitoring center + robot operation center**
- Không dùng layout trắng sáng kiểu ERP
- Không nhồi quá nhiều bảng thô; ưu tiên gauge, line chart, donut, thermometer, trend card, timeline, mini status panel

## 6) Công nghệ đề xuất để code
Ưu tiên stack sau:
- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui** cho card, dialog, tabs, select, badge, table nếu cần
- **Apache ECharts** cho toàn bộ chart vì cần gauge / thermometer / line / bar / scatter / pie / radar / timeline
- **Framer Motion** cho animation nhẹ
- **Lucide React** cho icon
- **Zustand** hoặc context store cho mock realtime state

> Nếu muốn đơn giản hơn, vẫn phải giữ khả năng dựng được: gauge, thermometer, semicircle meter, line trend, bar chart, Pareto, donut.

## 7) Cấu trúc trang cần có

### 7.1 Trang Dashboard tổng (`/dashboard`)
Trang này là trung tâm quan sát toàn bộ xưởng.

#### Header trên cùng
- Logo text hệ thống: `Factory Energy & Robot Monitor`
- Đồng hồ thời gian thực
- Bộ lọc: ca làm việc, ngày, khu vực, trạng thái
- Nút chuyển theme nhẹ nếu muốn
- Thanh cảnh báo đỏ nếu có alarm nghiêm trọng

#### Hàng KPI đầu tiên
Hiển thị 6–8 card lớn:
- OEE trung bình toàn xưởng
- Tổng sản lượng hôm nay
- Good parts / NG parts
- Tổng công suất hiện tại (kW)
- Tổng điện năng ca hiện tại (kWh)
- Số máy đang chạy / dừng / fault
- Số cảnh báo chưa xử lý
- Dự đoán downtime risk toàn xưởng

#### Khu trung tâm
Chia 3 vùng:

**Bên trái**
- Danh sách 5 máy dạng card dọc
- Mỗi card có:
  - tên máy
  - trạng thái (RUN / IDLE / STOP / FAULT / MAINT)
  - OEE hiện tại
  - công suất hiện tại
  - tool life còn lại (nếu có)
  - nút vào trang chi tiết

**Ở giữa**
- Sơ đồ tổng quan nhà xưởng hoặc schematic đơn giản 5 cell
- Card tổng điện năng theo khu vực / line
- Có thể dùng ảnh `assets/kuka-robot-line.jpg`, `assets/fanuc-welding-robot.jpg`, `assets/ur16e-cobot-resized.png` làm minh họa nhỏ trong card hoặc banner

**Bên phải**
- Alarm center
- Top 5 alarm mới nhất
- Top 5 downtime events
- Danh sách máy có nguy cơ bảo trì cao

#### Hàng biểu đồ phía dưới
1. **Line chart**: điện năng / công suất theo giờ trong ngày
2. **Bar chart**: OEE từng máy
3. **Donut/Pie**: tỉ lệ điện năng theo 5 máy
4. **Pareto chart**: nguyên nhân downtime
5. **Heatmap**: downtime theo giờ và theo máy

---

### 7.2 Trang danh sách máy (`/machines`)
- Grid 5 card lớn
- Mỗi card có ảnh minh họa, trạng thái, OEE, kWh, cảnh báo, ngày bảo trì tiếp theo
- Có thanh filter theo loại máy và trạng thái
- Click card để vào trang chi tiết

---

### 7.3 Trang chi tiết từng máy (`/machines/[id]`)
Đây là trang quan trọng nhất. Bố cục phải **gần giống ảnh tham khảo**: nhiều panel, đồng hồ, biểu đồ, sơ đồ kết nối, cực kỳ dễ hiểu.

#### Bố cục đề xuất

### A. Dải thông tin trên cùng
Gồm 6–8 panel ngang:
1. Tên máy + trạng thái + mode Auto/Manual
2. OEE gauge lớn
3. Availability / Performance / Quality dạng 3 vòng tròn nhỏ hoặc 3 gauge nửa vòng
4. Current power (kW) + energy today (kWh)
5. Tool life remaining (%)
6. Machine health score
7. Predicted maintenance due in X days
8. Active alarm count

### B. Khu trái giữa — Sơ đồ máy / one-line / topology
Hiển thị card kiểu sơ đồ khối như ảnh mẫu:
- PLC
- Robot / spindle / tool / sensors / HMI / power meter
- Mỗi node có trạng thái màu
- Mỗi node hiển thị 2–4 thông số chính
- Có đường nối logic giữa các node

Ví dụ cho máy CNC:
- PLC
- HMI
- Spindle
- Axis X/Y/Z
- Tool magazine
- Power meter
- Sensor safety door

Ví dụ cho robot cell:
- PLC
- Robot arm
- End effector
- Conveyor / fixture
- Welding unit / cutter / vision
- Safety gate
- Power meter

### C. Khu phải giữa — Xu hướng theo thời gian
1. **Line chart lớn**: power / energy / spindle load / cycle time theo thời gian
2. **Mini cards** bên cạnh:
   - Δ điện năng so với ca trước
   - Δ cycle time so với chuẩn
   - downtime bất thường trong 24h
   - anomaly score

### D. Hàng dưới cùng
Chia thành 4 nhóm panel:

#### Nhóm 1 — Tham số gia công / process parameters
- Spindle speed
- Feed rate
- Torque
- Tool number
- Tool usage time
- Cutting speed
- Coolant state
- Program recipe

Hiển thị bằng:
- digital card số lớn
- sparkline mini
- horizontal bar / bullet gauge

#### Nhóm 2 — Dao cụ / tool life
- Thermometer chart dọc cho tool wear
- Donut gauge cho % life remaining
- Trend line mòn dao theo thời gian
- Danh sách 5 tool gần hết tuổi thọ

#### Nhóm 3 — Sức khỏe máy / predictive maintenance
- Gauge nửa vòng: Machine Health Score
- Countdown: bảo trì sau X ngày
- Bar chart: runtime / idle / stop / fault
- Risk badges: motor, spindle, vibration, lubrication, temperature

#### Nhóm 4 — Alarm / abnormal stop
- Timeline sự kiện
- Pareto downtime cause
- Table log ngắn 5–10 dòng gần nhất
- Severity badge: Info / Warning / Critical

## 8) Các loại biểu đồ bắt buộc nên dùng
Dùng chart phù hợp thay vì chỉ vẽ line chart đơn giản.

1. **Gauge tròn / nửa vòng**
   - OEE
   - Machine health
   - Spindle load
   - Power factor nếu có

2. **Thermometer chart dọc**
   - Nhiệt độ spindle
   - Nhiệt độ motor
   - Tool wear

3. **Line / area chart**
   - Điện năng theo thời gian
   - Công suất theo thời gian
   - Cycle time trend
   - Spindle speed trend

4. **Donut / ring chart**
   - Availability / Performance / Quality
   - Tỉ lệ điện năng theo máy
   - Tỉ lệ trạng thái RUN/IDLE/STOP

5. **Pareto chart**
   - Nguyên nhân downtime
   - Nguyên nhân alarm

6. **Timeline / event strip**
   - Lịch sử stop / warning / restart

7. **Stacked bar chart**
   - Planned production vs actual
   - Runtime / idle / stop / fault

8. **Heatmap**
   - Downtime theo giờ
   - Alarm density theo ngày

9. **Digital counter style**
   - Part count
   - kWh hôm nay
   - số alarm đang active

## 9) Hành vi realtime
UI phải tạo cảm giác realtime:
- số liệu đổi mỗi 2–5 giây bằng mock stream
- chart cập nhật mượt
- trạng thái machine card có animation pulse nhẹ
- alarm mới trượt từ trên xuống
- cảnh báo critical nhấp nháy vừa phải, không chói mắt quá

## 10) Logic cảnh báo mẫu
Dùng mock rule để hiển thị warning/critical:

### Warning
- Tool life < 25%
- Vibration > 70%
- Temperature > 75°C
- Cycle time chậm hơn chuẩn > 10%
- Power tăng bất thường > 15% so với trung bình 1 giờ

### Critical
- Tool life < 10%
- Temperature > 85°C
- Downtime > 10 phút
- Machine Health < 45
- Alarm severity = critical

## 11) Điều hướng đề xuất
Sidebar trái hoặc top navigation đều được, nhưng giao diện nên ưu tiên kiểu dashboard công nghiệp.

### Menu
- Dashboard
- Machines
- OEE Analytics
- Tool Life
- Maintenance
- Alarms & Downtime
- Energy
- Reports
- Settings

## 12) Trang OEE Analytics (`/oee`)
- OEE tổng theo ngày / tuần / tháng
- OEE theo từng máy
- Breakdown 3 thành phần A/P/Q
- So sánh target vs actual
- Pareto nguyên nhân làm giảm OEE
- Waterfall hoặc stacked bar nếu cần

## 13) Trang Tool Life (`/tool-life`)
- Danh sách tool của các máy có dao cụ
- % tuổi thọ còn lại
- dự đoán còn bao nhiêu part / giờ
- cảnh báo thay dao
- trend mòn dao
- lịch sử thay dao

## 14) Trang Predictive Maintenance (`/maintenance`)
- Machine Health ranking
- countdown tới bảo trì
- risk score theo cụm: motor / spindle / servo / cooling / lubrication
- timeline lịch bảo trì
- card “recommended action”

## 15) Trang Alarm & Downtime (`/alarms`)
- Bảng log sự kiện gần nhất
- Bộ lọc severity / machine / time range
- Timeline trạng thái
- Pareto cause
- Thống kê downtime total, MTBF, MTTR

## 16) Trang Energy (`/energy`)
Trang này nên đẹp và khá giống tinh thần ảnh tham khảo user gửi.

### Bố cục đề xuất
- KPI hôm nay / tháng / năm
- Pareto tiêu thụ điện theo máy
- Donut tỉ lệ tiêu thụ điện
- Sơ đồ một sợi / sơ đồ phân bổ điện đơn giản
- Đồng hồ công suất hiện tại
- Trend chart điện năng ngày hiện tại và 7 ngày gần nhất
- Thống kê theo khu vực / theo máy
- Card hiển thị điện áp, dòng điện, công suất, PF, kWh

## 17) Data model mock tối thiểu
Tạo mock data đủ chi tiết để UI trông thật.

### Machine object
```ts
interface Machine {
  id: string;
  code: string;
  name: string;
  type: 'robot-welding' | 'cnc-milling' | 'cnc-turning' | 'pick-place' | 'cutting-polishing';
  brand: string;
  controller: string;
  plc: string;
  status: 'RUN' | 'IDLE' | 'STOP' | 'FAULT' | 'MAINT';
  mode: 'AUTO' | 'MANUAL' | 'SETUP';
  image: string;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  powerKw: number;
  energyTodayKwh: number;
  energyMonthKwh: number;
  cycleTimeSec: number;
  idealCycleTimeSec: number;
  partCount: number;
  goodCount: number;
  ngCount: number;
  machineHealth: number;
  maintenanceDueDays: number;
  anomalyScore: number;
  activeAlarms: number;
  toolLifeRemainingPct?: number;
  spindleSpeedRpm?: number;
  feedRateMmMin?: number;
  spindleLoadPct?: number;
  vibrationPct?: number;
  temperatureC?: number;
  weldingCurrentA?: number;
  servoLoadPct?: number;
  currentProgram: string;
  area: string;
}
```

### Event object
```ts
interface MachineEvent {
  id: string;
  machineId: string;
  timestamp: string;
  type: 'info' | 'warning' | 'critical' | 'downtime' | 'maintenance';
  title: string;
  message: string;
  durationMin?: number;
  cause?: string;
}
```

## 18) Asset phải dùng từ thư mục `assets`
Dùng ảnh trong folder này làm hình minh họa, thumbnail, banner, hoặc panel nội bộ:

- `assets/ui-reference-user.png` → ảnh tham chiếu bố cục chính
- `assets/moodboard-ui-robot-plc.jpg` → moodboard tổng hợp
- `assets/kuka-robot-line.jpg` → banner robot cell / dashboard hero
- `assets/fanuc-welding-robot.jpg` → máy hàn / robot cell
- `assets/ur16e-cobot-resized.png` → card robot/cobot minh họa
- `assets/teach-pendant-staubli.jpg` → card HMI / teach pendant / operator panel
- `assets/plc-control-panel-wikimedia.png` → card PLC overview
- `assets/plc-cabinet-control-panel.jpg` → card tủ điều khiển
- `assets/siemens-plc.jpg` → card PLC Siemens
- `assets/siemens-hmi-panel.gif` → card HMI
- `assets/cnc-panel-sinumerik.jpg` → card controller / CNC reference
- `assets/cnc-control-panel-mcfh.jpg` → card machine console / operator panel

> Chỉ dùng ảnh để minh họa cho UI demo/mock. Không dùng làm background rối mắt toàn trang.

## 19) Bố cục responsive
### Desktop (ưu tiên)
- Tối ưu cho 1440px, 1600px, 1920px
- Dashboard nhiều panel, giống control center

### Tablet
- Gộp panel theo chiều dọc
- Chart lớn thu nhỏ nhưng vẫn rõ

### Mobile
- Chỉ cần hiển thị các KPI chính, machine cards, line chart, alarm list
- Trang chi tiết máy chuyển thành stack dọc

## 20) Hiệu ứng và animation
- Fade-in card khi load
- KPI counter tăng số mượt
- Glow nhẹ cho machine RUN
- Pulse viền đỏ cho machine FAULT
- Slide-in cho alarm mới
- Hover card có nâng nhẹ, không quá game-like

## 21) Điều không được làm
- Không dùng template admin trắng sáng chung chung
- Không nhồi quá nhiều table khô cứng
- Không dùng màu neon quá chói
- Không dùng ảnh robot làm nền mờ full page gây khó đọc
- Không để biểu đồ thiếu chú thích và đơn vị
- Không dùng lorem ipsum tiếng Anh; label cần là tiếng Việt rõ ràng

## 22) Gợi ý nhãn tiếng Việt nên dùng
- Trạng thái máy
- Chương trình đang chạy
- OEE hiện tại
- Công suất tức thời
- Điện năng hôm nay
- Điện năng tháng
- Cycle time
- Part đạt / Part lỗi
- Tuổi thọ dao còn lại
- Dự đoán bảo trì
- Dừng máy bất thường
- Cảnh báo đang hoạt động
- Xu hướng tiêu thụ điện
- Thống kê theo máy
- Sơ đồ kết nối máy
- Lịch sử sự kiện

## 23) Cấu trúc code gợi ý
```bash
src/
  app/
    dashboard/page.tsx
    machines/page.tsx
    machines/[id]/page.tsx
    oee/page.tsx
    tool-life/page.tsx
    maintenance/page.tsx
    alarms/page.tsx
    energy/page.tsx
    reports/page.tsx
  components/
    layout/
    machine/
    charts/
    cards/
    alarms/
    energy/
    oee/
  lib/
    mock-data.ts
    realtime.ts
    format.ts
    thresholds.ts
  types/
    machine.ts
    event.ts
public/
  assets/
```

## 24) Ưu tiên UI khi code
Thứ tự ưu tiên:
1. Dashboard tổng đẹp và giống hệ công nghiệp thật
2. Trang chi tiết máy thật mạnh, nhiều chart đúng nghiệp vụ
3. OEE / Energy / Tool life / Maintenance rõ ràng
4. Mock realtime update mượt
5. Sau cùng mới tối ưu thêm animation nhỏ

## 25) Kết quả mong muốn
Khi mở web lên, người xem phải có cảm giác:
- đây là hệ thống giám sát sản xuất thật
- có thể dùng cho robot + PLC + CNC + năng lượng
- nhìn rất hiện đại, chuyên nghiệp, dễ demo
- mỗi máy có một màn hình riêng dễ hiểu, gần với ảnh mẫu user đã gửi

## 26) Yêu cầu chốt cho Copilot
Hãy code đúng theo hướng sau:
- **dark futuristic industrial dashboard**
- **5 máy có trang chi tiết riêng**
- **rất nhiều chart phù hợp nghiệp vụ**
- **có OEE, tool life, predictive maintenance, abnormal downtime, energy**
- **layout gần tinh thần ảnh tham khảo**
- **ưu tiên tính rõ ràng và cảm giác điều hành nhà máy**

