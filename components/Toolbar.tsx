
import React from 'react';
import { ChartConfig } from './TradingChart';

interface ToolbarProps {
  config: ChartConfig;
  setConfig: (config: ChartConfig) => void;
  drawingMode: string;
  setDrawingMode: (mode: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ config, setConfig, drawingMode, setDrawingMode }) => {
  const chartTypes = [
    { value: 'candlestick', label: 'Candlestick' },
    { value: 'line', label: 'Line' },
    { value: 'area', label: 'Area' },
    { value: 'bar', label: 'Bar' },
    { value: 'heikinashi', label: 'Heikin Ashi' }
  ];

  const indicators = [
    { value: 'SMA', label: 'Simple Moving Average' },
    { value: 'EMA', label: 'Exponential Moving Average' },
    { value: 'MACD', label: 'MACD' },
    { value: 'RSI', label: 'RSI' },
    { value: 'BB', label: 'Bollinger Bands' },
    { value: 'STOCH', label: 'Stochastic' },
    { value: 'ADX', label: 'ADX' },
    { value: 'CCI', label: 'Commodity Channel Index' },
    { value: 'WILLIAMS', label: 'Williams %R' }
  ];

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

  const handleIndicatorToggle = (indicator: string) => {
    const newIndicators = config.indicators.includes(indicator)
      ? config.indicators.filter(i => i !== indicator)
      : [...config.indicators, indicator];
    
    setConfig({ ...config, indicators: newIndicators });
  };

  return (
    <div style={{ 
      padding: '10px', 
      backgroundColor: '#f5f5f5', 
      borderBottom: '1px solid #ddd',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '10px',
      alignItems: 'center'
    }}>
      {/* Symbol Input */}
      <div>
        <label>Symbol: </label>
        <input
          type="text"
          value={config.symbol}
          onChange={(e) => setConfig({ ...config, symbol: e.target.value })}
          style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>

      {/* Timeframe */}
      <div>
        <label>Timeframe: </label>
        <select
          value={config.timeframe}
          onChange={(e) => setConfig({ ...config, timeframe: e.target.value })}
          style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          {timeframes.map(tf => (
            <option key={tf} value={tf}>{tf}</option>
          ))}
        </select>
      </div>

      {/* Chart Type */}
      <div>
        <label>Chart Type: </label>
        <select
          value={config.chartType}
          onChange={(e) => setConfig({ ...config, chartType: e.target.value as any })}
          style={{ padding: '5px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          {chartTypes.map(type => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </select>
      </div>

      {/* Indicators */}
      <div>
        <label>Indicators: </label>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {indicators.map(indicator => (
            <button
              key={indicator.value}
              onClick={() => handleIndicatorToggle(indicator.value)}
              style={{
                padding: '5px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: config.indicators.includes(indicator.value) ? '#2196F3' : 'white',
                color: config.indicators.includes(indicator.value) ? 'white' : 'black',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {indicator.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
