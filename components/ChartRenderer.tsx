
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as TI from 'technicalindicators';
import { CandleData, ChartConfig } from './TradingChart';

interface ChartRendererProps {
  data: CandleData[];
  config: ChartConfig;
  chartRef: React.RefObject<HTMLDivElement>;
  drawingMode: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  data, 
  config, 
  chartRef, 
  drawingMode 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const drawingsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!data.length || !chartRef.current) return;

    renderChart();
  }, [data, config]);

  const renderChart = () => {
    if (!chartRef.current || !svgRef.current) return;

    const margin = { top: 20, right: 50, bottom: 50, left: 50 };
    const width = chartRef.current.clientWidth - margin.left - margin.right;
    const height = chartRef.current.clientHeight - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Setup scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => Math.max(d.high, d.low)) as [number, number])
      .range([height * 0.7, 0]);

    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) as number])
      .range([height, height * 0.8]);

    // Setup zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on("zoom", (event) => {
        const { transform } = event;
        
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);

        updateChart(newXScale, newYScale);
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    // Initial chart render
    updateChart(xScale, yScale);

    function updateChart(currentXScale: any, currentYScale: any) {
      // Clear previous elements
      g.selectAll(".candle").remove();
      g.selectAll(".volume-bar").remove();
      g.selectAll(".axis").remove();
      g.selectAll(".indicator").remove();

      // Render based on chart type
      switch (config.chartType) {
        case 'candlestick':
          renderCandlesticks(g, currentXScale, currentYScale);
          break;
        case 'line':
          renderLineChart(g, currentXScale, currentYScale);
          break;
        case 'area':
          renderAreaChart(g, currentXScale, currentYScale);
          break;
        case 'bar':
          renderBarChart(g, currentXScale, currentYScale);
          break;
        case 'heikinashi':
          renderHeikinAshi(g, currentXScale, currentYScale);
          break;
      }

      // Render volume
      renderVolume(g, currentXScale, volumeScale);

      // Render indicators
      renderIndicators(g, currentXScale, currentYScale);

      // Render axes
      renderAxes(g, currentXScale, currentYScale, width, height);

      // Render drawings
      renderDrawings(g, currentXScale, currentYScale);
    }

    // Setup drawing interactions
    setupDrawingInteractions(svg, g, xScale, yScale);
  };

  const renderCandlesticks = (g: any, xScale: any, yScale: any) => {
    const candleWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.8);

    g.selectAll(".candle")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "candle")
      .each(function(d: CandleData) {
        const candle = d3.select(this);
        const x = xScale(d.date);
        const bodyHeight = Math.abs(yScale(d.open) - yScale(d.close));
        const bodyY = Math.min(yScale(d.open), yScale(d.close));
        const color = d.close >= d.open ? "#26a69a" : "#ef5350";

        // Wick
        candle.append("line")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", yScale(d.high))
          .attr("y2", yScale(d.low))
          .attr("stroke", color)
          .attr("stroke-width", 1);

        // Body
        candle.append("rect")
          .attr("x", x - candleWidth / 2)
          .attr("y", bodyY)
          .attr("width", candleWidth)
          .attr("height", Math.max(1, bodyHeight))
          .attr("fill", color);
      });
  };

  const renderLineChart = (g: any, xScale: any, yScale: any) => {
    const line = d3.line<CandleData>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.close))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("fill", "none")
      .attr("stroke", "#2196F3")
      .attr("stroke-width", 2)
      .attr("d", line);
  };

  const renderAreaChart = (g: any, xScale: any, yScale: any) => {
    const area = d3.area<CandleData>()
      .x(d => xScale(d.date))
      .y0(yScale.range()[0])
      .y1(d => yScale(d.close))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(data)
      .attr("class", "area")
      .attr("fill", "rgba(33, 150, 243, 0.3)")
      .attr("stroke", "#2196F3")
      .attr("stroke-width", 2)
      .attr("d", area);
  };

  const renderBarChart = (g: any, xScale: any, yScale: any) => {
    const barWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.8);

    g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => xScale(d.date) - barWidth / 2)
      .attr("y", d => yScale(Math.max(d.open, d.close)))
      .attr("width", barWidth)
      .attr("height", d => Math.abs(yScale(d.open) - yScale(d.close)))
      .attr("fill", d => d.close >= d.open ? "#26a69a" : "#ef5350");
  };

  const renderHeikinAshi = (g: any, xScale: any, yScale: any) => {
    const haData = calculateHeikinAshi(data);
    const candleWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / haData.length * 0.8);

    g.selectAll(".ha-candle")
      .data(haData)
      .enter()
      .append("g")
      .attr("class", "ha-candle")
      .each(function(d: any) {
        const candle = d3.select(this);
        const x = xScale(d.date);
        const bodyHeight = Math.abs(yScale(d.open) - yScale(d.close));
        const bodyY = Math.min(yScale(d.open), yScale(d.close));
        const color = d.close >= d.open ? "#26a69a" : "#ef5350";

        // Wick
        candle.append("line")
          .attr("x1", x)
          .attr("x2", x)
          .attr("y1", yScale(d.high))
          .attr("y2", yScale(d.low))
          .attr("stroke", color)
          .attr("stroke-width", 1);

        // Body
        candle.append("rect")
          .attr("x", x - candleWidth / 2)
          .attr("y", bodyY)
          .attr("width", candleWidth)
          .attr("height", Math.max(1, bodyHeight))
          .attr("fill", color);
      });
  };

  const renderVolume = (g: any, xScale: any, volumeScale: any) => {
    const barWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.8);

    g.selectAll(".volume-bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "volume-bar")
      .attr("x", d => xScale(d.date) - barWidth / 2)
      .attr("y", d => volumeScale(d.volume))
      .attr("width", barWidth)
      .attr("height", d => volumeScale.range()[0] - volumeScale(d.volume))
      .attr("fill", "rgba(156, 156, 156, 0.5)");
  };

  const renderIndicators = (g: any, xScale: any, yScale: any) => {
    config.indicators.forEach(indicator => {
      switch (indicator) {
        case 'SMA':
          renderSMA(g, xScale, yScale, 20);
          break;
        case 'EMA':
          renderEMA(g, xScale, yScale, 20);
          break;
        case 'MACD':
          renderMACD(g, xScale, yScale);
          break;
        case 'RSI':
          renderRSI(g, xScale, yScale);
          break;
        case 'BB':
          renderBollingerBands(g, xScale, yScale, 20, 2);
          break;
      }
    });
  };

  const renderSMA = (g: any, xScale: any, yScale: any, period: number) => {
    const closes = data.map(d => d.close);
    const smaValues = TI.SMA.calculate({ period, values: closes });
    
    const smaData = data.slice(period - 1).map((d, i) => ({
      date: d.date,
      value: smaValues[i]
    }));

    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(smaData)
      .attr("class", "indicator sma")
      .attr("fill", "none")
      .attr("stroke", "#FF9800")
      .attr("stroke-width", 2)
      .attr("d", line);
  };

  const renderEMA = (g: any, xScale: any, yScale: any, period: number) => {
    const closes = data.map(d => d.close);
    const emaValues = TI.EMA.calculate({ period, values: closes });
    
    const emaData = data.slice(period - 1).map((d, i) => ({
      date: d.date,
      value: emaValues[i]
    }));

    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(emaData)
      .attr("class", "indicator ema")
      .attr("fill", "none")
      .attr("stroke", "#9C27B0")
      .attr("stroke-width", 2)
      .attr("d", line);
  };

  const renderMACD = (g: any, xScale: any, yScale: any) => {
    const closes = data.map(d => d.close);
    const macdValues = TI.MACD.calculate({
      values: closes,
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    // This would need a separate scale for MACD values
    // Implementation would require additional panel
  };

  const renderRSI = (g: any, xScale: any, yScale: any) => {
    const closes = data.map(d => d.close);
    const rsiValues = TI.RSI.calculate({ period: 14, values: closes });
    
    // This would need a separate scale for RSI values (0-100)
    // Implementation would require additional panel
  };

  const renderBollingerBands = (g: any, xScale: any, yScale: any, period: number, stdDev: number) => {
    const closes = data.map(d => d.close);
    const bbValues = TI.BollingerBands.calculate({
      period,
      values: closes,
      stdDev
    });

    const bbData = data.slice(period - 1).map((d, i) => ({
      date: d.date,
      upper: bbValues[i]?.upper,
      middle: bbValues[i]?.middle,
      lower: bbValues[i]?.lower
    }));

    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Upper band
    g.append("path")
      .datum(bbData.map(d => ({ date: d.date, value: d.upper })))
      .attr("class", "indicator bb-upper")
      .attr("fill", "none")
      .attr("stroke", "#2196F3")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("d", line);

    // Middle band
    g.append("path")
      .datum(bbData.map(d => ({ date: d.date, value: d.middle })))
      .attr("class", "indicator bb-middle")
      .attr("fill", "none")
      .attr("stroke", "#2196F3")
      .attr("stroke-width", 1)
      .attr("d", line);

    // Lower band
    g.append("path")
      .datum(bbData.map(d => ({ date: d.date, value: d.lower })))
      .attr("class", "indicator bb-lower")
      .attr("fill", "none")
      .attr("stroke", "#2196F3")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("d", line);
  };

  const renderAxes = (g: any, xScale: any, yScale: any, width: number, height: number) => {
    // X-axis
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${height * 0.7})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m/%d")));

    // Y-axis
    g.append("g")
      .attr("class", "axis y-axis")
      .call(d3.axisLeft(yScale));

    // Right Y-axis
    g.append("g")
      .attr("class", "axis y-axis-right")
      .attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yScale));
  };

  const renderDrawings = (g: any, xScale: any, yScale: any) => {
    drawingsRef.current.forEach(drawing => {
      switch (drawing.type) {
        case 'line':
          renderTrendLine(g, drawing, xScale, yScale);
          break;
        case 'rectangle':
          renderRectangle(g, drawing, xScale, yScale);
          break;
        case 'fibonacci':
          renderFibonacci(g, drawing, xScale, yScale);
          break;
      }
    });
  };

  const renderTrendLine = (g: any, drawing: any, xScale: any, yScale: any) => {
    g.append("line")
      .attr("class", "drawing trend-line")
      .attr("x1", xScale(drawing.start.x))
      .attr("y1", yScale(drawing.start.y))
      .attr("x2", xScale(drawing.end.x))
      .attr("y2", yScale(drawing.end.y))
      .attr("stroke", "#FF5722")
      .attr("stroke-width", 2);
  };

  const renderRectangle = (g: any, drawing: any, xScale: any, yScale: any) => {
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

  const renderFibonacci = (g: any, drawing: any, xScale: any, yScale: any) => {
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

  const setupDrawingInteractions = (svg: any, g: any, xScale: any, yScale: any) => {
    let drawing = false;
    let currentDrawing: any = null;

    svg.on("mousedown", function(event: MouseEvent) {
      if (drawingMode === 'none') return;

      drawing = true;
      const [x, y] = d3.pointer(event, g.node());
      const dateX = xScale.invert(x);
      const priceY = yScale.invert(y);

      currentDrawing = {
        type: drawingMode,
        start: { x: dateX, y: priceY },
        end: { x: dateX, y: priceY }
      };
    });

    svg.on("mousemove", function(event: MouseEvent) {
      if (!drawing || !currentDrawing) return;

      const [x, y] = d3.pointer(event, g.node());
      const dateX = xScale.invert(x);
      const priceY = yScale.invert(y);

      currentDrawing.end = { x: dateX, y: priceY };

      // Update preview
      g.selectAll(".drawing-preview").remove();
      renderDrawingPreview(g, currentDrawing, xScale, yScale);
    });

    svg.on("mouseup", function() {
      if (!drawing || !currentDrawing) return;

      drawing = false;
      drawingsRef.current.push({ ...currentDrawing });
      
      g.selectAll(".drawing-preview").remove();
      renderDrawings(g, xScale, yScale);
      
      currentDrawing = null;
    });
  };

  const renderDrawingPreview = (g: any, drawing: any, xScale: any, yScale: any) => {
    switch (drawing.type) {
      case 'line':
        g.append("line")
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

  const calculateHeikinAshi = (data: CandleData[]) => {
    const haData: any[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const current = data[i];
      const prev = i > 0 ? haData[i - 1] : null;
      
      const haClose = (current.open + current.high + current.low + current.close) / 4;
      const haOpen = prev ? (prev.open + prev.close) / 2 : (current.open + current.close) / 2;
      const haHigh = Math.max(current.high, haOpen, haClose);
      const haLow = Math.min(current.low, haOpen, haClose);
      
      haData.push({
        date: current.date,
        open: haOpen,
        high: haHigh,
        low: haLow,
        close: haClose,
        volume: current.volume
      });
    }
    
    return haData;
  };

  return (
    <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: drawingMode !== 'none' ? 'crosshair' : 'default' }}>
    </svg>
  );
};

export default ChartRenderer;
