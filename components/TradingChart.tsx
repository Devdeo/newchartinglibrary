
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

export interface IndicatorInstance {
  id: string;
  type: string;
  label: string;
  color: string;
  params: { [key: string]: any };
}

export interface ChartConfig {
  chartType: 'candlestick' | 'line' | 'area' | 'bar' | 'heikinashi';
  indicators: string[];
  timeframe: string;
  symbol: string;
  showOI: boolean;
  appliedIndicators?: IndicatorInstance[];
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
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 50000;
    const strikeGap = 100;
    
    // Generate strikes from -15% to +15% of current price
    for (let i = -30; i <= 30; i++) {
      const strikePrice = Math.round((currentPrice + (i * strikeGap)) / 100) * 100; // Round to nearest 100
      const distanceFromMoney = Math.abs(strikePrice - currentPrice);
      
      // Higher OI for strikes closer to current price
      const baseOI = Math.max(1000, 15000 - (distanceFromMoney / 100) * 300);
      const oiVariation = 0.3; // 30% variation
      
      // CE tends to have higher OI for OTM (strikes above current price)
      const ceMultiplier = strikePrice > currentPrice ? 1.2 : 0.8;
      // PE tends to have higher OI for OTM (strikes below current price)  
      const peMultiplier = strikePrice < currentPrice ? 1.2 : 0.8;
      
      const ceOI = Math.floor((baseOI * ceMultiplier) * (1 + (Math.random() - 0.5) * oiVariation));
      const peOI = Math.floor((baseOI * peMultiplier) * (1 + (Math.random() - 0.5) * oiVariation));
      
      // Changes tend to be smaller for ATM strikes
      const changeVariation = Math.min(2000, distanceFromMoney / 10);
      
      oiData.push({
        strikePrice,
        ce: {
          oi: Math.max(500, ceOI),
          changeOI: Math.floor((Math.random() - 0.5) * changeVariation)
        },
        pe: {
          oi: Math.max(500, peOI),
          changeOI: Math.floor((Math.random() - 0.5) * changeVariation)
        }
      });
    }
    
    return oiData.sort((a, b) => a.strikePrice - b.strikePrice);
  };

  return (
    <div style={{ width: '100%', height: '800px', position: 'relative' }}>
      <Toolbar 
        config={config} 
        setConfig={setConfig}
        drawingMode={drawingMode}
        setDrawingMode={setDrawingMode}
      />
      <div style={{ display: 'flex', height: '750px' }}>
        <div ref={chartRef} style={{ 
          flex: 1, 
          height: '100%',
          marginLeft: window.innerWidth > 768 ? '200px' : '20px',
          marginRight: '10px'
        }}>
          <ChartRenderer 
            data={data}
            oiData={oiData}
            config={config}
            chartRef={chartRef}
            drawingMode={drawingMode}
          />
        </div>
      </div>
      <DrawingTools 
        drawingMode={drawingMode}
        setDrawingMode={setDrawingMode}
      />
    </div>
  );
};

export default TradingChart;
