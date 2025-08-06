import * as d3 from 'd3';
import { DrawingObject } from './types';

export const renderTrendLine = (g: any, drawing: any, xScale: any, yScale: any) => {
  g.append("line")
    .attr("class", "drawing trend-line")
    .attr("x1", xScale(drawing.start.x))
    .attr("y1", yScale(drawing.start.y))
    .attr("x2", xScale(drawing.end.x))
    .attr("y2", yScale(drawing.end.y))
    .attr("stroke", "#FF5722")
    .attr("stroke-width", 2);
};

export const renderRectangle = (g: any, drawing: any, xScale: any, yScale: any) => {
  const x = Math.min(xScale(drawing.start.x), xScale(drawing.end.x));
  const y = Math.min(yScale(drawing.start.y), yScale(drawing.end.y));
  const width = Math.abs(xScale(drawing.end.x) - xScale(drawing.start.x));
  const height = Math.abs(yScale(drawing.end.y) - yScale(drawing.start.y));

  g.append("rect")
    .attr("class", "drawing rectangle")
    .attr("x", x)
    .attr("y", y)
    .attr("width", width)
    .attr("height", height)
    .attr("fill", "rgba(255, 87, 34, 0.2)")
    .attr("stroke", "#FF5722")
    .attr("stroke-width", 2);
};

export const renderFibonacci = (g: any, drawing: any, xScale: any, yScale: any) => {
  const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
  const startY = yScale(drawing.start.y);
  const endY = yScale(drawing.end.y);
  const diff = endY - startY;

  fibLevels.forEach((level, i) => {
    const y = startY + diff * level;

    g.append("line")
      .attr("class", "drawing fibonacci")
      .attr("x1", xScale(drawing.start.x))
      .attr("x2", xScale(drawing.end.x))
      .attr("y1", y)
      .attr("y2", y)
      .attr("stroke", "#9C27B0")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2");

    g.append("text")
      .attr("class", "drawing fibonacci-label")
      .attr("x", xScale(drawing.end.x) + 5)
      .attr("y", y)
      .attr("dy", "0.35em")
      .attr("fill", "#9C27B0")
      .attr("font-size", "12px")
      .text(`${(level * 100).toFixed(1)}%`);
  });
};

export const renderDrawingPreview = (g: any, drawing: any, xScale: any, yScale: any) => {
  // Clear any existing preview
  g.selectAll(".drawing-preview-layer").remove();

  const previewLayer = g.append("g")
    .attr("class", "drawing-preview-layer")
    .style("pointer-events", "none")
    .attr("clip-path", "url(#chart-clip)");

  switch (drawing.type) {
    case 'line':
      previewLayer.append("line")
        .attr("class", "drawing-preview")
        .attr("x1", xScale(drawing.start.x))
        .attr("y1", yScale(drawing.start.y))
        .attr("x2", xScale(drawing.end.x))
        .attr("y2", yScale(drawing.end.y))
        .attr("stroke", "#FF5722")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .attr("stroke-dasharray", "5,5");
      break;
    case 'rectangle':
      const x = Math.min(xScale(drawing.start.x), xScale(drawing.end.x));
      const y = Math.min(yScale(drawing.start.y), yScale(drawing.end.y));
      const width = Math.abs(xScale(drawing.end.x) - xScale(drawing.start.x));
      const height = Math.abs(yScale(drawing.end.y) - yScale(drawing.start.y));

      previewLayer.append("rect")
        .attr("class", "drawing-preview")
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "rgba(255, 87, 34, 0.1)")
        .attr("stroke", "#FF5722")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .attr("stroke-dasharray", "5,5");
      break;
    case 'circle':
      const centerX = xScale(drawing.start.x);
      const centerY = yScale(drawing.start.y);
      const radius = Math.sqrt(
        Math.pow(xScale(drawing.end.x) - centerX, 2) + 
        Math.pow(yScale(drawing.end.y) - centerY, 2)
      );

      previewLayer.append("circle")
        .attr("class", "drawing-preview")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", radius)
        .attr("fill", "rgba(255, 87, 34, 0.1)")
        .attr("stroke", "#FF5722")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .attr("stroke-dasharray", "5,5");
      break;
    case 'horizontal':
      previewLayer.append("line")
        .attr("class", "drawing-preview")
        .attr("x1", xScale.range()[0])
        .attr("x2", xScale.range()[1])
        .attr("y1", yScale(drawing.start.y))
        .attr("y2", yScale(drawing.start.y))
        .attr("stroke", "#FF5722")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .attr("stroke-dasharray", "5,5");
      break;
    case 'vertical':
      previewLayer.append("line")
        .attr("class", "drawing-preview")
        .attr("x1", xScale(drawing.start.x))
        .attr("x2", xScale(drawing.start.x))
        .attr("y1", yScale.range()[0])
        .attr("y2", yScale.range()[1])
        .attr("stroke", "#FF5722")
        .attr("stroke-width", 2)
        .attr("opacity", 0.8)
        .attr("stroke-dasharray", "5,5");
      break;
  }
};

export const renderDrawings = (g: any, drawings: DrawingObject[], xScale: any, yScale: any) => {
  g.selectAll(".drawing").remove();
  g.selectAll(".drawings-layer").remove();

  if (drawings.length === 0) return;

  const drawingsLayer = g.append("g")
    .attr("class", "drawings-layer")
    .attr("clip-path", "url(#chart-clip)")
    .style("pointer-events", "all");

  drawings.forEach(drawing => {
    switch (drawing.type) {
      case 'line':
        renderTrendLine(drawingsLayer, drawing, xScale, yScale);
        break;
      case 'rectangle':
        renderRectangle(drawingsLayer, drawing, xScale, yScale);
        break;
      case 'circle':
        renderCircle(drawingsLayer, drawing, xScale, yScale);
        break;
      case 'horizontal':
        renderHorizontalLine(drawingsLayer, drawing, xScale, yScale);
        break;
      case 'vertical':
        renderVerticalLine(drawingsLayer, drawing, xScale, yScale);
        break;
      case 'fibonacci':
        renderFibonacci(drawingsLayer, drawing, xScale, yScale);
        break;
    }
  });
};

export const renderCircle = (g: any, drawing: any, xScale: any, yScale: any) => {
  const centerX = xScale(drawing.start.x);
  const centerY = yScale(drawing.start.y);
  const radius = Math.sqrt(
    Math.pow(xScale(drawing.end.x) - centerX, 2) + 
    Math.pow(yScale(drawing.end.y) - centerY, 2)
  );

  g.append("circle")
    .attr("class", "drawing circle")
    .attr("cx", centerX)
    .attr("cy", centerY)
    .attr("r", radius)
    .attr("fill", "rgba(255, 87, 34, 0.1)")
    .attr("stroke", "#FF5722")
    .attr("stroke-width", 2);
};

export const renderHorizontalLine = (g: any, drawing: any, xScale: any, yScale: any) => {
  g.append("line")
    .attr("class", "drawing horizontal-line")
    .attr("x1", xScale.range()[0])
    .attr("x2", xScale.range()[1])
    .attr("y1", yScale(drawing.start.y))
    .attr("y2", yScale(drawing.start.y))
    .attr("stroke", "#FF5722")
    .attr("stroke-width", 2);
};

export const renderVerticalLine = (g: any, drawing: any, xScale: any, yScale: any) => {
  g.append("line")
    .attr("class", "drawing vertical-line")
    .attr("x1", xScale(drawing.start.x))
    .attr("x2", xScale(drawing.start.x))
    .attr("y1", yScale.range()[0])
    .attr("y2", yScale.range()[1])
    .attr("stroke", "#FF5722")
    .attr("stroke-width", 2);
};

export const setupDrawingInteractions = (svg: any, g: any, xScale: any, yScale: any, drawingMode: string, drawingsRef: React.MutableRefObject<DrawingObject[]>) => {
  let drawing = false;
  let currentDrawing: any = null;
  let selectedDrawing: DrawingObject | null = null;

  const getCurrentDrawingBounds = () => {
    const svgNode = svg.node();
    if (!svgNode) return null;

    // Try to get current transform from the chart area or use identity transform
    let currentTransform;
    try {
      const zoomArea = g.select('.chart-zoom-area').node();
      currentTransform = zoomArea ? d3.zoomTransform(zoomArea) : d3.zoomIdentity;
    } catch (e) {
      currentTransform = d3.zoomIdentity;
    }

    const currentXScale = currentTransform.rescaleX(xScale);
    const currentYScale = currentTransform.rescaleY(yScale);

    return {
      drawingWidth: currentXScale.range()[1],
      drawingHeight: currentYScale.range()[0],
      xScale: currentXScale,
      yScale: currentYScale
    };
  };

  // Remove any existing drawing area
  g.selectAll(".drawing-area").remove();
  g.selectAll(".drawing-interaction-layer").remove();

  // Always keep chart zoom functionality enabled
  const chartArea = g.select('.chart-zoom-area');
  if (chartArea.node()) {
    chartArea.style("pointer-events", "all");
  }

  if (drawingMode === 'none') {
    // Select mode - use event delegation for drawing selection without blocking zoom
    svg.on("click.drawing", function(event: MouseEvent) {
      // Only handle click if it's not part of a zoom/pan gesture
      if (event.defaultPrevented) return;
      
      const [x, y] = d3.pointer(event, g.node());
      const bounds = getCurrentDrawingBounds();

      if (!bounds) return;

      // Check if click is within chart area
      if (x < 0 || x > bounds.drawingWidth || y < 0 || y > bounds.drawingHeight * 0.75) {
        return;
      }

      let foundDrawing = null;
      // Iterate over drawings in reverse to select the topmost one
      for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
        const drawing = drawingsRef.current[i];
        if (isPointOnDrawing(x, y, drawing, bounds.xScale, bounds.yScale)) {
          foundDrawing = drawing;
          break;
        }
      }

      selectedDrawing = foundDrawing;
      clearDrawingSelection(g);
      if (selectedDrawing) {
        highlightSelectedDrawing(g, selectedDrawing, bounds.xScale, bounds.yScale);
        console.log('Drawing selected:', selectedDrawing);
      } else {
        console.log('No drawing found at click position');
      }
    });

  } else {
    // Drawing mode - create interaction layer only when actively drawing
    selectedDrawing = null;
    clearDrawingSelection(g);

    svg.style("cursor", "crosshair");
    
    // Use event delegation for drawing interactions
    svg.on("mousedown.drawing", function(event: MouseEvent) {
      const [x, y] = d3.pointer(event, g.node());
      const bounds = getCurrentDrawingBounds();

      if (!bounds) return;

      // Check if click is within chart drawing area
      if (x < 0 || x > bounds.drawingWidth || y < 0 || y > bounds.drawingHeight * 0.75) {
        return;
      }

      // Prevent zoom from starting when we're drawing
      event.stopPropagation();
      event.preventDefault();

      drawing = true;
      const dateX = bounds.xScale.invert(x);
      const priceY = bounds.yScale.invert(y);

      currentDrawing = {
        type: drawingMode,
        start: { x: dateX, y: priceY },
        end: { x: dateX, y: priceY }
      };

      console.log('Drawing started:', currentDrawing);
    });

    svg.on("mousemove.drawing", function(event: MouseEvent) {
      if (!drawing || !currentDrawing) return;

      const [x, y] = d3.pointer(event, g.node());
      const bounds = getCurrentDrawingBounds();

      if (!bounds) return;

      const constrainedX = Math.max(0, Math.min(x, bounds.drawingWidth));
      const constrainedY = Math.max(0, Math.min(y, bounds.drawingHeight * 0.75));

      const dateX = bounds.xScale.invert(constrainedX);
      const priceY = bounds.yScale.invert(constrainedY);

      currentDrawing.end = { x: dateX, y: priceY };

      g.selectAll(".drawing-preview").remove();
      g.selectAll(".drawing-preview-layer").remove();
      renderDrawingPreview(g, currentDrawing, bounds.xScale, bounds.yScale);
    });

    svg.on("mouseup.drawing", function() {
      if (!drawing || !currentDrawing) return;

      drawing = false;

      const startX = currentDrawing.start.x.getTime ? currentDrawing.start.x.getTime() : currentDrawing.start.x;
      const endX = currentDrawing.end.x.getTime ? currentDrawing.end.x.getTime() : currentDrawing.end.x;
      const startY = currentDrawing.start.y;
      const endY = currentDrawing.end.y;

      if (Math.abs(startX - endX) > 1000 || Math.abs(startY - endY) > 0.01) {
        drawingsRef.current.push({ ...currentDrawing });
        console.log('Drawing added:', currentDrawing);
        console.log('Total drawings:', drawingsRef.current.length);
      }

      g.selectAll(".drawing-preview").remove();
      g.selectAll(".drawing-preview-layer").remove();

      const bounds = getCurrentDrawingBounds();
      if (bounds) {
        renderDrawings(g, drawingsRef.current, bounds.xScale, bounds.yScale);
      }

      currentDrawing = null;
    });

    // Clear selection handlers
    svg.on("click.drawing", null);
  }

  // Add keyboard support for deleting selected drawings
  if (typeof window !== 'undefined') {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (drawingMode === 'none' && selectedDrawing && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault();
        const index = drawingsRef.current.indexOf(selectedDrawing);
        if (index > -1) {
          drawingsRef.current.splice(index, 1);
          selectedDrawing = null;
          clearDrawingSelection(g);
          const bounds = getCurrentDrawingBounds();
          if (bounds) {
            renderDrawings(g, drawingsRef.current, bounds.xScale, bounds.yScale);
          }
          console.log('Drawing deleted, remaining:', drawingsRef.current.length);
        }
      }
    };

    // Remove existing listener if it exists
    const existingHandler = (svg.node() as any).__keydownHandler;
    if (existingHandler) {
      window.removeEventListener('keydown', existingHandler);
    }

    window.addEventListener('keydown', handleKeyDown);
    (svg.node() as any).__keydownHandler = handleKeyDown;
  }
};

// Helper function to check if a point is on a drawing
const isPointOnDrawing = (x: number, y: number, drawing: any, xScale: any, yScale: any): boolean => {
  const tolerance = 5; // pixels

  switch (drawing.type) {
    case 'line':
      return isPointOnLine(x, y, 
        xScale(drawing.start.x), yScale(drawing.start.y),
        xScale(drawing.end.x), yScale(drawing.end.y), tolerance);

    case 'rectangle':
      const rectX = Math.min(xScale(drawing.start.x), xScale(drawing.end.x));
      const rectY = Math.min(yScale(drawing.start.y), yScale(drawing.end.y));
      const rectWidth = Math.abs(xScale(drawing.end.x) - xScale(drawing.start.x));
      const rectHeight = Math.abs(yScale(drawing.end.y) - yScale(drawing.start.y));

      return x >= rectX && x <= rectX + rectWidth && y >= rectY && y <= rectY + rectHeight;

    case 'circle':
      const centerX = xScale(drawing.start.x);
      const centerY = yScale(drawing.start.y);
      const radius = Math.sqrt(
        Math.pow(xScale(drawing.end.x) - centerX, 2) + 
        Math.pow(yScale(drawing.end.y) - centerY, 2)
      );
      const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

      return Math.abs(distance - radius) <= tolerance;

    case 'horizontal':
      const lineY = yScale(drawing.start.y);
      return Math.abs(y - lineY) <= tolerance;

    case 'vertical':
      const lineX = xScale(drawing.start.x);
      return Math.abs(x - lineX) <= tolerance;

    case 'fibonacci':
      // Check if point is near any of the fibonacci lines
      const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const startY = yScale(drawing.start.y);
      const endY = yScale(drawing.end.y);
      const diff = endY - startY;

      for (const level of fibLevels) {
        const fibY = startY + diff * level;
        if (Math.abs(y - fibY) <= tolerance) {
          return true;
        }
      }
      return false;

    default:
      return false;
  }
};

// Helper function to check if point is on a line
const isPointOnLine = (px: number, py: number, x1: number, y1: number, x2: number, y2: number, tolerance: number): boolean => {
  const lineLength = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  const distanceToStart = Math.sqrt(Math.pow(px - x1, 2) + Math.pow(py - y1, 2));
  const distanceToEnd = Math.sqrt(Math.pow(px - x2, 2) + Math.pow(py - y2, 2));

  // Check if point is approximately on the line using the triangle inequality
  return Math.abs(distanceToStart + distanceToEnd - lineLength) <= tolerance;
};

// Function to highlight selected drawing
const highlightSelectedDrawing = (g: any, drawing: any, xScale: any, yScale: any) => {
  clearDrawingSelection(g);

  const selectionLayer = g.append("g")
    .attr("class", "drawing-selection-layer")
    .style("pointer-events", "none");

  switch (drawing.type) {
    case 'line':
      selectionLayer.append("line")
        .attr("class", "drawing-selection")
        .attr("x1", xScale(drawing.start.x))
        .attr("y1", yScale(drawing.start.y))
        .attr("x2", xScale(drawing.end.x))
        .attr("y2", yScale(drawing.end.y))
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 4)
        .attr("opacity", 0.6);
      break;

    case 'rectangle':
      const x = Math.min(xScale(drawing.start.x), xScale(drawing.end.x));
      const y = Math.min(yScale(drawing.start.y), yScale(drawing.end.y));
      const width = Math.abs(xScale(drawing.end.x) - xScale(drawing.start.x));
      const height = Math.abs(yScale(drawing.end.y) - yScale(drawing.start.y));

      selectionLayer.append("rect")
        .attr("class", "drawing-selection")
        .attr("x", x)
        .attr("y", y)
        .attr("width", width)
        .attr("height", height)
        .attr("fill", "none")
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 3)
        .attr("opacity", 0.8);
      break;

    case 'circle':
      const centerX = xScale(drawing.start.x);
      const centerY = yScale(drawing.start.y);
      const radius = Math.sqrt(
        Math.pow(xScale(drawing.end.x) - centerX, 2) + 
        Math.pow(yScale(drawing.end.y) - centerY, 2)
      );

      selectionLayer.append("circle")
        .attr("class", "drawing-selection")
        .attr("cx", centerX)
        .attr("cy", centerY)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 3)
        .attr("opacity", 0.8);
      break;
  }

  // Add selection indicators (small squares at key points)
  addSelectionHandles(selectionLayer, drawing, xScale, yScale);
};

// Function to add selection handles
const addSelectionHandles = (layer: any, drawing: any, xScale: any, yScale: any) => {
  const handleSize = 6;

  const handles = [];

  switch (drawing.type) {
    case 'line':
    case 'rectangle':
    case 'circle':
      handles.push(
        { x: xScale(drawing.start.x), y: yScale(drawing.start.y) },
        { x: xScale(drawing.end.x), y: yScale(drawing.end.y) }
      );
      break;
  }

  handles.forEach(handle => {
    layer.append("rect")
      .attr("class", "selection-handle")
      .attr("x", handle.x - handleSize / 2)
      .attr("y", handle.y - handleSize / 2)
      .attr("width", handleSize)
      .attr("height", handleSize)
      .attr("fill", "#2196F3")
      .attr("stroke", "white")
      .attr("stroke-width", 1);
  });
};

// Function to clear drawing selection
const clearDrawingSelection = (g: any) => {
  g.selectAll(".drawing-selection-layer").remove();
};