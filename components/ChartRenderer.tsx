import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as TI from 'technicalindicators';
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
      .style("pointer-events", drawingMode === 'none' ? "all" : "none");

    // Track touch state for gesture detection
    let touchState = {
      touches: [],
      lastDistance: 0,
      lastCenter: { x: 0, y: 0 },
      initialDistance: 0,
      initialCenter: { x: 0, y: 0 }
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

    // TradingView-like zoom behavior
    const zoom = d3.zoom<SVGRectElement, unknown>()
      .scaleExtent([0.01, 1000])
      .filter((event) => {
        // Allow wheel events and touch gestures for zooming
        return event.type === 'wheel' || event.type.startsWith('touch');
      })
      .on("zoom", (event) => {
        if (event.sourceEvent && event.sourceEvent.type === 'wheel') {
          event.sourceEvent.preventDefault();
          
          const delta = event.sourceEvent.deltaY;
          if (!delta) return;
          
          // More responsive zoom factors like TradingView
          const zoomFactor = delta > 0 ? 0.85 : 1.18;
          const [mouseX, mouseY] = d3.pointer(event.sourceEvent, chartArea.node());
          
          // Define axis areas more precisely
          const priceAxisStart = width - 60;
          const timeAxisStart = height * 0.75; // Above volume panel
          
          // Determine zoom type based on mouse position
          if (mouseX > priceAxisStart && mouseY < timeAxisStart) {
            // Price axis zoom - mouse is over right price area
            handlePriceZoom(mouseX, mouseY, zoomFactor);
          } else if (mouseY > timeAxisStart) {
            // Time axis zoom - mouse is over time/volume area
            handleTimeZoom(mouseX, mouseY, zoomFactor);
          } else {
            // Main chart area - determine based on modifier keys or default to time zoom
            if (event.sourceEvent.shiftKey || event.sourceEvent.ctrlKey) {
              handlePriceZoom(mouseX, mouseY, zoomFactor);
            } else {
              handleTimeZoom(mouseX, mouseY, zoomFactor);
            }
          }
        } else if (event.transform && event.sourceEvent) {
          // Handle d3 zoom transform for pan and pinch gestures
          const transform = event.transform;
          
          // Apply transform to time axis (horizontal pan/zoom)
          const currentDomain = xScale.domain();
          const domainWidth = currentDomain[1].getTime() - currentDomain[0].getTime();
          const scaledWidth = domainWidth / transform.k;
          const centerTime = new Date((currentDomain[0].getTime() + currentDomain[1].getTime()) / 2);
          const offsetTime = -transform.x * scaledWidth / width;
          
          const newDomain = [
            new Date(centerTime.getTime() - scaledWidth / 2 + offsetTime),
            new Date(centerTime.getTime() + scaledWidth / 2 + offsetTime)
          ];
          
          const newXScale = xScale.copy().domain(newDomain);
          updateChart(newXScale, yScale);
        }
      });

    // Helper function for price axis zoom
    const handlePriceZoom = (mouseX: number, mouseY: number, zoomFactor: number) => {
      const currentDomain = yScale.domain();
      const domainRange = currentDomain[1] - currentDomain[0];
      const newRange = domainRange * (1 / zoomFactor);
      
      // Get mouse position in price coordinates
      const mousePrice = yScale.invert(mouseY);
      
      // Keep the price under the mouse cursor fixed
      const mouseFraction = (mousePrice - currentDomain[0]) / domainRange;
      
      const newDomain = [
        mousePrice - newRange * mouseFraction,
        mousePrice + newRange * (1 - mouseFraction)
      ];
      
      // Prevent zooming out too far
      const originalPriceRange = d3.extent(data.flatMap(d => [d.open, d.high, d.low, d.close])) as [number, number];
      const maxRange = (originalPriceRange[1] - originalPriceRange[0]) * 5;
      
      if (newRange <= maxRange) {
        const newYScale = yScale.copy().domain(newDomain);
        updateChart(xScale, newYScale);
      }
    };

    // Helper function for time axis zoom
    const handleTimeZoom = (mouseX: number, mouseY: number, zoomFactor: number) => {
      const currentDomain = xScale.domain();
      const domainRange = currentDomain[1].getTime() - currentDomain[0].getTime();
      const newRange = domainRange * (1 / zoomFactor);
      
      // Get mouse position in time coordinates
      const mouseTime = xScale.invert(mouseX);
      
      // Keep the time under the mouse cursor fixed
      const mouseFraction = (mouseTime.getTime() - currentDomain[0].getTime()) / domainRange;
      
      const newDomain = [
        new Date(mouseTime.getTime() - newRange * mouseFraction),
        new Date(mouseTime.getTime() + newRange * (1 - mouseFraction))
      ];
      
      // Prevent zooming beyond data bounds
      const dataExtent = d3.extent(data, d => d.date) as [Date, Date];
      const maxRange = dataExtent[1].getTime() - dataExtent[0].getTime();
      const minRange = maxRange / 1000; // Allow zooming in to show very few candles
      
      if (newRange >= minRange && newRange <= maxRange * 2) {
        const newXScale = xScale.copy().domain(newDomain);
        updateChart(newXScale, yScale);
      }
    };

    // Enhanced pan and zoom interactions
    let isPanning = false;
    let lastPanX = 0;
    let lastPanY = 0;

    // Mouse pan with middle button (like TradingView)
    chartArea.on('mousedown', function(event) {
      if (event.button === 1) { // Middle mouse button
        event.preventDefault();
        isPanning = true;
        lastPanX = event.clientX;
        lastPanY = event.clientY;
        d3.select('body').style('cursor', 'grabbing');
      }
    });

    // Handle mouse move for panning
    d3.select(window).on('mousemove.chart-pan', function(event) {
      if (isPanning) {
        const deltaX = event.clientX - lastPanX;
        const deltaY = event.clientY - lastPanY;
        
        // Pan time axis
        if (Math.abs(deltaX) > 2) {
          const currentDomain = xScale.domain();
          const domainRange = currentDomain[1].getTime() - currentDomain[0].getTime();
          const timeOffset = -(deltaX / width) * domainRange;
          
          const newDomain = [
            new Date(currentDomain[0].getTime() + timeOffset),
            new Date(currentDomain[1].getTime() + timeOffset)
          ];
          
          const newXScale = xScale.copy().domain(newDomain);
          updateChart(newXScale, yScale);
        }
        
        // Pan price axis
        if (Math.abs(deltaY) > 2) {
          const currentDomain = yScale.domain();
          const domainRange = currentDomain[1] - currentDomain[0];
          const priceOffset = (deltaY / (height * 0.7)) * domainRange;
          
          const newDomain = [
            currentDomain[0] + priceOffset,
            currentDomain[1] + priceOffset
          ];
          
          const newYScale = yScale.copy().domain(newDomain);
          updateChart(xScale, newYScale);
        }
        
        lastPanX = event.clientX;
        lastPanY = event.clientY;
      }
    });

    // Stop panning
    d3.select(window).on('mouseup.chart-pan', function() {
      if (isPanning) {
        isPanning = false;
        d3.select('body').style('cursor', 'default');
      }
    });

    // Enhanced touch gestures
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
      } else if (touches.length === 1) {
        // Single finger pan
        touchState.lastCenter = { x: touches[0].clientX, y: touches[0].clientY };
      }
    });

    chartArea.on('touchmove', function(event) {
      const touches = event.touches;
      if (touches.length === 2 && touchState.lastDistance > 0) {
        event.preventDefault();

        const touch1 = touches[0];
        const touch2 = touches[1];
        const currentDistance = getTouchDistance(touch1, touch2);
        const currentCenter = getTouchCenter(touch1, touch2);
        
        // Zoom based on pinch
        const scaleFactor = currentDistance / touchState.lastDistance;
        
        // Pan based on center movement
        const deltaX = currentCenter.x - touchState.lastCenter.x;
        const deltaY = currentCenter.y - touchState.lastCenter.y;
        
        // Apply time zoom and pan
        const currentDomain = xScale.domain();
        const domainRange = currentDomain[1].getTime() - currentDomain[0].getTime();
        const newRange = domainRange * (1 / scaleFactor);
        const timeOffset = -(deltaX / width) * domainRange;
        const centerTime = currentDomain[0].getTime() + domainRange / 2 + timeOffset;
        
        const newDomain = [
          new Date(centerTime - newRange / 2),
          new Date(centerTime + newRange / 2)
        ];
        
        const newXScale = xScale.copy().domain(newDomain);
        updateChart(newXScale, yScale);

        touchState.lastDistance = currentDistance;
        touchState.lastCenter = currentCenter;
      } else if (touches.length === 1) {
        // Single finger pan
        const touch = touches[0];
        const deltaX = touch.clientX - touchState.lastCenter.x;
        const deltaY = touch.clientY - touchState.lastCenter.y;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          event.preventDefault();
          
          // Pan time axis
          const currentTimeDomain = xScale.domain();
          const timeRange = currentTimeDomain[1].getTime() - currentTimeDomain[0].getTime();
          const timeOffset = -(deltaX / width) * timeRange;
          
          const newTimeDomain = [
            new Date(currentTimeDomain[0].getTime() + timeOffset),
            new Date(currentTimeDomain[1].getTime() + timeOffset)
          ];
          
          // Pan price axis
          const currentPriceDomain = yScale.domain();
          const priceRange = currentPriceDomain[1] - currentPriceDomain[0];
          const priceOffset = (deltaY / (height * 0.7)) * priceRange;
          
          const newPriceDomain = [
            currentPriceDomain[0] + priceOffset,
            currentPriceDomain[1] + priceOffset
          ];
          
          const newXScale = xScale.copy().domain(newTimeDomain);
          const newYScale = yScale.copy().domain(newPriceDomain);
          updateChart(newXScale, newYScale);
          
          touchState.lastCenter = { x: touch.clientX, y: touch.clientY };
        }
      }
    });

    chartArea.on('touchend', function(event) {
      if (event.touches.length < 2) {
        touchState.lastDistance = 0;
      }
      if (event.touches.length === 0) {
        touchState.touches = [];
        touchState.lastCenter = { x: 0, y: 0 };
      }
    });

    // Apply zoom behavior
    chartArea.call(zoom);
    zoomRef.current = zoom;

    // Keyboard shortcuts for zoom controls (like TradingView)
    d3.select(window).on('keydown.zoom-controls', function(event) {
      if (event.target === document.body || event.target.tagName === 'SVG') {
        switch(event.key) {
          case 'r':
          case 'R':
            // Reset zoom to fit all data
            resetZoom();
            event.preventDefault();
            break;
          case '+':
          case '=':
            // Zoom in on center
            zoomToCenter(1.2);
            event.preventDefault();
            break;
          case '-':
          case '_':
            // Zoom out on center
            zoomToCenter(0.8);
            event.preventDefault();
            break;
        }
      }
    });

    // Helper function to reset zoom
    const resetZoom = () => {
      const originalXDomain = d3.extent(data, d => d.date) as [Date, Date];
      const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
      const originalPriceExtent = d3.extent(allPrices) as [number, number];
      const pricePadding = (originalPriceExtent[1] - originalPriceExtent[0]) * 0.1;
      
      const resetXScale = xScale.copy().domain(originalXDomain);
      const resetYScale = yScale.copy().domain([
        originalPriceExtent[0] - pricePadding, 
        originalPriceExtent[1] + pricePadding
      ]);
      
      updateChart(resetXScale, resetYScale);
    };

    // Helper function to zoom to center
    const zoomToCenter = (factor: number) => {
      const currentDomain = xScale.domain();
      const domainRange = currentDomain[1].getTime() - currentDomain[0].getTime();
      const newRange = domainRange * (1 / factor);
      const center = currentDomain[0].getTime() + domainRange / 2;
      
      const newDomain = [
        new Date(center - newRange / 2),
        new Date(center + newRange / 2)
      ];
      
      const newXScale = xScale.copy().domain(newDomain);
      updateChart(newXScale, yScale);
    };

    // Initial render with full indicator setup
    updateChart(xScale, yScale, undefined, true);

    function updateChart(currentXScale: any, currentYScale: any, currentVolumeScale?: any, fullRender = false) {
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

      // Handle indicator updates - full render on initial load, transform-only on zoom/pan
      if (fullRender) {
        g.selectAll(".indicator").remove();
        renderIndicators(g, currentXScale, currentYScale, height);
      } else {
        updateIndicatorTransforms(g, currentXScale, currentYScale, height);
      }

      renderAxes(g, currentXScale, currentYScale, width, height);
      updateCurrentPriceIndicator(g, currentYScale, width);

      if (config.showOI) {
        renderOIData(g, currentXScale, currentYScale, width, oiData, data, config);
      }

      renderDrawings(g, drawingsRef.current, currentXScale, currentYScale);
    }

    setupDrawingInteractions(svg, g, xScale, yScale, drawingMode, drawingsRef);
    
    // Ensure zoom area pointer events are correctly set based on drawing mode
    const chartZoomArea = g.select('.chart-zoom-area');
    if (chartZoomArea.node()) {
      chartZoomArea.style("pointer-events", drawingMode === 'none' ? "all" : "none");
    }
  };

  // Re-setup drawing interactions when drawing mode changes
  useEffect(() => {
    if (svgRef.current && data.length > 0) {
      const svg = d3.select(svgRef.current);
      const g = svg.select('g');
      if (!g.empty()) {
        // Get current scales from the chart
        const width = chartRef.current?.clientWidth || 800;
        const margin = { top: 20, right: 80, bottom: 50, left: 20 };
        const chartWidth = width - margin.left - margin.right;
        
        const xScale = d3.scaleTime()
          .domain(d3.extent(data, d => d.date) as [Date, Date])
          .range([0, chartWidth]);
          
        const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
        const priceExtent = d3.extent(allPrices) as [number, number];
        const pricePadding = (priceExtent[1] - priceExtent[0]) * 0.1;
        const height = (chartRef.current?.clientHeight || 600) - margin.top - margin.bottom;
        const yScale = d3.scaleLinear()
          .domain([priceExtent[0] - pricePadding, priceExtent[1] + pricePadding])
          .range([height * 0.7, 0]);
          
        setupDrawingInteractions(svg, g, xScale, yScale, drawingMode, drawingsRef);
      }
    }
  }, [drawingMode]);

  // Cleanup effect for event listeners
  useEffect(() => {
    return () => {
      // Cleanup any global event listeners when component unmounts or drawing mode changes
      if (typeof window !== 'undefined' && svgRef.current) {
        const svgNode = d3.select(svgRef.current).node();
        if (svgNode && (svgNode as any).__keydownHandler) {
          window.removeEventListener('keydown', (svgNode as any).__keydownHandler);
        }
        // Clear drawing event handlers
        d3.select(svgRef.current)
          .on("mousedown.drawing", null)
          .on("mousemove.drawing", null)
          .on("mouseup.drawing", null)
          .on("click.drawing", null);
      }
    };
  }, [drawingMode]);

  const updateIndicatorTransforms = (g: any, xScale: any, yScale: any, chartHeight: number) => {
    const appliedIndicators = config.appliedIndicators || [];

    appliedIndicators.forEach(indicator => {
      // Update line-based indicators (SMA, EMA, WMA, BB lines)
      if (['SMA', 'EMA', 'WMA'].includes(indicator.type)) {
        g.selectAll(`.${indicator.type.toLowerCase()}-${indicator.id}`)
          .attr("d", d3.line<any>()
            .x(d => xScale(d.date))
            .y(d => yScale(d.value))
            .curve(d3.curveMonotoneX));
      }

      // Update Bollinger Bands
      if (indicator.type === 'BB') {
        const line = d3.line<any>()
          .x(d => xScale(d.date))
          .y(d => yScale(d.value))
          .curve(d3.curveMonotoneX);

        g.selectAll(`.bb-upper-${indicator.id}`)
          .attr("d", line);
        g.selectAll(`.bb-middle-${indicator.id}`)
          .attr("d", line);
        g.selectAll(`.bb-lower-${indicator.id}`)
          .attr("d", line);
      }

      // Update RSI - need to recalculate position since it has its own scale
      if (indicator.type === 'RSI') {
        const rsiHeight = 80;
        const rsiY = yScale.range()[0] + 200;
        const rsiScale = d3.scaleLinear()
          .domain([0, 100])
          .range([rsiY + rsiHeight, rsiY]);

        g.selectAll(`.rsi-line-${indicator.id}`)
          .attr("d", d3.line<any>()
            .x(d => xScale(d.date))
            .y(d => rsiScale(d.value))
            .curve(d3.curveMonotoneX));

        // Update RSI reference lines
        g.selectAll(".rsi-reference")
          .attr("x1", xScale.range()[0])
          .attr("x2", xScale.range()[1]);
      }

      // Update MACD
      if (indicator.type === 'MACD') {
        const macdHeight = 100;
        const macdY = yScale.range()[0] + 50;

        // We need to recalculate the MACD extent for the scale
        const closes = data.map(d => d.close);
        const fastPeriod = indicator.params.fastPeriod || 12;
        const slowPeriod = indicator.params.slowPeriod || 26;
        const signalPeriod = indicator.params.signalPeriod || 9;

        const macdValues = TI.MACD.calculate({
          values: closes,
          fastPeriod,
          slowPeriod,
          signalPeriod,
          SimpleMAOscillator: false,
          SimpleMASignal: false
        });

        if (macdValues.length > 0) {
          const macdExtent = d3.extent(macdValues, (d: any) => Math.max(Math.abs(d.MACD || 0), Math.abs(d.signal || 0), Math.abs(d.histogram || 0)));
          const macdScale = d3.scaleLinear()
            .domain([-macdExtent[1], macdExtent[1]])
            .range([macdY + macdHeight, macdY]);

          g.selectAll(`.macd-line-${indicator.id}`)
            .attr("d", d3.line<any>()
              .x(d => xScale(d.date))
              .y(d => macdScale(d.macd))
              .curve(d3.curveMonotoneX));

          g.selectAll(`.macd-signal-${indicator.id}`)
            .attr("d", d3.line<any>()
              .x(d => xScale(d.date))
              .y(d => macdScale(d.signal))
              .curve(d3.curveMonotoneX));

          // Update MACD histogram bars
          const barWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.8);
          g.selectAll(".macd-histogram")
            .attr("x", d => xScale(d.date) - barWidth / 2)
            .attr("y", d => d.histogram >= 0 ? macdScale(d.histogram) : macdScale(0))
            .attr("width", barWidth)
            .attr("height", d => Math.abs(macdScale(d.histogram) - macdScale(0)));

          // Update zero line
          g.selectAll(".macd-zero")
            .attr("x1", xScale.range()[0])
            .attr("x2", xScale.range()[1])
            .attr("y1", macdScale(0))
            .attr("y2", macdScale(0));
        }
      }

      // Update Volume indicator
      if (indicator.type === 'VOLUME') {
        const volumeScale = d3.scaleLinear()
          .domain([0, d3.max(data, d => d.volume) as number])
          .range([chartHeight * 0.85, chartHeight * 0.75]);

        const barWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.6);

        g.selectAll(`.volume-ma-bar-${indicator.id}`)
          .attr("x", d => xScale(d.date) - barWidth / 2)
          .attr("y", d => volumeScale(d.maValue))
          .attr("width", barWidth)
          .attr("height", d => volumeScale.range()[0] - volumeScale(d.maValue));
      }
    });
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
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%' 
    }}>
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
        <div>📊 Green: Bullish volume</div>
        <div>📊 Red: Bearish volume</div>
        <div>📊 Orange line: Average volume</div>
      </div>
      <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: drawingMode !== 'none' ? 'crosshair' : 'default' }}></svg>
    </div>
  );
};

export default ChartRenderer;