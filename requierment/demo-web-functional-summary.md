# UI Review & Improvement Plan for Demo Web

> Mục đích của file này: đánh giá UI hiện tại của bản demo theo góc nhìn **sếp / người duyệt sản phẩm**, sau đó chốt rõ **UI đang ổn đến mức nào**, **điểm nào còn yếu**, và **lần sau cần sửa gì trước**.
>
> File này dùng để Copilot hoặc dev đọc lại trước khi tiếp tục chỉnh sửa, tránh sửa lan man và tránh nâng cấp sai trọng tâm.

---

## 1. Kết luận nhanh kiểu “sếp duyệt”

### 1.1 Nếu tôi là sếp, tôi đánh giá thế nào?

**Kết luận ngắn:** UI này **đủ tốt để demo nội bộ / demo ý tưởng**, nhưng **chưa đủ tốt để demo với khách hàng khó tính** và **chưa đủ chín để gọi là bản pilot nghiêm túc**.

### 1.2 Mức đánh giá hiện tại

- **Demo nội bộ:** đạt
- **Demo cho khách hàng mức cơ bản:** tạm được, nhưng cần polish lại trước
- **Demo bán hàng / pre-sales:** chưa ổn
- **Pilot thực tế / triển khai thử:** chưa ổn
- **Bản production:** chưa đạt

### 1.3 Chấm điểm nhanh

- **Visual / style:** 7/10
- **Cảm giác industrial / futuristic:** 7.5/10
- **Độ rõ ràng thông tin:** 6/10
- **Mức chuyên nghiệp khi nhìn như sản phẩm bán được:** 5.5/10
- **Độ thuyết phục với người làm nhà máy / kỹ thuật:** 6.5/10
- **Độ hoàn thiện UI tổng thể:** 6/10

### 1.4 Tóm tắt 1 câu

**Có nền tốt, đúng hướng, nhưng hiện tại vẫn mang cảm giác “demo dev làm khá nhanh” hơn là “một sản phẩm công nghiệp đã được thiết kế chỉn chu”.**

---

## 2. Nhận xét tổng quan

### 2.1 Điểm tốt hiện tại

UI hiện tại có một số điểm đáng giữ:

1. **Đúng tinh thần industrial dashboard**
   - tone màu tối ổn
   - card kiểu công nghiệp khá hợp
   - nhìn vào không bị giống admin template phổ thông

2. **Có cấu trúc sản phẩm rõ ràng**
   - có sidebar, header, dashboard, machine detail, energy, oee, tools, maintenance, alarms
   - phạm vi chức năng demo tương đối đầy đủ

3. **Trang machine detail là điểm sáng nhất**
   - nhiều panel hơn các trang còn lại
   - có cảm giác đang theo dõi máy thật
   - có modal chart và dữ liệu sống, khá thuyết phục cho demo kỹ thuật

4. **Có mock realtime nên tạo cảm giác hệ thống đang sống**
   - đây là điểm cộng lớn khi demo
   - nếu đứng trước khách, màn hình có chuyển động sẽ thuyết phục hơn màn hình tĩnh

5. **Có tính thực dụng**
   - có acknowledge alarms
   - có confirm maintenance
   - có replace tool
   - có language switch

### 2.2 Điểm chưa ổn tổng thể

Nếu nhìn bằng mắt của người duyệt sản phẩm, UI hiện tại có 5 vấn đề lớn:

1. **Đẹp nhưng chưa đủ “đắt”**
   - giao diện đúng hướng, nhưng chưa tạo cảm giác premium / enterprise
   - còn giống một bản ghép panel hơn là một hệ thống được thiết kế kỹ

2. **Thông tin chưa được phân tầng tốt**
   - nhiều chỗ dữ liệu có nhưng chưa rõ cái nào là quan trọng nhất
   - mắt người xem chưa được dẫn dắt đủ rõ

3. **Dashboard tổng còn yếu**
   - dashboard hiện tại mới ở mức KPI + list
   - chưa đủ wow effect cho một trang landing của hệ thống giám sát nhà máy

4. **Copywriting và độ sạch UI còn làm giảm niềm tin**
   - typo
   - text lỗi encoding/lỗi gõ
   - vài chỗ wording chưa chuyên nghiệp
   - đây là lỗi nhỏ nhưng ảnh hưởng rất mạnh tới cảm giác “sản phẩm có đáng tin không”

5. **Tính nhất quán giữa các trang chưa cao**
   - trang machines chi tiết hơn hẳn các trang khác
   - dashboard, energy, oee, alarms còn mỏng
   - cảm giác hệ thống bị lệch trọng tâm và chưa đồng đều

---

## 3. Nếu là sếp, tôi sẽ nói: phần nào ổn, phần nào chưa ổn

### 3.1 Thứ đang ổn

#### A. Theme màu
- giữ lại
- đúng chất dark industrial
- không cần đổi concept

#### B. Sidebar tổng thể
- ổn về ý tưởng
- có collapse + resize là điểm tốt
- menu đủ rõ

#### C. Machine detail
- là phần nên giữ làm hạt nhân
- nếu phát triển tiếp thì lấy trang này làm chuẩn chất lượng cho các trang khác

#### D. Mock realtime
- nên giữ
- thậm chí nên làm mượt hơn nữa vì đây là vũ khí demo rất mạnh

### 3.2 Thứ chưa ổn

#### A. Dashboard chưa xứng làm “trang mặt tiền”
Hiện tại dashboard chưa tạo được cảm giác:
- trung tâm điều hành xưởng
- nơi sếp/khách nhìn vào 10 giây là thấy hệ thống xịn
- nơi cho thấy giá trị kinh doanh ngay lập tức

#### B. Header chưa đủ thông minh
Hiện tại header:
- chưa phản ánh đúng route đang đứng
- chưa có breadcrumb / context rõ
- chưa có filter có ý nghĩa
- chưa giống một control bar của hệ thống công nghiệp

#### C. Chất lượng text/copy chưa đạt
Chỉ cần vài typo cũng đủ làm giảm mạnh cảm giác chuyên nghiệp, ví dụ:
- logo lỗi ký tự
- text tiếng Việt lỗi
- text energy có typo
- tiêu đề route chưa khớp

#### D. Phân cấp nội dung chưa sắc
Ví dụ:
- KPI nào là quan trọng nhất chưa nổi bật đủ
- cảnh báo critical chưa được đẩy lên ưu tiên số 1 ở dashboard
- machine risk / maintenance risk chưa tạo áp lực thị giác đủ mạnh

#### E. Một số trang còn giống “bản phụ”
Các trang đang còn hơi mỏng:
- `energy`
- `oee`
- `alarms`
- `settings`

Những trang này hiện chưa đủ chiều sâu để tạo cảm giác đây là một platform hoàn chỉnh.

---

## 4. Đánh giá theo từng khu vực UI

### 4.1 Sidebar

#### Điểm ổn
- có resize và collapse
- dark theme ổn
- menu rõ

#### Điểm chưa ổn
- logo đang lỗi ký tự, nhìn rất mất điểm
- icon và typography chưa đủ cao cấp
- active state của menu chưa nổi bật rõ ràng
- chưa cho cảm giác “đây là hệ thống công nghiệp cao cấp”

#### Kết luận
**Sidebar dùng được, nhưng cần polish mạnh về branding và trạng thái active.**

#### Hướng sửa
- thay logo text lỗi bằng logo/wordmark sạch
- làm active menu rõ hơn: nền, border, glow nhẹ
- thêm section group nếu cần: Monitoring / Analytics / System
- phần status online nên tinh gọn và đẹp hơn

---

### 4.2 Header

#### Điểm ổn
- có notification
- có language switch
- có badge critical alert

#### Điểm chưa ổn
- tiêu đề chưa phản ánh đúng trang hiện tại
- chưa có breadcrumb
- chưa có quick filter hữu ích
- chưa có timestamp / ca làm việc / khu vực
- hiện vẫn hơi giống top bar đơn giản, chưa giống command bar của hệ thống vận hành

#### Kết luận
**Header hiện tại đủ dùng, nhưng chưa đủ tầm để làm thanh điều khiển trung tâm.**

#### Hướng sửa
- title phải theo route thật
- thêm subtitle ngữ cảnh, ví dụ khu vực / line / machine đang xem
- thêm đồng hồ realtime
- thêm filter chung: ca làm việc, khu vực, trạng thái
- notification panel nên có cấu trúc rõ hơn: severity, machine, thời gian, action

---

### 4.3 Dashboard `/`

#### Điểm ổn
- có KPI cơ bản
- có machine overview
- có active alarms summary
- đủ để hiểu đây là dashboard tổng

#### Điểm chưa ổn
- chưa tạo ấn tượng mạnh ngay khi mở
- chưa có chart quan trọng để kể câu chuyện vận hành
- chưa có “alarm center” đúng nghĩa
- chưa có visual khu xưởng / line / phân bố máy
- chưa đủ chiều sâu cho người quản lý ra quyết định nhanh

#### Kết luận
**Đây là trang cần nâng cấp mạnh nhất sau phần copy/branding.**

#### Hướng sửa bắt buộc
1. thêm hàng KPI nổi bật hơn, có hierarchy rõ
2. thêm chart chủ lực:
   - energy trend
   - OEE by machine
   - power distribution
   - downtime Pareto
3. thêm block `Top risk / Top issue`
4. thêm machine overview dạng card đẹp hơn, ít cảm giác list thô
5. đưa critical alert lên vị trí nổi bật hơn

#### Mục tiêu sau khi sửa
Người xem mở dashboard phải hiểu trong 5–10 giây:
- xưởng đang ổn hay không
- máy nào có vấn đề
- điện năng đang thế nào
- OEE ra sao
- chỗ nào cần xử lý ngay

---

### 4.4 Machine detail `/machines`

#### Điểm ổn
- là trang mạnh nhất hiện tại
- có nhiều dữ liệu
- có chart realtime
- có machine health, alarms, tool life
- có cảm giác gần với giao diện kỹ thuật

#### Điểm chưa ổn
- vẫn còn hơi dàn trải
- một số panel nhìn chưa “same family”
- chưa có schematic / topology / machine map thật sự
- phần trên cùng chưa đủ đắt để tạo cảm giác HMI cao cấp
- modal metric detail ổn về chức năng nhưng visual còn thô

#### Kết luận
**Đây là nền rất tốt, nhưng cần polish để trở thành trang flagship.**

#### Hướng sửa ưu tiên
1. làm hero strip đầu trang đẹp hơn:
   - machine name
   - status
   - mode
   - OEE
   - power
   - health
   - maintenance due
   - active alarms
2. chuẩn hóa visual của các panel để đồng bộ hơn
3. thêm schematic / topology card
4. cải thiện modal metric detail để bớt giống tool nội bộ, tăng cảm giác enterprise
5. tăng độ rõ của abnormal values bằng màu + icon + threshold

#### Ghi chú quan trọng
Nếu phải chọn 1 trang để đầu tư mạnh nhất, **hãy đầu tư vào machine detail**.

---

### 4.5 Energy `/energy`

#### Điểm ổn
- có KPI
- có donut chart
- có cost analysis
- có list phân bố theo máy

#### Điểm chưa ổn
- còn mỏng
- chưa đủ “energy center”
- chưa có trend sâu theo thời gian
- power quality đang quá đơn giản
- chưa có visual one-line / area / line energy overview

#### Kết luận
**Trang này mới là bản nháp tốt, chưa phải trang thuyết phục với khách.**

#### Hướng sửa
- thêm line chart theo giờ/ngày/7 ngày
- thêm breakdown theo khu vực
- thêm peak / base load insight
- thêm so sánh hôm nay với hôm qua / ca trước
- sửa hết typo và wording trước

---

### 4.6 OEE `/oee`

#### Điểm ổn
- đơn giản, dễ hiểu
- có overall OEE
- có breakdown A/P/Q

#### Điểm chưa ổn
- còn quá ít chiều sâu
- chưa có trend theo thời gian
- chưa có target vs actual đúng nghĩa
- chưa có nguyên nhân làm giảm OEE

#### Kết luận
**Đủ để minh họa OEE, nhưng chưa đủ để gọi là module analytics.**

#### Hướng sửa
- thêm trend theo ngày/tuần/tháng
- thêm target vs actual đẹp hơn
- thêm root cause / Pareto OEE loss
- thêm so sánh giữa máy / line / ca

---

### 4.7 Tools `/tools`

#### Điểm ổn
- logic chia critical / warning / healthy dễ hiểu
- có flow thay dao
- có replacement history

#### Điểm chưa ổn
- visual còn nặng dạng list, chưa đủ trực quan
- thiếu chart wear trend rõ ràng
- thiếu cảm giác `predictive tool management`

#### Kết luận
**Function ổn, nhưng UI cần trực quan hơn để bớt giống bảng cảnh báo thường.**

#### Hướng sửa
- thêm wear trend mini chart cho từng tool quan trọng
- thêm donut / thermometer cho remaining life
- làm card critical nổi bật và “khẩn cấp” hơn
- replacement history nên đẹp và có ngữ cảnh hơn

---

### 4.8 Maintenance `/maintenance`

#### Điểm ổn
- có ranking machine health
- có risk assessment
- có confirm maintenance flow

#### Điểm chưa ổn
- risk visualization còn đơn giản
- chưa tạo cảm giác `predictive maintenance center`
- machine ranking đang đúng chức năng nhưng chưa thật sự đẹp

#### Kết luận
**Nội dung hợp lý, nhưng presentation chưa đủ mạnh.**

#### Hướng sửa
- thêm risk score visualization tốt hơn
- thêm timeline/schedule view
- thêm breakdown risk theo component: motor / spindle / vibration / lubrication / thermal
- làm highlight các máy urgent mạnh hơn

---

### 4.9 Alarms `/alarms`

#### Điểm ổn
- dễ hiểu
- group theo machine ổn
- có severity, cause, duration

#### Điểm chưa ổn
- chưa có filter mạnh
- chưa có timeline rõ
- chưa có Pareto / alarm analysis
- chưa đủ cảm giác một event center thực sự

#### Kết luận
**Đang là log viewer, chưa phải alarm management center.**

#### Hướng sửa
- thêm filter theo severity / machine / time range
- thêm timeline strip
- thêm Pareto cause
- thêm summary MTBF / MTTR / total downtime

---

### 4.10 Settings `/settings`

#### Điểm ổn
- đủ dùng
- có language switch
- có info cơ bản

#### Điểm chưa ổn
- hơi nghèo nội dung
- chưa cần đầu tư nhiều, nhưng nên sạch và gọn hơn

#### Kết luận
**Không phải ưu tiên cao, chỉ cần polish cơ bản.**

---

## 5. Các vấn đề làm giảm cảm giác chuyên nghiệp nhất

Đây là phần rất quan trọng. Nếu là sếp, tôi sẽ yêu cầu sửa ngay vì chúng không khó nhưng làm tụt chất lượng sản phẩm rất mạnh.

### 5.1 Lỗi text / typo / encoding
Các lỗi kiểu này làm sản phẩm trông thiếu kiểm soát:
- logo lỗi ký tự
- text typo ở energy
- chuỗi tiếng Việt lỗi gõ
- title/header chưa đúng ngữ cảnh route

**Kết luận:** phải sửa ngay, không tranh luận.

### 5.2 Thiếu phân cấp thị giác
- critical alert chưa đủ nổi
- KPI quan trọng chưa khác biệt rõ với KPI phụ
- mắt người xem chưa được dẫn đúng hướng

### 5.3 Chưa có câu chuyện kinh doanh rõ trên dashboard
Một sản phẩm tốt không chỉ đẹp, mà còn phải trả lời nhanh:
- máy nào đang rủi ro?
- năng lượng đang vượt ngưỡng không?
- OEE có thấp hơn target không?
- cái gì cần xử lý đầu tiên?

Hiện tại dashboard vẫn chưa trả lời mạnh những câu này.

---

## 6. Business risk nếu giữ UI như hiện tại

Nếu đem bản hiện tại đi demo với khách hàng hoặc sếp lớn hơn, có các rủi ro sau:

1. **Khách thấy “có tiềm năng” nhưng chưa thấy “sẵn sàng mua”**
2. **Người kỹ thuật thấy dữ liệu có, nhưng người ra quyết định thấy chưa đủ rõ**
3. **Lỗi typo/branding làm giảm niềm tin vào chất lượng tổng thể**
4. **Dashboard chưa đủ mạnh để tạo hiệu ứng wow trong 30 giây đầu**
5. **Sự không đồng đều giữa các trang làm sản phẩm trông chưa hoàn thiện**

---

## 7. Thứ tự ưu tiên sửa nếu làm tiếp

### P0 - Phải sửa ngay

#### P0.1 Sửa toàn bộ lỗi text / typo / branding
- sửa logo lỗi ký tự
- sửa toàn bộ typo tiếng Việt / tiếng Anh
- sửa wording chưa chuyên nghiệp
- sửa title/header theo từng route

#### P0.2 Nâng cấp Dashboard thành trang mặt tiền thật sự
- tăng độ mạnh của KPI
- thêm chart chủ lực
- thêm top issues / critical alerts / maintenance risk
- làm machine overview đẹp hơn

#### P0.3 Polish machine detail thành trang flagship
- làm hero strip đầu trang mạnh hơn
- đồng bộ visual panel
- cải thiện abnormal state highlight
- cải thiện modal metric detail

#### P0.4 Tăng tính nhất quán toàn hệ thống
- spacing
- typography scale
- title/subtitle pattern
- card header pattern
- icon usage
- màu trạng thái

---

### P1 - Nên làm ngay sau P0

#### P1.1 Làm lại Header thành command bar đúng nghĩa
- route title đúng
- breadcrumb
- đồng hồ realtime
- filter chung
- quick actions

#### P1.2 Tăng chiều sâu cho `energy`, `oee`, `alarms`
- energy trend
- OEE trend + loss analysis
- alarms timeline + Pareto

#### P1.3 Bổ sung schematic / topology / plant overview
- nhất là cho dashboard và machine detail
- đây là thứ làm hệ thống nhìn “xịn” hơn rất nhiều

---

### P2 - Làm sau để tăng đẳng cấp sản phẩm

#### P2.1 Animation mượt hơn
- transition chart
- live indicator đẹp hơn
- alert animation tinh tế hơn

#### P2.2 Cá nhân hóa theo role
- góc nhìn manager
- góc nhìn maintenance
- góc nhìn production engineer

#### P2.3 Export / reporting / compare mode
- export PDF/Excel
- compare shift/day/week
- snapshot trước/sau maintenance

---

## 8. Chỉ đạo cụ thể cho lần sửa tới

Nếu giao việc cho dev/Copilot, tôi sẽ yêu cầu theo thứ tự này:

### Sprint 1 - Sửa cảm giác “demo chưa sạch”
1. sửa toàn bộ typo / text lỗi / branding lỗi
2. sửa header theo route
3. sửa active state sidebar
4. chuẩn hóa title / subtitle / card header / spacing

### Sprint 2 - Nâng dashboard
1. thêm chart quan trọng
2. thêm alarm center rõ hơn
3. thêm maintenance risk block
4. làm machine overview đẹp hơn, ít list-thô hơn

### Sprint 3 - Nâng machine detail
1. làm top strip đẹp hơn
2. thêm schematic / topology panel
3. polish modal metric
4. làm nổi abnormal / threshold / recommended action

### Sprint 4 - Nâng các module còn lại
1. energy sâu hơn
2. oee sâu hơn
3. alarms sâu hơn
4. tools và maintenance trực quan hơn

---

## 9. Những thứ phải giữ nguyên, không được phá

Trong lần sửa tiếp theo, dù nâng cấp thế nào cũng phải giữ:

1. **Tinh thần dark industrial**
2. **Mock realtime sống động**
3. **5 máy/cell mẫu hiện tại**
4. **Machine detail là trung tâm của hệ thống**
5. **Flow business hiện có**
   - acknowledge alarm
   - confirm maintenance
   - replace tool
   - language switch
6. **Tông sản phẩm hướng nhà máy / IIoT / monitoring**, không bị trôi thành web admin chung chung

---

## 10. Mục tiêu chất lượng cho bản tiếp theo

Bản sửa tiếp theo phải đạt cảm giác sau:

### Khi mở Dashboard
Người xem phải nghĩ:
> Đây là một trung tâm giám sát nhà máy thật, không phải bài demo ghép card.

### Khi mở Machine Detail
Người xem phải nghĩ:
> Đây là màn hình mà kỹ thuật / quản lý vận hành có thể dùng để theo dõi máy.

### Khi nhìn tổng thể sản phẩm
Người xem phải nghĩ:
> Sản phẩm này có thể phát triển thành hàng thương mại được.

---

## 11. Phụ lục bắt buộc: UI phải bám dữ liệu PLC / robot thực tế

Phần này được thêm vào để lần sau Copilot hoặc dev **không dựng UI theo kiểu mock đẹp nhưng lệch nghiệp vụ OT**.

### 11.1 Kết luận cốt lõi

UI hiện tại **không sai về mặt demo**, nhưng **chưa bám sát cách dữ liệu công nghiệp thật đi từ PLC / robot / gateway ra backend rồi mới lên web**.

Hiện tại demo đang có xu hướng trộn 3 lớp dữ liệu vào cùng một tầng hiển thị:

1. **Raw telemetry**
   - tín hiệu gốc PLC / robot / CNC thật sự trả ra
   - ví dụ: run, stop, fault, ready, mode, spindle rpm, power, temperature, vibration

2. **Computed KPI**
   - số do backend tính từ raw data
   - ví dụ: OEE, availability, performance, quality, health score, MTBF, MTTR

3. **Prediction / recommendation**
   - số do rule engine hoặc model suy luận
   - ví dụ: remaining tool life, maintenance risk, predicted failure window, recommended action

**Nguyên tắc bắt buộc cho bản sau:**
- không được hiển thị prediction như thể đó là số PLC trả trực tiếp
- không được hiển thị OEE như thể robot / PLC native trả sẵn
- mỗi màn hình phải cho thấy rõ: cái gì là tín hiệu thật, cái gì là KPI tính toán, cái gì là cảnh báo / dự đoán

### 11.2 Copilot phải hiểu đúng luồng dữ liệu công nghiệp

Luồng đúng trong thực tế thường là:

`PLC / Robot Controller / CNC Controller -> Gateway / OPC UA / Modbus / MQTT / SCADA -> Backend -> UI`

Điều này có nghĩa là:
- PLC thường chỉ có **tag / register / variable / bit status / counter**
- robot controller thường trả **status, mode, diagnostics, program state, override, IO / handshake**
- CNC mới là nơi hay có **spindle, feed, cutting speed, tool number, load, coolant, machining parameters**
- backend mới là nơi tính OEE, risk score, tool life prediction, maintenance recommendation

### 11.3 Không được dùng một schema chung cho mọi loại máy

Bản sau phải chia máy thành ít nhất 3 loại:

#### A. Robot-only cell
Ví dụ: robot KUKA, Leantec, robot pick-place, robot welding, palletizing

Dữ liệu UI nên ưu tiên:
- machine / robot state
- auto / manual / teach
- ready / busy / fault
- program name
- override percent
- servo on
- emergency stop
- safety interlock
- home position / safe position
- gripper / vacuum / clamp status
- handshake với station hoặc máy chính
- cycle start / cycle complete
- energy consumption
- alarm / diagnostic

Không nên ép robot-only cell phải hiển thị nặng các chỉ số kiểu CNC như:
- spindle speed
- cutting speed
- depth of cut
- feed per tooth
- material removal rate

#### B. CNC / machining machine
Ví dụ: máy phay CNC, tiện CNC, laser cutting, grinding

Dữ liệu UI nên ưu tiên:
- spindle speed
- feed rate
- cutting speed
- depth of cut
- width of cut
- spindle load
- axis load
- coolant
- lubrication
- tool number
- tool usage time
- part count
- reject count
- energy
- vibration / thermal / bearing condition

#### C. Robot + CNC / robot tending cell
Ví dụ: robot KUKA hoặc Leantec gắp phôi cho CNC

UI phải tách 2 vùng dữ liệu:
- **Robot zone**: mode, ready, gripper, program, handshake, alarm, servo, axis status
- **Machine zone**: spindle, feed, tool, cycle time, production output, machining parameters

Nếu là cell hỗn hợp, không được trộn lẫn toàn bộ dữ liệu vào một card chung thiếu ngữ cảnh.

### 11.4 KUKA / Leantec / PLC thực tế thường trả được gì

Để bám thực tế, Copilot phải hiểu rằng robot / PLC thường trả tốt các nhóm tín hiệu sau:

#### Nhóm 1 - trạng thái vận hành
- connected / disconnected
- running / idle / stopped / fault / maintenance
- auto / manual / teach / jog
- cycle running
- ready / busy
- program name
- recipe / job
- emergency stop
- safety door / interlock

#### Nhóm 2 - đếm sản lượng và chu kỳ
- total count
- good count
- reject count
- rework count
- cycle start
- cycle complete
- actual cycle time
- target cycle time

#### Nhóm 3 - điện năng và điều kiện máy
- voltage
- current
- active power
- kWh
- power factor
- temperature
- vibration
- pressure
- servo load / motor current
- runtime hours

#### Nhóm 4 - alarm / event / reason
- alarm active
- alarm code
- alarm severity
- message
- acknowledged
- stop reason
- duration
- planned stop / unplanned stop

#### Nhóm 5 - robot / cell specific
- servo on
- override
- home position
- tool / gripper status
- vacuum on
- clamp open / close
- tray ready
- station ready
- handshake bits

#### Nhóm 6 - CNC / machining specific
- spindle rpm
- feed rate
- cutting speed
- depth of cut
- width of cut
- tool number
- spindle load
- coolant on
- tool change count
- axis positions / axis load

### 11.5 Điều bắt buộc: mỗi màn hình phải biết rõ nó đang hiển thị lớp dữ liệu nào

Trên UI, mỗi module phải tách rõ:

#### A. Observed / realtime
Dữ liệu đo trực tiếp hoặc đọc trực tiếp từ PLC / robot / CNC

Ví dụ label nên dùng:
- Realtime signals
- Live machine state
- Current process values
- Raw telemetry

#### B. Calculated
Dữ liệu backend tính

Ví dụ label nên dùng:
- Computed KPI
- OEE metrics
- Derived indicators

#### C. Predicted / recommended
Dữ liệu rule engine / ML / prediction

Ví dụ label nên dùng:
- Predicted remaining life
- Maintenance recommendation
- Risk forecast
- Suggested action

Nếu không tách 3 lớp này, UI sẽ đẹp nhưng sai logic hệ thống công nghiệp.

---

## 12. Phân tích sâu 5 chức năng chính và UI bắt buộc phải có

### 12.1 Giám sát hiệu quả sản xuất (OEE) theo thời gian thực

#### Điều phải hiểu đúng
PLC / robot thường **không trả trực tiếp OEE**. Chúng thường chỉ trả các tín hiệu nền để backend tính OEE.

#### Raw data cần có
- machine state
- run / idle / stop / fault
- cycle running
- cycle complete
- actual cycle time
- ideal cycle time
- total count
- good count
- reject count
- stop duration
- stop reason
- setup time
- micro stop
- work order / recipe / shift

#### KPI backend phải tính
- availability
- performance
- quality
- OEE
- target vs actual
- output vs plan

#### UI bắt buộc phải có
1. **OEE hero card**
   - OEE tổng
   - availability
   - performance
   - quality
   - target OEE
   - delta với target

2. **Downtime timeline**
   - chạy / dừng theo thời gian
   - hiển thị stop reason theo màu

3. **Pareto loss chart**
   - nguyên nhân mất OEE lớn nhất
   - top downtime causes

4. **Shift / work order context**
   - ca sản xuất
   - lệnh sản xuất
   - recipe / job

5. **Output panel**
   - actual output
   - target output
   - good / reject

#### Lỗi đang dễ gặp ở demo
- chỉ hiển thị một con số OEE mà thiếu nguyên nhân
- không phân biệt OEE là KPI backend tính
- không cho thấy downtime theo reason

### 12.2 Thu thập tham số gia công và dữ liệu cắt gọt

#### Điều phải hiểu đúng
Các tham số kiểu spindle / feed / cutting speed là **nhóm dữ liệu phù hợp với CNC / machining machine**, không phải mặc định áp cho mọi robot KUKA / Leantec.

#### Nếu là robot-only
UI nên hiển thị:
- mode
- ready / busy
- program
- servo on
- override
- gripper / vacuum / clamp
- station ready
- tray / pallet status
- handshake IO
- energy
- alarm

#### Nếu là CNC / machining
UI nên hiển thị:
- spindle speed
- feed rate
- cutting speed
- depth of cut
- width of cut
- spindle load
- axis load
- coolant
- lubrication
- tool number
- tool in use
- block / program

#### Nếu là robot + CNC cell
UI bắt buộc chia 2 panel:
- **Robot operations panel**
- **Machining process panel**

#### UI bắt buộc phải có
1. **Process parameter board**
2. **Realtime trend chart** cho spindle / load / feed / power
3. **Threshold indicator**
4. **Program / recipe / job info**
5. **Machine type aware layout**

#### Lỗi đang dễ gặp ở demo
- dùng một layout chung cho cả robot và CNC
- nhồi các chỉ số cắt gọt vào robot-only machine
- không tách panel robot với panel máy gia công

### 12.3 Dự đoán tuổi thọ dao cụ và cảnh báo

#### Điều phải hiểu đúng
PLC / CNC thường trả các số liệu quan sát được. **Tuổi thọ còn lại** thường là số do backend / model suy ra, không phải tín hiệu native.

#### Raw data nên có
- tool number
- tool id / tool type
- tool in use
- usage time
- cutting time
- cycle count
- spindle load
- vibration
- temperature
- tool change count
- last replacement time

#### Prediction data nên có
- remaining life percent
- remaining cycles
- estimated remaining hours
- wear state
- risk level
- confidence
- recommendation

#### UI bắt buộc phải có
1. **Tool status card**
   - tool number
   - wear state
   - remaining life
   - last changed

2. **Observed vs predicted section**
   - observed signals
   - predicted life

3. **Thermometer / radial gauge / donut**
   - thể hiện remaining life

4. **Wear trend**
   - usage time
   - load
   - vibration
   - nhiệt độ theo thời gian

5. **Action panel**
   - replace soon
   - inspect tool
   - reduce cutting parameter

#### Ghi chú quan trọng
Nếu máy là robot welding / gripper cell, “tool” có thể là:
- welding tip
- nozzle
- gripper pad
- suction cup
- EOAT consumables

Không được ép mọi máy đều có “dao cắt”.

### 12.4 Dự đoán bảo trì máy và nhắc nhở

#### Điều phải hiểu đúng
Maintenance prediction không chỉ là “còn bao nhiêu ngày”. Với máy công nghiệp thật, nó thường dựa vào giờ chạy, tải, nhiệt độ, rung, dầu mỡ, pin encoder, lubrication cycle, số lần start / stop, fault history.

#### Raw data nên có
- runtime hours
- servo-on hours
- spindle hours
- start / stop count
- motor current
- servo load
- vibration
- temperature
- lubrication status
- coolant level
- battery low
- oil / filter / grease due
- recent faults

#### Prediction / planning data nên có
- health score
- maintenance risk level
- next maintenance due
- remaining hours to service
- recommended maintenance action
- component risk breakdown

#### UI bắt buộc phải có
1. **Health summary card**
   - health score
   - risk level
   - due soon / overdue

2. **Component breakdown**
   - motor
   - spindle
   - vibration
   - lubrication
   - electrical
   - thermal

3. **Schedule / calendar / timeline**
   - lịch bảo trì sắp tới
   - việc quá hạn

4. **Observed vs recommended**
   - current condition
   - recommended action

5. **Technician action flow**
   - acknowledge
   - assign
   - confirm done

#### Lỗi đang dễ gặp ở demo
- chỉ hiển thị `maintenanceDueDays`
- thiếu runtime, vibration, temperature, battery, lubrication
- thiếu breakdown theo component

### 12.5 Cảnh báo dừng máy bất thường theo thời gian

#### Điều phải hiểu đúng
Muốn làm đúng module này, UI phải dựa trên **event model có thời điểm bắt đầu, kết thúc, duration, reason, severity, ack state**. Không đủ nếu chỉ có vài counter cảnh báo tổng.

#### Raw / event data nên có
- event id
- machine id
- event type
- severity
- code
- message
- start time
- end time
- duration
- acknowledged
- ack by
- planned / unplanned
- micro stop / fault / safety / wait material / maintenance
- machine state before / after

#### UI bắt buộc phải có
1. **Live alarm strip**
2. **Alarm table có filter mạnh**
3. **Downtime timeline**
4. **Pareto stop reasons**
5. **MTBF / MTTR / total downtime**
6. **Critical action panel**

#### Nhóm reason nên có
- safety
- emergency stop
- door open
- robot fault
- PLC communication loss
- material shortage
- operator wait
- tool change
- maintenance stop
- overload
- over temperature

#### Lỗi đang dễ gặp ở demo
- đang giống log viewer hơn là event center
- thiếu start / end / duration / reason model
- thiếu distinction giữa planned stop và abnormal stop

---

## 13. Bảng quy chiếu: UI nào dùng cho loại máy nào

### 13.1 Với robot KUKA / Leantec / pick-place / welding

UI phải ưu tiên:
- robot status
- mode
- override
- program
- servo on
- home / safe position
- gripper / clamp / vacuum
- station ready
- tray / pallet ready
- cycle state
- alarms
- energy
- maintenance health

UI không nên lấy machining panel làm trung tâm.

### 13.2 Với CNC / machining machine

UI phải ưu tiên:
- spindle
- feed
- cutting speed
- load
- tool
- coolant
- quality
- OEE
- downtime
- energy
- predictive maintenance

### 13.3 Với robot tending CNC

UI phải có layout 2 cột hoặc 2 tab:
- tab / cột **Robot Cell**
- tab / cột **Machine Process**

Và một vùng thứ ba để hiển thị:
- cell OEE
- production count
- stop reason
- energy
- maintenance alerts

---

## 14. Chỉ đạo kỹ thuật cho Copilot ở lần sửa tới

### 14.1 Bắt buộc tách schema dữ liệu thành 3 lớp

Mỗi object frontend nên có source rõ ràng:

- `rawTelemetry`
- `computedMetrics`
- `predictions`

Ví dụ:

```ts
type MachineUiData = {
  rawTelemetry: {
    state: string
    mode: string
    powerKw?: number
    temperatureC?: number
    vibration?: number
    spindleRpm?: number
    feedRate?: number
    toolNumber?: number
  }
  computedMetrics: {
    oee?: number
    availability?: number
    performance?: number
    quality?: number
    healthScore?: number
    mtbf?: number
    mttr?: number
  }
  predictions: {
    remainingToolLifePct?: number
    remainingMaintenanceHours?: number
    maintenanceRisk?: 'low' | 'medium' | 'high'
    predictedFailureWindow?: string
    recommendation?: string
  }
}
```

### 14.2 Bắt buộc có machine type aware rendering

Frontend phải biết ít nhất:
- `robot_only`
- `cnc_machine`
- `robot_cnc_cell`

Không được render cùng một bộ widget cho mọi máy.

### 14.3 Widget gợi ý bắt buộc theo chức năng

#### OEE
- stacked progress / segmented bar
- line chart theo thời gian
- downtime timeline
- Pareto bar chart

#### Process / machining
- radial gauge
- sparkline
- line trend
- threshold badge
- live parameter table

#### Tool life
- thermometer
- donut gauge
- wear trend line
- remaining life badge

#### Maintenance
- health gauge
- risk heatmap
- due-soon timeline
- component breakdown bar

#### Alarms / stops
- event timeline
- severity counters
- MTBF / MTTR cards
- root cause Pareto

### 14.4 Màu và ngôn ngữ trạng thái phải nhất quán

Bắt buộc thống nhất mapping màu:
- Running / Normal = xanh lá
- Idle / Waiting = xanh dương hoặc xám xanh
- Warning = vàng
- Fault / Critical / E-Stop = đỏ
- Maintenance due = cam
- Offline = xám đậm

Không được để mỗi trang dùng một logic màu khác nhau.

---

## 15. Ưu tiên sửa mới được thêm vào roadmap

Ngoài các ưu tiên P0, P1, P2 ở trên, bổ sung thêm các việc sau:

### P0.5 - Chuẩn hóa schema UI theo dữ liệu công nghiệp thật
- tách raw telemetry / computed metrics / predictions
- tách machine types
- bỏ tư duy một layout chung cho mọi máy

### P1.4 - Làm lại machine detail theo từng loại máy
- robot-only detail
- CNC detail
- robot + CNC cell detail

### P1.5 - Làm OEE và alarms theo event / reason model
- có start / end / duration / reason / severity / ack
- có planned stop vs abnormal stop

### P1.6 - Làm tools và maintenance theo observed vs predicted
- observed signals
- predicted life / risk
- recommendation

---

## 16. Prompt nâng cấp dùng cho Copilot từ lần sau

> Hãy đọc file này không chỉ như một UI review, mà còn như một **industrial data modeling guide cho frontend**. Khi sửa giao diện, phải bám theo logic dữ liệu thật của PLC / robot / CNC. Tách rõ `rawTelemetry`, `computedMetrics`, `predictions`. Không dùng một layout chung cho mọi máy. Bắt buộc phân biệt `robot_only`, `cnc_machine`, `robot_cnc_cell`. OEE phải dựa trên availability / performance / quality và downtime reason model. Tool life và maintenance phải tách observed data với predicted recommendation. Alarms phải có event timeline, duration, reason, severity, ack state. Giữ dark industrial style, mock realtime, 5 máy mẫu, machine detail là trung tâm, nhưng lần sửa sau phải đưa hệ thống tiến gần mô hình OT / IIoT thực tế hơn là chỉ đẹp ở mức demo.

---

## 17. Prompt dùng cho Copilot ở lần sửa tới

> Hãy đọc file `requierment/docs/demo-web-functional-summary.md` như một **UI review + improvement plan**. Không chỉ bám chức năng hiện tại, mà phải sửa đúng các điểm yếu đã nêu theo thứ tự ưu tiên P0 -> P1 -> P2. Mục tiêu là biến bản demo hiện tại từ mức “demo nội bộ ổn” thành mức “demo khách hàng thấy chuyên nghiệp”. Giữ nguyên tinh thần dark industrial, 5 máy mẫu, mock realtime, machine detail là trung tâm, và các flow business hiện có. Ưu tiên sửa sạch text/branding, nâng dashboard, polish machine detail, và tăng tính nhất quán toàn hệ thống trước khi thêm tính năng mới.

---

## 18. Kết luận cuối cùng

Nếu hỏi thẳng:

### UI này ổn chưa?
**Chưa ổn nếu nhìn theo tiêu chuẩn sản phẩm đem đi thuyết phục khách hàng.**

### Có đáng bỏ đi làm lại từ đầu không?
**Không.** Nền hiện tại tốt, hướng đúng, chỉ là cần polish và sắp xếp lại trọng tâm.

### Có nên sửa tiếp trên nền hiện tại không?
**Có. Rất nên.**

### Sửa gì đầu tiên?
1. sạch text / branding / title
2. nâng dashboard
3. polish machine detail
4. làm đồng bộ toàn hệ thống

> Tóm lại: **không phải UI tệ, nhưng chưa đạt level “đem đi bán”**. Nên xem đây là một bản demo có nền tốt, cần được nâng cấp có chiến lược chứ không vá lẻ tẻ.