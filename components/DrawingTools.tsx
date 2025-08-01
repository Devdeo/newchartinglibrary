
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
    { value: 'none', label: 'Select', icon: '👆' },
    { value: 'line', label: 'Trend Line', icon: '📈' },
    { value: 'rectangle', label: 'Rectangle', icon: '▭' },
    { value: 'circle', label: 'Circle', icon: '○' },
    { value: 'fibonacci', label: 'Fibonacci', icon: '🌀' },
    { value: 'horizontal', label: 'Horizontal Line', icon: '━' },
    { value: 'vertical', label: 'Vertical Line', icon: '┃' },
    { value: 'parallel', label: 'Parallel Channel', icon: '═' },
    { value: 'pitchfork', label: 'Andrews Pitchfork', icon: '🔱' },
    { value: 'gann', label: 'Gann Fan', icon: '📐' },
    { value: 'triangle', label: 'Triangle', icon: '△' },
    { value: 'arrow', label: 'Arrow', icon: '➡️' },
    { value: 'text', label: 'Text', icon: '📝' }
  ];

  return (
    <div 
      style={{
        position: 'absolute',
        left: isLargeScreen ? '20px' : '10px',
        top: isLargeScreen ? '20px' : '10px',
        width: isLargeScreen ? '60px' : '50px',
        maxWidth: isLargeScreen ? '60px' : '50px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: isLargeScreen ? '8px' : '6px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        fontSize: isLargeScreen ? '11px' : '10px',
        maxHeight: isLargeScreen ? 'none' : '80vh',
        overflowY: isLargeScreen ? 'visible' : 'auto',
        pointerEvents: 'auto' // Ensure clicks are captured by the toolbar
      }}
    >
      <h4 style={{ margin: '0 0 8px 0', fontSize: '10px', textAlign: 'center' }}>Tools</h4>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr', 
        gap: isLargeScreen ? '4px' : '3px' 
      }}>
        {tools.map(tool => (
          <button
            key={tool.value}
            onClick={(e) => {
              e.stopPropagation();
              setDrawingMode(tool.value);
            }}
            style={{
              padding: isLargeScreen ? '8px' : '6px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: drawingMode === tool.value ? '#2196F3' : 'white',
              color: drawingMode === tool.value ? 'white' : 'black',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              minHeight: '36px',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto'
            }}
            title={tool.label}
            onMouseEnter={(e) => {
              if (drawingMode !== tool.value) {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }
            }}
            onMouseLeave={(e) => {
              if (drawingMode !== tool.value) {
                e.currentTarget.style.backgroundColor = 'white';
              }
            }}
          >
            <span>{tool.icon}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default DrawingTools;
