import { useEffect, useMemo, useRef } from "react";
import Plotly from "plotly.js-dist-min";

type DailyRateCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  matches: number;
};

type RateTrendStockChartProps = {
  candles: DailyRateCandle[];
  ruleLabel: string;
};

const toJapaneseDateLabel = (dateKey: string) => {
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

const RateTrendStockChart = ({ candles, ruleLabel }: RateTrendStockChartProps) => {
  const chartRootRef = useRef<HTMLDivElement | null>(null);

  const xValues = useMemo(() => candles.map((item) => toJapaneseDateLabel(item.date)), [candles]);
  const openValues = useMemo(() => candles.map((item) => item.open), [candles]);
  const highValues = useMemo(() => candles.map((item) => item.high), [candles]);
  const lowValues = useMemo(() => candles.map((item) => item.low), [candles]);
  const closeValues = useMemo(() => candles.map((item) => item.close), [candles]);
  const volumeValues = useMemo(() => candles.map((item) => item.matches), [candles]);

  useEffect(() => {
    const chartRoot = chartRootRef.current;
    if (!chartRoot) {
      return;
    }

    const traces = [
      {
        type: "scatter",
        mode: "lines",
        x: xValues,
        y: closeValues,
        yaxis: "y3",
        showlegend: false,
        hoverinfo: "skip",
        line: { width: 1, color: "rgba(0,0,0,0)" }
      },
      {
        type: "scatter",
        mode: "lines",
        x: xValues,
        y: volumeValues,
        yaxis: "y4",
        showlegend: false,
        hoverinfo: "skip",
        line: { width: 1, color: "rgba(0,0,0,0)" }
      },
      {
        type: "candlestick",
        x: xValues,
        open: openValues,
        high: highValues,
        low: lowValues,
        close: closeValues,
        yaxis: "y",
        increasing: {
          line: { color: "#2e7d32" },
          fillcolor: "#2e7d32"
        },
        decreasing: {
          line: { color: "#c62828" },
          fillcolor: "#c62828"
        },
        hovertemplate:
          "%{x}<br>始値: %{open}<br>高値: %{high}<br>安値: %{low}<br>終値: %{close}<extra></extra>"
      },
      {
        type: "bar",
        x: xValues,
        y: volumeValues,
        yaxis: "y2",
        marker: { color: "#7ea7c6" },
        hovertemplate: "%{x}<br>試合数: %{y}<extra></extra>"
      }
    ];

    const layout = {
      autosize: true,
      margin: { l: 60, r: 60, t: 18, b: 34 },
      paper_bgcolor: "#ffffff",
      plot_bgcolor: "#ffffff",
      showlegend: false,
      dragmode: "pan",
      hovermode: "x unified",
      xaxis: {
        anchor: "y2",
        type: "category",
        rangeslider: { visible: false },
        showgrid: true,
        gridcolor: "#e4edf3",
        tickfont: { color: "#607684", size: 11 }
      },
      yaxis: {
        domain: [0.34, 1],
        side: "right",
        showgrid: true,
        gridcolor: "#e4edf3",
        showticklabels: true,
        tickfont: { color: "#607684", size: 11 }
      },
      yaxis3: {
        domain: [0.34, 1],
        overlaying: "y",
        side: "left",
        showgrid: false,
        zeroline: false,
        showticklabels: true,
        tickfont: { color: "#607684", size: 11 },
        matches: "y"
      },
      yaxis2: {
        domain: [0, 0.22],
        side: "right",
        showgrid: true,
        gridcolor: "#eef3f7",
        rangemode: "tozero",
        fixedrange: true,
        showticklabels: true,
        tickfont: { color: "#607684", size: 11 }
      },
      yaxis4: {
        domain: [0, 0.22],
        overlaying: "y2",
        side: "left",
        showgrid: false,
        zeroline: false,
        fixedrange: true,
        showticklabels: true,
        tickfont: { color: "#607684", size: 11 },
        matches: "y2"
      },
      shapes: [
        {
          type: "line",
          xref: "paper",
          yref: "paper",
          x0: 0,
          x1: 1,
          y0: 0.27,
          y1: 0.27,
          line: {
            color: "#d9e3ea",
            width: 1
          }
        }
      ],
      annotations: [
        {
          text: `${ruleLabel} / 日次集計`,
          xref: "paper",
          yref: "paper",
          x: 0,
          y: 1.13,
          showarrow: false,
          xanchor: "left",
          font: {
            size: 12,
            color: "#4d6170"
          }
        },
        {
          text: "レート",
          xref: "paper",
          yref: "paper",
          x: 0,
          y: 1.04,
          showarrow: false,
          xanchor: "left",
          font: {
            size: 12,
            color: "#4d6170"
          }
        },
        {
          text: "試合数",
          xref: "paper",
          yref: "paper",
          x: 0,
          y: 0.24,
          showarrow: false,
          xanchor: "left",
          font: {
            size: 12,
            color: "#4d6170"
          }
        }
      ]
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
  }, [
    closeValues,
    highValues,
    lowValues,
    openValues,
    ruleLabel,
    volumeValues,
    xValues
  ]);

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

export default RateTrendStockChart;
export type { DailyRateCandle };
