'use client';

import { useState, useEffect, Suspense, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMachineStore } from '@/lib/store';
import { formatNumber, formatDateTime, getHealthScore } from '@/lib/utils';
import { Thermometer, Zap, Activity, Clock, Cpu, BarChart3, TrendingUp, Package, AlertTriangle, X } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import enMessages from '@/locales/en.json';
import viMessages from '@/locales/vi.json';
import { TimeRangeSelector, TimeRange } from '@/components/TimeRangeSelector';
import { getTimeRangeConfig } from '@/lib/time-range-config';
import { useMachinesData } from '@/hooks/useMachinesData';
import { useAlarmsData } from '@/hooks/useAlarmsData';
import { formatMachineCategory, formatMachineMode, formatMachineType, formatStopReasonLabel } from '@/lib/machine-presentation';
import { useRealtimeStream } from '@/hooks/useRealtimeStream';
import { mapApiAlarmToUi } from '@/lib/mappers/alarm.mapper';
import { machinesApi } from '@/lib/api/machines';

function MachineDetailContent() {
  const searchParams = useSearchParams();
  const machineId = searchParams.get('id');
  const { selectedLanguage } = useMachineStore();
  const { machines, loading, error, usingMock, applyMachinePatch, imageOverrides, saveMachineImage, resetMachineImage } = useMachinesData();
  const { events, loading: alarmsLoading, error: alarmsError, usingMock: alarmsUsingMock, upsertEvent, acknowledgeMany } = useAlarmsData();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialMachine = machines.find(m => m.id === machineId) || machines[0];
  const [selectedMachineId, setSelectedMachineId] = useState(initialMachine?.id || '');
  const [timeRange, setTimeRange] = useState<TimeRange>('1h');
  const [metricRange, setMetricRange] = useState<TimeRange>('1h');
  
  useEffect(() => {
    if (machineId) {
      const found = machines.find(m => m.id === machineId);
      if (found) setSelectedMachineId(found.id);
    } else if (!selectedMachineId && machines.length > 0) {
      setSelectedMachineId(machines[0].id);
    }
  }, [machineId, machines, selectedMachineId]);

  const selectedMachine = machines.find(m => m.id === selectedMachineId) || machines[0];
  const locale = selectedLanguage === 'en' ? 'en' : 'vi';

  if (!selectedMachine) {
    return (
      <div className="card-industrial p-6 text-sm text-industrial-text-secondary">
        {selectedLanguage === 'en' ? 'No machine data available.' : 'Khong co du lieu may de hien thi.'}
      </div>
    );
  }
  const messages = selectedLanguage === 'en' ? enMessages : viMessages;
  const getStatusLabel = (status: string) => {
    if (status === 'RUN') return messages.machine.running;
    if (status === 'FAULT') return messages.machine.fault;
    if (status === 'IDLE') return messages.machine.idle;
    if (status === 'STOP') return messages.machine.stopped;
    if (status === 'MAINT') return messages.machine.maintenance;
    return status;
  };

  const machineEvents = events.filter((e) => e.machineId === selectedMachine.id).slice(0, 5);
  const currentImageOverride = imageOverrides[selectedMachine.id];
  const machineDetailMessages = (messages.machineDetail as any);

  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showAlarmsModal, setShowAlarmsModal] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImageName, setPendingImageName] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const [imageMessage, setImageMessage] = useState<string | null>(null);
  const [isSavingImage, setIsSavingImage] = useState(false);

  const handleRealtimeEvent = useCallback(
    (event: { topic?: string; data?: unknown; machineId?: string }) => {
      const payload = (event.data && typeof event.data === 'object' ? event.data : {}) as Record<string, unknown>;
      const resolvedMachineId =
        event.machineId ||
        (typeof payload.machineId === 'string' ? payload.machineId : undefined) ||
        selectedMachineId;

      if (!resolvedMachineId) return;

      if ((event.topic === 'telemetry' || event.topic === 'connection') && resolvedMachineId) {
        applyMachinePatch(resolvedMachineId, payload as never);
      }

      if (event.topic === 'alarm' || 'severity' in payload || 'title' in payload) {
        upsertEvent(mapApiAlarmToUi({ ...payload, machineId: resolvedMachineId }));
      }
    },
    [applyMachinePatch, selectedMachineId, upsertEvent],
  );

  const realtime = useRealtimeStream({
    enabled: Boolean(selectedMachineId) && (!usingMock || !alarmsUsingMock),
    machineId: selectedMachineId || undefined,
    topics: ['telemetry', 'alarm', 'connection'],
    onEvent: handleRealtimeEvent,
  });

  useEffect(() => {
    setPendingImage(null);
    setPendingImageName('');
    setImageError(null);
    setImageMessage(null);
  }, [selectedMachineId]);

  const handleChooseImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';

      if (!file) return;

      const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const maxSizeBytes = 4 * 1024 * 1024;

      if (!acceptedTypes.includes(file.type)) {
        setImageError(machineDetailMessages.imageInvalidType || (selectedLanguage === 'en' ? 'Only JPG, PNG or WebP files are supported.' : 'Chi ho tro tep JPG, PNG hoac WebP.'));
        setImageMessage(null);
        return;
      }

      if (file.size > maxSizeBytes) {
        setImageError(machineDetailMessages.imageTooLarge || (selectedLanguage === 'en' ? 'Image size must not exceed 4 MB.' : 'Dung luong anh khong duoc vuot qua 4 MB.'));
        setImageMessage(null);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPendingImage(reader.result);
          setPendingImageName(file.name);
          setImageError(null);
          setImageMessage(machineDetailMessages.imagePreviewReady || (selectedLanguage === 'en' ? 'Preview is ready. Save to apply this image on the UI.' : 'Anh xem truoc da san sang. Bam luu de ap dung tren giao dien.'));
        }
      };
      reader.onerror = () => {
        setImageError(machineDetailMessages.imageReadFailed || (selectedLanguage === 'en' ? 'Could not read this image file.' : 'Khong doc duoc tep anh nay.'));
      };
      reader.readAsDataURL(file);
    },
    [machineDetailMessages.imageInvalidType, machineDetailMessages.imagePreviewReady, machineDetailMessages.imageReadFailed, machineDetailMessages.imageTooLarge, selectedLanguage],
  );

  const handleSaveImage = useCallback(async () => {
    if (!pendingImage) {
      setImageError(machineDetailMessages.imageNoPending || (selectedLanguage === 'en' ? 'Please choose an image before saving.' : 'Vui long chon anh truoc khi luu.'));
      return;
    }

    setIsSavingImage(true);
    setImageError(null);
    try {
      await saveMachineImage(selectedMachine.id, pendingImage, pendingImageName || undefined);
      setImageMessage(machineDetailMessages.imageSavedLocal || (selectedLanguage === 'en' ? 'Image has been saved locally on this browser.' : 'Anh da duoc luu cuc bo tren trinh duyet nay.'));
      setPendingImage(null);
      setPendingImageName('');
    } catch {
      setImageError(machineDetailMessages.imageSaveFailed || (selectedLanguage === 'en' ? 'Could not save the image.' : 'Khong luu duoc anh.'));
    } finally {
      setIsSavingImage(false);
    }
  }, [machineDetailMessages.imageNoPending, machineDetailMessages.imageSaveFailed, machineDetailMessages.imageSavedLocal, pendingImage, pendingImageName, saveMachineImage, selectedLanguage, selectedMachine.id]);

  const handleResetImage = useCallback(async () => {
    setIsSavingImage(true);
    setImageError(null);
    try {
      await resetMachineImage(selectedMachine.id);
      setPendingImage(null);
      setPendingImageName('');
      setImageMessage(machineDetailMessages.imageResetDone || (selectedLanguage === 'en' ? 'Restored the default image for this machine.' : 'Da khoi phuc anh mac dinh cho may nay.'));
    } catch {
      setImageError(machineDetailMessages.imageResetFailed || (selectedLanguage === 'en' ? 'Could not restore the default image.' : 'Khong khoi phuc duoc anh mac dinh.'));
    } finally {
      setIsSavingImage(false);
    }
  }, [machineDetailMessages.imageResetDone, machineDetailMessages.imageResetFailed, resetMachineImage, selectedLanguage, selectedMachine.id]);

  const getRangeQuery = useCallback((range: TimeRange) => {
    const totalMinutes = getTimeRangeConfig(range).totalMinutes;
    const to = new Date();
    const from = new Date(to.getTime() - totalMinutes * 60 * 1000);

    const intervalMap: Record<TimeRange, 'raw' | '1m' | '5m' | '15m' | '30m' | '1h' | '6h' | '12h' | '1d'> = {
      '60s': 'raw',
      '1h': '5m',
      '1d': '1h',
      '1w': '6h',
      '1m': '1d',
    };

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      interval: intervalMap[range],
      aggregation: (intervalMap[range] === 'raw' ? 'last' : 'avg') as 'avg' | 'last',
      pointCount: getTimeRangeConfig(range).pointCount,
      totalMinutes,
    };
  }, []);

  const buildFallbackHistory = useCallback((range: TimeRange) => {
    const config = getTimeRangeConfig(range);
    return Array.from({ length: config.pointCount }).map((_, index) => ({
      timestamp: new Date(Date.now() - (config.pointCount - 1 - index) * ((config.totalMinutes * 60 * 1000) / Math.max(1, config.pointCount - 1))).toISOString(),
      oee: selectedMachine.oee,
      availability: selectedMachine.availability,
      performance: selectedMachine.performance,
      quality: selectedMachine.quality,
      powerKw: selectedMachine.powerKw,
      temperatureC: selectedMachine.temperatureC || 0,
      vibrationPct: selectedMachine.vibrationPct || 0,
      spindleSpeedRpm: selectedMachine.spindleSpeedRpm || 0,
      feedRateMmMin: selectedMachine.feedRateMmMin || 0,
      cuttingSpeedMMin: selectedMachine.cuttingSpeedMMin,
      depthOfCutMm: selectedMachine.depthOfCutMm,
      feedPerToothMm: selectedMachine.feedPerToothMm,
      widthOfCutMm: selectedMachine.widthOfCutMm,
      materialRemovalRateCm3Min: selectedMachine.materialRemovalRateCm3Min,
      cycleTimeSec: selectedMachine.cycleTimeSec,
    }));
  }, [selectedMachine]);

  useEffect(() => {
    if (!selectedMachineId || usingMock) {
      setHistory(buildFallbackHistory(timeRange));
      return;
    }

    const historyRange = getTimeRangeConfig(timeRange).totalMinutes >= getTimeRangeConfig(metricRange).totalMinutes ? timeRange : metricRange;
    const query = getRangeQuery(historyRange);
    let isCancelled = false;

    const loadHistory = async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const points = await machinesApi.getMachineHistory(selectedMachineId, {
          from: query.from,
          to: query.to,
          interval: query.interval,
          aggregation: query.aggregation,
        });

        if (isCancelled) return;

        if (!points || points.length === 0) {
          setHistory(buildFallbackHistory(historyRange));
          return;
        }

        setHistory(
          points.map((point) => ({
            timestamp: String(point.timestamp || point.ts || new Date().toISOString()),
            oee: Number(point.oee ?? selectedMachine.oee),
            availability: Number(point.availability ?? selectedMachine.availability),
            performance: Number(point.performance ?? selectedMachine.performance),
            quality: Number(point.quality ?? selectedMachine.quality),
            powerKw: Number(point.powerKw ?? selectedMachine.powerKw),
            temperatureC: Number(point.temperatureC ?? selectedMachine.temperatureC ?? 0),
            vibrationPct: Number(point.vibrationPct ?? selectedMachine.vibrationPct ?? 0),
            spindleSpeedRpm: Number(point.spindleRpm ?? selectedMachine.spindleSpeedRpm ?? 0),
            feedRateMmMin: Number(point.feedRateMmMin ?? selectedMachine.feedRateMmMin ?? 0),
            cuttingSpeedMMin: selectedMachine.cuttingSpeedMMin,
            depthOfCutMm: selectedMachine.depthOfCutMm,
            feedPerToothMm: selectedMachine.feedPerToothMm,
            widthOfCutMm: selectedMachine.widthOfCutMm,
            materialRemovalRateCm3Min: selectedMachine.materialRemovalRateCm3Min,
            cycleTimeSec: Number(point.cycleTimeSec ?? selectedMachine.cycleTimeSec),
          })),
        );
      } catch (historyLoadError) {
        if (isCancelled) return;
        setHistoryError(historyLoadError instanceof Error ? historyLoadError.message : 'Khong tai duoc lich su telemetry');
        setHistory(buildFallbackHistory(historyRange));
      } finally {
        if (!isCancelled) {
          setHistoryLoading(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [selectedMachineId, timeRange, metricRange, usingMock, getRangeQuery, buildFallbackHistory]);

  useEffect(() => {
     setHistory(prev => {
        if (prev.length === 0) return prev;
        const now = new Date().toISOString();
        const last = prev[prev.length - 1];
        if (new Date(now).getTime() - new Date(last.timestamp).getTime() < 1000) return prev;
        
        const newPoint = {
           timestamp: now,
           oee: selectedMachine.oee,
           availability: selectedMachine.availability,
           performance: selectedMachine.performance,
           quality: selectedMachine.quality,
           powerKw: selectedMachine.powerKw,
           temperatureC: selectedMachine.temperatureC || 0,
           vibrationPct: selectedMachine.vibrationPct || 0,
           spindleSpeedRpm: selectedMachine.spindleSpeedRpm || 0,
           feedRateMmMin: selectedMachine.feedRateMmMin || 0,
           cuttingSpeedMMin: selectedMachine.cuttingSpeedMMin,
           depthOfCutMm: selectedMachine.depthOfCutMm,
           feedPerToothMm: selectedMachine.feedPerToothMm,
           widthOfCutMm: selectedMachine.widthOfCutMm,
           materialRemovalRateCm3Min: selectedMachine.materialRemovalRateCm3Min,
           cycleTimeSec: selectedMachine.cycleTimeSec,
        };
        const updated = [...prev, newPoint];
        if (updated.length > 60) updated.shift();
        return updated;
     });
  }, [selectedMachine]);

  const getHistoryWindow = (range: TimeRange) => {
    const totalMinutes = getTimeRangeConfig(range).totalMinutes;
    const startTime = Date.now() - totalMinutes * 60 * 1000;
    return history.filter((point) => new Date(point.timestamp).getTime() >= startTime);
  };

  const realtimeHistory = getHistoryWindow(timeRange);
  const metricHistory = getHistoryWindow(metricRange);
  const productionTotal = Math.max(1, selectedMachine.partCount);
  const goodRatio = (selectedMachine.goodCount / productionTotal) * 100;
  const ngRatio = (selectedMachine.ngCount / productionTotal) * 100;

  const oeeChartOptions = {
    tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: '#17a2b8', textStyle: { color: '#fff' } },
    legend: {
      top: 0,
      textStyle: { color: '#8fb3d9', fontSize: 10 },
    },
    grid: { left: '1%', right: '1%', bottom: '5%', top: '18%', containLabel: false },
    xAxis: { 
       type: 'category', 
       boundaryGap: false,
       data: realtimeHistory.map(h => formatDateTime(h.timestamp).split(' ')[1] || ''), 
       axisLabel: { show: false },
       axisLine: { show: false },
       axisTick: { show: false },
       splitLine: { show: true, lineStyle: { color: '#333' } }
    },
    yAxis: { 
       type: 'value', 
       min: 0, 
       max: 100,
       splitLine: { show: true, lineStyle: { color: '#333' } },
       axisLabel: { show: false },
       axisLine: { show: false },
       axisTick: { show: false }
    },
    series: [
      { 
        name: 'OEE', 
        type: 'line', 
        data: realtimeHistory.map(h => h.oee), 
        itemStyle: { color: '#17a2b8' }, 
        smooth: false, 
        symbol: 'none', 
        lineStyle: { width: 1.5, color: '#17a2b8' },
        areaStyle: {
            color: {
                type: 'linear',
                x: 0, y: 0, x2: 0, y2: 1,
                colorStops: [
                    { offset: 0, color: 'rgba(23, 162, 184, 0.5)' },
                    { offset: 1, color: 'rgba(23, 162, 184, 0.05)' }
                ]
            }
        }
      },
      {
        name: selectedLanguage === 'en' ? 'Availability' : 'Khả dụng',
        type: 'line',
        data: realtimeHistory.map((h) => h.availability),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.4, color: '#22c55e' },
        itemStyle: { color: '#22c55e' },
      },
      {
        name: selectedLanguage === 'en' ? 'Performance' : 'Hiệu suất',
        type: 'line',
        data: realtimeHistory.map((h) => h.performance),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.4, color: '#60a5fa' },
        itemStyle: { color: '#60a5fa' },
      },
      {
        name: selectedLanguage === 'en' ? 'Quality' : 'Chất lượng',
        type: 'line',
        data: realtimeHistory.map((h) => h.quality),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.4, color: '#facc15' },
        itemStyle: { color: '#facc15' },
      }
    ]
  };

  const getMetricChartOptions = (metricKey: string, color: string, name: string) => ({
      tooltip: { trigger: 'axis', backgroundColor: '#111', borderColor: color, textStyle: { color: '#fff' } },
      grid: { left: '1%', right: '1%', bottom: '5%', top: '5%', containLabel: false },
      xAxis: { 
         type: 'category', 
         boundaryGap: false,
         data: metricHistory.map(h => formatDateTime(h.timestamp).split(' ')[1] || ''), 
         axisLabel: { show: false },
         axisLine: { show: false },
         axisTick: { show: false },
         splitLine: { show: true, lineStyle: { color: '#333' } }
      },
      yAxis: { 
         type: 'value', 
         min: 'dataMin',
         splitLine: { show: true, lineStyle: { color: '#333' } },
         axisLabel: { show: false },
         axisLine: { show: false },
         axisTick: { show: false }
      },
      series: [
        { 
           name: name, 
           type: 'line', 
           data: metricHistory.map(h => h[metricKey as keyof typeof h] || 0), 
           itemStyle: { color: color }, 
           smooth: false, 
           symbol: 'none', 
           lineStyle: { width: 1.5 },
           areaStyle: { 
               opacity: 0.8,
               color: {
                   type: 'linear',
                   x: 0, y: 0, x2: 0, y2: 1,
                   colorStops: [
                       { offset: 0, color: color.replace(')', ', 0.5)').replace('rgb', 'rgba') },
                       { offset: 1, color: color.replace(')', ', 0.05)').replace('rgb', 'rgba') }
                   ]
               }
           }
        }
      ]
  });

  const allMetrics = [
      { key: 'powerKw', label: selectedLanguage === 'en' ? 'Power' : 'Điện năng', unit: 'kW', color: 'rgb(23, 162, 184)', value: selectedMachine.powerKw },
      { key: 'cycleTimeSec', label: messages.machine.cycleTime || 'Cycle Time', unit: 's', color: 'rgb(23, 162, 184)', value: selectedMachine.cycleTimeSec },
      ...(selectedMachine.spindleSpeedRpm !== undefined ? [{ key: 'spindleSpeedRpm', label: selectedLanguage === 'en' ? 'Spindle Speed' : 'Tốc độ trục chính', unit: 'rpm', color: 'rgb(23, 162, 184)', value: selectedMachine.spindleSpeedRpm }] : []),
      ...(selectedMachine.feedRateMmMin !== undefined ? [{ key: 'feedRateMmMin', label: selectedLanguage === 'en' ? 'Feed Rate' : 'Lượng chạy dao', unit: 'mm/min', color: 'rgb(23, 162, 184)', value: selectedMachine.feedRateMmMin }] : []),
      ...(selectedMachine.cuttingSpeedMMin !== undefined ? [{ key: 'cuttingSpeedMMin', label: selectedLanguage === 'en' ? 'Cutting Speed' : 'Vận tốc cắt', unit: 'm/min', color: 'rgb(23, 162, 184)', value: selectedMachine.cuttingSpeedMMin }] : []),
      ...(selectedMachine.depthOfCutMm !== undefined ? [{ key: 'depthOfCutMm', label: selectedLanguage === 'en' ? 'Depth of Cut' : 'Chiều sâu cắt', unit: 'mm', color: 'rgb(23, 162, 184)', value: selectedMachine.depthOfCutMm }] : []),
      ...(selectedMachine.feedPerToothMm !== undefined ? [{ key: 'feedPerToothMm', label: selectedLanguage === 'en' ? 'Feed per Tooth' : 'Lượng chạy dao răng', unit: 'mm/tooth', color: 'rgb(23, 162, 184)', value: selectedMachine.feedPerToothMm }] : []),
      ...(selectedMachine.widthOfCutMm !== undefined ? [{ key: 'widthOfCutMm', label: selectedLanguage === 'en' ? 'Width of Cut' : 'Chiều rộng cắt', unit: 'mm', color: 'rgb(23, 162, 184)', value: selectedMachine.widthOfCutMm }] : []),
      ...(selectedMachine.materialRemovalRateCm3Min !== undefined ? [{ key: 'materialRemovalRateCm3Min', label: selectedLanguage === 'en' ? 'MRR' : 'Tốc độ bóc tách VL', unit: 'cm³/min', color: 'rgb(23, 162, 184)', value: selectedMachine.materialRemovalRateCm3Min }] : []),
      ...(selectedMachine.temperatureC !== undefined ? [{ key: 'temperatureC', label: messages.machine.temperature || 'Temperature', unit: '°C', color: 'rgb(23, 162, 184)', value: selectedMachine.temperatureC }] : []),
      ...(selectedMachine.vibrationPct !== undefined ? [{ key: 'vibrationPct', label: messages.machine.vibration || 'Vibration', unit: '%', color: 'rgb(23, 162, 184)', value: selectedMachine.vibrationPct }] : []),
  ];

  const activeMetricObj = selectedMetric ? allMetrics.find(m => m.key === selectedMetric) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {(!(usingMock && alarmsUsingMock) && (loading || alarmsLoading || error || alarmsError)) && (
        <div className="card-industrial p-3 text-xs border border-industrial-border/20 text-industrial-text-secondary">
          {loading || alarmsLoading
            ? selectedLanguage === 'en'
              ? 'Loading machine detail from backend...'
              : 'Dang tai chi tiet may tu backend...'
            : selectedLanguage === 'en'
            ? `Backend unavailable. Showing local fallback. ${error || alarmsError || ''}`
            : `Backend tam thoi khong phan hoi. Dang hien thi du lieu du phong. ${error || alarmsError || ''}`}
        </div>
      )}

      {/* Machine Selector */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {machines.map((machine) => (
          <button
            key={machine.id}
            onClick={() => setSelectedMachineId(machine.id)}
            className={`p-4 rounded-lg border-2 transition-all text-left flex items-start gap-3 ${
              selectedMachine.id === machine.id
                ? 'bg-industrial-border/20 border-industrial-border text-industrial-border'
                : 'bg-industrial-card border-industrial-border/20 hover:border-industrial-border/50'
            }`}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-industrial-border/30 mt-1">
              <img src={machine.image} alt={machine.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      machine.status === 'RUN'
                        ? '#22c55e'
                        : machine.status === 'FAULT'
                        ? '#ef4444'
                        : '#facc15',
                  }}
                ></div>
                <p className="font-semibold text-sm line-clamp-1">{machine.code}</p>
              </div>
              <p className="text-xs text-industrial-text-secondary line-clamp-1">
                {machine.name}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Selected Machine Detail */}
      <div className="card-industrial p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-industrial-text-secondary">{selectedMachine.code}</p>
            <h2 className="text-xl font-bold text-industrial-text">{selectedMachine.name}</h2>
            <div className="flex gap-1 mt-2 flex-wrap">
              <span className="data-layer-badge raw">{selectedLanguage === 'en' ? 'raw telemetry' : 'dữ liệu thô'}</span>
              <span className="data-layer-badge computed">{selectedLanguage === 'en' ? 'computed kpi' : 'chỉ số tính toán'}</span>
              <span className="data-layer-badge predicted">{selectedLanguage === 'en' ? 'prediction' : 'dự báo'}</span>
              <span className={`px-2 py-1 rounded-full text-[11px] border ${realtime.status === 'live' ? 'bg-industrial-success/10 text-industrial-success border-industrial-success/30' : realtime.status === 'degraded' ? 'bg-industrial-warning/10 text-industrial-warning border-industrial-warning/30' : 'bg-industrial-card/60 text-industrial-text-secondary border-industrial-border/20'}`}>
                {selectedLanguage === 'en'
                  ? `Realtime: ${realtime.status}`
                  : `Realtime: ${realtime.status === 'live' ? 'dang song' : realtime.status === 'degraded' ? 'suy giam' : realtime.status === 'connecting' ? 'dang ket noi' : realtime.status === 'idle' ? 'tam dung' : 'ngat ket noi'}`}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 w-full md:w-auto">
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Status' : 'Trạng thái'}</p>
              <p className={`text-sm font-semibold ${selectedMachine.status === 'FAULT' ? 'text-industrial-error' : selectedMachine.status === 'RUN' ? 'text-industrial-success' : 'text-industrial-info'}`}>{getStatusLabel(selectedMachine.status)}</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Mode' : 'Chế độ'}</p>
              <p className="text-sm font-semibold text-industrial-text">{formatMachineMode(selectedMachine.mode, locale)}</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-industrial-text-secondary">OEE</p>
              <p className="text-sm font-semibold text-industrial-border">{Math.round(selectedMachine.oee)}%</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Power' : 'Công suất'}</p>
              <p className="text-sm font-semibold text-industrial-success">{formatNumber(selectedMachine.powerKw, 1)} kW</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Health' : 'Sức khỏe'}</p>
              <p className="text-sm font-semibold text-industrial-text">{selectedMachine.machineHealth}%</p>
            </div>
            <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg px-3 py-2">
              <p className="text-[10px] uppercase text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Alarms' : 'Cảnh báo'}</p>
              <p className={`text-sm font-semibold ${selectedMachine.activeAlarms > 0 ? 'text-industrial-error' : 'text-industrial-success'}`}>{selectedMachine.activeAlarms}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-4">
          {/* Machine Image & Basic Info */}
          <div className="card-industrial p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="relative group overflow-hidden rounded-lg">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
                <img
                  src={pendingImage || selectedMachine.image}
                  alt={selectedMachine.name}
                  className="w-full h-56 object-cover rounded-lg transform group-hover:scale-105 transition-transform duration-500"
                  onError={(event) => {
                    event.currentTarget.src = '/img/may.png';
                  }}
                />
                <div className="absolute top-2 right-2 px-3 py-1 rounded bg-black/60 backdrop-blur-md border border-white/10 text-xs font-bold text-white uppercase tracking-wider">
                  {formatMachineType(selectedMachine.type, locale)}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/75 via-black/35 to-transparent">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-1 rounded-full text-[11px] bg-black/55 text-white border border-white/10">
                      {currentImageOverride
                        ? machineDetailMessages.imageSourceLocal || (selectedLanguage === 'en' ? 'Local browser image' : 'Anh luu tren trinh duyet')
                        : machineDetailMessages.imageSourceDefault || (selectedLanguage === 'en' ? 'Default image' : 'Anh mac dinh')}
                    </span>
                    {pendingImage && (
                      <span className="px-2 py-1 rounded-full text-[11px] bg-industrial-warning/15 text-industrial-warning border border-industrial-warning/30">
                        {machineDetailMessages.imagePendingSave || (selectedLanguage === 'en' ? 'Preview waiting to save' : 'Anh xem truoc chua luu')}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleChooseImage}
                      className="px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs border border-white/10 hover:bg-black/75 transition-colors"
                    >
                      {machineDetailMessages.imageChoose || (selectedLanguage === 'en' ? 'Choose image' : 'Tai anh len')}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveImage}
                      disabled={!pendingImage || isSavingImage}
                      className="px-3 py-1.5 rounded-lg bg-industrial-border/80 text-industrial-darker text-xs border border-industrial-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-industrial-border transition-colors"
                    >
                      {isSavingImage
                        ? machineDetailMessages.imageSaving || (selectedLanguage === 'en' ? 'Saving...' : 'Dang luu...')
                        : machineDetailMessages.imageSave || (selectedLanguage === 'en' ? 'Save image' : 'Luu anh')}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetImage}
                      disabled={!currentImageOverride || isSavingImage}
                      className="px-3 py-1.5 rounded-lg bg-industrial-card/80 text-industrial-text text-xs border border-industrial-border/30 disabled:opacity-50 disabled:cursor-not-allowed hover:border-industrial-border/60 transition-colors"
                    >
                      {machineDetailMessages.imageReset || (selectedLanguage === 'en' ? 'Restore default' : 'Khoi phuc anh goc')}
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-industrial-border/20 bg-industrial-darker/40 p-3 text-xs text-industrial-text-secondary">
                <p className="font-medium text-industrial-text mb-1">{machineDetailMessages.imageManagerTitle || (selectedLanguage === 'en' ? 'Machine image manager' : 'Quan ly anh may')}</p>
                <p>{machineDetailMessages.imageLocalOnlyHint || (selectedLanguage === 'en' ? 'This image is currently saved only on this browser UI because no backend upload endpoint is configured yet.' : 'Anh hien tai chi duoc luu tren UI cua trinh duyet nay vi chua co endpoint upload tu backend.')}</p>
                <p className="mt-2">{machineDetailMessages.imageRequirements || (selectedLanguage === 'en' ? 'Supported formats: JPG, PNG, WebP. Maximum size: 4 MB.' : 'Dinh dang ho tro: JPG, PNG, WebP. Dung luong toi da: 4 MB.')}</p>
                {pendingImageName && (
                  <p className="mt-2 text-industrial-border">{machineDetailMessages.imageSelectedFile || (selectedLanguage === 'en' ? 'Selected file' : 'Tep da chon')}: {pendingImageName}</p>
                )}
                {imageMessage && <p className="mt-2 text-industrial-success">{imageMessage}</p>}
                {imageError && <p className="mt-2 text-industrial-error">{imageError}</p>}
              </div>
              </div>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="metric-label">{messages.machine.name}</p>
                  <p className="text-xl font-semibold text-industrial-text">
                    {selectedMachine.name}
                  </p>
                </div>
                <div>
                  <p className="metric-label">{messages.machine.brand || 'Brand'}</p>
                  <p className="text-md font-semibold text-industrial-text">
                    {selectedMachine.brand}
                  </p>
                </div>
                <div>
                  <p className="metric-label">{messages.machine.controller}</p>
                  <p className="text-sm text-industrial-text">{selectedMachine.controller}</p>
                </div>
                <div>
                  <p className="metric-label">{messages.machine.status}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{
                        backgroundColor:
                          selectedMachine.status === 'RUN'
                            ? '#22c55e'
                            : selectedMachine.status === 'FAULT'
                            ? '#ef4444'
                            : '#60a5fa',
                      }}
                    ></div>
                    <p className="text-sm font-semibold text-industrial-text">
                      {selectedMachine.status === 'RUN' && (messages.machine.running || 'Đang Chạy')}
                      {selectedMachine.status === 'FAULT' && (messages.machine.fault || 'Trục trặc')}
                      {selectedMachine.status === 'IDLE' && (messages.machine.idle || 'Đang chờ')}
                      {selectedMachine.status === 'STOP' && (messages.machine.stopped || 'Dừng')}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-industrial-border/20">
                  <p className="metric-label mb-2">{selectedLanguage === 'en' ? 'Data Layers' : 'Lớp dữ liệu'}</p>
                  <div className="flex gap-1">
                    <span className="data-layer-badge raw">{selectedLanguage === 'en' ? 'raw telemetry' : 'dữ liệu thô'}</span>
                    <span className="data-layer-badge computed">{selectedLanguage === 'en' ? 'computed kpi' : 'chỉ số tính toán'}</span>
                    <span className="data-layer-badge predicted">{selectedLanguage === 'en' ? 'prediction' : 'dự báo'}</span>
                  </div>
                </div>

                <div>
                  <p className="metric-label mb-2">{selectedLanguage === 'en' ? 'Machine Category' : 'Nhóm máy'}</p>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-industrial-border/10 border border-industrial-border/30 text-industrial-border uppercase tracking-wider">
                    {formatMachineCategory(selectedMachine.category, locale)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card-industrial p-6">
            <h3 className="panel-title mb-4">{selectedLanguage === 'en' ? 'Type-Aware Operation Panels' : 'Bảng vận hành theo loại máy'}</h3>

            {selectedMachine.category === 'robot_only' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-4">
                  <p className="text-xs uppercase text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Robot Zone' : 'Khu vực robot'}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Program' : 'Chương trình'}: {selectedMachine.rawTelemetry?.programName || selectedMachine.currentProgram}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Mode' : 'Chế độ'}: {formatMachineMode(selectedMachine.rawTelemetry?.mode || selectedMachine.mode, locale)}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Servo load' : 'Tải servo'}: {formatNumber(selectedMachine.rawTelemetry?.servoLoadPct ?? selectedMachine.servoLoadPct ?? 0, 0)}%</p>
                </div>
                <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-4">
                  <p className="text-xs uppercase text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Cell Handshake' : 'Đồng bộ cell'}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Ready/Busy' : 'Sẵn sàng/Bận'}: {selectedLanguage === 'en' ? (selectedMachine.status === 'RUN' ? 'Ready' : 'Waiting') : (selectedMachine.status === 'RUN' ? 'Sẵn sàng' : 'Đang chờ')}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Safety interlock' : 'Liên động an toàn'}: {selectedLanguage === 'en' ? (selectedMachine.status === 'FAULT' ? 'Tripped' : 'Normal') : (selectedMachine.status === 'FAULT' ? 'Đã ngắt' : 'Bình thường')}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Energy' : 'Năng lượng'}: {formatNumber(selectedMachine.rawTelemetry?.powerKw ?? selectedMachine.powerKw, 1)} kW</p>
                </div>
              </div>
            )}

            {selectedMachine.category === 'cnc_machine' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-4">
                  <p className="text-xs uppercase text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Machining Process' : 'Quá trình gia công'}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Spindle' : 'Trục chính'}: {selectedMachine.rawTelemetry?.spindleRpm ?? selectedMachine.spindleSpeedRpm ?? 0} rpm</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Feed' : 'Lượng chạy dao'}: {selectedMachine.rawTelemetry?.feedRateMmMin ?? selectedMachine.feedRateMmMin ?? 0} mm/min</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Cycle' : 'Chu kỳ'}: {selectedMachine.cycleTimeSec}s</p>
                </div>
                <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-4">
                  <p className="text-xs uppercase text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Condition Monitoring' : 'Giám sát tình trạng'}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Temperature' : 'Nhiệt độ'}: {formatNumber(selectedMachine.rawTelemetry?.temperatureC ?? selectedMachine.temperatureC ?? 0, 1)}C</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Vibration' : 'Độ rung'}: {formatNumber(selectedMachine.rawTelemetry?.vibrationPct ?? selectedMachine.vibrationPct ?? 0, 1)}%</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Tool life' : 'Tuổi thọ dao'}: {formatNumber(selectedMachine.predictions?.remainingToolLifePct ?? selectedMachine.toolLifeRemainingPct ?? 0, 0)}%</p>
                </div>
              </div>
            )}

            {selectedMachine.category === 'robot_cnc_cell' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-4">
                  <p className="text-xs uppercase text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Robot Zone' : 'Khu vực robot'}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Program' : 'Chương trình'}: {selectedMachine.rawTelemetry?.programName || selectedMachine.currentProgram}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Servo load' : 'Tải servo'}: {formatNumber(selectedMachine.rawTelemetry?.servoLoadPct ?? selectedMachine.servoLoadPct ?? 0, 0)}%</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Cell state' : 'Trạng thái cell'}: {selectedMachine.rawTelemetry?.state || selectedMachine.status}</p>
                </div>
                <div className="bg-industrial-darker/50 border border-industrial-border/20 rounded-lg p-4">
                  <p className="text-xs uppercase text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Machining Zone' : 'Khu vực gia công'}</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Spindle' : 'Trục chính'}: {selectedMachine.rawTelemetry?.spindleRpm ?? selectedMachine.spindleSpeedRpm ?? 0} rpm</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Feed' : 'Lượng chạy dao'}: {selectedMachine.rawTelemetry?.feedRateMmMin ?? selectedMachine.feedRateMmMin ?? 0} mm/min</p>
                  <p className="text-sm text-industrial-text">{selectedLanguage === 'en' ? 'Quality output' : 'Sản lượng đạt'}: {selectedMachine.goodCount}/{selectedMachine.partCount}</p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
              <Cpu size={18} />
              {messages.machineDetail.parameterMonitoring}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('powerKw')}>
                 <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Power' : 'Điện'}</p>
                  <Zap size={16} className="text-industrial-success" />
                </div>
                <p className="text-2xl font-bold text-industrial-success">
                  {formatNumber(selectedMachine.powerKw, 1)} <span className="text-sm font-normal">kW</span>
                </p>
              </div>

              <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('cycleTimeSec')}>
                 <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-industrial-text-secondary">{messages.machine.cycleTime || 'Cycle'}</p>
                  <Clock size={16} className="text-industrial-info" />
                </div>
                <p className="text-2xl font-bold text-industrial-info">
                  {selectedMachine.cycleTimeSec}<span className="text-sm font-normal">s</span>
                </p>
              </div>

              {selectedMachine.spindleSpeedRpm !== undefined && selectedMachine.spindleSpeedRpm > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('spindleSpeedRpm')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Spindle Speed' : 'Tốc độ trục chính'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.spindleSpeedRpm} <span className="text-xs font-normal">rpm</span>
                  </p>
                </div>
              )}

              {selectedMachine.feedRateMmMin !== undefined && selectedMachine.feedRateMmMin > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('feedRateMmMin')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Feed Rate' : 'Lượng chạy dao'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.feedRateMmMin} <span className="text-xs font-normal">mm/min</span>
                  </p>
                </div>
              )}

              {selectedMachine.cuttingSpeedMMin !== undefined && selectedMachine.cuttingSpeedMMin > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('cuttingSpeedMMin')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'Cutting Speed' : 'Vận tốc cắt'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.cuttingSpeedMMin} <span className="text-xs font-normal">m/min</span>
                  </p>
                </div>
              )}

              {selectedMachine.materialRemovalRateCm3Min !== undefined && selectedMachine.materialRemovalRateCm3Min > 0 && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('materialRemovalRateCm3Min')}>
                  <p className="text-sm text-industrial-text-secondary mb-2">{selectedLanguage === 'en' ? 'MRR' : 'Tốc độ bóc tách'}</p>
                  <p className="text-xl font-bold text-industrial-text">
                    {selectedMachine.materialRemovalRateCm3Min} <span className="text-xs font-normal">cm³/min</span>
                  </p>
                </div>
              )}
              
              {selectedMachine.temperatureC !== undefined && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('temperatureC')}>
                   <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-industrial-text-secondary">{messages.machine.temperature || 'Temp'}</p>
                    <Thermometer size={16} className={selectedMachine.temperatureC > 70 ? 'text-industrial-error' : 'text-industrial-warning'} />
                  </div>
                  <div className="flex items-end gap-2">
                    <p className={`text-xl font-bold ${selectedMachine.temperatureC > 70 ? 'text-industrial-error animate-pulse' : 'text-industrial-text'}`}>
                      {formatNumber(selectedMachine.temperatureC, 1)}°C
                    </p>
                  </div>
                  <div className="h-1 w-full bg-industrial-card mt-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min((selectedMachine.temperatureC / 100) * 100, 100)}%`,
                        backgroundColor: selectedMachine.temperatureC > 70 ? '#ef4444' : selectedMachine.temperatureC > 50 ? '#facc15' : '#22c55e'
                      }}
                    ></div>
                  </div>
                </div>
              )}
              
              {selectedMachine.vibrationPct !== undefined && (
                <div className="bg-industrial-darker p-4 rounded-lg border border-industrial-border/10 cursor-pointer hover:bg-industrial-card transition-colors" onClick={() => setSelectedMetric('vibrationPct')}>
                   <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-industrial-text-secondary">{messages.machine.vibration || 'Vibration'}</p>
                    <Activity size={16} className="text-industrial-warning" />
                  </div>
                  <p className="text-xl font-bold text-industrial-warning">
                    {formatNumber(selectedMachine.vibrationPct, 1)}%
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* OEE & Production Advanced Panel */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-6 flex items-center gap-2">
              <BarChart3 size={18} />
              {selectedLanguage === 'en' ? 'OEE & Production Analytics' : 'Phân tích OEE & Sản lượng'}
            </h3>
            
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
              {/* Main OEE Score */}
              <div className="xl:col-span-3 bg-industrial-darker/50 p-4 rounded-xl border border-industrial-border/10 flex flex-col items-center justify-center relative">
                <p className="text-sm font-semibold text-industrial-text-secondary mb-3">{messages.machine.oee} KPI</p>
                <div className="relative w-32 h-32 mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(30, 144, 255, 0.1)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke={selectedMachine.oee >= 85 ? "#22c55e" : selectedMachine.oee >= 60 ? "#facc15" : "#ef4444"} strokeWidth="8" strokeDasharray={`${(selectedMachine.oee / 100) * 251.2} 251.2`} strokeLinecap="round" className="transition-all duration-1000" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-4xl font-bold text-industrial-text">{selectedMachine.oee}%</p>
                  </div>
                </div>
                <div className="text-center mt-3 flex flex-col items-center">
                  <p className={`px-4 py-1.5 rounded-full text-xs font-bold ${selectedMachine.oee >= 85 ? "bg-industrial-success/20 text-industrial-success" : selectedMachine.oee >= 60 ? "bg-industrial-warning/20 text-industrial-warning" : "bg-industrial-error/20 text-industrial-error"}`}>
                    OEE: {selectedMachine.oee}%
                  </p>
                </div>
              </div>

              {/* OEE Components Breakdown */}
              <div className="xl:col-span-5 space-y-4 flex flex-col justify-center bg-industrial-darker/30 p-5 rounded-xl border border-industrial-border/10">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Availability (A)' : 'Khả dụng (A)'}</span>
                    <span className="text-sm font-bold text-industrial-success">{selectedMachine.availability}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/10 overflow-hidden shadow-inner">
                    <div className="h-full bg-industrial-success transition-all duration-500" style={{width: `${selectedMachine.availability}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Performance (P)' : 'Hiệu suất (P)'}</span>
                    <span className="text-sm font-bold text-industrial-info">{selectedMachine.performance}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/10 overflow-hidden shadow-inner">
                    <div className="h-full bg-industrial-info transition-all duration-500" style={{width: `${selectedMachine.performance}%`}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-industrial-text-secondary">{selectedLanguage === 'en' ? 'Quality (Q)' : 'Chất lượng (Q)'}</span>
                    <span className="text-sm font-bold text-industrial-warning">{selectedMachine.quality}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-industrial-card border border-industrial-border/10 overflow-hidden shadow-inner">
                    <div className="h-full bg-industrial-warning transition-all duration-500" style={{width: `${selectedMachine.quality}%`}}></div>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-xs text-industrial-text-secondary bg-industrial-bg px-3 py-2 rounded-lg border border-industrial-border/5 inline-block">
                    <strong className="text-industrial-border">{selectedLanguage === 'en' ? 'Formula' : 'Công thức'}:</strong> OEE = A × P × Q
                  </p>
                </div>
              </div>

              {/* Enhanced Production Stats */}
              <div className="xl:col-span-4 bg-industrial-darker/50 p-5 rounded-xl border border-industrial-border/10 flex flex-col justify-between">
                <h4 className="text-sm font-semibold text-industrial-text mb-4 pb-2 border-b border-industrial-border/10 flex items-center justify-between">
                  {selectedLanguage === 'en' ? 'Production Output' : 'Sản lượng'}
                  <TrendingUp size={16} className="text-industrial-border" />
                </h4>
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div className="bg-industrial-card border border-industrial-border/5 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-industrial-border/10 flex items-center justify-center mb-3 text-industrial-border">
                         <Package size={24} />
                      </div>
                      <span className="text-3xl font-bold font-mono text-industrial-text">{selectedMachine.partCount}</span>
                      <span className="text-xs text-industrial-text-secondary mt-1">{messages.machine.partCount}</span>
                  </div>
                  <div className="bg-industrial-card border border-industrial-error/5 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-industrial-error/10 flex items-center justify-center mb-3 text-industrial-error">
                         <AlertTriangle size={24} />
                      </div>
                      <span className="text-3xl font-bold font-mono text-industrial-error">{selectedMachine.ngCount}</span>
                      <span className="text-xs text-industrial-error mt-1">{messages.machine.ngParts || 'NG Parts'}</span>
                  </div>
                </div>
                <div className="mt-4 bg-industrial-bg/40 border border-industrial-border/10 rounded-lg p-3">
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-industrial-success">{selectedLanguage === 'en' ? 'Good Ratio' : 'Tỷ lệ đạt'}: {formatNumber(goodRatio, 1)}%</span>
                    <span className="text-industrial-error">{selectedLanguage === 'en' ? 'NG Ratio' : 'Tỷ lệ lỗi'}: {formatNumber(ngRatio, 1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-industrial-card overflow-hidden border border-industrial-border/10">
                    <div className="h-full bg-industrial-success" style={{ width: `${Math.min(100, goodRatio)}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Validation Chart */}
            <div className="h-64 mt-2 border-t border-industrial-border/20 pt-6">
              <div className="flex justify-between items-center mb-3">
                 <h4 className="text-xs uppercase tracking-wider text-industrial-text-secondary flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-industrial-error animate-pulse"></span>
                   {messages.machineDetail.realtimeOeeAnalytics}
                 </h4>
                 <TimeRangeSelector value={timeRange} onChange={setTimeRange} showLabel={false} />
              </div>
              {(historyLoading || historyError) && (
                <div className={`mb-3 text-xs ${historyError ? 'text-industrial-warning' : 'text-industrial-text-secondary'}`}>
                  {historyLoading
                    ? selectedLanguage === 'en'
                      ? 'Loading telemetry history from backend...'
                      : 'Dang tai lich su telemetry tu backend...'
                    : selectedLanguage === 'en'
                    ? `Telemetry history fallback is active. ${historyError || ''}`
                    : `Dang dung du lieu du phong cho lich su telemetry. ${historyError || ''}`}
                </div>
              )}
              <div className="bg-[#111] p-1 rounded-lg h-full border border-[#333]">
                  <ReactECharts option={oeeChartOptions} style={{height: '100%', width: '100%'}} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Machine Health */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-4 text-center">
              {messages.machineDetail.machineHealthScore}
            </h3>
            <div className="relative w-40 h-40 mx-auto mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="rgba(30, 144, 255, 0.1)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={selectedMachine.machineHealth > 70 ? "#22c55e" : selectedMachine.machineHealth > 40 ? "#facc15" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={`${(selectedMachine.machineHealth / 100) * 251.2} 251.2`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-4xl font-bold text-industrial-text">
                  {selectedMachine.machineHealth}
                </p>
              </div>
            </div>
            <p className="text-center text-sm font-medium" style={{color: selectedMachine.machineHealth > 70 ? "#22c55e" : selectedMachine.machineHealth > 40 ? "#facc15" : "#ef4444" }}>
              {/* Sử dụng getHealthScore với messages và selectedLanguage */}
              {getHealthScore(selectedMachine.machineHealth, selectedLanguage, messages)}
            </p>
          </div>

          {/* Maintenance & Alarms */}
          <div className="card-industrial p-6 space-y-4">
            <div>
              <p className="text-sm text-industrial-text-secondary mb-2">
                {messages.machine.maintenanceDue}
              </p>
              <p
                className={`text-2xl font-bold ${
                  selectedMachine.maintenanceDueDays <= 7
                    ? 'text-industrial-error animate-pulse'
                    : 'text-industrial-warning'
                }`}
              >
                {selectedMachine.maintenanceDueDays} {selectedLanguage === 'en' ? 'days' : 'ngày'}
              </p>
            </div>
            <div className="border-t border-industrial-border/20 pt-4">
              <p className="text-sm text-industrial-text-secondary mb-2">
                {messages.machine.activeAlarms}
              </p>
              <div className="flex items-center justify-between">
                <p className={`text-2xl font-bold ${selectedMachine.activeAlarms > 0 ? 'text-industrial-error animate-pulse' : 'text-industrial-success'}`}>
                  {selectedMachine.activeAlarms}
                </p>
                {selectedMachine.activeAlarms > 0 && (
                  <button 
                    onClick={() => setShowAlarmsModal(true)}
                    className="px-3 py-1 bg-industrial-error/10 text-industrial-error border border-industrial-error/30 rounded text-xs hover:bg-industrial-error/30 transition-colors"
                  >
                    {selectedLanguage === 'en' ? 'View Details' : 'Xem chi tiết'}
                  </button>
                )}
              </div>
            </div>
            {selectedMachine.toolLifeRemainingPct !== undefined && (
              <div className="border-t border-industrial-border/20 pt-4">
                <p className="text-sm text-industrial-text-secondary mb-2">
                  {messages.machine.toolLife}
                </p>
                <div className="h-4 rounded-full bg-industrial-card border border-industrial-border/30 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${selectedMachine.toolLifeRemainingPct}%`,
                      backgroundColor: selectedMachine.toolLifeRemainingPct > 30 ? '#1e90ff' : '#ef4444'
                    }}
                  ></div>
                </div>
                <p className="text-xs text-industrial-text-secondary mt-2 flex justify-between">
                  <span>{selectedMachine.toolLifeRemainingPct}%</span>
                  <span>{selectedLanguage === 'en' ? 'Remaining' : 'Còn lại'}</span>
                </p>
              </div>
            )}
          </div>

          {/* Recent Events */}
          <div className="card-industrial p-6">
            <h3 className="text-industrial-border font-semibold mb-4 text-sm">
              {messages.machineDetail.eventTimeline || (selectedLanguage === 'en' ? 'Recent Events' : 'Sự kiện gần đây')}
            </h3>
            <div className="space-y-3">
              {machineEvents.length > 0 ? (
                machineEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 bg-industrial-darker rounded border-l-4 shadow-sm"
                    style={{
                      borderColor:
                        event.severity === 'critical'
                          ? '#ef4444'
                          : event.severity === 'warning'
                          ? '#facc15'
                          : '#38bdf8',
                    }}
                  >
                    <p className="font-semibold text-industrial-text text-sm">
                      {event.title}
                    </p>
                    <p className="text-xs text-industrial-text-secondary mt-1">
                      {formatDateTime(event.timestamp)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-industrial-text-secondary text-center py-4 bg-industrial-darker rounded border border-dashed border-industrial-border/30">
                  {selectedLanguage === 'en' ? 'No recent events' : 'Không có sự kiện gần đây'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Task Manager Style Modal */}
      {selectedMetric && activeMetricObj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedMetric(null)}>
          <div className="bg-[#1e1e1e] border border-gray-700/50 rounded-xl shadow-2xl w-[90vw] max-w-5xl h-[70vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-gray-200 flex items-center gap-2">
                 <Activity size={18} /> {selectedLanguage === 'en' ? 'Performance' : 'Hiệu suất'}
              </h2>
              <button className="text-gray-400 hover:text-white" onClick={() => setSelectedMetric(null)}>
                 <X size={24} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex flex-1 overflow-hidden">
               {/* Fixed left sidebar for metrics list */}
               <div className="w-1/3 border-r border-gray-800 bg-[#181818] overflow-y-auto">
                  {allMetrics.map(m => (
                      <div 
                         key={m.key} 
                         onClick={() => setSelectedMetric(m.key)}
                         className={`p-3 border-b border-gray-800/50 cursor-pointer transition-colors flex flex-col gap-1 ${selectedMetric === m.key ? 'bg-[#2d2d2d] border-l-4 border-l-[#17a2b8]' : 'hover:bg-[#252525] border-l-4 border-l-transparent'}`}
                      >
                         <div className="flex justify-between text-sm">
                            <span className="text-gray-300">{m.label}</span>
                         </div>
                         <div className="flex justify-between items-end">
                            <span className="text-xs text-gray-500">{selectedLanguage === 'en' ? 'Utilization' : 'Mức sử dụng'}</span>
                            <span className="text-lg font-semibold text-gray-100">{formatNumber(m.value, 1)} {m.unit}</span>
                         </div>
                      </div>
                  ))}
               </div>
               
               {/* Main Chart Area */}
               <div className="flex-1 flex flex-col bg-[#111] p-6">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-2xl font-light text-gray-100">{activeMetricObj.label}</h3>
                     <span className="text-sm font-medium text-gray-300">{formatNumber(activeMetricObj.value, 1)} {activeMetricObj.unit}</span>
                  </div>

                  <div className="mb-4 flex justify-end">
                     <TimeRangeSelector value={metricRange} onChange={setMetricRange} showLabel={false} />
                  </div>
                  
                  <div className="flex-1 min-h-0 border border-[#333] relative">
                     <ReactECharts option={getMetricChartOptions(activeMetricObj.key, activeMetricObj.color, activeMetricObj.label)} style={{height: '100%', width: '100%'}} />
                  </div>
                  
                  <div className="mt-4 grid grid-cols-4 gap-4 text-sm text-gray-400">
                     <div className="flex flex-col">
                        <span>{selectedLanguage === 'en' ? 'Current Window' : 'Khung thời gian hiện tại'}</span>
                        <span className="text-xs mt-1">{selectedLanguage === 'en' ? 'Utilization' : 'Mức sử dụng'}</span>
                        <span className="text-xl text-gray-200">{formatNumber(activeMetricObj.value, 1)} {activeMetricObj.unit}</span>
                     </div>
                     <div className="flex flex-col">
                        <span>{selectedLanguage === 'en' ? 'Max Recorded' : 'Mức lớn nhất'}</span>
                        <span className="text-xl text-gray-200">{formatNumber(Math.max(...metricHistory.map(h => Number(h[activeMetricObj.key]) || 0)), 1)}</span>
                     </div>
                     <div className="flex flex-col">
                        <span>{selectedLanguage === 'en' ? 'Average' : 'Trung bình'}</span>
                        <span className="text-xl text-gray-200">{formatNumber(metricHistory.reduce((a, b) => a + (Number(b[activeMetricObj.key]) || 0), 0) / (metricHistory.length || 1), 1)}</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Alarms Modal */}
      {showAlarmsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAlarmsModal(false)}>
          <div className="bg-[#1e1e1e] border border-industrial-error/50 rounded-xl shadow-2xl w-[90vw] max-w-2xl max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-4 border-b border-industrial-border/20 bg-industrial-error/5">
              <h2 className="text-lg font-semibold text-industrial-error flex items-center gap-2">
                 <AlertTriangle size={20} />
                 {selectedLanguage === 'en' ? 'Active Alerts' : 'Cảnh báo hệ thống'} - {selectedMachine.name}
              </h2>
              <button className="text-gray-400 hover:text-white" onClick={() => setShowAlarmsModal(false)}>
                 <X size={24} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3 bg-[#111]">
              {events.filter(e => e.machineId === selectedMachine.id && e.severity !== 'info').map(event => (
                <div key={event.id} className="p-4 rounded-lg bg-[#181818] border border-industrial-error/30 border-l-4 border-l-industrial-error">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-industrial-text">{selectedLanguage === 'vi' && event.title_vi ? event.title_vi : event.title}</h3>
                    <span className="text-xs text-gray-500 font-mono">{formatDateTime(event.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{selectedLanguage === 'vi' && event.message_vi ? event.message_vi : event.message}</p>
                  {(event.stopReasonCode || event.cause) && (
                    <p className="text-xs text-gray-400 mt-2">{formatStopReasonLabel(event.stopReasonCode || event.cause, locale)}</p>
                  )}
                </div>
              ))}
              {events.filter(e => e.machineId === selectedMachine.id && e.severity !== 'info').length === 0 && (
                <p className="text-center text-gray-500 py-8">{selectedLanguage === 'en' ? 'No active clearable alerts' : 'Không có cảnh báo'}</p>
              )}
            </div>
            <div className="p-4 border-t border-industrial-border/20 bg-[#1e1e1e] flex justify-end gap-3">
               <button onClick={() => setShowAlarmsModal(false)} className="px-4 py-2 rounded border border-gray-600 text-gray-300 hover:bg-gray-800 transition-colors">
                  {selectedLanguage === 'en' ? 'Close' : 'Đóng'}
               </button>
               <button 
                  onClick={() => {
                     const pendingAlarmIds = events
                       .filter((event) => event.machineId === selectedMachine.id && event.severity !== 'info' && !event.acknowledged)
                       .map((event) => event.id);
                     if (pendingAlarmIds.length > 0) {
                       void acknowledgeMany(pendingAlarmIds, 'ui-operator');
                     }
                     setShowAlarmsModal(false);
                  }} 
                  className="px-4 py-2 rounded bg-industrial-success/20 border border-industrial-success/50 text-industrial-success hover:bg-industrial-success/40 transition-colors font-medium"
               >
                  {selectedLanguage === 'en' ? 'Acknowledge All' : 'Xác nhận toàn bộ'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MachinesFallback = () => {
  const { selectedLanguage } = useMachineStore();

  return (
    <div className="p-8 text-center text-industrial-border animate-pulse">
      {selectedLanguage === 'en' ? 'Loading machine details...' : 'Dang tai chi tiet may...'}
    </div>
  );
};

const MachinesPage = () => {
  return (
    <Suspense fallback={<MachinesFallback />}>
      <MachineDetailContent />
    </Suspense>
  );
};

export default MachinesPage;

