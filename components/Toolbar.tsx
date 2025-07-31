
import React, { useState } from 'react';
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

  const [showIndicatorConfig, setShowIndicatorConfig] = useState<string | null>(null);

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

  const handleIndicatorToggle = (indicator: string) => {
    const newIndicators = config.indicators.includes(indicator)
      ? config.indicators.filter(i => i !== indicator)
      : [...config.indicators, indicator];
    
    setConfig({ ...config, indicators: newIndicators });
  };

  const renderIndicatorConfig = (indicator: string) => {
    const indicatorConfig = config.indicatorConfig || {};
    
    const updateIndicatorConfig = (param: string, value: number) => {
      const newConfig = {
        ...config,
        indicatorConfig: {
          ...indicatorConfig,
          [indicator]: {
            ...indicatorConfig[indicator],
            [param]: value
          }
        }
      };
      setConfig(newConfig);
    };

    const getConfigValue = (param: string, defaultValue: number) => {
      return indicatorConfig[indicator]?.[param] || defaultValue;
    };

    switch (indicator) {
      case 'SMA':
        return (
          <div>
            <label>Period: </label>
            <input
              type="number"
              value={getConfigValue('period', 20)}
              onChange={(e) => updateIndicatorConfig('period', parseInt(e.target.value) || 20)}
              style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
              min="1"
              max="200"
            />
          </div>
        );
      
      case 'EMA':
        return (
          <div>
            <label>Period: </label>
            <input
              type="number"
              value={getConfigValue('period', 20)}
              onChange={(e) => updateIndicatorConfig('period', parseInt(e.target.value) || 20)}
              style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
              min="1"
              max="200"
            />
          </div>
        );
      
      case 'RSI':
        return (
          <div>
            <label>Period: </label>
            <input
              type="number"
              value={getConfigValue('period', 14)}
              onChange={(e) => updateIndicatorConfig('period', parseInt(e.target.value) || 14)}
              style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
              min="1"
              max="50"
            />
          </div>
        );
      
      case 'BB':
        return (
          <div>
            <div style={{ marginBottom: '5px' }}>
              <label>Period: </label>
              <input
                type="number"
                value={getConfigValue('period', 20)}
                onChange={(e) => updateIndicatorConfig('period', parseInt(e.target.value) || 20)}
                style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
                min="1"
                max="50"
              />
            </div>
            <div>
              <label>Std Dev: </label>
              <input
                type="number"
                step="0.1"
                value={getConfigValue('stdDev', 2)}
                onChange={(e) => updateIndicatorConfig('stdDev', parseFloat(e.target.value) || 2)}
                style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
                min="0.1"
                max="5"
              />
            </div>
          </div>
        );
      
      case 'MACD':
        return (
          <div>
            <div style={{ marginBottom: '5px' }}>
              <label>Fast Period: </label>
              <input
                type="number"
                value={getConfigValue('fastPeriod', 12)}
                onChange={(e) => updateIndicatorConfig('fastPeriod', parseInt(e.target.value) || 12)}
                style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
                min="1"
                max="50"
              />
            </div>
            <div style={{ marginBottom: '5px' }}>
              <label>Slow Period: </label>
              <input
                type="number"
                value={getConfigValue('slowPeriod', 26)}
                onChange={(e) => updateIndicatorConfig('slowPeriod', parseInt(e.target.value) || 26)}
                style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
                min="1"
                max="100"
              />
            </div>
            <div>
              <label>Signal Period: </label>
              <input
                type="number"
                value={getConfigValue('signalPeriod', 9)}
                onChange={(e) => updateIndicatorConfig('signalPeriod', parseInt(e.target.value) || 9)}
                style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
                min="1"
                max="50"
              />
            </div>
          </div>
        );
      
      default:
        return <div>No configuration available for this indicator.</div>;
    }
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
            <div key={indicator.value} style={{ position: 'relative' }}>
              <button
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
              {config.indicators.includes(indicator.value) && (
                <button
                  onClick={() => setShowIndicatorConfig(showIndicatorConfig === indicator.value ? null : indicator.value)}
                  style={{
                    marginLeft: '2px',
                    padding: '5px 8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    backgroundColor: '#fff',
                    color: '#666',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  ⚙️
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Indicator Configuration Panel */}
        {showIndicatorConfig && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '15px',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            minWidth: '300px'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>Configure {showIndicatorConfig}</h4>
            {renderIndicatorConfig(showIndicatorConfig)}
            <button
              onClick={() => setShowIndicatorConfig(null)}
              style={{
                marginTop: '10px',
                padding: '5px 10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: '#f5f5f5',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
