
import React, { useState } from 'react';
import { ChartConfig } from './TradingChart';

interface ToolbarProps {
  config: ChartConfig;
  setConfig: (config: ChartConfig) => void;
  drawingMode: string;
  setDrawingMode: (mode: string) => void;
}

interface IndicatorInstance {
  id: string;
  type: string;
  label: string;
  color: string;
  params: { [key: string]: any };
}

const Toolbar: React.FC<ToolbarProps> = ({ config, setConfig, drawingMode, setDrawingMode }) => {
  const chartTypes = [
    { value: 'candlestick', label: 'Candlestick' },
    { value: 'line', label: 'Line' },
    { value: 'area', label: 'Area' },
    { value: 'bar', label: 'Bar' },
    { value: 'heikinashi', label: 'Heikin Ashi' }
  ];

  const availableIndicators = [
    { value: 'SMA', label: 'Simple Moving Average', defaultColor: '#FF9800' },
    { value: 'EMA', label: 'Exponential Moving Average', defaultColor: '#9C27B0' },
    { value: 'MACD', label: 'MACD', defaultColor: '#2196F3' },
    { value: 'RSI', label: 'RSI', defaultColor: '#9C27B0' },
    { value: 'BB', label: 'Bollinger Bands', defaultColor: '#2196F3' },
    { value: 'STOCH', label: 'Stochastic', defaultColor: '#FF5722' },
    { value: 'ADX', label: 'ADX', defaultColor: '#4CAF50' },
    { value: 'CCI', label: 'Commodity Channel Index', defaultColor: '#FF9800' },
    { value: 'WILLIAMS', label: 'Williams %R', defaultColor: '#795548' }
  ];

  const [showIndicatorDropdown, setShowIndicatorDropdown] = useState(false);
  const [showIndicatorConfig, setShowIndicatorConfig] = useState<string | null>(null);
  const [selectedIndicator, setSelectedIndicator] = useState('');

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W', '1M'];

  // Get applied indicators from config
  const appliedIndicators: IndicatorInstance[] = config.appliedIndicators || [];

  const generateIndicatorId = (type: string) => {
    const existingCount = appliedIndicators.filter(ind => ind.type === type).length;
    return `${type}_${existingCount + 1}`;
  };

  const addIndicator = (indicatorType: string) => {
    const indicator = availableIndicators.find(ind => ind.value === indicatorType);
    if (!indicator) return;

    const newIndicator: IndicatorInstance = {
      id: generateIndicatorId(indicatorType),
      type: indicatorType,
      label: `${indicator.label}`,
      color: indicator.defaultColor,
      params: getDefaultParams(indicatorType)
    };

    const newAppliedIndicators = [...appliedIndicators, newIndicator];
    setConfig({ 
      ...config, 
      appliedIndicators: newAppliedIndicators,
      indicators: newAppliedIndicators.map(ind => ind.type) // Keep legacy compatibility
    });
    setShowIndicatorDropdown(false);
    setSelectedIndicator('');
  };

  const removeIndicator = (indicatorId: string) => {
    const newAppliedIndicators = appliedIndicators.filter(ind => ind.id !== indicatorId);
    setConfig({ 
      ...config, 
      appliedIndicators: newAppliedIndicators,
      indicators: newAppliedIndicators.map(ind => ind.type) // Keep legacy compatibility
    });
  };

  const updateIndicator = (indicatorId: string, updates: Partial<IndicatorInstance>) => {
    const newAppliedIndicators = appliedIndicators.map(ind => 
      ind.id === indicatorId ? { ...ind, ...updates } : ind
    );
    setConfig({ 
      ...config, 
      appliedIndicators: newAppliedIndicators,
      indicators: newAppliedIndicators.map(ind => ind.type) // Keep legacy compatibility
    });
  };

  const getDefaultParams = (indicatorType: string) => {
    switch (indicatorType) {
      case 'SMA':
      case 'EMA':
        return { period: 20 };
      case 'RSI':
        return { period: 14 };
      case 'BB':
        return { period: 20, stdDev: 2 };
      case 'MACD':
        return { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };
      case 'STOCH':
        return { kPeriod: 14, dPeriod: 3 };
      case 'ADX':
        return { period: 14 };
      case 'CCI':
        return { period: 20 };
      case 'WILLIAMS':
        return { period: 14 };
      default:
        return {};
    }
  };

  const renderIndicatorParams = (indicator: IndicatorInstance) => {
    const updateParam = (param: string, value: any) => {
      updateIndicator(indicator.id, {
        params: { ...indicator.params, [param]: value }
      });
    };

    switch (indicator.type) {
      case 'SMA':
      case 'EMA':
        return (
          <div>
            <label>Period: </label>
            <input
              type="number"
              value={indicator.params.period || 20}
              onChange={(e) => updateParam('period', parseInt(e.target.value) || 20)}
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
              value={indicator.params.period || 14}
              onChange={(e) => updateParam('period', parseInt(e.target.value) || 14)}
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
                value={indicator.params.period || 20}
                onChange={(e) => updateParam('period', parseInt(e.target.value) || 20)}
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
                value={indicator.params.stdDev || 2}
                onChange={(e) => updateParam('stdDev', parseFloat(e.target.value) || 2)}
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
                value={indicator.params.fastPeriod || 12}
                onChange={(e) => updateParam('fastPeriod', parseInt(e.target.value) || 12)}
                style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
                min="1"
                max="50"
              />
            </div>
            <div style={{ marginBottom: '5px' }}>
              <label>Slow Period: </label>
              <input
                type="number"
                value={indicator.params.slowPeriod || 26}
                onChange={(e) => updateParam('slowPeriod', parseInt(e.target.value) || 26)}
                style={{ width: '60px', padding: '3px', marginLeft: '5px' }}
                min="1"
                max="100"
              />
            </div>
            <div>
              <label>Signal Period: </label>
              <input
                type="number"
                value={indicator.params.signalPeriod || 9}
                onChange={(e) => updateParam('signalPeriod', parseInt(e.target.value) || 9)}
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

      {/* Show OI Data */}
      <div>
        <label>
          <input
            type="checkbox"
            checked={config.showOI}
            onChange={(e) => setConfig({ ...config, showOI: e.target.checked })}
            style={{ marginRight: '5px' }}
          />
          Show OI Data
        </label>
      </div>

      {/* Indicator Dropdown */}
      <div style={{ position: 'relative' }}>
        <label>Indicators: </label>
        <button
          onClick={() => setShowIndicatorDropdown(!showIndicatorDropdown)}
          style={{
            padding: '5px 10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            marginLeft: '5px'
          }}
        >
          Add Indicator ▼
        </button>

        {showIndicatorDropdown && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: '4px',
            zIndex: 1000,
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
            minWidth: '200px'
          }}>
            {availableIndicators.map(indicator => (
              <button
                key={indicator.value}
                onClick={() => addIndicator(indicator.value)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '12px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                {indicator.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Applied Indicators */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
        {appliedIndicators.map(indicator => (
          <div key={indicator.id} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <div style={{
              padding: '4px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div 
                style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: indicator.color,
                  borderRadius: '2px'
                }}
              />
              <span>{indicator.label}</span>
              <button
                onClick={() => setShowIndicatorConfig(showIndicatorConfig === indicator.id ? null : indicator.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  fontSize: '10px'
                }}
              >
                ⚙️
              </button>
              <button
                onClick={() => removeIndicator(indicator.id)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  fontSize: '10px',
                  color: '#f44336'
                }}
              >
                ✕
              </button>
            </div>

            {showIndicatorConfig === indicator.id && (
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
                <h4 style={{ margin: '0 0 10px 0' }}>Configure {indicator.label}</h4>
                
                {/* Color Picker */}
                <div style={{ marginBottom: '10px' }}>
                  <label>Color: </label>
                  <input
                    type="color"
                    value={indicator.color}
                    onChange={(e) => updateIndicator(indicator.id, { color: e.target.value })}
                    style={{ marginLeft: '5px' }}
                  />
                </div>

                {/* Parameters */}
                {renderIndicatorParams(indicator)}

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
        ))}
      </div>
    </div>
  );
};

export default Toolbar;
