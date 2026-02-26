import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

type RateTrendStepPoint = {
  id: number;
  timestamp: number;
  playedAt: string;
  rate: number;
  rateBand: string;
  dateKey: string;
};

type RateTrendStepSeries = {
  rule: string;
  label: string;
  color: string;
  points: RateTrendStepPoint[];
};

type RateTrendStepChartProps = {
  series: RateTrendStepSeries[];
};

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

const formatDateLabel = (dateKey: string) => {
  const parts = dateKey.split("-");
  if (parts.length !== 3) {
    return dateKey;
  }
  const [year, month, day] = parts;
  const monthValue = Number.parseInt(month, 10);
  const dayValue = Number.parseInt(day, 10);
  if (Number.isNaN(monthValue) || Number.isNaN(dayValue)) {
    return dateKey;
  }
  return `${year}年${monthValue}月${dayValue}日`;
};

const displayRateBand = (rateBand: string) => {
  const trimmed = rateBand.trim();
  return trimmed.length > 0 ? trimmed : "-";
};

const RateTrendStepChart = ({ series }: RateTrendStepChartProps) => {
  const chartRootRef = useRef<HTMLDivElement | null>(null);
  const categoryLabels = useMemo(() => {
    const labelByDateKey = new Map<string, string>();
    series.forEach((entry) => {
      entry.points.forEach((point) => {
        if (!labelByDateKey.has(point.dateKey)) {
          labelByDateKey.set(point.dateKey, formatDateLabel(point.dateKey));
        }
      });
    });
    return Array.from(labelByDateKey.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map((entry) => entry[1]);
  }, [series]);

  const traces = useMemo(
    () =>
      series.map((entry) => ({
        type: "scatter",
        mode: "lines+markers",
        name: entry.label,
        x: entry.points.map((point) => formatDateLabel(point.dateKey)),
        y: entry.points.map((point) => point.rate),
        customdata: entry.points.map((point) => [
          formatDateLabel(point.dateKey),
          formatPlayedAt(point.playedAt),
          displayRateBand(point.rateBand)
        ]),
        line: { color: entry.color, width: 2.2, shape: "hv" as const },
        marker: {
          color: entry.color,
          size: 6,
          line: { color: "#ffffff", width: 1 }
        },
        hovertemplate:
          "日付: %{customdata[0]}<br>最終対戦日時: %{customdata[1]}<br>レート: %{y}<br>レート帯: %{customdata[2]}<extra>%{fullData.name}</extra>"
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
      legend: {
        orientation: "h",
        x: 0,
        y: 1.13,
        bgcolor: "rgba(255,255,255,0.85)",
        borderwidth: 0,
        font: { color: "#3f5564", size: 11 }
      },
      xaxis: {
        type: "category",
        categoryorder: "array",
        categoryarray: categoryLabels,
        showgrid: true,
        gridcolor: "#e4edf3",
        tickmode: "auto",
        nticks: 14,
        automargin: true,
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
  }, [categoryLabels, traces]);

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

export default RateTrendStepChart;
export type { RateTrendStepSeries };
