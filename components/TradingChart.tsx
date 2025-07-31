
import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import * as TI from 'technicalindicators';
import ChartRenderer from './ChartRenderer';
import Toolbar from './Toolbar';
import DrawingTools from './DrawingTools';

export interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ChartConfig {
  chartType: 'candlestick' | 'line' | 'area' | 'bar' | 'heikinashi';
  indicators: string[];
  timeframe: string;
  symbol: string;
}

const TradingChart: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CandleData[]>([]);
  const [config, setConfig] = useState<ChartConfig>({
    chartType: 'candlestick',
    indicators: [],
    timeframe: '1D',
    symbol: 'BTCUSDT'
  });
  const [drawingMode, setDrawingMode] = useState<string>('none');

  useEffect(() => {
    // Generate sample data
    const sampleData = generateSampleData();
    setData(sampleData);
  }, []);

  const generateSampleData = (): CandleData[] => {
    const data: CandleData[] = [];
    let price = 50000;
    const startDate = new Date('2023-01-01');

    for (let i = 0; i < 365; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      const change = (Math.random() - 0.5) * 1000;
      const open = price;
      price += change;
      const close = price;
      const high = Math.max(open, close) + Math.random() * 500;
      const low = Math.min(open, close) - Math.random() * 500;
      const volume = Math.random() * 1000000;

      data.push({
        date,
        open,
        high,
        low,
        close,
        volume
      });
    }

    return data;
  };

  return (
    <div style={{ width: '100%', height: '800px', position: 'relative' }}>
      <Toolbar 
        config={config} 
        setConfig={setConfig}
        drawingMode={drawingMode}
        setDrawingMode={setDrawingMode}
      />
      <div ref={chartRef} style={{ width: '100%', height: '750px' }}>
        <ChartRenderer 
          data={data}
          config={config}
          chartRef={chartRef}
          drawingMode={drawingMode}
        />
      </div>
      <DrawingTools 
        drawingMode={drawingMode}
        setDrawingMode={setDrawingMode}
      />
    </div>
  );
};

export default TradingChart;
