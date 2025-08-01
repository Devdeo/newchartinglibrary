
import * as d3 from 'd3';
import { CandleData } from '../TradingChart';
import { calculateHeikinAshi } from './chartUtils';

export const renderCandlesticks = (g: any, xScale: any, yScale: any, data: CandleData[]) => {
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

export const renderLineChart = (g: any, xScale: any, yScale: any, data: CandleData[]) => {
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

export const renderAreaChart = (g: any, xScale: any, yScale: any, data: CandleData[]) => {
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

export const renderBarChart = (g: any, xScale: any, yScale: any, data: CandleData[]) => {
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

export const renderHeikinAshi = (g: any, xScale: any, yScale: any, data: CandleData[]) => {
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

export const renderVolume = (g: any, xScale: any, volumeScale: any, data: CandleData[]) => {
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
