declare module "plotly.js-dist-min" {
  type PlotlyChartRoot = HTMLElement;

  type PlotlyStatic = {
    react: (
      root: PlotlyChartRoot,
      data: unknown[],
      layout?: Record<string, unknown>,
      config?: Record<string, unknown>
    ) => Promise<void> | void;
    purge: (root: PlotlyChartRoot) => void;
    Plots?: {
      resize?: (root: PlotlyChartRoot) => void;
    };
  };

  const Plotly: PlotlyStatic;
  export default Plotly;
}
