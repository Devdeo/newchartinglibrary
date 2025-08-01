
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
    showOI: true // Enable OI by default to show the histogram
  });
  const [drawingMode, setDrawingMode] = useState<string>('none');
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    // Generate sample data
    const sampleData = generateSampleData();
    setData(sampleData);
    
    // Generate OI data
    const sampleOI = generateOIData();
    setOiData(sampleOI);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        setIsLargeScreen(window.innerWidth > 768);
      }
    };

    // Set initial value
    if (typeof window !== 'undefined') {
      setIsLargeScreen(window.innerWidth > 768);
      
      // Add event listener
      window.addEventListener('resize', handleResize);
    }

    // Cleanup
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const generateSampleData = (): CandleData[] => {
    const data: CandleData[] = [];
    let price = 100; // Start with simple price of 100
    const startDate = new Date('2023-01-01');

    for (let i = 0; i < 100; i++) { // Reduced to 100 days for simplicity
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);

      // Simple price movements - up or down by 1-5
      const change = Math.floor((Math.random() - 0.5) * 10); // -5 to +5
      const open = price;
      price += change;
      const close = price;
      
      // Simple high/low calculation
      const high = Math.max(open, close) + Math.floor(Math.random() * 3); // +0 to +2
      const low = Math.min(open, close) - Math.floor(Math.random() * 3); // -0 to -2
      const volume = Math.floor(Math.random() * 1000) + 100; // 100-1100

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
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 100;
    
    // Generate simple strikes around current price with gap of 5
    for (let i = -10; i <= 10; i++) {
      const strikePrice = currentPrice + (i * 5); // Strike every 5 points
      
      // Simple OI values based on distance from current price
      let ceOI, peOI;
      const distance = Math.abs(i);
      
      if (distance === 0) {
        // ATM strikes
        ceOI = 50;
        peOI = 50;
      } else if (distance <= 2) {
        // Near ATM
        ceOI = 40;
        peOI = 40;
      } else if (distance <= 5) {
        // Moderate OTM
        ceOI = 30;
        peOI = 30;
      } else {
        // Deep OTM
        ceOI = 10;
        peOI = 10;
      }
      
      // Simple change values
      const ceChange = Math.floor((Math.random() - 0.5) * 10); // -5 to +5
      const peChange = Math.floor((Math.random() - 0.5) * 10); // -5 to +5
      
      oiData.push({
        strikePrice,
        ce: {
          oi: ceOI,
          changeOI: ceChange
        },
        pe: {
          oi: peOI,
          changeOI: peChange
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
      <div style={{ display: 'flex', height: '750px', position: 'relative' }}>
        <DrawingTools 
          drawingMode={drawingMode}
          setDrawingMode={setDrawingMode}
        />
        <div ref={chartRef} style={{ 
          flex: 1, 
          height: '100%',
          marginLeft: isLargeScreen ? '100px' : '70px', // Increased margin to avoid overlap with drawing tools
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
    </div>
  );
};

export default TradingChart;
