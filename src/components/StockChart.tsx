'use client';

import type { CSSProperties } from 'react';
import ReactECharts from 'echarts-for-react';

export function StockChart({
  option,
  style,
  className,
}: {
  option: unknown;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <ReactECharts
      option={option as object}
      style={style}
      className={className}
      opts={{ renderer: 'canvas' }}
      notMerge={false}
      lazyUpdate
    />
  );
}

