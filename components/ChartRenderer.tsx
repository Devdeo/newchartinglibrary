import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { CandleData, ChartConfig, OIData } from './TradingChart';
import { ChartRendererProps, DrawingObject } from './chart/types';
import { renderCandlesticks, renderLineChart, renderAreaChart, renderBarChart, renderHeikinAshi, renderVolume } from './chart/chartRenderers';
import { renderSMA, renderEMA, renderWMA, renderRSI, renderMACD, renderBollingerBands } from './chart/indicatorRenderers';
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
    const margin = { top: 20, right: 80, bottom: 50, left: 60 };
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

    const volumeScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.volume) as number])
      .range([height * 0.7, height * 0.75]);

    const defs = svg.append("defs");
    defs.append("clipPath")
      .attr("id", "chart-clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", width)
      .attr("height", height * 0.75);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .translateExtent([[-width * 2, -height * 2], [width * 3, height * 3]])
      .on("zoom", (event) => {
        const { transform } = event;
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);
        const newVolumeScale = d3.scaleLinear()
          .domain(volumeScale.domain())
          .range([height * 0.7, height * 0.75]);
        updateChart(newXScale, newYScale, newVolumeScale);
      });

    svg.call(zoom);
    zoomRef.current = zoom;
    svg.selectAll(".axis").style("pointer-events", "all");

    updateChart(xScale, yScale);

    function updateChart(currentXScale: any, currentYScale: any, currentVolumeScale?: any) {
      const activeVolumeScale = currentVolumeScale || volumeScale;

      g.selectAll(".candle").remove();
      g.selectAll(".volume-bar").remove();
      g.selectAll(".axis").remove();
      g.selectAll(".indicator").remove();
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

      renderVolume(g, currentXScale, activeVolumeScale, data);
      renderIndicators(g, currentXScale, currentYScale);
      renderAxes(g, currentXScale, currentYScale, width, height);
      updateCurrentPriceIndicator(g, currentYScale, width);

      if (config.showOI) {
        renderOIData(g, currentXScale, currentYScale, width, oiData, data, config);
      }

      renderDrawings(g, drawingsRef.current, currentXScale, currentYScale);
    }

    setupDrawingInteractions(svg, g, xScale, yScale, drawingMode, drawingsRef);
  };

  const renderIndicators = (g: any, xScale: any, yScale: any) => {
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
      }
    });
  };

  const renderAxes = (g: any, xScale: any, yScale: any, width: number, height: number) => {
    g.append("g")
      .attr("class", "axis x-axis")
      .attr("transform", `translate(0,${height * 0.75})`)
      .call(d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%m/%d"))
        .tickSizeInner(-height * 0.75)
        .tickSizeOuter(0))
      .selectAll(".tick line")
      .attr("stroke", "#e0e0e0")
      .attr("stroke-width", 0.5);

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
    <svg ref={svgRef} style={{ width: '100%', height: '100%', cursor: drawingMode !== 'none' ? 'crosshair' : 'default' }}>
    </svg>
  );
};

export default ChartRenderer;