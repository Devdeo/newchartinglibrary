
import * as d3 from 'd3';
import { OIData, CandleData, ChartConfig } from '../TradingChart';
import { formatOI, formatChange } from './chartUtils';

export const renderOIData = (g: any, xScale: any, yScale: any, width: number, oiData: OIData[], data: CandleData[], config: ChartConfig) => {
  if (!config.showOI) return;
  
  const currentPrice = data.length > 0 ? data[data.length - 1].close : 100;

  const [minPrice, maxPrice] = yScale.domain();
  const visibleOI = oiData.filter(oi => {
    return oi.strikePrice >= minPrice && oi.strikePrice <= maxPrice;
  });

  if (visibleOI.length === 0) {
    const priceRange = maxPrice - minPrice;
    const expandedMin = minPrice - priceRange * 0.5;
    const expandedMax = maxPrice + priceRange * 0.5;
    
    visibleOI.push(...oiData.filter(oi => {
      return oi.strikePrice >= expandedMin && oi.strikePrice <= expandedMax;
    }));
  }

  const maxCE_OI = visibleOI.length > 0 ? Math.max(...visibleOI.map(oi => oi.ce.oi)) : 1;
  const maxPE_OI = visibleOI.length > 0 ? Math.max(...visibleOI.map(oi => oi.pe.oi)) : 1;
  const maxCE_Change = visibleOI.length > 0 ? Math.max(...visibleOI.map(oi => Math.abs(oi.ce.changeOI))) : 1;
  const maxPE_Change = visibleOI.length > 0 ? Math.max(...visibleOI.map(oi => Math.abs(oi.pe.changeOI))) : 1;

  const priceRange = yScale.domain()[1] - yScale.domain()[0];
  const zoomFactor = Math.min(2, Math.max(0.5, 100 / priceRange));
  const maxBarWidth = Math.min(width * 0.35, width * 0.25 * zoomFactor);

  const oiOverlay = g.append("g")
    .attr("class", "oi-overlay");

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

  visibleOI.forEach(oi => {
    const strikeY = yScale(oi.strikePrice);
    
    // Calculate bar dimensions without gaps
    const priceRange = yScale.domain()[1] - yScale.domain()[0];
    const zoomFactor = Math.min(3, Math.max(0.8, 100 / priceRange));
    const barHeight = Math.max(3, Math.min(12, 6 * zoomFactor));

    const ceOIWidth = (oi.ce.oi / maxCE_OI) * maxBarWidth;
    const peOIWidth = (oi.pe.oi / maxPE_OI) * maxBarWidth;
    const ceChangeWidth = Math.abs(oi.ce.changeOI) / maxCE_Change * maxBarWidth * 0.6;
    const peChangeWidth = Math.abs(oi.pe.changeOI) / maxPE_Change * maxBarWidth * 0.6;

    const ceStartX = width - ceOIWidth;
    const peStartX = width - peOIWidth;
    const ceChangeStartX = width - ceChangeWidth;
    const peChangeStartX = width - peChangeWidth;

    // Order from top to bottom: CE OI, CE Change, PE OI, PE Change (no gaps)
    const topY = strikeY - (barHeight * 2);
    const ceOI_Y = topY;
    const ceChange_Y = topY + barHeight;
    const peOI_Y = strikeY;
    const peChange_Y = strikeY + barHeight;

    // CE OI (Red) - Top
    oiOverlay.append("rect")
      .attr("class", "oi-histogram ce-oi")
      .attr("x", ceStartX)
      .attr("y", ceOI_Y)
      .attr("width", ceOIWidth)
      .attr("height", barHeight)
      .attr("fill", "#ef5350")
      .attr("opacity", 0.8)
      .style("cursor", "pointer")
      .on("mouseover", function(event) {
        d3.select(this).attr("opacity", 1);
        tooltipDiv.transition().duration(200).style("opacity", 1);
        tooltipDiv.html(`
          <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
          <div>CE OI: ${formatOI(oi.ce.oi)}</div>
          <div>CE Change: ${formatChange(oi.ce.changeOI)}</div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.8);
        tooltipDiv.transition().duration(200).style("opacity", 0);
      });

    // CE Change (Orange) - Second from top
    oiOverlay.append("rect")
      .attr("class", "oi-histogram ce-change")
      .attr("x", ceChangeStartX)
      .attr("y", ceChange_Y)
      .attr("width", ceChangeWidth)
      .attr("height", barHeight)
      .attr("fill", "#ff9800")
      .attr("opacity", 0.8)
      .style("cursor", "pointer")
      .on("mouseover", function(event) {
        d3.select(this).attr("opacity", 1);
        tooltipDiv.transition().duration(200).style("opacity", 1);
        tooltipDiv.html(`
          <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
          <div>CE Change: ${formatChange(oi.ce.changeOI)}</div>
          <div>CE OI: ${formatOI(oi.ce.oi)}</div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.8);
        tooltipDiv.transition().duration(200).style("opacity", 0);
      });

    // PE OI (Green) - Third from top
    oiOverlay.append("rect")
      .attr("class", "oi-histogram pe-oi")
      .attr("x", peStartX)
      .attr("y", peOI_Y)
      .attr("width", peOIWidth)
      .attr("height", barHeight)
      .attr("fill", "#4caf50")
      .attr("opacity", 0.8)
      .style("cursor", "pointer")
      .on("mouseover", function(event) {
        d3.select(this).attr("opacity", 1);
        tooltipDiv.transition().duration(200).style("opacity", 1);
        tooltipDiv.html(`
          <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
          <div>PE OI: ${formatOI(oi.pe.oi)}</div>
          <div>PE Change: ${formatChange(oi.pe.changeOI)}</div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseOut", function() {
        d3.select(this).attr("opacity", 0.8);
        tooltipDiv.transition().duration(200).style("opacity", 0);
      });

    // PE Change (Blue) - Bottom
    oiOverlay.append("rect")
      .attr("class", "oi-histogram pe-change")
      .attr("x", peChangeStartX)
      .attr("y", peChange_Y)
      .attr("width", peChangeWidth)
      .attr("height", barHeight)
      .attr("fill", "#2196f3")
      .attr("opacity", 0.8)
      .style("cursor", "pointer")
      .on("mouseover", function(event) {
        d3.select(this).attr("opacity", 1);
        tooltipDiv.transition().duration(200).style("opacity", 1);
        tooltipDiv.html(`
          <div><strong>Strike: ${oi.strikePrice.toFixed(1)}</strong></div>
          <div>PE Change: ${formatChange(oi.pe.changeOI)}</div>
          <div>PE OI: ${formatOI(oi.pe.oi)}</div>
        `)
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function() {
        d3.select(this).attr("opacity", 0.8);
        tooltipDiv.transition().duration(200).style("opacity", 0);
      });

    // Strike price reference line (subtle)
    oiOverlay.append("line")
      .attr("class", "strike-reference-line")
      .attr("x1", width - maxBarWidth)
      .attr("x2", width)
      .attr("y1", strikeY)
      .attr("y2", strikeY)
      .attr("stroke", Math.abs(oi.strikePrice - currentPrice) <= 500 ? "#ff9800" : "#e0e0e0")
      .attr("stroke-width", Math.abs(oi.strikePrice - currentPrice) <= 500 ? 1 : 0.5)
      .attr("stroke-dasharray", "1,3")
      .attr("opacity", 0.3);

    // Strike price label (only for nearby strikes)
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

  // Current price indicator
  const currentPriceY = yScale(currentPrice);
  oiOverlay.append("line")
    .attr("class", "current-price-line-oi")
    .attr("x1", width - maxBarWidth)
    .attr("x2", width)
    .attr("y1", currentPriceY)
    .attr("y2", currentPriceY)
    .attr("stroke", "#ff5722")
    .attr("stroke-width", 2)
    .attr("opacity", 0.9);

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
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .attr("fill", "white")
    .text(currentPrice.toFixed(1));

  // Updated Legend with correct colors and order
  const legendX = width - maxBarWidth + 10;
  const legendY = 10;
  const legendItems = [
    { color: "#ef5350", label: "CE OI" },
    { color: "#ff9800", label: "CE Chg" },
    { color: "#4caf50", label: "PE OI" },
    { color: "#2196f3", label: "PE Chg" }
  ];

  const legend = oiOverlay.append("g")
    .attr("class", "oi-legend")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  legend.append("rect")
    .attr("x", -5)
    .attr("y", -5)
    .attr("width", 65)
    .attr("height", 60)
    .attr("fill", "rgba(255, 255, 255, 0.95)")
    .attr("stroke", "#ccc")
    .attr("rx", 3)
    .attr("opacity", 0.9);

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
      .attr("font-size", "9px")
      .attr("fill", "#333")
      .text(item.label);
  });

  // PCR indicator
  const totalCE_OI = visibleOI.reduce((sum, oi) => sum + oi.ce.oi, 0);
  const totalPE_OI = visibleOI.reduce((sum, oi) => sum + oi.pe.oi, 0);
  const pcr = totalPE_OI / totalCE_OI;

  oiOverlay.append("rect")
    .attr("x", width - maxBarWidth + 10)
    .attr("y", legendY + 50)
    .attr("width", 55)
    .attr("height", 20)
    .attr("fill", "rgba(255, 255, 255, 0.95)")
    .attr("stroke", "#ccc")
    .attr("rx", 3)
    .attr("opacity", 0.9);

  oiOverlay.append("text")
    .attr("x", width - maxBarWidth + 37)
    .attr("y", legendY + 60)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("font-weight", "bold")
    .attr("fill", pcr > 1.2 ? "#4caf50" : pcr < 0.8 ? "#f44336" : "#ff9800")
    .text(`PCR: ${pcr.toFixed(2)}`);
};
