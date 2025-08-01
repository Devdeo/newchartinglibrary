
import { CandleData } from '../TradingChart';

export const calculateHeikinAshi = (data: CandleData[]) => {
  const haData: any[] = [];
  
  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const prev = i > 0 ? haData[i - 1] : null;
    
    const haClose = (current.open + current.high + current.low + current.close) / 4;
    const haOpen = prev ? (prev.open + prev.close) / 2 : (current.open + current.close) / 2;
    const haHigh = Math.max(current.high, haOpen, haClose);
    const haLow = Math.min(current.low, haOpen, haClose);
    
    haData.push({
      date: current.date,
      open: haOpen,
      high: haHigh,
      low: haLow,
      close: haClose,
      volume: current.volume
    });
  }
  
  return haData;
};

export const formatOI = (value: number): string => {
  if (value >= 100000) {
    return (value / 100000).toFixed(1) + 'L';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toString();
};

export const formatChange = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return sign + formatOI(Math.abs(value));
};
