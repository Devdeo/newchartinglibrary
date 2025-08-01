
import { CandleData, ChartConfig, OIData } from '../TradingChart';

export interface ChartRendererProps {
  data: CandleData[];
  oiData: OIData[];
  config: ChartConfig;
  chartRef: React.RefObject<HTMLDivElement>;
  drawingMode: string;
}

export interface IndicatorRenderParams {
  g: any;
  xScale: any;
  yScale: any;
  period?: number;
  params?: any;
  color?: string;
  id?: string;
  label?: string;
}

export interface DrawingObject {
  type: string;
  start: { x: Date; y: number };
  end: { x: Date; y: number };
}
