
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

export interface OIData {
  strikePrice: number;
  ce: {
    oi: number;
    changeOI: number;
  };
  pe: {
    oi: number;
    changeOI: number;
  };
}

export interface ChartConfig {
  chartType: 'candlestick' | 'line' | 'area' | 'bar' | 'heikinashi';
  indicators: string[];
  timeframe: string;
  symbol: string;
  showOI: boolean;
  indicatorConfig?: {
    [key: string]: {
      [param: string]: number;
    };
  };
}

const TradingChart: React.FC = () => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<CandleData[]>([]);
  const [oiData, setOiData] = useState<OIData[]>([]);
  const [config, setConfig] = useState<ChartConfig>({
    chartType: 'candlestick',
    indicators: [],
    timeframe: '1D',
    symbol: 'BTCUSDT',
    showOI: false
  });
  const [drawingMode, setDrawingMode] = useState<string>('none');

  useEffect(() => {
    // Generate sample data
    const sampleData = generateSampleData();
    setData(sampleData);
    
    // Generate OI data
    const sampleOI = generateOIData();
    setOiData(sampleOI);
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

  const generateOIData = (): OIData[] => {
    const oiData: OIData[] = [];
    const basePrice = 50000;
    const strikeGap = 500;
    
    // Generate strikes from -20% to +20% of base price
    for (let i = -20; i <= 20; i++) {
      const strikePrice = basePrice + (i * strikeGap);
      
      oiData.push({
        strikePrice,
        ce: {
          oi: Math.floor(Math.random() * 10000) + 1000,
          changeOI: Math.floor((Math.random() - 0.5) * 2000)
        },
        pe: {
          oi: Math.floor(Math.random() * 10000) + 1000,
          changeOI: Math.floor((Math.random() - 0.5) * 2000)
        }
      });
    }
    
    return oiData;
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
          oiData={oiData}
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
