
import * as d3 from 'd3';

export const renderIndicatorLabel = (g: any, xScale: any, yScale: any, indicatorData: any[], labelText: string, color: string, id: string, customY?: number, showIndicatorSettings?: Function, removeIndicatorFromChart?: Function) => {
  if (!indicatorData.length) return;

  const lastValue = indicatorData[indicatorData.length - 1];
  const labelY = customY !== undefined ? customY : yScale(lastValue.value);
  const labelX = xScale.range()[1] - 100;

  const labelGroup = g.append("g")
    .attr("class", `indicator-label indicator-label-${id}`)
    .style("cursor", "pointer");

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

  const labelText_element = labelGroup.append("text")
    .attr("x", labelX)
    .attr("y", labelY - 2)
    .attr("dy", "0.35em")
    .attr("fill", color)
    .attr("font-size", "11px")
    .attr("font-weight", "bold")
    .text(labelText);

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

  labelGroup.on("mouseenter", function() {
    settingsButton.style("opacity", 1);
    deleteButton.style("opacity", 1);
    labelBg.attr("opacity", 1);
  }).on("mouseleave", function() {
    settingsButton.style("opacity", 0);
    deleteButton.style("opacity", 0);
    labelBg.attr("opacity", 0.8);
  });

  if (showIndicatorSettings) {
    settingsButton.on("click", function(event) {
      event.stopPropagation();
      showIndicatorSettings(id, labelX, labelY, color, g);
    });

    labelGroup.on("click", function(event) {
      event.stopPropagation();
      showIndicatorSettings(id, labelX, labelY, color, g);
    });
  }

  if (removeIndicatorFromChart) {
    deleteButton.on("click", function(event) {
      event.stopPropagation();
      removeIndicatorFromChart(id);
    });
  }
};

export const showIndicatorSettings = (indicatorId: string, x: number, y: number, currentColor: string, g: any, updateIndicatorSettings?: Function) => {
  g.selectAll(".indicator-settings-panel").remove();

  const settingsPanel = g.append("g")
    .attr("class", "indicator-settings-panel")
    .attr("transform", `translate(${x - 150}, ${y - 100})`);

  settingsPanel.append("rect")
    .attr("width", 200)
    .attr("height", 150)
    .attr("fill", "white")
    .attr("stroke", "#ccc")
    .attr("stroke-width", 1)
    .attr("rx", 5)
    .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)");

  settingsPanel.append("text")
    .attr("x", 10)
    .attr("y", 20)
    .attr("font-size", "14px")
    .attr("font-weight", "bold")
    .text("Indicator Settings");

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

  if (updateIndicatorSettings) {
    doneButton.on("click", function() {
      const newColor = (colorInput.node() as any).value;
      const newPeriod = parseInt((periodInput.node() as any).value) || 20;
      
      updateIndicatorSettings(indicatorId, { color: newColor, period: newPeriod });
      settingsPanel.remove();
    });
  }

  cancelButton.on("click", function() {
    settingsPanel.remove();
  });

  setTimeout(() => {
    d3.select("body").on("click.settings", function() {
      settingsPanel.remove();
      d3.select("body").on("click.settings", null);
    });
  }, 100);
};
