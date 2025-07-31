
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as TI from 'technicalindicators';
import { CandleData, ChartConfig, OIData } from './TradingChart';

interface ChartRendererProps {
  data: CandleData[];
  oiData: OIData[];
  config: ChartConfig;
  chartRef: React.RefObject<HTMLDivElement>;
  drawingMode: string;
}

const ChartRenderer: React.FC<ChartRendererProps> = ({ 
  data, 
  oiData,
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

    const oiPanelWidth = config.showOI ? 350 : 0;
    const margin = { top: 20, right: 220, bottom: 50, left: 50 + oiPanelWidth };
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

      // Render OI data if enabled
      if (config.showOI) {
        renderOIData(g, currentXScale, currentYScale, oiPanelWidth);
      }

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
    const indicatorConfig = config.indicatorConfig || {};
    
    config.indicators.forEach(indicator => {
      const userConfig = indicatorConfig[indicator] || {};
      
      switch (indicator) {
        case 'SMA':
          renderSMA(g, xScale, yScale, userConfig.period || 20);
          break;
        case 'EMA':
          renderEMA(g, xScale, yScale, userConfig.period || 20);
          break;
        case 'MACD':
          renderMACD(g, xScale, yScale, userConfig);
          break;
        case 'RSI':
          renderRSI(g, xScale, yScale, userConfig.period || 14);
          break;
        case 'BB':
          renderBollingerBands(g, xScale, yScale, userConfig.period || 20, userConfig.stdDev || 2);
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

    // Add current value label
    if (smaData.length > 0) {
      const lastValue = smaData[smaData.length - 1];
      g.append("text")
        .attr("class", "indicator sma-label")
        .attr("x", xScale.range()[1] + 5)
        .attr("y", yScale(lastValue.value))
        .attr("dy", "0.35em")
        .attr("fill", "#FF9800")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text(`SMA(${period}): ${lastValue.value.toFixed(2)}`);
    }
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

    // Add current value label
    if (emaData.length > 0) {
      const lastValue = emaData[emaData.length - 1];
      g.append("text")
        .attr("class", "indicator ema-label")
        .attr("x", xScale.range()[1] + 5)
        .attr("y", yScale(lastValue.value))
        .attr("dy", "0.35em")
        .attr("fill", "#9C27B0")
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text(`EMA(${period}): ${lastValue.value.toFixed(2)}`);
    }
  };

  const renderMACD = (g: any, xScale: any, yScale: any, userConfig: any = {}) => {
    const closes = data.map(d => d.close);
    const fastPeriod = userConfig.fastPeriod || 12;
    const slowPeriod = userConfig.slowPeriod || 26;
    const signalPeriod = userConfig.signalPeriod || 9;
    
    const macdValues = TI.MACD.calculate({
      values: closes,
      fastPeriod,
      slowPeriod,
      signalPeriod,
      SimpleMAOscillator: false,
      SimpleMASignal: false
    });

    if (macdValues.length === 0) return;

    // Create MACD panel at bottom
    const macdHeight = 100;
    const macdY = yScale.range()[0] + 50;
    
    const macdExtent = d3.extent(macdValues, (d: any) => Math.max(Math.abs(d.MACD || 0), Math.abs(d.signal || 0), Math.abs(d.histogram || 0)));
    const macdScale = d3.scaleLinear()
      .domain([-macdExtent[1], macdExtent[1]])
      .range([macdY + macdHeight, macdY]);

    const macdData = data.slice(slowPeriod).map((d, i) => ({
      date: d.date,
      macd: macdValues[i]?.MACD || 0,
      signal: macdValues[i]?.signal || 0,
      histogram: macdValues[i]?.histogram || 0
    }));

    // MACD line
    const macdLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => macdScale(d.macd))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(macdData)
      .attr("class", "indicator macd-line")
      .attr("fill", "none")
      .attr("stroke", "#2196F3")
      .attr("stroke-width", 2)
      .attr("d", macdLine);

    // Signal line
    const signalLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => macdScale(d.signal))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(macdData)
      .attr("class", "indicator macd-signal")
      .attr("fill", "none")
      .attr("stroke", "#FF9800")
      .attr("stroke-width", 2)
      .attr("d", signalLine);

    // Histogram bars
    const barWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / macdData.length * 0.8);
    
    g.selectAll(".macd-histogram")
      .data(macdData)
      .enter()
      .append("rect")
      .attr("class", "indicator macd-histogram")
      .attr("x", d => xScale(d.date) - barWidth / 2)
      .attr("y", d => d.histogram >= 0 ? macdScale(d.histogram) : macdScale(0))
      .attr("width", barWidth)
      .attr("height", d => Math.abs(macdScale(d.histogram) - macdScale(0)))
      .attr("fill", d => d.histogram >= 0 ? "rgba(76, 175, 80, 0.7)" : "rgba(244, 67, 54, 0.7)");

    // MACD zero line
    g.append("line")
      .attr("class", "indicator macd-zero")
      .attr("x1", xScale.range()[0])
      .attr("x2", xScale.range()[1])
      .attr("y1", macdScale(0))
      .attr("y2", macdScale(0))
      .attr("stroke", "#666")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "2,2");
  };

  const renderRSI = (g: any, xScale: any, yScale: any, period: number = 14) => {
    const closes = data.map(d => d.close);
    const rsiValues = TI.RSI.calculate({ period, values: closes });
    
    if (rsiValues.length === 0) return;

    // Create RSI panel at bottom
    const rsiHeight = 80;
    const rsiY = yScale.range()[0] + 200;
    
    const rsiScale = d3.scaleLinear()
      .domain([0, 100])
      .range([rsiY + rsiHeight, rsiY]);

    const rsiData = data.slice(period).map((d, i) => ({
      date: d.date,
      value: rsiValues[i] || 50
    }));

    // RSI line
    const rsiLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => rsiScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(rsiData)
      .attr("class", "indicator rsi-line")
      .attr("fill", "none")
      .attr("stroke", "#9C27B0")
      .attr("stroke-width", 2)
      .attr("d", rsiLine);

    // RSI reference lines
    [30, 50, 70].forEach(level => {
      g.append("line")
        .attr("class", "indicator rsi-reference")
        .attr("x1", xScale.range()[0])
        .attr("x2", xScale.range()[1])
        .attr("y1", rsiScale(level))
        .attr("y2", rsiScale(level))
        .attr("stroke", level === 50 ? "#666" : "#999")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", level === 50 ? "2,2" : "1,1");
    });

    // RSI area fill for overbought/oversold
    const area = d3.area<any>()
      .x(d => xScale(d.date))
      .y0(d => rsiScale(Math.max(70, d.value)))
      .y1(rsiScale(100))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(rsiData.filter(d => d.value > 70))
      .attr("class", "indicator rsi-overbought")
      .attr("fill", "rgba(244, 67, 54, 0.2)")
      .attr("d", area);

    const areaOversold = d3.area<any>()
      .x(d => xScale(d.date))
      .y0(rsiScale(0))
      .y1(d => rsiScale(Math.min(30, d.value)))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(rsiData.filter(d => d.value < 30))
      .attr("class", "indicator rsi-oversold")
      .attr("fill", "rgba(76, 175, 80, 0.2)")
      .attr("d", areaOversold);
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

    // Add current value labels
    if (bbData.length > 0) {
      const lastValue = bbData[bbData.length - 1];
      const labels = [
        { value: lastValue.upper, label: 'Upper', offset: 0 },
        { value: lastValue.middle, label: 'Middle', offset: 15 },
        { value: lastValue.lower, label: 'Lower', offset: 30 }
      ];

      labels.forEach(({ value, label, offset }) => {
        g.append("text")
          .attr("class", "indicator bb-label")
          .attr("x", xScale.range()[1] + 5)
          .attr("y", yScale(value) + offset)
          .attr("dy", "0.35em")
          .attr("fill", "#2196F3")
          .attr("font-size", "10px")
          .text(`BB ${label}: ${value.toFixed(2)}`);
      });
    }
  };

  const renderOIData = (g: any, xScale: any, yScale: any, oiPanelWidth: number) => {
    const oiContainer = g.append("g")
      .attr("class", "oi-container")
      .attr("transform", `translate(${-oiPanelWidth}, 0)`);

    // OI Panel Background with gradient
    const defs = oiContainer.append("defs");
    const gradient = defs.append("linearGradient")
      .attr("id", "oi-background-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#f8f9fa")
      .attr("stop-opacity", 0.98);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#ffffff")
      .attr("stop-opacity", 0.95);

    oiContainer.append("rect")
      .attr("class", "oi-background")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", oiPanelWidth - 10)
      .attr("height", yScale.range()[0])
      .attr("fill", "url(#oi-background-gradient)")
      .attr("stroke", "#e9ecef")
      .attr("stroke-width", 1);

    // Headers with better styling
    const headerY = 25;
    const headers = [
      { text: "Strike", x: 40, align: "middle", width: 60 },
      { text: "CE OI", x: 110, align: "middle", width: 50 },
      { text: "Chg", x: 145, align: "middle", width: 35 },
      { text: "OI Chart", x: 200, align: "middle", width: 80 },
      { text: "PE OI", x: 260, align: "middle", width: 50 },
      { text: "Chg", x: 295, align: "middle", width: 35 }
    ];

    // Header background
    oiContainer.append("rect")
      .attr("x", 5)
      .attr("y", 5)
      .attr("width", oiPanelWidth - 20)
      .attr("height", 30)
      .attr("fill", "#6c757d")
      .attr("rx", 4);

    headers.forEach(header => {
      oiContainer.append("text")
        .attr("class", "oi-header")
        .attr("x", header.x)
        .attr("y", headerY)
        .attr("text-anchor", header.align)
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", "white")
        .text(header.text);
    });

    // Current price for reference
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 50000;

    // Filter and sort OI data by strike price
    const visibleOI = oiData
      .filter(oi => Math.abs(oi.strikePrice - currentPrice) <= currentPrice * 0.15) // Show strikes within 15% of current price
      .sort((a, b) => b.strikePrice - a.strikePrice);

    // Calculate max OI for scaling bars
    const maxOI = Math.max(...visibleOI.map(oi => Math.max(oi.ce.oi, oi.pe.oi)));
    const maxBarWidth = 35;

    // Render OI data rows with enhanced visuals
    visibleOI.forEach((oi, index) => {
      const rowY = headerY + 20 + (index * 22);
      
      if (rowY > yScale.range()[0] - 25) return; // Don't render if out of bounds

      const isATM = Math.abs(oi.strikePrice - currentPrice) <= 500; // At the money
      const isITM_CE = oi.strikePrice < currentPrice; // In the money for CE
      const isITM_PE = oi.strikePrice > currentPrice; // In the money for PE
      
      // Row background with alternating colors
      const rowBg = index % 2 === 0 ? "rgba(248, 249, 250, 0.5)" : "rgba(255, 255, 255, 0.3)";
      const atmBg = isATM ? "rgba(255, 193, 7, 0.15)" : rowBg;

      oiContainer.append("rect")
        .attr("x", 8)
        .attr("y", rowY - 10)
        .attr("width", oiPanelWidth - 26)
        .attr("height", 20)
        .attr("fill", atmBg)
        .attr("rx", 2);

      // Strike price with enhanced styling
      oiContainer.append("text")
        .attr("class", "oi-strike")
        .attr("x", 40)
        .attr("y", rowY)
        .attr("text-anchor", "middle")
        .attr("font-size", isATM ? "11px" : "10px")
        .attr("font-weight", isATM ? "bold" : "normal")
        .attr("fill", isATM ? "#f57c00" : "#495057")
        .text(oi.strikePrice.toLocaleString());

      // CE side (left)
      const ceColor = isITM_CE ? "#1565c0" : "#42a5f5";
      
      // CE OI with background highlight for ITM
      if (isITM_CE) {
        oiContainer.append("rect")
          .attr("x", 85)
          .attr("y", rowY - 8)
          .attr("width", 50)
          .attr("height", 16)
          .attr("fill", "rgba(21, 101, 192, 0.1)")
          .attr("rx", 2);
      }

      oiContainer.append("text")
        .attr("class", "oi-ce")
        .attr("x", 110)
        .attr("y", rowY)
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("font-weight", isITM_CE ? "bold" : "normal")
        .attr("fill", ceColor)
        .text(formatOI(oi.ce.oi));

      // CE Change with arrows
      const ceChangeIcon = oi.ce.changeOI >= 0 ? "▲" : "▼";
      oiContainer.append("text")
        .attr("class", "oi-ce-change")
        .attr("x", 145)
        .attr("y", rowY)
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .attr("fill", oi.ce.changeOI >= 0 ? "#4caf50" : "#f44336")
        .text(ceChangeIcon + formatChange(Math.abs(oi.ce.changeOI)));

      // OI Bar Chart in center
      const ceBarWidth = (oi.ce.oi / maxOI) * maxBarWidth;
      const peBarWidth = (oi.pe.oi / maxOI) * maxBarWidth;
      const centerX = 200;

      // CE bar (left side of center)
      oiContainer.append("rect")
        .attr("x", centerX - ceBarWidth)
        .attr("y", rowY - 6)
        .attr("width", ceBarWidth)
        .attr("height", 12)
        .attr("fill", ceColor)
        .attr("opacity", 0.7)
        .attr("rx", 1);

      // PE bar (right side of center)
      oiContainer.append("rect")
        .attr("x", centerX)
        .attr("y", rowY - 6)
        .attr("width", peBarWidth)
        .attr("height", 12)
        .attr("fill", "#d32f2f")
        .attr("opacity", 0.7)
        .attr("rx", 1);

      // Center line
      oiContainer.append("line")
        .attr("x1", centerX)
        .attr("x2", centerX)
        .attr("y1", rowY - 8)
        .attr("y2", rowY + 8)
        .attr("stroke", "#666")
        .attr("stroke-width", 1)
        .attr("opacity", 0.5);

      // PE side (right)
      const peColor = isITM_PE ? "#c62828" : "#ef5350";
      
      // PE OI with background highlight for ITM
      if (isITM_PE) {
        oiContainer.append("rect")
          .attr("x", 235)
          .attr("y", rowY - 8)
          .attr("width", 50)
          .attr("height", 16)
          .attr("fill", "rgba(198, 40, 40, 0.1)")
          .attr("rx", 2);
      }

      oiContainer.append("text")
        .attr("class", "oi-pe")
        .attr("x", 260)
        .attr("y", rowY)
        .attr("text-anchor", "middle")
        .attr("font-size", "9px")
        .attr("font-weight", isITM_PE ? "bold" : "normal")
        .attr("fill", peColor)
        .text(formatOI(oi.pe.oi));

      // PE Change with arrows
      const peChangeIcon = oi.pe.changeOI >= 0 ? "▲" : "▼";
      oiContainer.append("text")
        .attr("class", "oi-pe-change")
        .attr("x", 295)
        .attr("y", rowY)
        .attr("text-anchor", "middle")
        .attr("font-size", "8px")
        .attr("fill", oi.pe.changeOI >= 0 ? "#4caf50" : "#f44336")
        .text(peChangeIcon + formatChange(Math.abs(oi.pe.changeOI)));

      // Strike price line extending to chart with enhanced styling
      const strikeY = yScale(oi.strikePrice);
      if (strikeY >= 0 && strikeY <= yScale.range()[0]) {
        g.append("line")
          .attr("class", "strike-line")
          .attr("x1", -oiPanelWidth + 10)
          .attr("x2", xScale.range()[1])
          .attr("y1", strikeY)
          .attr("y2", strikeY)
          .attr("stroke", isATM ? "#ff9800" : "#e0e0e0")
          .attr("stroke-width", isATM ? 2 : 0.5)
          .attr("stroke-dasharray", isATM ? "none" : "3,3")
          .attr("opacity", isATM ? 0.9 : 0.4);

        // Strike price labels on the chart
        if (isATM || index % 3 === 0) { // Show labels for ATM and every 3rd strike
          g.append("text")
            .attr("class", "strike-label")
            .attr("x", xScale.range()[1] + 5)
            .attr("y", strikeY)
            .attr("dy", "0.35em")
            .attr("font-size", "9px")
            .attr("font-weight", isATM ? "bold" : "normal")
            .attr("fill", isATM ? "#ff9800" : "#666")
            .text(oi.strikePrice.toFixed(0));
        }
      }
    });

    // Current price indicator line with enhanced styling
    const currentPriceY = yScale(currentPrice);
    g.append("line")
      .attr("class", "current-price-line")
      .attr("x1", -oiPanelWidth + 10)
      .attr("x2", xScale.range()[1])
      .attr("y1", currentPriceY)
      .attr("y2", currentPriceY)
      .attr("stroke", "#ff5722")
      .attr("stroke-width", 3)
      .attr("opacity", 0.9);

    // Current price label with shadow effect
    const priceLabel = oiContainer.append("g")
      .attr("class", "current-price-label");

    // Shadow
    priceLabel.append("rect")
      .attr("x", 12)
      .attr("y", currentPriceY - 8)
      .attr("width", 70)
      .attr("height", 18)
      .attr("fill", "rgba(0, 0, 0, 0.2)")
      .attr("rx", 4);

    // Main label
    priceLabel.append("rect")
      .attr("x", 10)
      .attr("y", currentPriceY - 10)
      .attr("width", 70)
      .attr("height", 18)
      .attr("fill", "#ff5722")
      .attr("rx", 4);

    priceLabel.append("text")
      .attr("x", 45)
      .attr("y", currentPriceY)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(currentPrice.toFixed(0));

    // Total OI summary at bottom
    const totalCE_OI = visibleOI.reduce((sum, oi) => sum + oi.ce.oi, 0);
    const totalPE_OI = visibleOI.reduce((sum, oi) => sum + oi.pe.oi, 0);
    const totalCE_Change = visibleOI.reduce((sum, oi) => sum + oi.ce.changeOI, 0);
    const totalPE_Change = visibleOI.reduce((sum, oi) => sum + oi.pe.changeOI, 0);

    const summaryY = yScale.range()[0] - 40;
    
    // Summary background
    oiContainer.append("rect")
      .attr("x", 5)
      .attr("y", summaryY - 15)
      .attr("width", oiPanelWidth - 20)
      .attr("height", 35)
      .attr("fill", "#495057")
      .attr("rx", 4);

    // Summary labels
    oiContainer.append("text")
      .attr("x", 15)
      .attr("y", summaryY - 2)
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text("Total CE OI: " + formatOI(totalCE_OI));

    oiContainer.append("text")
      .attr("x", 15)
      .attr("y", summaryY + 10)
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text("Change: " + (totalCE_Change >= 0 ? "+" : "") + formatOI(totalCE_Change));

    oiContainer.append("text")
      .attr("x", 160)
      .attr("y", summaryY - 2)
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text("Total PE OI: " + formatOI(totalPE_OI));

    oiContainer.append("text")
      .attr("x", 160)
      .attr("y", summaryY + 10)
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text("Change: " + (totalPE_Change >= 0 ? "+" : "") + formatOI(totalPE_Change));

    // PCR (Put Call Ratio)
    const pcr = totalPE_OI / totalCE_OI;
    oiContainer.append("text")
      .attr("x", oiPanelWidth / 2)
      .attr("y", summaryY + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", pcr > 1.2 ? "#4caf50" : pcr < 0.8 ? "#f44336" : "#ff9800")
      .text(`PCR: ${pcr.toFixed(2)}`);
  };

  const formatOI = (value: number): string => {
    if (value >= 100000) {
      return (value / 100000).toFixed(1) + 'L';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  const formatChange = (value: number): string => {
    const sign = value >= 0 ? '+' : '';
    return sign + formatOI(Math.abs(value));
  };

  const renderAxes = (g: any, xScale: any, yScale: any, width: number, height: number) => {
    // X-axis
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${height * 0.7})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat("%m/%d")));

    // Left Y-axis (for prices and strikes)
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
