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
    // handleResize(); // Removed initial call to avoid SSR issues

    // Add event listener
    // window.addEventListener('resize', handleResize); // Removed window event listener to avoid SSR issues

    // Cleanup
    // return () => window.removeEventListener('resize', handleResize); // No need to remove listener
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
        left: '10px',
        top: '50px',
        width: '180px',
        maxWidth: '180px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: '11px'
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', textAlign: 'center' }}>Drawing Tools</h4>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr', 
        gap: '3px' 
      }}>
        {tools.map(tool => (
          <button
            key={tool.value}
            onClick={() => setDrawingMode(tool.value)}
            style={{
              padding: '6px 8px',
              border: '1px solid #ddd',
              borderRadius: '3px',
              backgroundColor: drawingMode === tool.value ? '#2196F3' : 'white',
              color: drawingMode === tool.value ? 'white' : 'black',
              cursor: 'pointer',
              fontSize: '11px',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '6px',
              width: '100%',
              textAlign: 'left',
              minHeight: '32px'
            }}
            title={tool.label}
          >
            <span style={{ fontSize: '14px' }}>{tool.icon}</span>
            <span style={{ 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis',
              maxWidth: '100%'
            }}>
              {tool.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DrawingTools;