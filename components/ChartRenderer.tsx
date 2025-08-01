import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CandleData, ChartConfig, OIData } from './TradingChart';
import { ChartRendererProps, DrawingObject } from './chart/types';
import { renderCandlesticks, renderLineChart, renderAreaChart, renderBarChart, renderHeikinAshi, renderVolume } from './chart/chartRenderers';
import { renderSMA, renderEMA, renderWMA, renderRSI, renderMACD, renderBollingerBands, renderVolumeIndicator } from './chart/indicatorRenderers';
import { renderOIData } from './chart/oiRenderer';
import { renderDrawings, setupDrawingInteractions } from './chart/drawingTools';
import { renderIndicatorLabel, showIndicatorSettings } from './chart/indicatorSettings';

const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  data, 
  oiData,
  config, 
  chartRef, 
  drawingMode 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>();
  const drawingsRef = useRef<DrawingObject[]>([]);

  useEffect(() => {
    if (!data.length || !chartRef.current) return;
    renderChart();
  }, [data, config]);

  const renderChart = () => {
    if (!chartRef.current || !svgRef.current) return;

    const totalWidth = chartRef.current.clientWidth;
    const margin = { top: 20, right: 80, bottom: 50, left: 20 };
    const width = totalWidth - margin.left - margin.right;
    const height = chartRef.current.clientHeight - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]);

    const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
    const priceExtent = d3.extent(allPrices) as [number, number];
    const pricePadding = (priceExtent[1] - priceExtent[0]) * 0.1;
    const yScale = d3.scaleLinear()
      .domain([priceExtent[0] - pricePadding, priceExtent[1] + pricePadding])
      .range([height * 0.7, 0]);

    // Volume indicator will have its own panel below the chart
    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) as number])
      .range([height * 0.85, height * 0.75]);

    const defs = svg.append("defs");
    defs.append("clipPath")
      .attr("id", "chart-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height * 0.75);

    defs.append("clipPath")
      .attr("id", "volume-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", height * 0.75)
      .attr("width", width)
      .attr("height", height * 0.1);

    // Create a chart area for zoom interactions (main chart + volume panel)
    const chartArea = g.append("rect")
      .attr("class", "chart-zoom-area")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height * 0.85)
      .attr("fill", "transparent")
      .style("pointer-events", "all");

    // Track touch state for gesture detection
    let touchState = {
      touches: [],
      lastDistance: 0,
      lastCenter: { x: 0, y: 0 },
      initialDistance: 0,
      initialCenter: { x: 0, y: 0 },
      zoomMode: 'none' // 'time', 'price', 'both'
    };

    // Helper function to calculate distance between two touches
    const getTouchDistance = (touch1: any, touch2: any) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // Helper function to get center point between touches
    const getTouchCenter = (touch1: any, touch2: any) => {
      return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
      };
    };

    // Time axis zoom (default scroll for desktop, horizontal pinch for mobile)
    const timeZoom = d3.zoom<SVGRectElement, unknown>()
      .scaleExtent([0.1, 50])
      .translateExtent([[-width * 5, 0], [width * 6, height * 0.85]])
      .filter((event) => {
        // For mouse events
        if (event.type.includes('wheel')) {
          return !event.shiftKey && !event.ctrlKey && !event.metaKey;
        }
        // Allow touch events
        return event.type.includes('touch') || event.type.includes('pointer');
      })
      .on("zoom", (event) => {
        const { transform } = event;
        const newXScale = transform.rescaleX(xScale);
        updateChart(newXScale, yScale);
      });

    // Price axis zoom (shift + scroll for desktop, vertical pinch for mobile)
    const priceZoom = d3.zoom<SVGRectElement, unknown>()
      .scaleExtent([0.1, 50])
      .translateExtent([[0, -height * 5], [width, height * 6]])
      .filter((event) => {
        // For mouse events
        if (event.type.includes('wheel')) {
          return event.shiftKey && !event.ctrlKey && !event.metaKey;
        }
        // Allow touch events
        return event.type.includes('touch') || event.type.includes('pointer');
      })
      .on("zoom", (event) => {
        const { transform } = event;
        const newYScale = transform.rescaleY(yScale);
        updateChart(xScale, newYScale);
      });

    // Combined zoom for both axes (ctrl/cmd + scroll for desktop, two-finger pinch for mobile)
    const combinedZoom = d3.zoom<SVGRectElement, unknown>()
      .scaleExtent([0.1, 50])
      .translateExtent([[-width * 5, -height * 5], [width * 6, height * 6]])
      .filter((event) => {
        // For mouse events
        if (event.type.includes('wheel')) {
          return event.ctrlKey || event.metaKey;
        }
        // Allow touch events
        return event.type.includes('touch') || event.type.includes('pointer');
      })
      .on("zoom", (event) => {
        const { transform } = event;
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);
        updateChart(newXScale, newYScale);
      });

    // Custom touch event handlers for gesture detection
    chartArea.on('touchstart', function(event) {
      const touches = event.touches;
      if (touches.length === 2) {
        event.preventDefault();
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        touchState.initialDistance = getTouchDistance(touch1, touch2);
        touchState.initialCenter = getTouchCenter(touch1, touch2);
        touchState.lastDistance = touchState.initialDistance;
        touchState.lastCenter = touchState.initialCenter;
        
        // Determine zoom mode based on gesture direction
        const rect = chartArea.node()!.getBoundingClientRect();
        const centerX = touchState.initialCenter.x - rect.left;
        const centerY = touchState.initialCenter.y - rect.top;
        
        const dx = Math.abs(touch1.clientX - touch2.clientX);
        const dy = Math.abs(touch1.clientY - touch2.clientY);
        
        // Determine zoom direction based on touch orientation
        if (dx > dy * 1.5) {
          touchState.zoomMode = 'time'; // Horizontal gesture
        } else if (dy > dx * 1.5) {
          touchState.zoomMode = 'price'; // Vertical gesture
        } else {
          touchState.zoomMode = 'both'; // Diagonal gesture
        }
      }
    });

    chartArea.on('touchmove', function(event) {
      const touches = event.touches;
      if (touches.length === 2 && touchState.zoomMode !== 'none') {
        event.preventDefault();
        
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        const currentDistance = getTouchDistance(touch1, touch2);
        const currentCenter = getTouchCenter(touch1, touch2);
        
        const scaleFactor = currentDistance / touchState.lastDistance;
        const rect = chartArea.node()!.getBoundingClientRect();
        
        // Convert touch coordinates to chart coordinates
        const chartX = currentCenter.x - rect.left;
        const chartY = currentCenter.y - rect.top;
        
        // Apply zoom based on detected mode
        if (touchState.zoomMode === 'time') {
          const currentTransform = d3.zoomTransform(chartArea.node()!);
          const newTransform = currentTransform.scale(scaleFactor);
          timeZoom.transform(chartArea, newTransform);
        } else if (touchState.zoomMode === 'price') {
          const currentTransform = d3.zoomTransform(chartArea.node()!);
          const newTransform = currentTransform.scale(scaleFactor);
          priceZoom.transform(chartArea, newTransform);
        } else if (touchState.zoomMode === 'both') {
          const currentTransform = d3.zoomTransform(chartArea.node()!);
          const newTransform = currentTransform.scale(scaleFactor);
          combinedZoom.transform(chartArea, newTransform);
        }
        
        touchState.lastDistance = currentDistance;
        touchState.lastCenter = currentCenter;
      }
    });

    chartArea.on('touchend', function(event) {
      if (event.touches.length < 2) {
        touchState.zoomMode = 'none';
        touchState.touches = [];
      }
    });

    // Apply zoom behaviors
    chartArea.call(timeZoom).call(priceZoom).call(combinedZoom);
    zoomRef.current = timeZoom;

    updateChart(xScale, yScale);

    function updateChart(currentXScale: any, currentYScale: any, currentVolumeScale?: any) {
      const activeVolumeScale = currentVolumeScale || d3.scaleLinear()
        .domain([0, d3.max(data, d => d.volume) as number])
        .range([height * 0.7, height * 0.75]);

      // Only remove chart elements, preserve indicators unless they need updating
      g.selectAll(".candle").remove();
      g.selectAll(".volume-bar").remove();
      g.selectAll(".axis").remove();
      g.selectAll(".oi-overlay").remove();

      switch (config.chartType) {
        case 'candlestick':
          renderCandlesticks(g, currentXScale, currentYScale, data);
          break;
        case 'line':
          renderLineChart(g, currentXScale, currentYScale, data);
          break;
        case 'area':
          renderAreaChart(g, currentXScale, currentYScale, data);
          break;
        case 'bar':
          renderBarChart(g, currentXScale, currentYScale, data);
          break;
        case 'heikinashi':
          renderHeikinAshi(g, currentXScale, currentYScale, data);
          break;
      }

      // Always render volume histogram if volume data exists
      if (data.length > 0 && data[0].volume !== undefined) {
        renderVolumeHistogram(g, currentXScale, activeVolumeScale, data, width, height);
      }
      
      // Update indicators with current scales
      g.selectAll(".indicator").remove();
      renderIndicators(g, currentXScale, currentYScale, height);
      
      renderAxes(g, currentXScale, currentYScale, width, height);
      updateCurrentPriceIndicator(g, currentYScale, width);

      if (config.showOI) {
        renderOIData(g, currentXScale, currentYScale, width, oiData, data, config);
      }

      renderDrawings(g, drawingsRef.current, currentXScale, currentYScale);
    }

    setupDrawingInteractions(svg, g, xScale, yScale, drawingMode, drawingsRef);
  };

  const renderIndicators = (g: any, xScale: any, yScale: any, chartHeight: number) => {
    const appliedIndicators = config.appliedIndicators || [];

    appliedIndicators.forEach(indicator => {
      const params = {
        g, xScale, yScale,
        period: indicator.params.period,
        params: indicator.params,
        color: indicator.color,
        id: indicator.id,
        label: indicator.label
      };

      switch (indicator.type) {
        case 'SMA':
          renderSMA(params, data, renderIndicatorLabel);
          break;
        case 'EMA':
          renderEMA(params, data, renderIndicatorLabel);
          break;
        case 'WMA':
          renderWMA(params, data, renderIndicatorLabel);
          break;
        case 'MACD':
          renderMACD(params, data, renderIndicatorLabel);
          break;
        case 'RSI':
          renderRSI(params, data, renderIndicatorLabel);
          break;
        case 'BB':
          renderBollingerBands(params, data, renderIndicatorLabel);
          break;
        case 'STOCH':
            break;
        case 'STOCHRSI':
            break;
        case 'ADX':
            break;
        case 'CCI':
            break;
        case 'WILLIAMS':
            break;
        case 'ATR':
            break;
        case 'TRIX':
            break;
        case 'MFI':
            break;
        case 'ROC':
            break;
        case 'OBV':
            break;
        case 'KAMA':
            break;
        case 'PSAR':
            break;
        case 'ICHIMOKU':
            break;
        case 'DONCHIAN':
            break;
        case 'VWAP':
            break;
        case 'HV':
            break;
        case 'VOLUME':
          // Pass the volume scale from the existing histogram
          const volumeParams = {
            ...params,
            volumeScale: d3.scaleLinear()
              .domain([0, d3.max(data, d => d.volume) as number])
              .range([chartHeight * 0.85, chartHeight * 0.75])
          };
          renderVolumeIndicator(volumeParams, data, renderIndicatorLabel);
          break;
      }
    });
  };

  const renderVolumeHistogram = (g: any, xScale: any, volumeScale: any, data: CandleData[], width: number, height: number) => {
    // Clear existing volume elements
    g.selectAll(".volume-panel-bg").remove();
    g.selectAll(".volume-histogram").remove();
    g.selectAll(".volume-title").remove();
    g.selectAll(".volume-axis").remove();
    g.selectAll(".avg-volume-line").remove();
    g.selectAll(".avg-volume-label").remove();
    
    const barWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.8);
    
    // Volume panel background
    g.append("rect")
      .attr("class", "volume-panel-bg")
      .attr("x", 0)
      .attr("y", height * 0.75)
      .attr("width", width)
      .attr("height", height * 0.1)
      .attr("fill", "#f8f9fa")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 1);

    const volumeGroup = g.append("g")
      .attr("class", "volume-histogram")
      .attr("clip-path", "url(#volume-clip)");

    // Volume bars with color coding based on price movement
    volumeGroup.selectAll(".volume-bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "volume-bar")
      .attr("x", d => xScale(d.date) - barWidth / 2)
      .attr("y", d => volumeScale(d.volume))
      .attr("width", barWidth)
      .attr("height", d => volumeScale.range()[0] - volumeScale(d.volume))
      .attr("fill", d => d.close >= d.open ? "#26a69a" : "#ef5350")
      .attr("opacity", 0.7)
      .style("cursor", "pointer")
      .on("mouseover", function(event, d) {
        d3.select(this).attr("opacity", 1);
        
        // Tooltip for volume
        const tooltip = d3.select("body").selectAll(".volume-tooltip").data([null]);
        const tooltipEnter = tooltip.enter().append("div")
          .attr("class", "volume-tooltip")
          .style("position", "absolute")
          .style("background", "rgba(0,0,0,0.8)")
          .style("color", "white")
          .style("padding", "8px")
          .style("border-radius", "4px")
          .style("font-size", "12px")
          .style("pointer-events", "none")
          .style("z-index", "1000");
        
        tooltipEnter.merge(tooltip)
          .html(`
            <div><strong>Volume: ${d.volume.toLocaleString()}</strong></div>
            <div>Date: ${d.date.toLocaleDateString()}</div>
            <div>Price: ${d.close.toFixed(2)}</div>
          `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px")
          .style("opacity", 1);
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.7);
        d3.select(".volume-tooltip").style("opacity", 0);
      });

    // Volume panel title
    g.append("text")
      .attr("class", "volume-title")
      .attr("x", 10)
      .attr("y", height * 0.76)
      .attr("font-size", "12px")
      .attr("font-weight", "bold")
      .attr("fill", "#666")
      .text("Volume");

    // Volume scale axis (right side)
    const volumeAxis = g.append("g")
      .attr("class", "axis volume-axis")
      .attr("transform", `translate(${width}, 0)`)
      .call(d3.axisRight(volumeScale)
        .ticks(3)
        .tickFormat(d => {
          if (d >= 1000000) return (d / 1000000).toFixed(1) + 'M';
          if (d >= 1000) return (d / 1000).toFixed(1) + 'K';
          return d.toString();
        })
        .tickSizeInner(-width)
        .tickSizeOuter(0));

    volumeAxis.selectAll(".tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5);

    volumeAxis.selectAll(".tick text")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .style("text-anchor", "start")
      .attr("dx", "5px");

    // Average volume line
    const avgVolume = d3.mean(data, d => d.volume) || 0;
    g.append("line")
      .attr("class", "avg-volume-line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", volumeScale(avgVolume))
      .attr("y2", volumeScale(avgVolume))
      .attr("stroke", "#ff9800")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("opacity", 0.6);

    // Average volume label
    g.append("text")
      .attr("class", "avg-volume-label")
      .attr("x", width - 5)
      .attr("y", volumeScale(avgVolume) - 3)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("fill", "#ff9800")
      .attr("font-weight", "bold")
      .text("Avg");
  };

  const renderAxes = (g: any, xScale: any, yScale: any, width: number, height: number) => {
    // Time axis (below volume panel)
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${height * 0.85})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%m/%d"))
        .tickSizeInner(-height * 0.85)
        .tickSizeOuter(0))
      .selectAll(".tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5);

    // Only right price axis
    const rightAxis = g.append("g")
      .attr("class", "axis y-axis-right")
      .attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yScale)
        .tickFormat(d => d3.format(".2f")(d))
        .tickSizeInner(-width)
        .tickSizeOuter(0));

    rightAxis.selectAll(".tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5);

    rightAxis.selectAll(".tick text")
      .attr("font-size", "11px")
      .attr("fill", "#666")
      .attr("font-weight", "bold")
      .style("text-anchor", "start")
      .attr("dx", "5px");

    g.selectAll(".axis path")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);

    g.selectAll(".axis .tick text")
      .attr("font-family", "Arial, sans-serif");
  };

  const updateCurrentPriceIndicator = (g: any, yScale: any, width: number) => {
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const currentPriceY = yScale(currentPrice);

    g.selectAll(".current-price-line").remove();
    g.selectAll(".current-price-label").remove();

    g.append("line")
      .attr("class", "current-price-line")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", currentPriceY)
      .attr("y2", currentPriceY)
      .attr("stroke", "#ff6b35")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", "4,4")
      .attr("opacity", 0.8);

    const priceLabel = g.append("g")
      .attr("class", "current-price-label")
      .attr("transform", `translate(${width + 2}, ${currentPriceY})`);

    priceLabel.append("rect")
      .attr("x", 0)
      .attr("y", -10)
      .attr("width", 50)
      .attr("height", 20)
      .attr("fill", "#ff6b35")
      .attr("rx", 3)
      .attr("opacity", 0.9);

    priceLabel.append("text")
      .attr("x", 25)
      .attr("y", 0)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(currentPrice.toFixed(2));
  };

  const updateIndicatorSettings = (indicatorId: string, newSettings: any) => {
    const appliedIndicators = config.appliedIndicators || [];
    const indicatorIndex = appliedIndicators.findIndex(ind => ind.id === indicatorId);

    if (indicatorIndex !== -1) {
      const updatedIndicators = [...appliedIndicators];
      updatedIndicators[indicatorIndex] = {
        ...updatedIndicators[indicatorIndex],
        color: newSettings.color,
        params: { ...updatedIndicators[indicatorIndex].params, ...newSettings }
      };
      renderChart();
    }
  };

  const removeIndicatorFromChart = (indicatorId: string) => {
    const appliedIndicators = config.appliedIndicators || [];
    const updatedIndicators = appliedIndicators.filter(ind => ind.id !== indicatorId);
    renderChart();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(255,255,255,0.9)',
        padding: '8px',
        borderRadius: '4px',
        fontSize: '11px',
        color: '#666',
        zIndex: 100,
        border: '1px solid #ddd',
        maxWidth: '200px'
      }}>
        <div><strong>Desktop:</strong></div>
        <div>🖱️ Drag: Pan chart</div>
        <div>⇧ + Scroll: Zoom price axis</div>
        <div>Scroll: Zoom time axis</div>
        <div>Ctrl/⌘ + Scroll: Zoom both axes</div>
        <div style={{ marginTop: '8px' }}><strong>Mobile:</strong></div>
        <div>📱 Horizontal pinch: Zoom time</div>
        <div>📱 Vertical pinch: Zoom price</div>
        <div>📱 Diagonal pinch: Zoom both</div>
        <div style={{ marginTop: '8px' }}><strong>Volume:</strong></div>
        <div>📊 Green: Bullish volume</div>
        <div>📊 Red: Bearish volume</div>
        <div>📊 Orange line: Average volume</div>
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: drawingMode !== 'none' ? 'crosshair' : 'default' }}>
      </svg>
    </div>
  );
};

export default ChartRenderer;