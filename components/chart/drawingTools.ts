
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
  let previewLayer = g.select(".drawing-preview-layer");
  if (previewLayer.empty()) {
    previewLayer = g.append("g")
      .attr("class", "drawing-preview-layer")
      .style("pointer-events", "none");
  }
  
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
        .attr("opacity", 0.7);
      break;
  }
};

export const renderDrawings = (g: any, drawings: DrawingObject[], xScale: any, yScale: any) => {
  g.selectAll(".drawing").remove();
  
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
      case 'fibonacci':
        renderFibonacci(drawingsLayer, drawing, xScale, yScale);
        break;
    }
  });
};

export const setupDrawingInteractions = (svg: any, g: any, xScale: any, yScale: any, drawingMode: string, drawingsRef: React.MutableRefObject<DrawingObject[]>) => {
  let drawing = false;
  let currentDrawing: any = null;

  const getCurrentDrawingBounds = () => {
    const currentTransform = d3.zoomTransform(svg.node());
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

  const drawingArea = g.append("rect")
    .attr("class", "drawing-area")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", xScale.range()[1])
    .attr("height", yScale.range()[0])
    .attr("fill", "transparent")
    .style("pointer-events", "all")
    .style("cursor", () => drawingMode !== 'none' ? 'crosshair' : 'default');

  drawingArea.on("mousedown", function(event: MouseEvent) {
    if (drawingMode === 'none') return;

    event.stopPropagation();
    event.preventDefault();

    const [x, y] = d3.pointer(event, this);
    const bounds = getCurrentDrawingBounds();
    
    if (x < 0 || x > bounds.drawingWidth || y < 0 || y > bounds.drawingHeight) return;

    drawing = true;
    const dateX = bounds.xScale.invert(x);
    const priceY = bounds.yScale.invert(y);

    currentDrawing = {
      type: drawingMode,
      start: { x: dateX, y: priceY },
      end: { x: dateX, y: priceY }
    };
  });

  drawingArea.on("mousemove", function(event: MouseEvent) {
    if (!drawing || !currentDrawing) return;

    const [x, y] = d3.pointer(event, this);
    const bounds = getCurrentDrawingBounds();
    
    const constrainedX = Math.max(0, Math.min(x, bounds.drawingWidth));
    const constrainedY = Math.max(0, Math.min(y, bounds.drawingHeight));
    
    const dateX = bounds.xScale.invert(constrainedX);
    const priceY = bounds.yScale.invert(constrainedY);

    currentDrawing.end = { x: dateX, y: priceY };

    g.selectAll(".drawing-preview").remove();
    g.selectAll(".drawing-preview-layer").remove();
    renderDrawingPreview(g, currentDrawing, bounds.xScale, bounds.yScale);
  });

  drawingArea.on("mouseup", function() {
    if (!drawing || !currentDrawing) return;

    drawing = false;
    drawingsRef.current.push({ ...currentDrawing });
    
    g.selectAll(".drawing-preview").remove();
    g.selectAll(".drawing-preview-layer").remove();
    
    const bounds = getCurrentDrawingBounds();
    renderDrawings(g, drawingsRef.current, bounds.xScale, bounds.yScale);
    
    currentDrawing = null;
  });
};
