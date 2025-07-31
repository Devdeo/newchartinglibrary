
import React, { useEffect, useState } from 'react';

interface DrawingToolsProps {
  drawingMode: string;
  setDrawingMode: (mode: string) => void;
}

const DrawingTools: React.FC<DrawingToolsProps> = ({ drawingMode, setDrawingMode }) => {
  const [isLargeScreen, setIsLargeScreen] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth > 768);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
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
      padding: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 1000,
      width: 'min(180px, calc(100vw - 20px))',
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textAlign: 'center' }}>Drawing Tools</h4>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isLargeScreen ? '1fr' : 'repeat(2, 1fr)', 
        gap: '3px' 
      }}>
        {tools.map(tool => (
          <button
            key={tool.value}
            onClick={() => setDrawingMode(tool.value)}
            style={{
              padding: isLargeScreen ? '6px 8px' : '4px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              backgroundColor: drawingMode === tool.value ? '#2196F3' : 'white',
              color: drawingMode === tool.value ? 'white' : 'black',
              cursor: 'pointer',
              fontSize: isLargeScreen ? '11px' : '9px',
              display: 'flex',
              flexDirection: isLargeScreen ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isLargeScreen ? '6px' : '2px',
              width: '100%',
              textAlign: 'center',
              minHeight: '32px'
            }}
            title={tool.label}
          >
            <span style={{ fontSize: isLargeScreen ? '14px' : '12px' }}>{tool.icon}</span>
            <span style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {isLargeScreen ? tool.label : tool.label.split(' ')[0]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DrawingTools;
