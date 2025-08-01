
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

    const totalWidth = chartRef.current.clientWidth;
    const margin = { top: 20, right: 80, bottom: 50, left: 60 }; // Increased margins for price labels
    const width = totalWidth - margin.left - margin.right;
    const height = chartRef.current.clientHeight - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Setup scales - full width since OI histogram is overlaid
    const xScale = d3.scaleTime()
      .domain(d3.extent(data, d => d.date) as [Date, Date])
      .range([0, width]); // Full width since OI is overlaid

    // Get proper price domain including all OHLC values with padding
    const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
    const priceExtent = d3.extent(allPrices) as [number, number];
    const pricePadding = (priceExtent[1] - priceExtent[0]) * 0.1; // 10% padding
    const yScale = d3.scaleLinear()
      .domain([priceExtent[0] - pricePadding, priceExtent[1] + pricePadding])
      .range([height * 0.7, 0]);

    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) as number])
      .range([height * 0.7, height * 0.75]); // Volume in bottom section of main chart

    // Create clipping path for chart content
    const defs = svg.append("defs");
    defs.append("clipPath")
      .attr("id", "chart-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height * 0.75); // Include volume area

    // Setup zoom with both X and Y axis scaling
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .translateExtent([[-width * 2, -height * 2], [width * 3, height * 3]]) // Allow panning beyond chart boundaries
      .on("zoom", (event) => {
        const { transform } = event;
        
        // Apply transform to both X and Y scales
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);

        // Update volume scale proportionally with Y scale
        const newVolumeScale = d3.scaleLinear()
          .domain(volumeScale.domain())
          .range([height * 0.7, height * 0.75]);

        updateChart(newXScale, newYScale, newVolumeScale);
      });

    // Apply zoom to entire SVG area (including axes)
    svg.call(zoom);
    zoomRef.current = zoom;
    
    // Enable zoom on axes areas as well
    svg.selectAll(".axis")
      .style("pointer-events", "all");

    // Initial chart render
    updateChart(xScale, yScale);

    function updateChart(currentXScale: any, currentYScale: any, currentVolumeScale?: any) {
      // Use provided volume scale or default
      const activeVolumeScale = currentVolumeScale || volumeScale;
      
      // Clear previous elements (but preserve drawings and current price indicator)
      g.selectAll(".candle").remove();
      g.selectAll(".volume-bar").remove();
      g.selectAll(".axis").remove();
      g.selectAll(".indicator").remove();
      g.selectAll(".oi-overlay").remove(); // Clear OI overlay separately

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
      renderVolume(g, currentXScale, activeVolumeScale);

      // Render indicators
      renderIndicators(g, currentXScale, currentYScale);

      // Render axes
      renderAxes(g, currentXScale, currentYScale, width, height);

      // Update current price indicator position
      updateCurrentPriceIndicator(g, currentYScale, width);

      // Render OI data if enabled (before drawings to keep drawings on top)
      if (config.showOI) {
        renderOIData(g, currentXScale, currentYScale, width);
      }

      // Render drawings (always on top)
      renderDrawings(g, currentXScale, currentYScale);
    }

    // Setup drawing interactions
    setupDrawingInteractions(svg, g, xScale, yScale);
  };

  const renderCandlesticks = (g: any, xScale: any, yScale: any) => {
    const candleWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.8);

    const candlesGroup = g.append("g")
      .attr("class", "candles-group")
      .attr("clip-path", "url(#chart-clip)");

    candlesGroup.selectAll(".candle")
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
      .attr("clip-path", "url(#chart-clip)")
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
      .attr("clip-path", "url(#chart-clip)")
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

    const volumeGroup = g.append("g")
      .attr("class", "volume-group")
      .attr("clip-path", "url(#chart-clip)");

    volumeGroup.selectAll(".volume-bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "volume-bar")
      .attr("x", d => xScale(d.date) - barWidth / 2)
      .attr("y", d => volumeScale(d.volume))
      .attr("width", barWidth)
      .attr("height", d => volumeScale.range()[0] - volumeScale(d.volume))
      .attr("fill", "rgba(156, 156, 156, 0.3)")
      .attr("opacity", 0.7);
  };

  const renderIndicators = (g: any, xScale: any, yScale: any) => {
    const appliedIndicators = config.appliedIndicators || [];
    
    appliedIndicators.forEach(indicator => {
      switch (indicator.type) {
        case 'SMA':
          renderSMA(g, xScale, yScale, indicator.params.period || 20, indicator.color, indicator.id, indicator.label);
          break;
        case 'EMA':
          renderEMA(g, xScale, yScale, indicator.params.period || 20, indicator.color, indicator.id, indicator.label);
          break;
        case 'WMA':
          renderWMA(g, xScale, yScale, indicator.params.period || 20, indicator.color, indicator.id, indicator.label);
          break;
        case 'MACD':
          renderMACD(g, xScale, yScale, indicator.params, indicator.color, indicator.id, indicator.label);
          break;
        case 'RSI':
          renderRSI(g, xScale, yScale, indicator.params.period || 14, indicator.color, indicator.id, indicator.label);
          break;
        case 'STOCH':
          renderStochastic(g, xScale, yScale, indicator.params, indicator.color, indicator.id, indicator.label);
          break;
        case 'STOCHRSI':
          renderStochRSI(g, xScale, yScale, indicator.params, indicator.color, indicator.id, indicator.label);
          break;
        case 'ADX':
          renderADX(g, xScale, yScale, indicator.params.period || 14, indicator.color, indicator.id, indicator.label);
          break;
        case 'CCI':
          renderCCI(g, xScale, yScale, indicator.params.period || 14, indicator.color, indicator.id, indicator.label);
          break;
        case 'WILLIAMS':
          renderWilliamsR(g, xScale, yScale, indicator.params.period || 14, indicator.color, indicator.id, indicator.label);
          break;
        case 'ATR':
          renderATR(g, xScale, yScale, indicator.params.period || 14, indicator.color, indicator.id, indicator.label);
          break;
        case 'TRIX':
          renderTRIX(g, xScale, yScale, indicator.params.period || 18, indicator.color, indicator.id, indicator.label);
          break;
        case 'MFI':
          renderMFI(g, xScale, yScale, indicator.params.period || 14, indicator.color, indicator.id, indicator.label);
          break;
        case 'ROC':
          renderROC(g, xScale, yScale, indicator.params.period || 12, indicator.color, indicator.id, indicator.label);
          break;
        case 'OBV':
          renderOBV(g, xScale, yScale, indicator.color, indicator.id, indicator.label);
          break;
        case 'KAMA':
          renderKAMA(g, xScale, yScale, indicator.params, indicator.color, indicator.id, indicator.label);
          break;
        case 'PSAR':
          renderPSAR(g, xScale, yScale, indicator.params, indicator.color, indicator.id, indicator.label);
          break;
        case 'ICHIMOKU':
          renderIchimoku(g, xScale, yScale, indicator.color, indicator.id, indicator.label);
          break;
        case 'DONCHIAN':
          renderDonchian(g, xScale, yScale, indicator.params.period || 20, indicator.color, indicator.id, indicator.label);
          break;
        case 'VWAP':
          renderVWAP(g, xScale, yScale, indicator.color, indicator.id, indicator.label);
          break;
        case 'HV':
          renderHV(g, xScale, yScale, indicator.params.period || 30, indicator.color, indicator.id, indicator.label);
          break;
        case 'BB':
          renderBollingerBands(g, xScale, yScale, indicator.params.period || 20, indicator.params.stdDev || 2, indicator.color, indicator.id, indicator.label);
          break;
      }
    });
  };

  const renderSMA = (g: any, xScale: any, yScale: any, period: number, color: string = "#FF9800", id: string = "sma", label: string = "SMA") => {
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
      .attr("class", `indicator sma sma-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add clickable indicator label with settings/delete options
    renderIndicatorLabel(g, xScale, yScale, smaData, `${label}(${period})`, color, id);
  };

  const renderEMA = (g: any, xScale: any, yScale: any, period: number, color: string = "#9C27B0", id: string = "ema", label: string = "EMA") => {
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
      .attr("class", `indicator ema ema-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    // Add clickable indicator label with settings/delete options
    renderIndicatorLabel(g, xScale, yScale, emaData, `${label}(${period})`, color, id);
  };

  const renderWMA = (g: any, xScale: any, yScale: any, period: number, color: string = "#4CAF50", id: string = "wma", label: string = "WMA") => {
    const closes = data.map(d => d.close);
    const wmaValues = TI.WMA.calculate({ period, values: closes });
    
    const wmaData = data.slice(period - 1).map((d, i) => ({
      date: d.date,
      value: wmaValues[i]
    }));

    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(wmaData)
      .attr("class", `indicator wma wma-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    renderIndicatorLabel(g, xScale, yScale, wmaData, `${label}(${period})`, color, id);
  };

  const renderStochastic = (g: any, xScale: any, yScale: any, params: any, color: string = "#FF5722", id: string = "stoch", label: string = "STOCH") => {
    const period = params.period || 14;
    const signalPeriod = params.signalPeriod || 3;
    
    const stochValues = TI.Stochastic.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      period,
      signalPeriod
    });

    if (stochValues.length === 0) return;

    const stochHeight = 80;
    const stochY = yScale.range()[0] + 300;
    
    const stochScale = d3.scaleLinear()
      .domain([0, 100])
      .range([stochY + stochHeight, stochY]);

    const stochData = data.slice(period).map((d, i) => ({
      date: d.date,
      k: stochValues[i]?.k || 50,
      d: stochValues[i]?.d || 50
    }));

    // %K line
    const kLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => stochScale(d.k))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(stochData)
      .attr("class", `indicator stoch-k stoch-k-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", kLine);

    // %D line
    const dLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => stochScale(d.d))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(stochData)
      .attr("class", `indicator stoch-d stoch-d-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.7)
      .attr("d", dLine);

    // Reference lines
    [20, 50, 80].forEach(level => {
      g.append("line")
        .attr("class", "indicator stoch-reference")
        .attr("x1", xScale.range()[0])
        .attr("x2", xScale.range()[1])
        .attr("y1", stochScale(level))
        .attr("y2", stochScale(level))
        .attr("stroke", "#999")
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "1,1");
    });

    renderIndicatorLabel(g, xScale, yScale, stochData, `${label}(${period},${signalPeriod})`, color, id, stochY);
  };

  const renderStochRSI = (g: any, xScale: any, yScale: any, params: any, color: string = "#E91E63", id: string = "stochrsi", label: string = "StochRSI") => {
    const rsiPeriod = params.rsiPeriod || 14;
    const stochPeriod = params.stochPeriod || 14;
    const kPeriod = params.kPeriod || 3;
    
    const closes = data.map(d => d.close);
    const rsiValues = TI.RSI.calculate({ period: rsiPeriod, values: closes });
    
    if (rsiValues.length < stochPeriod) return;
    
    const stochRSIValues = TI.Stochastic.calculate({
      high: rsiValues,
      low: rsiValues,
      close: rsiValues,
      period: stochPeriod,
      signalPeriod: kPeriod
    });

    if (stochRSIValues.length === 0) return;

    const stochRSIHeight = 80;
    const stochRSIY = yScale.range()[0] + 400;
    
    const stochRSIScale = d3.scaleLinear()
      .domain([0, 100])
      .range([stochRSIY + stochRSIHeight, stochRSIY]);

    const stochRSIData = data.slice(rsiPeriod + stochPeriod).map((d, i) => ({
      date: d.date,
      k: stochRSIValues[i]?.k || 50,
      d: stochRSIValues[i]?.d || 50
    }));

    // %K line
    const kLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => stochRSIScale(d.k))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(stochRSIData)
      .attr("class", `indicator stochrsi-k stochrsi-k-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", kLine);

    renderIndicatorLabel(g, xScale, yScale, stochRSIData, `${label}(${rsiPeriod},${stochPeriod})`, color, id, stochRSIY);
  };

  const renderADX = (g: any, xScale: any, yScale: any, period: number, color: string = "#4CAF50", id: string = "adx", label: string = "ADX") => {
    const adxValues = TI.ADX.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      period
    });

    if (adxValues.length === 0) return;

    const adxHeight = 80;
    const adxY = yScale.range()[0] + 500;
    
    const adxScale = d3.scaleLinear()
      .domain([0, 100])
      .range([adxY + adxHeight, adxY]);

    const adxData = data.slice(period * 2).map((d, i) => ({
      date: d.date,
      adx: adxValues[i]?.adx || 25,
      pdi: adxValues[i]?.pdi || 25,
      mdi: adxValues[i]?.mdi || 25
    }));

    // ADX line
    const adxLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => adxScale(d.adx))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(adxData)
      .attr("class", `indicator adx-line adx-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", adxLine);

    renderIndicatorLabel(g, xScale, yScale, adxData, `${label}(${period})`, color, id, adxY);
  };

  const renderCCI = (g: any, xScale: any, yScale: any, period: number, color: string = "#FF9800", id: string = "cci", label: string = "CCI") => {
    const cciValues = TI.CCI.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      period
    });

    if (cciValues.length === 0) return;

    const cciHeight = 80;
    const cciY = yScale.range()[0] + 600;
    
    const cciExtent = d3.extent(cciValues) as [number, number];
    const cciScale = d3.scaleLinear()
      .domain(cciExtent)
      .range([cciY + cciHeight, cciY]);

    const cciData = data.slice(period - 1).map((d, i) => ({
      date: d.date,
      value: cciValues[i] || 0
    }));

    const cciLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => cciScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(cciData)
      .attr("class", `indicator cci-line cci-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", cciLine);

    renderIndicatorLabel(g, xScale, yScale, cciData, `${label}(${period})`, color, id, cciY);
  };

  const renderWilliamsR = (g: any, xScale: any, yScale: any, period: number, color: string = "#795548", id: string = "williams", label: string = "Williams %R") => {
    const williamsValues = TI.WilliamsR.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      period
    });

    if (williamsValues.length === 0) return;

    const williamsHeight = 80;
    const williamsY = yScale.range()[0] + 700;
    
    const williamsScale = d3.scaleLinear()
      .domain([-100, 0])
      .range([williamsY + williamsHeight, williamsY]);

    const williamsData = data.slice(period - 1).map((d, i) => ({
      date: d.date,
      value: williamsValues[i] || -50
    }));

    const williamsLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => williamsScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(williamsData)
      .attr("class", `indicator williams-line williams-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", williamsLine);

    renderIndicatorLabel(g, xScale, yScale, williamsData, `${label}(${period})`, color, id, williamsY);
  };

  const renderATR = (g: any, xScale: any, yScale: any, period: number, color: string = "#607D8B", id: string = "atr", label: string = "ATR") => {
    const atrValues = TI.ATR.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      period
    });

    if (atrValues.length === 0) return;

    const atrHeight = 80;
    const atrY = yScale.range()[0] + 800;
    
    const atrExtent = d3.extent(atrValues) as [number, number];
    const atrScale = d3.scaleLinear()
      .domain([0, atrExtent[1]])
      .range([atrY + atrHeight, atrY]);

    const atrData = data.slice(period).map((d, i) => ({
      date: d.date,
      value: atrValues[i] || 0
    }));

    const atrLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => atrScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(atrData)
      .attr("class", `indicator atr-line atr-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", atrLine);

    renderIndicatorLabel(g, xScale, yScale, atrData, `${label}(${period})`, color, id, atrY);
  };

  const renderTRIX = (g: any, xScale: any, yScale: any, period: number, color: string = "#9E9E9E", id: string = "trix", label: string = "TRIX") => {
    const trixValues = TI.TRIX.calculate({
      values: data.map(d => d.close),
      period
    });

    if (trixValues.length === 0) return;

    const trixHeight = 80;
    const trixY = yScale.range()[0] + 900;
    
    const trixExtent = d3.extent(trixValues) as [number, number];
    const trixScale = d3.scaleLinear()
      .domain(trixExtent)
      .range([trixY + trixHeight, trixY]);

    const trixData = data.slice(period * 3).map((d, i) => ({
      date: d.date,
      value: trixValues[i] || 0
    }));

    const trixLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => trixScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(trixData)
      .attr("class", `indicator trix-line trix-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", trixLine);

    renderIndicatorLabel(g, xScale, yScale, trixData, `${label}(${period})`, color, id, trixY);
  };

  const renderMFI = (g: any, xScale: any, yScale: any, period: number, color: string = "#673AB7", id: string = "mfi", label: string = "MFI") => {
    const mfiValues = TI.MFI.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      volume: data.map(d => d.volume),
      period
    });

    if (mfiValues.length === 0) return;

    const mfiHeight = 80;
    const mfiY = yScale.range()[0] + 1000;
    
    const mfiScale = d3.scaleLinear()
      .domain([0, 100])
      .range([mfiY + mfiHeight, mfiY]);

    const mfiData = data.slice(period).map((d, i) => ({
      date: d.date,
      value: mfiValues[i] || 50
    }));

    const mfiLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => mfiScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(mfiData)
      .attr("class", `indicator mfi-line mfi-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", mfiLine);

    renderIndicatorLabel(g, xScale, yScale, mfiData, `${label}(${period})`, color, id, mfiY);
  };

  const renderROC = (g: any, xScale: any, yScale: any, period: number, color: string = "#FF5722", id: string = "roc", label: string = "ROC") => {
    const rocValues = TI.ROC.calculate({
      values: data.map(d => d.close),
      period
    });

    if (rocValues.length === 0) return;

    const rocHeight = 80;
    const rocY = yScale.range()[0] + 1100;
    
    const rocExtent = d3.extent(rocValues) as [number, number];
    const rocScale = d3.scaleLinear()
      .domain(rocExtent)
      .range([rocY + rocHeight, rocY]);

    const rocData = data.slice(period).map((d, i) => ({
      date: d.date,
      value: rocValues[i] || 0
    }));

    const rocLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => rocScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(rocData)
      .attr("class", `indicator roc-line roc-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", rocLine);

    renderIndicatorLabel(g, xScale, yScale, rocData, `${label}(${period})`, color, id, rocY);
  };

  const renderOBV = (g: any, xScale: any, yScale: any, color: string = "#795548", id: string = "obv", label: string = "OBV") => {
    const obvValues = TI.OBV.calculate({
      close: data.map(d => d.close),
      volume: data.map(d => d.volume)
    });

    if (obvValues.length === 0) return;

    const obvHeight = 80;
    const obvY = yScale.range()[0] + 1200;
    
    const obvExtent = d3.extent(obvValues) as [number, number];
    const obvScale = d3.scaleLinear()
      .domain(obvExtent)
      .range([obvY + obvHeight, obvY]);

    const obvData = data.map((d, i) => ({
      date: d.date,
      value: obvValues[i] || 0
    }));

    const obvLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => obvScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(obvData)
      .attr("class", `indicator obv-line obv-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", obvLine);

    renderIndicatorLabel(g, xScale, yScale, obvData, label, color, id, obvY);
  };

  const renderKAMA = (g: any, xScale: any, yScale: any, params: any, color: string = "#009688", id: string = "kama", label: string = "KAMA") => {
    const period = params.period || 10;
    const fastSC = params.fastSC || 2;
    const slowSC = params.slowSC || 30;
    
    const kamaValues = TI.KAMA.calculate({
      values: data.map(d => d.close),
      period,
      fastSC,
      slowSC
    });

    if (kamaValues.length === 0) return;

    const kamaData = data.slice(period).map((d, i) => ({
      date: d.date,
      value: kamaValues[i]
    }));

    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(kamaData)
      .attr("class", `indicator kama kama-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    renderIndicatorLabel(g, xScale, yScale, kamaData, `${label}(${period})`, color, id);
  };

  const renderPSAR = (g: any, xScale: any, yScale: any, params: any, color: string = "#FFC107", id: string = "psar", label: string = "PSAR") => {
    const step = params.step || 0.02;
    const max = params.max || 0.2;
    
    const psarValues = TI.PSAR.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      step,
      max
    });

    if (psarValues.length === 0) return;

    const psarData = data.slice(2).map((d, i) => ({
      date: d.date,
      value: psarValues[i]
    }));

    g.selectAll(`.psar-dot-${id}`)
      .data(psarData)
      .enter()
      .append("circle")
      .attr("class", `indicator psar-dot psar-dot-${id}`)
      .attr("cx", d => xScale(d.date))
      .attr("cy", d => yScale(d.value))
      .attr("r", 2)
      .attr("fill", color);

    renderIndicatorLabel(g, xScale, yScale, psarData, label, color, id);
  };

  const renderIchimoku = (g: any, xScale: any, yScale: any, color: string = "#3F51B5", id: string = "ichimoku", label: string = "Ichimoku") => {
    const ichimokuValues = TI.IchimokuKinkoHyo.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      conversionPeriod: 9,
      basePeriod: 26,
      spanPeriod: 52,
      displacement: 26
    });

    if (ichimokuValues.length === 0) return;

    const ichimokuData = data.slice(26).map((d, i) => ({
      date: d.date,
      tenkan: ichimokuValues[i]?.tenkanSen,
      kijun: ichimokuValues[i]?.kijunSen,
      senkou: ichimokuValues[i]?.senkouSpanA,
      senkouB: ichimokuValues[i]?.senkouSpanB,
      chikou: ichimokuValues[i]?.chikouSpan
    }));

    // Tenkan Sen
    const tenkanLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.tenkan))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(ichimokuData.filter(d => d.tenkan))
      .attr("class", `indicator ichimoku-tenkan ichimoku-tenkan-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("d", tenkanLine);

    renderIndicatorLabel(g, xScale, yScale, ichimokuData, label, color, id);
  };

  const renderDonchian = (g: any, xScale: any, yScale: any, period: number, color: string = "#8BC34A", id: string = "donchian", label: string = "Donchian") => {
    const donchianValues = TI.DonchianChannel.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      period
    });

    if (donchianValues.length === 0) return;

    const donchianData = data.slice(period - 1).map((d, i) => ({
      date: d.date,
      upper: donchianValues[i]?.upper,
      middle: donchianValues[i]?.middle,
      lower: donchianValues[i]?.lower
    }));

    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    // Upper band
    g.append("path")
      .datum(donchianData.map(d => ({ date: d.date, value: d.upper })))
      .attr("class", `indicator donchian-upper donchian-upper-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("d", line);

    // Lower band
    g.append("path")
      .datum(donchianData.map(d => ({ date: d.date, value: d.lower })))
      .attr("class", `indicator donchian-lower donchian-lower-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("d", line);

    renderIndicatorLabel(g, xScale, yScale, donchianData, `${label}(${period})`, color, id);
  };

  const renderVWAP = (g: any, xScale: any, yScale: any, color: string = "#FF7043", id: string = "vwap", label: string = "VWAP") => {
    const vwapValues = TI.VWAP.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      volume: data.map(d => d.volume)
    });

    if (vwapValues.length === 0) return;

    const vwapData = data.map((d, i) => ({
      date: d.date,
      value: vwapValues[i]
    }));

    const line = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(vwapData)
      .attr("class", `indicator vwap vwap-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", line);

    renderIndicatorLabel(g, xScale, yScale, vwapData, label, color, id);
  };

  const renderHV = (g: any, xScale: any, yScale: any, period: number, color: string = "#EC407A", id: string = "hv", label: string = "HV") => {
    // Calculate historical volatility
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push(Math.log(data[i].close / data[i - 1].close));
    }
    
    const hvValues = [];
    for (let i = period - 1; i < returns.length; i++) {
      const periodReturns = returns.slice(i - period + 1, i + 1);
      const mean = periodReturns.reduce((sum, val) => sum + val, 0) / period;
      const variance = periodReturns.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / period;
      hvValues.push(Math.sqrt(variance * 252) * 100); // Annualized volatility in %
    }

    if (hvValues.length === 0) return;

    const hvHeight = 80;
    const hvY = yScale.range()[0] + 1300;
    
    const hvExtent = d3.extent(hvValues) as [number, number];
    const hvScale = d3.scaleLinear()
      .domain([0, hvExtent[1]])
      .range([hvY + hvHeight, hvY]);

    const hvData = data.slice(period).map((d, i) => ({
      date: d.date,
      value: hvValues[i] || 0
    }));

    const hvLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => hvScale(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(hvData)
      .attr("class", `indicator hv-line hv-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", hvLine);

    renderIndicatorLabel(g, xScale, yScale, hvData, `${label}(${period})`, color, id, hvY);
  };

  const renderMACD = (g: any, xScale: any, yScale: any, userConfig: any = {}, color: string = "#2196F3", id: string = "macd", label: string = "MACD") => {
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
      .attr("class", `indicator macd-line macd-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", macdLine);

    // Signal line
    const signalLine = d3.line<any>()
      .x(d => xScale(d.date))
      .y(d => macdScale(d.signal))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(macdData)
      .attr("class", `indicator macd-signal macd-signal-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.7)
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

    renderIndicatorLabel(g, xScale, yScale, macdData, `${label}(${fastPeriod},${slowPeriod},${signalPeriod})`, color, id, macdY);
  };

  const renderRSI = (g: any, xScale: any, yScale: any, period: number = 14, color: string = "#9C27B0", id: string = "rsi", label: string = "RSI") => {
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
      .attr("class", `indicator rsi-line rsi-line-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
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

    renderIndicatorLabel(g, xScale, yScale, rsiData, `${label}(${period})`, color, id, rsiY);
  };

  const renderBollingerBands = (g: any, xScale: any, yScale: any, period: number, stdDev: number, color: string = "#2196F3", id: string = "bb", label: string = "BB") => {
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
      .attr("class", `indicator bb-upper bb-upper-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("d", line);

    // Middle band
    g.append("path")
      .datum(bbData.map(d => ({ date: d.date, value: d.middle })))
      .attr("class", `indicator bb-middle bb-middle-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("d", line);

    // Lower band
    g.append("path")
      .datum(bbData.map(d => ({ date: d.date, value: d.lower })))
      .attr("class", `indicator bb-lower bb-lower-${id}`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3")
      .attr("d", line);

    renderIndicatorLabel(g, xScale, yScale, bbData, `${label}(${period},${stdDev})`, color, id);
  };

  const renderOIData = (g: any, xScale: any, yScale: any, width: number) => {
    if (!config.showOI) return;
    
    // Current price for reference
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 100;

    // Filter OI data to show strikes within visible price range - use yScale domain for proper sync
    const [minPrice, maxPrice] = yScale.domain();
    const visibleOI = oiData.filter(oi => {
      return oi.strikePrice >= minPrice && oi.strikePrice <= maxPrice;
    });

    // If no visible OI data after filtering, show a wider range
    if (visibleOI.length === 0) {
      const priceRange = maxPrice - minPrice;
      const expandedMin = minPrice - priceRange * 0.5;
      const expandedMax = maxPrice + priceRange * 0.5;
      
      visibleOI.push(...oiData.filter(oi => {
        return oi.strikePrice >= expandedMin && oi.strikePrice <= expandedMax;
      }));
    }

    // Calculate max values for scaling histograms
    const maxCE_OI = visibleOI.length > 0 ? Math.max(...visibleOI.map(oi => oi.ce.oi)) : 1;
    const maxPE_OI = visibleOI.length > 0 ? Math.max(...visibleOI.map(oi => oi.pe.oi)) : 1;

    // Maximum bar width - adjust based on zoom level and visible price range
    const priceRange = yScale.domain()[1] - yScale.domain()[0];
    const zoomFactor = Math.min(2, Math.max(0.5, 100 / priceRange)); // Scale factor based on price range
    const maxBarWidth = Math.min(width * 0.35, width * 0.25 * zoomFactor);

    // Create OI histogram overlay container with proper layering
    const oiOverlay = g.append("g")
      .attr("class", "oi-overlay");

    // Create tooltip for hover data
    const tooltip = d3.select("body").select(".oi-tooltip");
    let tooltipDiv;
    if (tooltip.empty()) {
      tooltipDiv = d3.select("body").append("div")
        .attr("class", "oi-tooltip")
        .style("position", "absolute")
        .style("padding", "8px")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);
    } else {
      tooltipDiv = tooltip;
    }

    // Render histogram bars for each strike price - only on right side
    visibleOI.forEach(oi => {
      const strikeY = yScale(oi.strikePrice);
      
      // Adjust bar height based on zoom level and number of visible strikes
      const priceRange = yScale.domain()[1] - yScale.domain()[0];
      const zoomFactor = Math.min(3, Math.max(0.8, 100 / priceRange));
      const barHeight = Math.max(4, Math.min(20, 8 * zoomFactor)); // Dynamic bar height 4-20px
      const barGap = Math.max(1, barHeight * 0.25); // Proportional gap

      // Calculate bar widths based on values (simplified for easy values)
      const ceOIWidth = (oi.ce.oi / maxCE_OI) * maxBarWidth;
      const peOIWidth = (oi.pe.oi / maxPE_OI) * maxBarWidth;

      // Right side positioning - foot of histogram at price axis, head extends inward
      // CE bars start from right edge (price axis) and extend left (inward)
      const ceStartX = width - ceOIWidth; // Foot at right edge, extends left
      
      // PE bars also start from right edge but positioned below CE
      const peStartX = width - peOIWidth; // Foot at right edge, extends left

      // CE OI (Red) - Above strike price, foot at price axis extending inward
      oiOverlay.append("rect")
        .attr("class", "oi-histogram ce-oi")
        .attr("x", ceStartX)
        .attr("y", strikeY - (barHeight * 2) - (barGap * 3))
        .attr("width", ceOIWidth)
        .attr("height", barHeight)
        .attr("fill", "#ef5350")
        .attr("opacity", 0.7)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>CE OI: ${oi.ce.oi}</div>
            <div>CE Change: ${oi.ce.changeOI >= 0 ? '+' : ''}${oi.ce.changeOI}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.7);
          tooltipDiv.transition().duration(200).style("opacity", 0);
        })
        .on("touchstart", function(event) {
          event.preventDefault();
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          const touch = event.touches[0];
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>CE OI: ${oi.ce.oi}</div>
            <div>CE Change: ${oi.ce.changeOI >= 0 ? '+' : ''}${oi.ce.changeOI}</div>
          `)
            .style("left", (touch.pageX + 10) + "px")
            .style("top", (touch.pageY - 10) + "px");
        })
        .on("touchend", function() {
          d3.select(this).attr("opacity", 0.7);
          setTimeout(() => tooltipDiv.transition().duration(200).style("opacity", 0), 2000);
        });

      // CE Change (Yellow) - Below CE OI
      const ceChangeWidth = Math.abs(oi.ce.changeOI) / Math.max(...visibleOI.map(o => Math.abs(o.ce.changeOI))) * maxBarWidth * 0.6;
      const ceChangeStartX = width - ceChangeWidth;
      
      oiOverlay.append("rect")
        .attr("class", "oi-histogram ce-change")
        .attr("x", ceChangeStartX)
        .attr("y", strikeY - barHeight - (barGap * 2))
        .attr("width", ceChangeWidth)
        .attr("height", barHeight * 0.6)
        .attr("fill", "#ffeb3b")
        .attr("opacity", 0.8)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>CE Change: ${oi.ce.changeOI >= 0 ? '+' : ''}${oi.ce.changeOI}</div>
            <div>CE OI: ${oi.ce.oi}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.8);
          tooltipDiv.transition().duration(200).style("opacity", 0);
        })
        .on("touchstart", function(event) {
          event.preventDefault();
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          const touch = event.touches[0];
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>CE Change: ${oi.ce.changeOI >= 0 ? '+' : ''}${oi.ce.changeOI}</div>
            <div>CE OI: ${oi.ce.oi}</div>
          `)
            .style("left", (touch.pageX + 10) + "px")
            .style("top", (touch.pageY - 10) + "px");
        })
        .on("touchend", function() {
          d3.select(this).attr("opacity", 0.8);
          setTimeout(() => tooltipDiv.transition().duration(200).style("opacity", 0), 2000);
        });

      // PE OI (Green) - Below strike price, foot at price axis extending inward
      oiOverlay.append("rect")
        .attr("class", "oi-histogram pe-oi")
        .attr("x", peStartX)
        .attr("y", strikeY + barGap)
        .attr("width", peOIWidth)
        .attr("height", barHeight)
        .attr("fill", "#66bb6a")
        .attr("opacity", 0.7)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>PE OI: ${oi.pe.oi}</div>
            <div>PE Change: ${oi.pe.changeOI >= 0 ? '+' : ''}${oi.pe.changeOI}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.7);
          tooltipDiv.transition().duration(200).style("opacity", 0);
        })
        .on("touchstart", function(event) {
          event.preventDefault();
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          const touch = event.touches[0];
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>PE OI: ${oi.pe.oi}</div>
            <div>PE Change: ${oi.pe.changeOI >= 0 ? '+' : ''}${oi.pe.changeOI}</div>
          `)
            .style("left", (touch.pageX + 10) + "px")
            .style("top", (touch.pageY - 10) + "px");
        })
        .on("touchend", function() {
          d3.select(this).attr("opacity", 0.7);
          setTimeout(() => tooltipDiv.transition().duration(200).style("opacity", 0), 2000);
        });

      // PE Change (Blue) - Below PE OI
      const peChangeWidth = Math.abs(oi.pe.changeOI) / Math.max(...visibleOI.map(o => Math.abs(o.pe.changeOI))) * maxBarWidth * 0.6;
      const peChangeStartX = width - peChangeWidth;
      
      oiOverlay.append("rect")
        .attr("class", "oi-histogram pe-change")
        .attr("x", peChangeStartX)
        .attr("y", strikeY + barHeight + (barGap * 2))
        .attr("width", peChangeWidth)
        .attr("height", barHeight * 0.6)
        .attr("fill", "#2196f3")
        .attr("opacity", 0.8)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>PE Change: ${oi.pe.changeOI >= 0 ? '+' : ''}${oi.pe.changeOI}</div>
            <div>PE OI: ${oi.pe.oi}</div>
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.8);
          tooltipDiv.transition().duration(200).style("opacity", 0);
        })
        .on("touchstart", function(event) {
          event.preventDefault();
          d3.select(this).attr("opacity", 1);
          tooltipDiv.transition().duration(200).style("opacity", 1);
          const touch = event.touches[0];
          tooltipDiv.html(`
            <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
            <div>PE Change: ${oi.pe.changeOI >= 0 ? '+' : ''}${oi.pe.changeOI}</div>
            <div>PE OI: ${oi.pe.oi}</div>
          `)
            .style("left", (touch.pageX + 10) + "px")
            .style("top", (touch.pageY - 10) + "px");
        })
        .on("touchend", function() {
          d3.select(this).attr("opacity", 0.8);
          setTimeout(() => tooltipDiv.transition().duration(200).style("opacity", 0), 2000);
        });

      // Strike price reference line - only in histogram area
      oiOverlay.append("line")
        .attr("class", "strike-reference-line")
        .attr("x1", width - maxBarWidth)
        .attr("x2", width)
        .attr("y1", strikeY)
        .attr("y2", strikeY)
        .attr("stroke", Math.abs(oi.strikePrice - currentPrice) <= 500 ? "#ff9800" : "#e0e0e0")
        .attr("stroke-width", Math.abs(oi.strikePrice - currentPrice) <= 500 ? 1 : 0.5)
        .attr("stroke-dasharray", "1,2")
        .attr("opacity", 0.2);

      // Strike price label at the right edge (only for strikes near current price)
      if (Math.abs(oi.strikePrice - currentPrice) <= 1000) {
        oiOverlay.append("text")
          .attr("class", "oi-strike-label")
          .attr("x", width + 5)
          .attr("y", strikeY)
          .attr("dy", "0.35em")
          .attr("text-anchor", "start")
          .attr("font-size", "9px")
          .attr("font-weight", "normal")
          .attr("fill", "#666")
          .attr("opacity", 0.8)
          .text(oi.strikePrice.toFixed(0));
      }
    });

    // Current price indicator line - only in histogram area
    const currentPriceY = yScale(currentPrice);
    oiOverlay.append("line")
      .attr("class", "current-price-line-oi")
      .attr("x1", width - maxBarWidth)
      .attr("x2", width)
      .attr("y1", currentPriceY)
      .attr("y2", currentPriceY)
      .attr("stroke", "#ff5722")
      .attr("stroke-width", 2)
      .attr("opacity", 0.8);

    // Current price label in OI area
    oiOverlay.append("rect")
      .attr("x", width - maxBarWidth/2 - 25)
      .attr("y", currentPriceY - 8)
      .attr("width", 50)
      .attr("height", 16)
      .attr("fill", "#ff5722")
      .attr("rx", 3)
      .attr("opacity", 0.9);

    oiOverlay.append("text")
      .attr("x", width - maxBarWidth/2)
      .attr("y", currentPriceY)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "9px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(currentPrice.toFixed(1));

    // Simplified Legend for OI histogram colors - position at top right of histogram area
    const legendX = width - maxBarWidth + 10;
    const legendY = 10;
    const legendItems = [
      { color: "#ef5350", label: "CE OI" },
      { color: "#ffeb3b", label: "CE Chg" },
      { color: "#66bb6a", label: "PE OI" },
      { color: "#2196f3", label: "PE Chg" }
    ];

    const legend = oiOverlay.append("g")
      .attr("class", "oi-legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Compact legend background
    legend.append("rect")
      .attr("x", -5)
      .attr("y", -5)
      .attr("width", 55)
      .attr("height", 55)
      .attr("fill", "rgba(255, 255, 255, 0.9)")
      .attr("stroke", "#ccc")
      .attr("rx", 3)
      .attr("opacity", 0.8);

    // Vertical legend layout for right side
    legendItems.forEach((item, i) => {
      const yOffset = i * 12;
      
      legend.append("rect")
        .attr("x", 0)
        .attr("y", yOffset)
        .attr("width", 8)
        .attr("height", 8)
        .attr("fill", item.color)
        .attr("opacity", 0.8);

      legend.append("text")
        .attr("x", 12)
        .attr("y", yOffset + 4)
        .attr("dy", "0.35em")
        .attr("font-size", "8px")
        .attr("fill", "#333")
        .text(item.label);
    });

    // Summary statistics - simplified PCR indicator
    const totalCE_OI = visibleOI.reduce((sum, oi) => sum + oi.ce.oi, 0);
    const totalPE_OI = visibleOI.reduce((sum, oi) => sum + oi.pe.oi, 0);
    const pcr = totalPE_OI / totalCE_OI;

    // PCR indicator - positioned in histogram area
    oiOverlay.append("rect")
      .attr("x", width - maxBarWidth + 10)
      .attr("y", legendY + 40)
      .attr("width", 50)
      .attr("height", 20)
      .attr("fill", "rgba(255, 255, 255, 0.9)")
      .attr("stroke", "#ccc")
      .attr("rx", 3)
      .attr("opacity", 0.8);

    oiOverlay.append("text")
      .attr("x", width - maxBarWidth + 35)
      .attr("y", legendY + 50)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", pcr > 1.2 ? "#4caf50" : pcr < 0.8 ? "#f44336" : "#ff9800")
      .text(`PCR: ${pcr.toFixed(1)}`);
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
    // X-axis with proper positioning
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${height * 0.75})`) // Position below volume
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%m/%d"))
        .tickSizeInner(-height * 0.75)
        .tickSizeOuter(0))
      .selectAll(".tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5);

    // Left Y-axis (main price axis) with proper tick formatting
    const leftAxis = g.append("g")
      .attr("class", "axis y-axis")
      .call(d3.axisLeft(yScale)
        .tickFormat(d => d3.format(".2f")(d))
        .tickSizeInner(-width)
        .tickSizeOuter(0));
    
    leftAxis.selectAll(".tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5);
    
    leftAxis.selectAll(".tick text")
      .attr("font-size", "11px")
      .attr("fill", "#666")
      .style("text-anchor", "end");

    // Right Y-axis (main price axis) with better formatting
    const rightAxis = g.append("g")
      .attr("class", "axis y-axis-right")
      .attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yScale)
        .tickFormat(d => d3.format(".2f")(d))
        .tickSizeInner(0)
        .tickSizeOuter(0));
    
    rightAxis.selectAll(".tick text")
      .attr("font-size", "11px")
      .attr("fill", "#666")
      .attr("font-weight", "bold")
      .style("text-anchor", "start")
      .attr("dx", "5px");

    // Style axis lines
    g.selectAll(".axis path")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1);
    
    g.selectAll(".axis .tick text")
      .attr("font-family", "Arial, sans-serif");
  };

  const updateCurrentPriceIndicator = (g: any, yScale: any, width: number) => {
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 0;
    const currentPriceY = yScale(currentPrice);
    
    // Remove existing current price elements
    g.selectAll(".current-price-line").remove();
    g.selectAll(".current-price-label").remove();
    
    // Current price line across chart
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

    // Current price label box on right
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

  const renderDrawings = (g: any, xScale: any, yScale: any) => {
    // Remove existing drawings first
    g.selectAll(".drawing").remove();
    
    // Create drawings layer on top with clipping
    const drawingsLayer = g.append("g")
      .attr("class", "drawings-layer")
      .attr("clip-path", "url(#chart-clip)")
      .style("pointer-events", "all"); // Enable interactions for drawings
    
    drawingsRef.current.forEach(drawing => {
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

    // Define drawing area bounds (exclude OI histogram area) - use current transform
    const getCurrentDrawingBounds = () => {
      const currentTransform = d3.zoomTransform(svg.node());
      const currentXScale = currentTransform.rescaleX(xScale);
      const currentYScale = currentTransform.rescaleY(yScale);
      
      return {
        drawingWidth: currentXScale.range()[1] * 0.75, // Exclude OI area on right
        drawingHeight: currentYScale.range()[0] * 0.75, // Exclude volume area at bottom
        xScale: currentXScale,
        yScale: currentYScale
      };
    };

    // Create a drawing area overlay to capture mouse events only in valid areas
    const drawingArea = g.append("rect")
      .attr("class", "drawing-area")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", xScale.range()[1] * 0.75)
      .attr("height", yScale.range()[0] * 0.75)
      .attr("fill", "transparent")
      .style("pointer-events", "all")
      .style("cursor", () => drawingMode !== 'none' ? 'crosshair' : 'default');

    drawingArea.on("mousedown", function(event: MouseEvent) {
      if (drawingMode === 'none') return;

      // Prevent event bubbling to avoid conflicts with zoom
      event.stopPropagation();

      const [x, y] = d3.pointer(event, g.node());
      const bounds = getCurrentDrawingBounds();
      
      // Additional bounds check for safety
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

      const [x, y] = d3.pointer(event, g.node());
      const bounds = getCurrentDrawingBounds();
      
      // Constrain coordinates to drawing bounds
      const constrainedX = Math.max(0, Math.min(x, bounds.drawingWidth));
      const constrainedY = Math.max(0, Math.min(y, bounds.drawingHeight));
      
      const dateX = bounds.xScale.invert(constrainedX);
      const priceY = bounds.yScale.invert(constrainedY);

      currentDrawing.end = { x: dateX, y: priceY };

      // Update preview (clear all previews first)
      g.selectAll(".drawing-preview").remove();
      g.selectAll(".drawing-preview-layer").remove();
      renderDrawingPreview(g, currentDrawing, xScale, yScale);
    });

    drawingArea.on("mouseup", function() {
      if (!drawing || !currentDrawing) return;

      drawing = false;
      drawingsRef.current.push({ ...currentDrawing });
      
      // Clean up preview elements
      g.selectAll(".drawing-preview").remove();
      g.selectAll(".drawing-preview-layer").remove();
      
      // Use current zoom transform for rendering drawings
      const currentTransform = d3.zoomTransform(svg.node());
      const currentXScale = currentTransform.rescaleX(xScale);
      const currentYScale = currentTransform.rescaleY(yScale);
      renderDrawings(g, currentXScale, currentYScale);
      
      currentDrawing = null;
    });

    // Update drawing area cursor based on drawing mode
    const updateDrawingCursor = () => {
      drawingArea.style("cursor", drawingMode !== 'none' ? 'crosshair' : 'default');
    };

    // Call initially and whenever drawing mode changes
    updateDrawingCursor();
  };

  const renderDrawingPreview = (g: any, drawing: any, xScale: any, yScale: any) => {
    // Create or get preview layer (always on top)
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

  const renderIndicatorLabel = (g: any, xScale: any, yScale: any, indicatorData: any[], labelText: string, color: string, id: string, customY?: number) => {
    if (!indicatorData.length) return;

    const lastValue = indicatorData[indicatorData.length - 1];
    const labelY = customY !== undefined ? customY : yScale(lastValue.value);
    const labelX = xScale.range()[1] - 100; // Position on the right side

    // Create indicator label group
    const labelGroup = g.append("g")
      .attr("class", `indicator-label indicator-label-${id}`)
      .style("cursor", "pointer");

    // Background for the label
    const labelBg = labelGroup.append("rect")
      .attr("x", labelX - 5)
      .attr("y", labelY - 12)
      .attr("width", 95)
      .attr("height", 20)
      .attr("fill", "rgba(255, 255, 255, 0.9)")
      .attr("stroke", color)
      .attr("stroke-width", 1)
      .attr("rx", 3)
      .attr("opacity", 0.8);

    // Indicator name text
    const labelText_element = labelGroup.append("text")
      .attr("x", labelX)
      .attr("y", labelY - 2)
      .attr("dy", "0.35em")
      .attr("fill", color)
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .text(labelText);

    // Settings button (gear icon)
    const settingsButton = labelGroup.append("g")
      .attr("class", "settings-button")
      .attr("transform", `translate(${labelX + 65}, ${labelY - 2})`)
      .style("cursor", "pointer")
      .style("opacity", 0);

    settingsButton.append("circle")
      .attr("r", 8)
      .attr("fill", "rgba(0, 0, 0, 0.1)");

    settingsButton.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .text("⚙️");

    // Delete button (X icon)
    const deleteButton = labelGroup.append("g")
      .attr("class", "delete-button")
      .attr("transform", `translate(${labelX + 80}, ${labelY - 2})`)
      .style("cursor", "pointer")
      .style("opacity", 0);

    deleteButton.append("circle")
      .attr("r", 8)
      .attr("fill", "rgba(255, 0, 0, 0.1)");

    deleteButton.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("fill", "#ff0000")
      .text("✕");

    // Show/hide buttons on hover
    labelGroup.on("mouseenter", function() {
      settingsButton.style("opacity", 1);
      deleteButton.style("opacity", 1);
      labelBg.attr("opacity", 1);
    }).on("mouseleave", function() {
      settingsButton.style("opacity", 0);
      deleteButton.style("opacity", 0);
      labelBg.attr("opacity", 0.8);
    });

    // Settings button click handler
    settingsButton.on("click", function(event) {
      event.stopPropagation();
      showIndicatorSettings(id, labelX, labelY, color, g);
    });

    // Delete button click handler
    deleteButton.on("click", function(event) {
      event.stopPropagation();
      removeIndicatorFromChart(id);
    });

    // Click anywhere on label to show settings
    labelGroup.on("click", function(event) {
      event.stopPropagation();
      showIndicatorSettings(id, labelX, labelY, color, g);
    });
  };

  const showIndicatorSettings = (indicatorId: string, x: number, y: number, currentColor: string, g: any) => {
    // Remove any existing settings panels
    g.selectAll(".indicator-settings-panel").remove();

    // Create settings panel
    const settingsPanel = g.append("g")
      .attr("class", "indicator-settings-panel")
      .attr("transform", `translate(${x - 150}, ${y - 100})`);

    // Panel background
    settingsPanel.append("rect")
      .attr("width", 200)
      .attr("height", 150)
      .attr("fill", "white")
      .attr("stroke", "#ccc")
      .attr("stroke-width", 1)
      .attr("rx", 5)
      .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)");

    // Title
    settingsPanel.append("text")
      .attr("x", 10)
      .attr("y", 20)
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text("Indicator Settings");

    // Color picker
    settingsPanel.append("text")
      .attr("x", 10)
      .attr("y", 45)
      .attr("font-size", "12px")
      .text("Color:");

    const colorInput = settingsPanel.append("foreignObject")
      .attr("x", 50)
      .attr("y", 30)
      .attr("width", 40)
      .attr("height", 20)
      .append("xhtml:input")
      .attr("type", "color")
      .attr("value", currentColor)
      .style("width", "100%")
      .style("height", "100%")
      .style("border", "none");

    // Parameter inputs (simplified for demo)
    settingsPanel.append("text")
      .attr("x", 10)
      .attr("y", 70)
      .attr("font-size", "12px")
      .text("Period:");

    const periodInput = settingsPanel.append("foreignObject")
      .attr("x", 60)
      .attr("y", 55)
      .attr("width", 50)
      .attr("height", 20)
      .append("xhtml:input")
      .attr("type", "number")
      .attr("value", "20")
      .style("width", "100%")
      .style("height", "100%")
      .style("border", "1px solid #ccc")
      .style("padding", "2px");

    // Done button
    const doneButton = settingsPanel.append("g")
      .attr("class", "done-button")
      .style("cursor", "pointer");

    doneButton.append("rect")
      .attr("x", 10)
      .attr("y", 110)
      .attr("width", 60)
      .attr("height", 25)
      .attr("fill", "#4CAF50")
      .attr("rx", 3);

    doneButton.append("text")
      .attr("x", 40)
      .attr("y", 127)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text("Done");

    // Cancel button
    const cancelButton = settingsPanel.append("g")
      .attr("class", "cancel-button")
      .style("cursor", "pointer");

    cancelButton.append("rect")
      .attr("x", 80)
      .attr("y", 110)
      .attr("width", 60)
      .attr("height", 25)
      .attr("fill", "#f44336")
      .attr("rx", 3);

    cancelButton.append("text")
      .attr("x", 110)
      .attr("y", 127)
      .attr("text-anchor", "middle")
      .attr("fill", "white")
      .attr("font-size", "12px")
      .text("Cancel");

    // Done button handler
    doneButton.on("click", function() {
      const newColor = (colorInput.node() as any).value;
      const newPeriod = parseInt((periodInput.node() as any).value) || 20;
      
      // Update indicator with new settings
      updateIndicatorSettings(indicatorId, { color: newColor, period: newPeriod });
      
      // Remove settings panel
      settingsPanel.remove();
    });

    // Cancel button handler
    cancelButton.on("click", function() {
      settingsPanel.remove();
    });

    // Close on click outside
    setTimeout(() => {
      d3.select("body").on("click.settings", function() {
        settingsPanel.remove();
        d3.select("body").on("click.settings", null);
      });
    }, 100);
  };

  const updateIndicatorSettings = (indicatorId: string, newSettings: any) => {
    // Find the indicator in config and update it
    const appliedIndicators = config.appliedIndicators || [];
    const indicatorIndex = appliedIndicators.findIndex(ind => ind.id === indicatorId);
    
    if (indicatorIndex !== -1) {
      const updatedIndicators = [...appliedIndicators];
      updatedIndicators[indicatorIndex] = {
        ...updatedIndicators[indicatorIndex],
        color: newSettings.color,
        params: { ...updatedIndicators[indicatorIndex].params, ...newSettings }
      };
      
      // Update config (this would typically call a callback to parent)
      // For now, we'll trigger a re-render
      renderChart();
    }
  };

  const removeIndicatorFromChart = (indicatorId: string) => {
    // Remove the indicator from config
    const appliedIndicators = config.appliedIndicators || [];
    const updatedIndicators = appliedIndicators.filter(ind => ind.id !== indicatorId);
    
    // Update config (this would typically call a callback to parent)
    // For now, we'll trigger a re-render
    renderChart();
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
