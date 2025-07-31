import React, { useEffect, useState } from 'react';

interface DrawingToolsProps {
  drawingMode: string;
  setDrawingMode: (mode: string) => void;
}

const DrawingTools: React.FC<DrawingToolsProps> = ({ drawingMode, setDrawingMode }) => {
  const [isLargeScreen, setIsLargeScreen] = useState(true);

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
    <div 
      style={{
        position: 'absolute',
        left: isLargeScreen ? '10px' : '5px',
        top: isLargeScreen ? '50px' : '10px',
        width: isLargeScreen ? '180px' : '150px',
        maxWidth: isLargeScreen ? '180px' : '150px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: isLargeScreen ? '8px' : '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: isLargeScreen ? '11px' : '10px',
        maxHeight: isLargeScreen ? 'none' : '80vh',
        overflowY: isLargeScreen ? 'visible' : 'auto'
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textAlign: 'center' }}>Drawing Tools</h4>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isLargeScreen ? '1fr' : '1fr 1fr', 
        gap: isLargeScreen ? '3px' : '2px' 
      }}>
        {tools.map(tool => (
          <button
            key={tool.value}
            onClick={() => setDrawingMode(tool.value)}
            style={{
              padding: isLargeScreen ? '6px 8px' : '4px 6px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              backgroundColor: drawingMode === tool.value ? '#2196F3' : 'white',
              color: drawingMode === tool.value ? 'white' : 'black',
              cursor: 'pointer',
              fontSize: isLargeScreen ? '11px' : '9px',
              display: 'flex',
              flexDirection: isLargeScreen ? 'row' : 'column',
              alignItems: 'center',
              justifyContent: isLargeScreen ? 'flex-start' : 'center',
              gap: isLargeScreen ? '6px' : '2px',
              width: '100%',
              textAlign: isLargeScreen ? 'left' : 'center',
              minHeight: isLargeScreen ? '32px' : '40px'
            }}
            title={tool.label}
          >
            <span style={{ fontSize: '14px' }}>{tool.icon}</span>
            <span style={{ 
              whiteSpace: isLargeScreen ? 'nowrap' : 'normal', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              maxWidth: '100%',
              fontSize: isLargeScreen ? 'inherit' : '8px',
              lineHeight: isLargeScreen ? 'normal' : '1.1'
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