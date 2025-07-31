
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
    const margin = { top: 20, right: 20, bottom: 50, left: 50 };
    const width = totalWidth - margin.left - margin.right;
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
      .range([0, width * 0.75]); // Leave space for OI histogram on right

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data, d => Math.max(d.high, d.low)) as [number, number])
      .range([height * 0.7, 0]);

    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) as number])
      .range([height * 0.7, height * 0.75]); // Volume in bottom section of main chart

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
      // Clear previous elements (but preserve drawings)
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
      renderVolume(g, currentXScale, volumeScale);

      // Render indicators
      renderIndicators(g, currentXScale, currentYScale);

      // Render axes
      renderAxes(g, currentXScale, currentYScale, width, height);

      // Render OI data if enabled (before drawings to keep drawings on top)
      if (config.showOI) {
        renderOIData(g, currentXScale, currentYScale);
      }

      // Render drawings (always on top)
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
      .attr("fill", "rgba(156, 156, 156, 0.3)")
      .attr("opacity", 0.7);
  };

  const renderIndicators = (g: any, xScale: any, yScale: any) => {
    const appliedIndicators = config.appliedIndicators || [];
    
    appliedIndicators.forEach(indicator => {
      switch (indicator.type) {
        case 'SMA':
          renderSMA(g, xScale, yScale, indicator.params.period || 20, indicator.color, indicator.id);
          break;
        case 'EMA':
          renderEMA(g, xScale, yScale, indicator.params.period || 20, indicator.color, indicator.id);
          break;
        case 'MACD':
          renderMACD(g, xScale, yScale, indicator.params, indicator.color, indicator.id);
          break;
        case 'RSI':
          renderRSI(g, xScale, yScale, indicator.params.period || 14, indicator.color, indicator.id);
          break;
        case 'BB':
          renderBollingerBands(g, xScale, yScale, indicator.params.period || 20, indicator.params.stdDev || 2, indicator.color, indicator.id);
          break;
      }
    });
  };

  const renderSMA = (g: any, xScale: any, yScale: any, period: number, color: string = "#FF9800", id: string = "sma") => {
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

    // Add current value label
    if (smaData.length > 0) {
      const lastValue = smaData[smaData.length - 1];
      g.append("text")
        .attr("class", `indicator sma-label sma-label-${id}`)
        .attr("x", xScale.range()[1] + 5)
        .attr("y", yScale(lastValue.value))
        .attr("dy", "0.35em")
        .attr("fill", color)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text(`SMA(${period}): ${lastValue.value.toFixed(2)}`);
    }
  };

  const renderEMA = (g: any, xScale: any, yScale: any, period: number, color: string = "#9C27B0", id: string = "ema") => {
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

    // Add current value label
    if (emaData.length > 0) {
      const lastValue = emaData[emaData.length - 1];
      g.append("text")
        .attr("class", `indicator ema-label ema-label-${id}`)
        .attr("x", xScale.range()[1] + 5)
        .attr("y", yScale(lastValue.value))
        .attr("dy", "0.35em")
        .attr("fill", color)
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .text(`EMA(${period}): ${lastValue.value.toFixed(2)}`);
    }
  };

  const renderMACD = (g: any, xScale: any, yScale: any, userConfig: any = {}, color: string = "#2196F3", id: string = "macd") => {
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
  };

  const renderRSI = (g: any, xScale: any, yScale: any, period: number = 14, color: string = "#9C27B0", id: string = "rsi") => {
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
  };

  const renderBollingerBands = (g: any, xScale: any, yScale: any, period: number, stdDev: number, color: string = "#2196F3", id: string = "bb") => {
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
          .attr("class", `indicator bb-label bb-label-${id}`)
          .attr("x", xScale.range()[1] + 5)
          .attr("y", yScale(value) + offset)
          .attr("dy", "0.35em")
          .attr("fill", color)
          .attr("font-size", "10px")
          .text(`BB ${label}: ${value.toFixed(2)}`);
      });
    }
  };

  const renderOIData = (g: any, xScale: any, yScale: any) => {
    if (!config.showOI) return;
    
    // Current price for reference
    const currentPrice = data.length > 0 ? data[data.length - 1].close : 50000;

    // Filter OI data to show strikes within visible price range
    const visibleOI = oiData.filter(oi => {
      const strikeY = yScale(oi.strikePrice);
      return strikeY >= 0 && strikeY <= yScale.range()[0] && Math.abs(oi.strikePrice - currentPrice) <= currentPrice * 0.2;
    });

    // Calculate max values for scaling histograms
    const maxCE_OI = Math.max(...visibleOI.map(oi => oi.ce.oi));
    const maxPE_OI = Math.max(...visibleOI.map(oi => oi.pe.oi));
    const maxCE_Change = Math.max(...visibleOI.map(oi => Math.abs(oi.ce.changeOI)));
    const maxPE_Change = Math.max(...visibleOI.map(oi => Math.abs(oi.pe.changeOI)));

    // Maximum bar width - use the right 25% of total width
    const oiAreaWidth = width * 0.25;
    const maxBarWidth = oiAreaWidth * 0.8;

    // Base X position (right side of price chart)
    const baseX = xScale.range()[1] + 10;

    // Create OI histogram overlay container with proper layering
    const oiOverlay = g.append("g")
      .attr("class", "oi-overlay")
      .style("pointer-events", "none"); // Prevent interference with drawing interactions

    // Render histogram bars for each strike price
    visibleOI.forEach(oi => {
      const strikeY = yScale(oi.strikePrice);
      const barHeight = 8; // Height of each individual bar
      const barGap = 1; // Gap between bars

      // Calculate bar widths based on values
      const ceOIWidth = (oi.ce.oi / maxCE_OI) * maxBarWidth;
      const peOIWidth = (oi.pe.oi / maxPE_OI) * maxBarWidth;
      const ceChangeWidth = Math.abs(oi.ce.changeOI) / maxCE_Change * maxBarWidth * 0.6; // Smaller scale for changes
      const peChangeWidth = Math.abs(oi.pe.changeOI) / maxPE_Change * maxBarWidth * 0.6;

      // Stack bars vertically at each strike price
      // CE OI (Red) - Top bar
      oiOverlay.append("rect")
        .attr("class", "oi-histogram ce-oi")
        .attr("x", baseX)
        .attr("y", strikeY - (barHeight * 2) - (barGap * 2))
        .attr("width", ceOIWidth)
        .attr("height", barHeight)
        .attr("fill", "#ef5350")
        .attr("opacity", 0.8)
        .append("title")
        .text(`CE OI: ${formatOI(oi.ce.oi)} @ ${oi.strikePrice}`);

      // PE OI (Green) - Second bar
      oiOverlay.append("rect")
        .attr("class", "oi-histogram pe-oi")
        .attr("x", baseX)
        .attr("y", strikeY - barHeight - barGap)
        .attr("width", peOIWidth)
        .attr("height", barHeight)
        .attr("fill", "#66bb6a")
        .attr("opacity", 0.8)
        .append("title")
        .text(`PE OI: ${formatOI(oi.pe.oi)} @ ${oi.strikePrice}`);

      // CE Change (Yellow) - Third bar
      const ceChangeColor = oi.ce.changeOI >= 0 ? "#ffeb3b" : "#ffc107";
      oiOverlay.append("rect")
        .attr("class", "oi-histogram ce-change")
        .attr("x", baseX)
        .attr("y", strikeY)
        .attr("width", ceChangeWidth)
        .attr("height", barHeight)
        .attr("fill", ceChangeColor)
        .attr("opacity", 0.8)
        .append("title")
        .text(`CE Change: ${oi.ce.changeOI >= 0 ? '+' : ''}${formatOI(oi.ce.changeOI)} @ ${oi.strikePrice}`);

      // PE Change (Blue) - Bottom bar
      const peChangeColor = oi.pe.changeOI >= 0 ? "#42a5f5" : "#1976d2";
      oiOverlay.append("rect")
        .attr("class", "oi-histogram pe-change")
        .attr("x", baseX)
        .attr("y", strikeY + barHeight + barGap)
        .attr("width", peChangeWidth)
        .attr("height", barHeight)
        .attr("fill", peChangeColor)
        .attr("opacity", 0.8)
        .append("title")
        .text(`PE Change: ${oi.pe.changeOI >= 0 ? '+' : ''}${formatOI(oi.pe.changeOI)} @ ${oi.strikePrice}`);

      // Strike price label at the right edge
      oiOverlay.append("text")
        .attr("class", "oi-strike-label")
        .attr("x", baseX + maxBarWidth + 5)
        .attr("y", strikeY)
        .attr("dy", "0.35em")
        .attr("font-size", "9px")
        .attr("font-weight", Math.abs(oi.strikePrice - currentPrice) <= 100 ? "bold" : "normal")
        .attr("fill", Math.abs(oi.strikePrice - currentPrice) <= 100 ? "#ff9800" : "#666")
        .text(oi.strikePrice.toLocaleString());

      // Light strike price line
      oiOverlay.append("line")
        .attr("class", "strike-reference-line")
        .attr("x1", xScale.range()[0])
        .attr("x2", baseX + maxBarWidth)
        .attr("y1", strikeY)
        .attr("y2", strikeY)
        .attr("stroke", Math.abs(oi.strikePrice - currentPrice) <= 100 ? "#ff9800" : "#e0e0e0")
        .attr("stroke-width", Math.abs(oi.strikePrice - currentPrice) <= 100 ? 1.5 : 0.5)
        .attr("stroke-dasharray", "2,2")
        .attr("opacity", 0.3);
    });

    // Current price indicator line
    const currentPriceY = yScale(currentPrice);
    oiOverlay.append("line")
      .attr("class", "current-price-line")
      .attr("x1", xScale.range()[0])
      .attr("x2", xScale.range()[1] + maxBarWidth + 100)
      .attr("y1", currentPriceY)
      .attr("y2", currentPriceY)
      .attr("stroke", "#ff5722")
      .attr("stroke-width", 2)
      .attr("opacity", 0.9);

    // Current price label
    oiOverlay.append("rect")
      .attr("x", xScale.range()[1] + maxBarWidth + 50)
      .attr("y", currentPriceY - 10)
      .attr("width", 60)
      .attr("height", 20)
      .attr("fill", "#ff5722")
      .attr("rx", 3);

    oiOverlay.append("text")
      .attr("x", xScale.range()[1] + maxBarWidth + 80)
      .attr("y", currentPriceY)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("fill", "white")
      .text(currentPrice.toFixed(0));

    // Legend for OI histogram colors - position at top right of OI area
    const legendX = baseX;
    const legendY = 10;
    const legendItems = [
      { color: "#ef5350", label: "CE OI", y: 0 },
      { color: "#66bb6a", label: "PE OI", y: 15 },
      { color: "#ffeb3b", label: "CE Chg", y: 30 },
      { color: "#42a5f5", label: "PE Chg", y: 45 }
    ];

    const legend = oiOverlay.append("g")
      .attr("class", "oi-legend")
      .attr("transform", `translate(${legendX}, ${legendY})`);

    // Legend background
    legend.append("rect")
      .attr("x", -5)
      .attr("y", -5)
      .attr("width", 80)
      .attr("height", 65)
      .attr("fill", "rgba(255, 255, 255, 0.9)")
      .attr("stroke", "#ccc")
      .attr("rx", 3);

    legendItems.forEach(item => {
      legend.append("rect")
        .attr("x", 0)
        .attr("y", item.y)
        .attr("width", 12)
        .attr("height", 8)
        .attr("fill", item.color)
        .attr("opacity", 0.8);

      legend.append("text")
        .attr("x", 16)
        .attr("y", item.y + 4)
        .attr("dy", "0.35em")
        .attr("font-size", "10px")
        .attr("fill", "#333")
        .text(item.label);
    });

    // Summary statistics
    const totalCE_OI = visibleOI.reduce((sum, oi) => sum + oi.ce.oi, 0);
    const totalPE_OI = visibleOI.reduce((sum, oi) => sum + oi.pe.oi, 0);
    const pcr = totalPE_OI / totalCE_OI;

    // PCR indicator - position below legend
    oiOverlay.append("rect")
      .attr("x", legendX)
      .attr("y", legendY + 75)
      .attr("width", 80)
      .attr("height", 25)
      .attr("fill", "rgba(255, 255, 255, 0.9)")
      .attr("stroke", "#ccc")
      .attr("rx", 3);

    oiOverlay.append("text")
      .attr("x", legendX + 40)
      .attr("y", legendY + 88)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
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

    // Left Y-axis (minimal or hidden when OI is shown)
    if (!config.showOI) {
      g.append("g")
        .attr("class", "axis y-axis")
        .call(d3.axisLeft(yScale));
    }

    // Right Y-axis (main price axis)
    g.append("g")
      .attr("class", "axis y-axis-right")
      .attr("transform", `translate(${width},0)`)
      .call(d3.axisRight(yScale).tickFormat(d => d3.format(".0f")(d)));
  };

  const renderDrawings = (g: any, xScale: any, yScale: any) => {
    // Remove existing drawings first
    g.selectAll(".drawing").remove();
    
    // Create drawings layer on top
    const drawingsLayer = g.append("g")
      .attr("class", "drawings-layer")
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

      // Update preview (clear all previews first)
      g.selectAll(".drawing-preview").remove();
      g.selectAll(".drawing-preview-layer").remove();
      renderDrawingPreview(g, currentDrawing, xScale, yScale);
    });

    svg.on("mouseup", function() {
      if (!drawing || !currentDrawing) return;

      drawing = false;
      drawingsRef.current.push({ ...currentDrawing });
      
      // Clean up preview elements
      g.selectAll(".drawing-preview").remove();
      g.selectAll(".drawing-preview-layer").remove();
      renderDrawings(g, xScale, yScale);
      
      currentDrawing = null;
    });
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
