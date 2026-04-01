/**
 * Stock-style Chart Configuration Utilities
 * Cấu hình ECharts theo phong cách TradingView/chứng khoán
 * - Smooth realtime animation
 * - Crosshair + tooltip đẹp
 * - Zoom & pan support
 * - Gradient areas
 * - Professional dark theme
 */

// ═══════════════════════════════════════════════════════════════════════════
// THEME COLORS
// ═══════════════════════════════════════════════════════════════════════════

export const chartColors = {
  // Primary palette
  primary: '#17a2b8',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#60a5fa',
  purple: '#a855f7',

  // Background & Grid
  background: 'transparent',
  gridLine: 'rgba(75, 85, 99, 0.3)',
  axisLine: '#374151',
  axisLabel: '#9ca3af',

  // Text
  textPrimary: '#f3f4f6',
  textSecondary: '#9ca3af',

  // Tooltip
  tooltipBg: 'rgba(17, 24, 39, 0.95)',
  tooltipBorder: '#374151',
};

// ═══════════════════════════════════════════════════════════════════════════
// GRADIENT GENERATORS
// ═══════════════════════════════════════════════════════════════════════════

export const createGradient = (color: string, opacity1 = 0.4, opacity2 = 0.05) => ({
  type: 'linear' as const,
  x: 0,
  y: 0,
  x2: 0,
  y2: 1,
  colorStops: [
    { offset: 0, color: color.replace(')', `, ${opacity1})`).replace('rgb', 'rgba').replace('#', '').length === 6 ? hexToRgba(color, opacity1) : color },
    { offset: 1, color: color.replace(')', `, ${opacity2})`).replace('rgb', 'rgba').replace('#', '').length === 6 ? hexToRgba(color, opacity2) : color },
  ],
});

const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const gradients = {
  primary: createGradient(chartColors.primary),
  success: createGradient(chartColors.success),
  warning: createGradient(chartColors.warning),
  danger: createGradient(chartColors.danger),
  info: createGradient(chartColors.info),
};

// ═══════════════════════════════════════════════════════════════════════════
// BASE CHART OPTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const baseChartOptions = {
  backgroundColor: chartColors.background,
  animation: true,
  animationDuration: 300,
  animationEasing: 'cubicOut' as const,
};

// ═══════════════════════════════════════════════════════════════════════════
// TOOLTIP CONFIG (Stock-style)
// ═══════════════════════════════════════════════════════════════════════════

export const stockTooltip = (
  borderColor = chartColors.primary,
  formatter?: (params: unknown) => string
) => ({
  trigger: 'axis' as const,
  backgroundColor: chartColors.tooltipBg,
  borderColor,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: {
    color: chartColors.textPrimary,
    fontSize: 12,
  },
  axisPointer: {
    type: 'cross' as const,
    lineStyle: {
      color: chartColors.axisLabel,
      type: 'solid' as const,
    },
    crossStyle: {
      color: chartColors.axisLabel,
    },
    label: {
      backgroundColor: chartColors.tooltipBg,
      borderColor: chartColors.tooltipBorder,
      borderWidth: 1,
      color: chartColors.textPrimary,
      fontSize: 11,
    },
  },
  formatter,
});

// ═══════════════════════════════════════════════════════════════════════════
// GRID CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const stockGrid = (options?: {
  left?: string;
  right?: string;
  top?: string;
  bottom?: string;
  containLabel?: boolean;
}) => ({
  left: options?.left ?? '3%',
  right: options?.right ?? '3%',
  top: options?.top ?? '15%',
  bottom: options?.bottom ?? '12%',
  containLabel: options?.containLabel ?? true,
});

// ═══════════════════════════════════════════════════════════════════════════
// AXIS CONFIG (Stock-style)
// ═══════════════════════════════════════════════════════════════════════════

export const stockXAxis = (
  data: string[],
  options?: {
    showLabel?: boolean;
    interval?: number | 'auto';
    rotate?: number;
  }
) => ({
  type: 'category' as const,
  data,
  boundaryGap: false,
  axisLine: {
    show: true,
    lineStyle: { color: chartColors.axisLine },
  },
  axisTick: {
    show: false,
  },
  axisLabel: {
    show: options?.showLabel !== false,
    color: chartColors.axisLabel,
    fontSize: 10,
    interval: options?.interval ?? 'auto',
    rotate: options?.rotate ?? 0,
  },
  splitLine: {
    show: true,
    lineStyle: {
      color: chartColors.gridLine,
      type: 'solid' as const,
    },
  },
});

export const stockYAxis = (options?: {
  name?: string;
  unit?: string;
  min?: number | 'dataMin';
  max?: number | 'dataMax';
  showLabel?: boolean;
  splitNumber?: number;
}) => ({
  type: 'value' as const,
  name: options?.name,
  nameTextStyle: {
    color: chartColors.axisLabel,
    fontSize: 11,
    padding: [0, 0, 0, 40],
  },
  min: options?.min,
  max: options?.max,
  splitNumber: options?.splitNumber ?? 5,
  axisLine: {
    show: false,
  },
  axisTick: {
    show: false,
  },
  axisLabel: {
    show: options?.showLabel !== false,
    color: chartColors.axisLabel,
    fontSize: 10,
    formatter: options?.unit ? `{value} ${options.unit}` : '{value}',
  },
  splitLine: {
    show: true,
    lineStyle: {
      color: chartColors.gridLine,
      type: 'solid' as const,
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// DATA ZOOM (Scroll & Zoom like TradingView)
// ═══════════════════════════════════════════════════════════════════════════

export const stockDataZoom = (options?: {
  show?: boolean;
  startValue?: number;
  endValue?: number;
}) => [
  {
    type: 'inside' as const,
    xAxisIndex: 0,
    start: 0,
    end: 100,
    zoomOnMouseWheel: true,
    moveOnMouseMove: true,
    preventDefaultMouseMove: false,
  },
  {
    type: 'slider' as const,
    xAxisIndex: 0,
    show: options?.show ?? false,
    height: 20,
    bottom: 5,
    showDetail: false,
    backgroundColor: 'transparent',
    borderColor: chartColors.gridLine,
    fillerColor: 'rgba(23, 162, 184, 0.2)',
    handleStyle: {
      color: chartColors.primary,
      borderColor: chartColors.primary,
    },
    textStyle: {
      color: chartColors.axisLabel,
      fontSize: 10,
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// SERIES BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

export const stockLineSeries = (
  name: string,
  data: (number | null | undefined)[],
  color: string,
  options?: {
    showArea?: boolean;
    smooth?: boolean;
    lineWidth?: number;
    showSymbol?: boolean;
    symbolSize?: number;
    markLine?: {
      value: number;
      label: string;
      color?: string;
    };
  }
) => ({
  name,
  type: 'line' as const,
  data,
  smooth: options?.smooth ?? true,
  symbol: options?.showSymbol ? 'circle' : 'none',
  symbolSize: options?.symbolSize ?? 4,
  sampling: 'lttb' as const, // Largest-Triangle-Three-Buckets downsampling
  lineStyle: {
    color,
    width: options?.lineWidth ?? 2,
    type: 'solid' as const,
  },
  itemStyle: {
    color,
  },
  areaStyle: options?.showArea !== false
    ? {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: hexToRgba(color, 0.35) },
            { offset: 1, color: hexToRgba(color, 0.05) },
          ],
        },
      }
    : undefined,
  emphasis: {
    focus: 'series' as const,
    lineStyle: {
      width: (options?.lineWidth ?? 2) + 1,
    },
  },
  connectNulls: true,
  markLine: options?.markLine
    ? {
        silent: true,
        symbol: 'none',
        lineStyle: {
          type: 'solid' as const,
          color: options.markLine.color ?? chartColors.warning,
          width: 1.5,
        },
        label: {
          show: true,
          formatter: options.markLine.label,
          color: options.markLine.color ?? chartColors.warning,
          fontSize: 10,
          position: 'end' as const,
        },
        data: [{ yAxis: options.markLine.value }],
      }
    : undefined,
});

export const stockBarSeries = (
  name: string,
  data: (number | null | undefined)[],
  color: string,
  options?: {
    barWidth?: string;
    borderRadius?: number[];
    gradient?: boolean;
  }
) => ({
  name,
  type: 'bar' as const,
  data: data.map((value) => ({
    value,
    itemStyle: options?.gradient
      ? {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color },
              { offset: 1, color: hexToRgba(color, 0.6) },
            ],
          },
        }
      : { color },
  })),
  barWidth: options?.barWidth ?? '60%',
  itemStyle: {
    borderRadius: options?.borderRadius ?? [4, 4, 0, 0],
  },
  emphasis: {
    itemStyle: {
      shadowBlur: 10,
      shadowColor: hexToRgba(color, 0.5),
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// LEGEND CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const stockLegend = (options?: {
  show?: boolean;
  position?: 'top' | 'bottom';
  data?: string[];
}) => ({
  show: options?.show !== false,
  top: options?.position === 'bottom' ? undefined : 5,
  bottom: options?.position === 'bottom' ? 5 : undefined,
  textStyle: {
    color: chartColors.axisLabel,
    fontSize: 11,
  },
  icon: 'roundRect',
  itemWidth: 14,
  itemHeight: 3,
  itemGap: 16,
  data: options?.data,
});

// ═══════════════════════════════════════════════════════════════════════════
// COMPLETE CHART BUILDERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tạo stock-style line chart với nhiều series
 */
export const buildStockLineChart = (config: {
  xAxisData: string[];
  series: Array<{
    name: string;
    data: (number | null | undefined)[];
    color: string;
    showArea?: boolean;
  }>;
  yAxisUnit?: string;
  yAxisMin?: number | 'dataMin';
  yAxisMax?: number | 'dataMax';
  showLegend?: boolean;
  showZoom?: boolean;
  markLine?: { value: number; label: string; color?: string };
}) => ({
  ...baseChartOptions,
  tooltip: stockTooltip(config.series[0]?.color ?? chartColors.primary),
  legend: stockLegend({ show: config.showLegend }),
  grid: stockGrid({ bottom: (config.showZoom ?? false) ? '20%' : '12%' }),
  xAxis: stockXAxis(config.xAxisData),
  yAxis: stockYAxis({
    unit: config.yAxisUnit,
    min: config.yAxisMin,
    max: config.yAxisMax,
  }),
  dataZoom: stockDataZoom({ show: config.showZoom ?? false }),
  series: config.series.map((s) =>
    stockLineSeries(s.name, s.data, s.color, {
      showArea: s.showArea,
      markLine: config.markLine,
    })
  ),
});

/**
 * Tạo realtime live chart (60s rolling window)
 */
export const buildRealtimeLiveChart = (config: {
  labels: string[];
  values: (number | null)[];
  color: string;
  yAxisUnit?: string;
  yAxisMin?: number;
  yAxisMax?: number;
  title?: string;
}) => ({
  ...baseChartOptions,
  animationDuration: 100, // Fast animation for realtime
  tooltip: stockTooltip(config.color),
  grid: stockGrid({ top: '12%', bottom: '10%' }),
  xAxis: stockXAxis(config.labels, { showLabel: true, interval: Math.floor(config.labels.length / 6) }),
  yAxis: stockYAxis({
    unit: config.yAxisUnit,
    min: config.yAxisMin,
    max: config.yAxisMax,
  }),
  series: [
    stockLineSeries('Value', config.values, config.color, {
      smooth: true,
      showArea: true,
      lineWidth: 2,
    }),
  ],
});

/**
 * Tạo OEE multi-line chart (OEE + A + P + Q)
 */
export const buildOeeMultiLineChart = (config: {
  labels: string[];
  oeeData: (number | null | undefined)[];
  availabilityData: (number | null | undefined)[];
  performanceData: (number | null | undefined)[];
  qualityData: (number | null | undefined)[];
  showTarget?: boolean;
  targetValue?: number;
  showZoom?: boolean;
  locale?: 'vi' | 'en';
}) => {
  const locale = config.locale ?? 'vi';
  return {
    ...baseChartOptions,
    tooltip: stockTooltip(chartColors.primary),
    legend: stockLegend({
      data: [
        'OEE',
        locale === 'vi' ? 'Khả dụng' : 'Availability',
        locale === 'vi' ? 'Hiệu suất' : 'Performance',
        locale === 'vi' ? 'Chất lượng' : 'Quality',
      ],
    }),
    grid: stockGrid({ top: '18%', bottom: (config.showZoom ?? false) ? '20%' : '12%' }),
    xAxis: stockXAxis(config.labels),
    yAxis: stockYAxis({ unit: '%', min: 0, max: 100 }),
    dataZoom: stockDataZoom({ show: config.showZoom ?? false }),
    series: [
      stockLineSeries('OEE', config.oeeData, chartColors.primary, {
        showArea: true,
        lineWidth: 2.5,
        markLine: config.showTarget
          ? { value: config.targetValue ?? 85, label: `Target ${config.targetValue ?? 85}%`, color: chartColors.warning }
          : undefined,
      }),
      stockLineSeries(locale === 'vi' ? 'Khả dụng' : 'Availability', config.availabilityData, chartColors.success, {
        showArea: false,
        lineWidth: 1.5,
      }),
      stockLineSeries(locale === 'vi' ? 'Hiệu suất' : 'Performance', config.performanceData, chartColors.info, {
        showArea: false,
        lineWidth: 1.5,
      }),
      stockLineSeries(locale === 'vi' ? 'Chất lượng' : 'Quality', config.qualityData, chartColors.warning, {
        showArea: false,
        lineWidth: 1.5,
      }),
    ],
  };
};

/**
 * Tạo bar chart cho OEE by machine
 */
export const buildOeeByMachineChart = (config: {
  machines: string[];
  oeeValues: (number | null | undefined)[];
  targetValue?: number;
  locale?: 'vi' | 'en';
}) => {
  const locale = config.locale ?? 'vi';
  return {
    ...baseChartOptions,
    tooltip: stockTooltip(chartColors.primary),
    grid: stockGrid({ bottom: '15%' }),
    xAxis: {
      type: 'category' as const,
      data: config.machines,
      axisLine: { lineStyle: { color: chartColors.axisLine } },
      axisTick: { show: false },
      axisLabel: {
        color: chartColors.axisLabel,
        fontSize: 10,
        rotate: config.machines.length > 5 ? 25 : 0,
      },
    },
    yAxis: stockYAxis({ unit: '%', max: 100 }),
    series: [
      {
        name: 'OEE',
        type: 'bar' as const,
        data: config.oeeValues.map((value) => ({
          value,
          itemStyle: {
            color:
              value == null
                ? chartColors.axisLine
                : value >= 85
                ? chartColors.success
                : value >= 60
                ? chartColors.warning
                : chartColors.danger,
            borderRadius: [4, 4, 0, 0],
          },
        })),
        barWidth: '55%',
        label: {
          show: config.machines.length <= 8,
          position: 'top' as const,
          color: chartColors.textSecondary,
          fontSize: 10,
          formatter: (params: { value: number | null }) =>
            params.value != null ? `${Math.round(params.value)}%` : '',
        },
      },
      {
        name: locale === 'vi' ? 'Mục tiêu' : 'Target',
        type: 'line' as const,
        data: config.machines.map(() => config.targetValue ?? 85),
        symbol: 'none',
        lineStyle: {
          type: 'solid' as const,
          color: chartColors.warning,
          width: 2,
        },
      },
    ],
  };
};

/**
 * Tạo donut chart cho power distribution
 */
export const buildPowerDonutChart = (config: {
  data: Array<{ name: string; value: number }>;
  unit?: string;
  locale?: 'vi' | 'en';
}) => ({
  ...baseChartOptions,
  tooltip: {
    trigger: 'item' as const,
    backgroundColor: chartColors.tooltipBg,
    borderColor: chartColors.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: chartColors.textPrimary },
    formatter: (params: { name: string; value: number; percent: number }) =>
      `${params.name}<br/><strong>${params.value} ${config.unit ?? 'kW'}</strong> (${params.percent}%)`,
  },
  legend: {
    type: 'scroll' as const,
    orient: 'vertical' as const,
    left: '62%',
    right: '2%',
    top: 'center',
    textStyle: { color: chartColors.axisLabel, fontSize: 11 },
    pageTextStyle: { color: chartColors.axisLabel },
    pageIconColor: chartColors.primary,
    pageIconInactiveColor: chartColors.axisLine,
    formatter: (name: string) => (name.length > 18 ? `${name.slice(0, 17)}...` : name),
  },
  series: [
    {
      type: 'pie' as const,
      radius: ['50%', '75%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#0f172a',
        borderWidth: 2,
      },
      label: { show: false },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
          color: chartColors.textPrimary,
        },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0, 0, 0, 0.5)',
        },
      },
      labelLine: { show: false },
      data: config.data.map((item, index) => ({
        ...item,
        itemStyle: {
          color: [
            chartColors.primary,
            chartColors.success,
            chartColors.warning,
            chartColors.info,
            chartColors.purple,
            chartColors.danger,
          ][index % 6],
        },
      })),
    },
  ],
});

/**
 * Tạo gauge chart cho single metric (OEE, Health, etc.)
 */
export const buildGaugeChart = (config: {
  value: number;
  name?: string;
  min?: number;
  max?: number;
  thresholds?: { good: number; warning: number };
}) => {
  const thresholds = config.thresholds ?? { good: 85, warning: 60 };
  const value = config.value;
  const color =
    value >= thresholds.good
      ? chartColors.success
      : value >= thresholds.warning
      ? chartColors.warning
      : chartColors.danger;

  return {
    ...baseChartOptions,
    series: [
      {
        type: 'gauge' as const,
        startAngle: 200,
        endAngle: -20,
        min: config.min ?? 0,
        max: config.max ?? 100,
        splitNumber: 5,
        itemStyle: { color },
        progress: {
          show: true,
          width: 12,
          roundCap: true,
        },
        pointer: { show: false },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, chartColors.gridLine]],
          },
          roundCap: true,
        },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        title: {
          show: !!config.name,
          offsetCenter: [0, '70%'],
          color: chartColors.axisLabel,
          fontSize: 12,
        },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '20%'],
          fontSize: 28,
          fontWeight: 'bold',
          formatter: '{value}%',
          color,
        },
        data: [{ value, name: config.name }],
      },
    ],
  };
};

