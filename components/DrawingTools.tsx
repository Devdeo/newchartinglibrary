
import React from 'react';

interface DrawingToolsProps {
  drawingMode: string;
  setDrawingMode: (mode: string) => void;
}

const DrawingTools: React.FC<DrawingToolsProps> = ({ drawingMode, setDrawingMode }) => {
  const tools = [
    { value: 'none', label: 'Select', icon: '🏺' },
    { value: 'line', label: 'Trend Line', icon: '📈' },
    { value: 'rectangle', label: 'Rectangle', icon: '▭' },
    { value: 'circle', label: 'Circle', icon: '○' },
    { value: 'fibonacci', label: 'Fibonacci', icon: '🌀' },
    { value: 'horizontal', label: 'Horizontal Line', icon: '—' },
    { value: 'vertical', label: 'Vertical Line', icon: '|' },
    { value: 'parallel', label: 'Parallel Channel', icon: '||' },
    { value: 'pitchfork', label: 'Andrews Pitchfork', icon: '🔱' },
    { value: 'gann', label: 'Gann Fan', icon: '🪁' },
    { value: 'triangle', label: 'Triangle', icon: '△' },
    { value: 'arrow', label: 'Arrow', icon: '➡️' },
    { value: 'text', label: 'Text', icon: 'T' }
  ];

  return (
    <div style={{
      position: 'absolute',
      top: '60px',
      left: '10px',
      backgroundColor: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      padding: '10px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000
    }}>
      <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Drawing Tools</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '5px' }}>
        {tools.map(tool => (
          <button
            key={tool.value}
            onClick={() => setDrawingMode(tool.value)}
            style={{
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: drawingMode === tool.value ? '#2196F3' : 'white',
              color: drawingMode === tool.value ? 'white' : 'black',
              cursor: 'pointer',
              fontSize: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              minWidth: '80px'
            }}
            title={tool.label}
          >
            <span style={{ fontSize: '16px' }}>{tool.icon}</span>
            <span>{tool.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DrawingTools;
