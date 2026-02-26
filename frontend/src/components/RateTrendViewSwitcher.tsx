import { FormControl, InputLabel, MenuItem, Select, SelectChangeEvent } from "@mui/material";

export type RateTrendViewMode = "line" | "step" | "candlestick";

type RateTrendViewOption = {
  value: RateTrendViewMode;
  label: string;
};

export const RATE_TREND_VIEW_OPTIONS: RateTrendViewOption[] = [
  { value: "line", label: "折れ線グラフ" },
  { value: "step", label: "階段グラフ" },
  { value: "candlestick", label: "ローソク" }
];

type RateTrendViewSwitcherProps = {
  value: RateTrendViewMode;
  onChange: (value: RateTrendViewMode) => void;
};

const RateTrendViewSwitcher = ({ value, onChange }: RateTrendViewSwitcherProps) => {
  const handleChange = (event: SelectChangeEvent<RateTrendViewMode>) => {
    onChange(event.target.value as RateTrendViewMode);
  };

  return (
    <FormControl size="small" className="rate-trend-switcher">
      <InputLabel id="rate-trend-view-mode-label">表示</InputLabel>
      <Select<RateTrendViewMode>
        labelId="rate-trend-view-mode-label"
        value={value}
        label="表示"
        onChange={handleChange}
      >
        {RATE_TREND_VIEW_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default RateTrendViewSwitcher;
