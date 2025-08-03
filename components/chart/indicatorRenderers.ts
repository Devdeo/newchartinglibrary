
import * as d3 from 'd3';
import * as TI from 'technicalindicators';
import { CandleData } from '../TradingChart';
import { IndicatorRenderParams } from './types';

export const renderSMA = (params: IndicatorRenderParams, data: CandleData[], renderIndicatorLabel: Function) => {
  const { g, xScale, yScale, period = 20, color = "#FF9800", id = "sma", label = "SMA" } = params;
  
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

  renderIndicatorLabel(g, xScale, yScale, smaData, `${label}(${period})`, color, id);
};

export const renderEMA = (params: IndicatorRenderParams, data: CandleData[], renderIndicatorLabel: Function) => {
  const { g, xScale, yScale, period = 20, color = "#9C27B0", id = "ema", label = "EMA" } = params;
  
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

  renderIndicatorLabel(g, xScale, yScale, emaData, `${label}(${period})`, color, id);
};

export const renderWMA = (params: IndicatorRenderParams, data: CandleData[], renderIndicatorLabel: Function) => {
  const { g, xScale, yScale, period = 20, color = "#4CAF50", id = "wma", label = "WMA" } = params;
  
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

export const renderRSI = (params: IndicatorRenderParams, data: CandleData[], renderIndicatorLabel: Function) => {
  const { g, xScale, yScale, period = 14, color = "#9C27B0", id = "rsi", label = "RSI" } = params;
  
  const closes = data.map(d => d.close);
  const rsiValues = TI.RSI.calculate({ period, values: closes });
  
  if (rsiValues.length === 0) return;

  const rsiHeight = 80;
  const rsiY = yScale.range()[0] + 200;
  
  const rsiScale = d3.scaleLinear()
    .domain([0, 100])
    .range([rsiY + rsiHeight, rsiY]);

  const rsiData = data.slice(period).map((d, i) => ({
    date: d.date,
    value: rsiValues[i] || 50
  }));

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

export const renderMACD = (params: IndicatorRenderParams, data: CandleData[], renderIndicatorLabel: Function) => {
  const { g, xScale, yScale, params: userConfig = {}, color = "#2196F3", id = "macd", label = "MACD" } = params;
  
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

export const renderBollingerBands = (params: IndicatorRenderParams, data: CandleData[], renderIndicatorLabel: Function) => {
  const { g, xScale, yScale, period = 20, params: userParams, color = "#2196F3", id = "bb", label = "BB" } = params;
  const stdDev = userParams?.stdDev || 2;
  
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

  g.append("path")
    .datum(bbData.map(d => ({ date: d.date, value: d.upper })))
    .attr("class", `indicator bb-upper bb-upper-${id}`)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .attr("d", line);

  g.append("path")
    .datum(bbData.map(d => ({ date: d.date, value: d.middle })))
    .attr("class", `indicator bb-middle bb-middle-${id}`)
    .attr("fill", "none")
    .attr("stroke", color)
    .attr("stroke-width", 1)
    .attr("d", line);

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

export const renderVolumeIndicator = (params: IndicatorRenderParams, data: CandleData[], renderIndicatorLabel: Function) => {
  const { g, xScale, yScale, params: userParams, color = "#FFB74D", id = "volume", label = "Volume" } = params;
  const showMA = userParams?.showMA !== false; // Default to true
  const maPeriod = userParams?.maPeriod || 20;
  
  // Calculate height from yScale range
  const height = Math.abs(yScale.range()[0] - yScale.range()[1]);
  
  // Use the volumeScale passed from params (should match the existing histogram scale)
  const volumeScale = params.volumeScale || d3.scaleLinear()
    .domain([0, d3.max(data, d => d.volume) as number])
    .range([height * 0.85, height * 0.75]);

  // Enhance existing volume bars with better styling and interactivity
  g.selectAll(".volume-bar")
    .attr("opacity", 0.85)
    .attr("stroke", d => d.close >= d.open ? "#1B5E20" : "#B71C1C")
    .attr("stroke-width", 1)
    .style("filter", "brightness(1.1)");

  // Add volume moving average as histogram bars overlay if enabled
  if (showMA && data.length >= maPeriod) {
    const volumes = data.map(d => d.volume);
    const volumeMAValues = TI.SMA.calculate({ period: maPeriod, values: volumes });
    
    const volumeMAData = data.slice(maPeriod - 1).map((d, i) => ({
      date: d.date,
      volume: d.volume,
      maValue: volumeMAValues[i],
      close: d.close,
      open: d.open
    })).filter(d => d.maValue != null);

    if (volumeMAData.length > 0) {
      const barWidth = Math.max(1, (xScale.range()[1] - xScale.range()[0]) / data.length * 0.6);
      
      // Add MA volume bars as thin overlay bars
      g.selectAll(".volume-ma-bar")
        .data(volumeMAData)
        .enter()
        .append("rect")
        .attr("class", `indicator volume-ma-bar volume-ma-bar-${id}`)
        .attr("x", d => xScale(d.date) - barWidth / 2)
        .attr("y", d => volumeScale(d.maValue))
        .attr("width", barWidth)
        .attr("height", d => volumeScale.range()[0] - volumeScale(d.maValue))
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.7)
        .attr("clip-path", "url(#volume-clip)");

      // Add a label for the volume MA in the volume panel
      g.append("text")
        .attr("class", `indicator volume-ma-label volume-ma-label-${id}`)
        .attr("x", 10)
        .attr("y", height * 0.78)
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", color)
        .attr("opacity", 0.9)
        .text(`Vol MA(${maPeriod})`);
    }
  }
  
  // Calculate width from xScale range
  const chartWidth = xScale.range()[1] - xScale.range()[0];
  
  // Add volume indicator active marker
  g.append("text")
    .attr("class", `indicator volume-indicator-active volume-indicator-active-${id}`)
    .attr("x", chartWidth - 100)
    .attr("y", height * 0.76)
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .attr("fill", color)
    .attr("opacity", 0.8)
    .text("📊 Volume Active");
};
