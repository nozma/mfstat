import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import { buildSeasonBands } from "./rateTrendSeasonBands";

type RateTrendLinePoint = {
  id: number;
  timestamp: number;
  playedAt: string;
  rate: number;
  rateBand: string;
  season: string;
};

type RateTrendLineSeries = {
  rule: string;
  label: string;
  color: string;
  points: RateTrendLinePoint[];
};

type RateTrendLineChartProps = {
  series: RateTrendLineSeries[];
};

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

const pad2 = (value: number) => value.toString().padStart(2, "0");

const formatPlayedAt = (playedAt: string) => {
  const date = new Date(playedAt);
  if (Number.isNaN(date.getTime())) {
    return playedAt;
  }

  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad2(
    date.getHours()
  )}:${pad2(date.getMinutes())}`;
};

const displayRateBand = (rateBand: string) => {
  const trimmed = rateBand.trim();
  return trimmed.length > 0 ? trimmed : "-";
};

const RateTrendLineChart = ({ series }: RateTrendLineChartProps) => {
  const chartRootRef = useRef<HTMLDivElement | null>(null);

  const traces = useMemo(
    () =>
      series.flatMap((entry) => {
        const segments: RateTrendLinePoint[][] = [];
        entry.points.forEach((point) => {
          const currentSegment = segments[segments.length - 1];
          if (!currentSegment || currentSegment[currentSegment.length - 1].season !== point.season) {
            segments.push([point]);
            return;
          }
          currentSegment.push(point);
        });

        return segments.map((points, index) => ({
          type: "scatter",
          mode: "lines+markers",
          name: entry.label,
          legendgroup: entry.rule,
          showlegend: index === 0,
          x: points.map((point) => point.timestamp),
          y: points.map((point) => point.rate),
          customdata: points.map((point) => [
            formatPlayedAt(point.playedAt),
            displayRateBand(point.rateBand),
            point.season
          ]),
          line: { color: entry.color, width: 2.2 },
          marker: {
            color: entry.color,
            size: 6,
            line: { color: "#ffffff", width: 1 }
          },
          hovertemplate:
            "対戦日時: %{customdata[0]}<br>シーズン: %{customdata[2]}<br>レート: %{y}<br>レート帯: %{customdata[1]}<extra>%{fullData.name}</extra>"
        }));
      }),
    [series]
  );

  const seasonBands = useMemo(
    () =>
      buildSeasonBands(series.flatMap((entry) => entry.points)).map((band, index, bands) => ({
        ...band,
        startTimestamp: index === 0 ? band.startTimestamp - HALF_DAY_MS : band.startTimestamp,
        endTimestamp:
          index === bands.length - 1 ? band.endTimestamp + HALF_DAY_MS : band.endTimestamp,
        labelTimestamp: band.labelTimestamp
      })),
    [series]
  );

  useEffect(() => {
    const chartRoot = chartRootRef.current;
    if (!chartRoot) {
      return;
    }

    const layout = {
      autosize: true,
      margin: { l: 58, r: 26, t: 16, b: 38 },
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      dragmode: "pan",
      hovermode: "closest",
      showlegend: true,
      shapes: seasonBands.map((band, index) => ({
        type: "rect",
        xref: "x",
        yref: "paper",
        x0: band.startTimestamp,
        x1: band.endTimestamp,
        y0: 0,
        y1: 1,
        fillcolor: band.fillColor,
        line: { width: index === 0 ? 0 : 1, color: "rgba(205, 216, 226, 0.28)" },
        layer: "below"
      })),
      annotations: seasonBands.map((band) => ({
        xref: "x",
        yref: "paper",
        x: band.labelTimestamp,
        y: 0.93,
        text: band.season,
        showarrow: false,
        font: { size: 24, color: "rgba(104, 125, 141, 0.18)" },
        xanchor: "center",
        yanchor: "middle"
      })),
      legend: {
        orientation: "h",
        x: 0,
        y: 1.13,
        bgcolor: "rgba(255,255,255,0.85)",
        borderwidth: 0,
        font: { color: "#3f5564", size: 11 }
      },
      xaxis: {
        type: "date",
        showgrid: true,
        gridcolor: "#e4edf3",
        tickformat: "%H:%M\n%-d日",
        tickfont: { color: "#607684", size: 11 }
      },
      yaxis: {
        title: { text: "レート", standoff: 6, font: { color: "#607684", size: 12 } },
        showgrid: true,
        gridcolor: "#e4edf3",
        tickfont: { color: "#607684", size: 11 },
        zeroline: false
      }
    };

    const config = {
      displaylogo: false,
      responsive: true,
      modeBarButtonsToRemove: ["lasso2d", "select2d"]
    };

    void Plotly.react(chartRoot, traces, layout, config);
    requestAnimationFrame(() => {
      Plotly.Plots?.resize?.(chartRoot);
    });
  }, [seasonBands, traces]);

  useEffect(() => {
    const chartRoot = chartRootRef.current;
    if (!chartRoot || !Plotly.Plots?.resize) {
      return;
    }

    const handleResize = () => {
      Plotly.Plots?.resize?.(chartRoot);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(
    () => () => {
      const chartRoot = chartRootRef.current;
      if (!chartRoot) {
        return;
      }
      Plotly.purge(chartRoot);
    },
    []
  );

  return (
    <div className="rate-stock-chart-wrap">
      <div ref={chartRootRef} className="rate-stock-chart" />
      <p className="rate-stock-license">
        Powered by{" "}
        <a href="https://plotly.com/javascript/" target="_blank" rel="noreferrer">
          Plotly.js
        </a>{" "}
        (MIT License)
      </p>
    </div>
  );
};

export default RateTrendLineChart;
export type { RateTrendLineSeries };
