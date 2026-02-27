import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  Checkbox,
  Chip,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import SportsTennisIcon from "@mui/icons-material/SportsTennis";
import {
  DataGrid,
  GridCellParams,
  GridColDef,
  GridColumnVisibilityModel,
  GridRenderCellParams,
  GridRenderEditCellParams,
  useGridApiRef
} from "@mui/x-data-grid";
import MatchRecordModal, {
  MatchRecordValues
} from "./components/MatchRecordModal";
import RateTrendLineChart, { RateTrendLineSeries } from "./components/RateTrendLineChart";
import RateTrendStockChart, { DailyRateCandle } from "./components/RateTrendStockChart";
import RateTrendStepChart, { RateTrendStepSeries } from "./components/RateTrendStepChart";
import RateTrendViewSwitcher, { RateTrendViewMode } from "./components/RateTrendViewSwitcher";
import {
  MatchRecord,
  createRecord,
  deleteRecord,
  listRecords,
  updateRecord
} from "./api/records";
import {
  CHARACTER_OPTIONS,
  RATE_BAND_OPTIONS,
  RACKET_OPTIONS,
  RULE_OPTIONS,
  STAGE_OPTIONS
} from "./constants/options";

const COLUMN_VISIBILITY_STORAGE_KEY = "mfstat.recordGrid.columnVisibility";
const COLUMN_ORDER_STORAGE_KEY = "mfstat.recordGrid.columnOrder";
const RATE_TREND_VIEW_MODE_STORAGE_KEY = "mfstat.rateTrend.viewMode";
const RATE_TREND_RULE_STORAGE_KEY = "mfstat.rateTrend.rule";
type DateFilterPreset = "all" | "last30" | "custom";
type SummaryViewMode = "rate" | "winRate" | "usage";
type FilterFieldKey =
  | "rule"
  | "stage"
  | "myCharacter"
  | "myRacket"
  | "opponentCharacter"
  | "opponentRacket"
  | "opponentRateBand";

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

const displayOrDash = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
};

const parsePlayedAtTimestamp = (playedAt: string) => {
  const timestamp = new Date(playedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const uniqueStringList = (values: string[]) => Array.from(new Set(values));
const incrementCount = (map: Map<string, number>, key: string) => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const displayResultLabel = (value: string) => {
  if (value === "WIN") {
    return "勝利";
  }
  if (value === "LOSS") {
    return "敗北";
  }
  if (value === "DRAW") {
    return "引き分け";
  }
  return value;
};
const formatPercent = (value: number) => `${Math.round(value)}%`;
const formatRateWithBand = (rate: number | null, rateBand: string | null) => {
  if (rate === null) {
    return "-";
  }
  const trimmedRateBand = (rateBand ?? "").trim();
  return trimmedRateBand.length > 0 ? `${trimmedRateBand} ${rate}` : String(rate);
};

const DatetimeEditCell = (params: GridRenderEditCellParams<MatchRecord, string>) => {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    void params.api.setEditCellValue(
      { id: params.id, field: params.field, value: event.target.value },
      event
    );
  };

  return (
    <TextField
      type="datetime-local"
      value={typeof params.value === "string" ? params.value : ""}
      onChange={handleChange}
      size="small"
      fullWidth
      slotProps={{ htmlInput: { step: 60 } }}
    />
  );
};

const toMatchRecordValues = (record: MatchRecord): MatchRecordValues => ({
  playedAt: record.playedAt,
  rule: record.rule,
  stage: record.stage,
  myScore: record.myScore,
  opponentScore: record.opponentScore,
  myCharacter: record.myCharacter,
  myPartnerCharacter: record.myPartnerCharacter,
  opponentCharacter: record.opponentCharacter,
  opponentPartnerCharacter: record.opponentPartnerCharacter,
  myRacket: record.myRacket,
  myPartnerRacket: record.myPartnerRacket,
  opponentRacket: record.opponentRacket,
  opponentPartnerRacket: record.opponentPartnerRacket,
  myRate: record.myRate,
  myRateBand: record.myRateBand,
  myPartnerRateBand: record.myPartnerRateBand,
  opponentRateBand: record.opponentRateBand,
  opponentPartnerRateBand: record.opponentPartnerRateBand,
  opponentPlayerName: record.opponentPlayerName,
  myPartnerPlayerName: record.myPartnerPlayerName,
  opponentPartnerPlayerName: record.opponentPartnerPlayerName
});

const normalizeInlineEditValues = (values: MatchRecordValues): MatchRecordValues => {
  const normalized: MatchRecordValues = {
    ...values,
    playedAt: values.playedAt.trim(),
    stage: values.stage.trim(),
    myCharacter: values.myCharacter.trim(),
    myPartnerCharacter: values.myPartnerCharacter.trim(),
    opponentCharacter: values.opponentCharacter.trim(),
    opponentPartnerCharacter: values.opponentPartnerCharacter.trim(),
    myRacket: values.myRacket.trim(),
    myPartnerRacket: values.myPartnerRacket.trim(),
    opponentRacket: values.opponentRacket.trim(),
    opponentPartnerRacket: values.opponentPartnerRacket.trim(),
    myRate: values.myRate.trim(),
    myRateBand: values.myRateBand.trim(),
    myPartnerRateBand: values.myPartnerRateBand.trim(),
    opponentRateBand: values.opponentRateBand.trim(),
    opponentPartnerRateBand: values.opponentPartnerRateBand.trim(),
    opponentPlayerName: values.opponentPlayerName.trim(),
    myPartnerPlayerName: values.myPartnerPlayerName.trim(),
    opponentPartnerPlayerName: values.opponentPartnerPlayerName.trim()
  };

  if (normalized.playedAt.length === 0) {
    throw new Error("試合日時を入力してください。");
  }
  if (normalized.stage.length === 0) {
    throw new Error("ステージを入力してください。");
  }
  if (normalized.myCharacter.length === 0) {
    throw new Error("自分キャラを入力してください。");
  }
  if (normalized.opponentCharacter.length === 0) {
    throw new Error("相手キャラを入力してください。");
  }
  if (normalized.myRateBand.length === 0) {
    throw new Error("自分レート帯を入力してください。");
  }
  if (normalized.opponentRateBand.length === 0) {
    throw new Error("相手レート帯を入力してください。");
  }
  if (!/^\d+$/.test(normalized.myRate)) {
    throw new Error("レートは0以上の整数で入力してください。");
  }
  normalized.myRate = String(Number.parseInt(normalized.myRate, 10));

  const selectedRule = RULE_OPTIONS.find((option) => option.value === normalized.rule);
  if (!selectedRule) {
    throw new Error("ルールの値が不正です。");
  }
  if (!selectedRule.isDoubles) {
    normalized.myPartnerCharacter = "";
    normalized.opponentPartnerCharacter = "";
    normalized.myPartnerRacket = "";
    normalized.opponentPartnerRacket = "";
    normalized.myPartnerRateBand = "";
    normalized.opponentPartnerRateBand = "";
    normalized.myPartnerPlayerName = "";
    normalized.opponentPartnerPlayerName = "";
  }
  if (!selectedRule.hasFeverRacket) {
    normalized.myRacket = "";
    normalized.opponentRacket = "";
    normalized.myPartnerRacket = "";
    normalized.opponentPartnerRacket = "";
  }

  return normalized;
};

const resultChipColor = (value: string): "success" | "error" | "default" => {
  if (value === "WIN") {
    return "success";
  }
  if (value === "LOSS") {
    return "error";
  }
  return "default";
};

const rateBandChipSx = {
  minWidth: 48,
  height: 22,
  fontWeight: 700,
  fontSize: "0.72rem",
  "& .MuiChip-label": { px: 0.8 }
} as const;

const getRateBandChipToneSx = (rateBand: string) => {
  const tier = rateBand.trim().charAt(0).toUpperCase();
  if (tier === "S") {
    return { backgroundColor: "#fbe3e2", color: "#8c1d18", borderColor: "#f0b3af" } as const;
  }
  if (tier === "A") {
    return { backgroundColor: "#fef0db", color: "#88510d", borderColor: "#f3d4a7" } as const;
  }
  if (tier === "B") {
    return { backgroundColor: "#e3f1ff", color: "#114d93", borderColor: "#b7d7fb" } as const;
  }
  return { backgroundColor: "#e8edf1", color: "#41505c", borderColor: "#c5d0d9" } as const;
};

const compactHeaderLabelSx = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1.05,
  fontSize: "0.7rem",
  fontWeight: 600
} as const;

const rateCellTextSx = {
  display: "inline-block",
  width: "100%",
  textAlign: "center",
  fontSize: "0.78rem",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontVariantNumeric: "tabular-nums"
} as const;

const scoreCellTextSx = {
  display: "inline-block",
  width: "100%",
  textAlign: "center",
  fontSize: "0.78rem",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontVariantNumeric: "tabular-nums"
} as const;

const RULE_VALUE_OPTIONS = RULE_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label
}));
const CHARACTER_VALUE_OPTIONS = CHARACTER_OPTIONS.map((option) => ({
  value: option.value,
  label: option.label
}));
const RACKET_VALUE_OPTIONS = RACKET_OPTIONS.map((option) => ({
  value: option,
  label: option
}));
const RATE_BAND_VALUE_OPTIONS = [...RATE_BAND_OPTIONS].reverse().map((option) => ({
  value: option,
  label: option
}));
const PARTNER_ONLY_FIELDS = new Set([
  "myPartnerCharacter",
  "opponentPartnerCharacter",
  "myPartnerRacket",
  "opponentPartnerRacket",
  "myPartnerRateBand",
  "opponentPartnerRateBand",
  "myPartnerPlayerName",
  "opponentPartnerPlayerName"
]);
const FEVER_RACKET_FIELDS = new Set([
  "myRacket",
  "opponentRacket",
  "myPartnerRacket",
  "opponentPartnerRacket"
]);

const RULE_TREND_COLORS: Record<MatchRecordValues["rule"], string> = {
  singles_fever_on: "#2e7d32",
  singles_fever_off: "#1565c0",
  doubles_fever_on: "#ef6c00",
  doubles_fever_off: "#6a1b9a"
};

const toDateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};
const toDateStartTimestamp = (dateKey: string) => {
  const timestamp = new Date(`${dateKey}T00:00:00`).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const APP_VERSION = __APP_VERSION__;
const APP_VERSION_FROM_ENV = import.meta.env.VITE_APP_VERSION;
const IS_DEV = import.meta.env.DEV;
const DISPLAY_VERSION_FALLBACK = APP_VERSION_FROM_ENV || APP_VERSION;
const DEFAULT_API_BASE_URL = import.meta.env.DEV ? "http://127.0.0.1:8000" : window.location.origin;
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

const formatVersionLabel = (value: string) =>
  value.startsWith("v") || value.startsWith("dev-") ? value : `v${value}`;

type AppVersionResponse = {
  version: string;
};

const fetchAppVersion = async (): Promise<string | null> => {
  const response = await fetch(`${API_BASE_URL}/app-version`);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as AppVersionResponse;
  const version = typeof data.version === "string" ? data.version.trim() : "";
  if (version.length === 0 || version === "unknown") {
    return null;
  }
  return version;
};

function App() {
  const gridApiRef = useGridApiRef();
  const [versionLabel, setVersionLabel] = useState(() => formatVersionLabel(DISPLAY_VERSION_FALLBACK));
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isColumnOrderEditorOpen, setIsColumnOrderEditorOpen] = useState(false);
  const [selectedRules, setSelectedRules] = useState<MatchRecordValues["rule"][]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedMyCharacters, setSelectedMyCharacters] = useState<string[]>([]);
  const [selectedMyRackets, setSelectedMyRackets] = useState<string[]>([]);
  const [selectedOpponentCharacters, setSelectedOpponentCharacters] = useState<string[]>([]);
  const [selectedOpponentRackets, setSelectedOpponentRackets] = useState<string[]>([]);
  const [selectedOpponentRateBands, setSelectedOpponentRateBands] = useState<string[]>([]);
  const [dateFilterPreset, setDateFilterPreset] = useState<DateFilterPreset>("all");
  const [summaryViewMode, setSummaryViewMode] = useState<SummaryViewMode>("rate");
  const [rateTrendViewMode, setRateTrendViewMode] = useState<RateTrendViewMode>(() => {
    if (typeof window === "undefined") {
      return "line";
    }

    const saved = window.localStorage.getItem(RATE_TREND_VIEW_MODE_STORAGE_KEY);
    if (saved === "line" || saved === "step" || saved === "candlestick") {
      return saved;
    }
    return "line";
  });
  const [selectedTrendRule, setSelectedTrendRule] = useState<MatchRecordValues["rule"]>(() => {
    if (typeof window === "undefined") {
      return RULE_OPTIONS[0].value;
    }

    const saved = window.localStorage.getItem(RATE_TREND_RULE_STORAGE_KEY);
    if (saved && RULE_OPTIONS.some((option) => option.value === saved)) {
      return saved as MatchRecordValues["rule"];
    }
    return RULE_OPTIONS[0].value;
  });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    const saved = window.localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (!saved) {
      return {};
    }

    try {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === "object") {
        return parsed as GridColumnVisibilityModel;
      }
      return {};
    } catch {
      return {};
    }
  });
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    const saved = window.localStorage.getItem(COLUMN_ORDER_STORAGE_KEY);
    if (!saved) {
      return [];
    }

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every((field) => typeof field === "string")) {
        return parsed;
      }
      return [];
    } catch {
      return [];
    }
  });

  const editingRecord = useMemo(
    () => records.find((record) => record.id === editingRecordId),
    [records, editingRecordId]
  );
  const latestRecord = records[0];
  const createInitialValues = useMemo<Partial<MatchRecordValues> | undefined>(() => {
    if (!latestRecord) {
      return undefined;
    }

    return {
      rule: latestRecord.rule,
      stage: latestRecord.stage,
      myCharacter: latestRecord.myCharacter,
      myRacket: latestRecord.myRacket,
      myRate: latestRecord.myRate,
      myRateBand: latestRecord.myRateBand,
      myPartnerRateBand: latestRecord.myPartnerRateBand || RATE_BAND_OPTIONS[0],
      opponentRateBand: latestRecord.myRateBand,
      opponentPartnerRateBand: latestRecord.opponentPartnerRateBand || RATE_BAND_OPTIONS[0]
    };
  }, [latestRecord]);

  const loadRecords = async (mode: "initial" | "manual" = "initial") => {
    const setLoadingState = mode === "initial" ? setIsLoading : setIsRefreshing;

    try {
      setLoadingState(true);
      setErrorMessage(null);
      const fetchedRecords = await listRecords();
      setRecords(fetchedRecords);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "記録の取得に失敗しました。");
    } finally {
      setLoadingState(false);
    }
  };

  const refreshVersionLabel = async (isMounted: () => boolean = () => true) => {
    try {
      const runtimeVersion = await fetchAppVersion();
      if (!runtimeVersion || !isMounted()) {
        return;
      }
      const nextLabel = formatVersionLabel(runtimeVersion);
      setVersionLabel((current) => (current === nextLabel ? current : nextLabel));
    } catch {
      // バージョン取得に失敗した場合は現在の表示を維持する。
    }
  };

  useEffect(() => {
    void loadRecords("initial");
  }, []);

  useEffect(() => {
    if (!IS_DEV) {
      return;
    }

    let isMounted = true;

    const isMountedRef = () => isMounted;
    const handleWindowFocus = () => {
      void refreshVersionLabel(isMountedRef);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshVersionLabel(isMountedRef);
      }
    };

    void refreshVersionLabel(isMountedRef);
    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      COLUMN_VISIBILITY_STORAGE_KEY,
      JSON.stringify(columnVisibilityModel)
    );
  }, [columnVisibilityModel]);

  useEffect(() => {
    window.localStorage.setItem(RATE_TREND_VIEW_MODE_STORAGE_KEY, rateTrendViewMode);
  }, [rateTrendViewMode]);

  useEffect(() => {
    window.localStorage.setItem(RATE_TREND_RULE_STORAGE_KEY, selectedTrendRule);
  }, [selectedTrendRule]);

  const openCreateModal = () => {
    setEditingRecordId(null);
    setIsModalOpen(true);
  };

  const openEditModal = (id: number) => {
    setEditingRecordId(id);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) {
      return;
    }
    setIsModalOpen(false);
  };

  const handleSubmit = async (
    values: MatchRecordValues,
    options?: { keepOpenAfterSave?: boolean }
  ) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const shouldKeepOpenAfterSave = editingRecordId === null && options?.keepOpenAfterSave === true;

      if (editingRecordId === null) {
        const createdRecord = await createRecord(values);
        setRecords((prev) => [createdRecord, ...prev]);
      } else {
        const updatedRecord = await updateRecord(editingRecordId, values);
        setRecords((prev) =>
          prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
        );
      }

      if (!shouldKeepOpenAfterSave) {
        setIsModalOpen(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "記録の保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("この記録を削除しますか？")) {
      return;
    }

    try {
      setDeletingRecordId(id);
      setErrorMessage(null);
      await deleteRecord(id);
      setRecords((prev) => prev.filter((record) => record.id !== id));
      if (editingRecordId === id) {
        setEditingRecordId(null);
        setIsModalOpen(false);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "記録の削除に失敗しました。");
    } finally {
      setDeletingRecordId(null);
    }
  };

  const handleRefreshClick = () => {
    void loadRecords("manual");
    if (IS_DEV) {
      void refreshVersionLabel();
    }
  };

  const handleInlineRowUpdate = async (newRow: MatchRecord) => {
    setErrorMessage(null);
    const values = normalizeInlineEditValues(toMatchRecordValues(newRow));
    const updatedRecord = await updateRecord(newRow.id, values);
    setRecords((prev) =>
      prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
    );
    return updatedRecord;
  };

  const handleInlineRowUpdateError = (error: unknown) => {
    setErrorMessage(error instanceof Error ? error.message : "記録の保存に失敗しました。");
  };

  const handleGridCellClick = (params: GridCellParams<MatchRecord>) => {
    if (!params.isEditable || params.cellMode === "edit") {
      return;
    }
    if (isLoading || isRefreshing || isSubmitting || deletingRecordId !== null) {
      return;
    }
    gridApiRef.current?.startCellEditMode({ id: params.id, field: params.field });
  };

  const handleGridIsCellEditable = (params: GridCellParams<MatchRecord>) => {
    const ruleOption = RULE_OPTIONS.find((option) => option.value === params.row.rule);
    if (!ruleOption) {
      return false;
    }

    if (PARTNER_ONLY_FIELDS.has(params.field) && !ruleOption.isDoubles) {
      return false;
    }

    if (FEVER_RACKET_FIELDS.has(params.field) && !ruleOption.hasFeverRacket) {
      return false;
    }

    return true;
  };

  const ruleLabelByValue = useMemo(
    () =>
      Object.fromEntries(RULE_OPTIONS.map((option) => [option.value, option.label])) as Record<
        MatchRecordValues["rule"],
        string
      >,
    []
  );
  const characterLabelByValue = useMemo(
    () =>
      Object.fromEntries(CHARACTER_OPTIONS.map((option) => [option.value, option.label])) as Record<
        string,
        string
      >,
    []
  );
  const displayCharacter = (value: string) => characterLabelByValue[value] ?? value;
  const displayCharacterOrDash = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return "-";
    }
    return displayCharacter(trimmed);
  };
  const stageFilterOptions = useMemo(
    () =>
      uniqueStringList([
        ...STAGE_OPTIONS,
        ...records.map((record) => record.stage).filter((value) => value.trim().length > 0)
      ]),
    [records]
  );
  const myRacketFilterOptions = useMemo(
    () =>
      uniqueStringList([
        ...RACKET_OPTIONS,
        ...records.map((record) => record.myRacket).filter((value) => value.trim().length > 0)
      ]),
    [records]
  );
  const opponentRacketFilterOptions = useMemo(
    () =>
      uniqueStringList([
        ...RACKET_OPTIONS,
        ...records.map((record) => record.opponentRacket).filter((value) => value.trim().length > 0)
      ]),
    [records]
  );
  const opponentRateBandFilterOptions = useMemo(
    () =>
      uniqueStringList([
        ...[...RATE_BAND_OPTIONS].reverse(),
        ...records.map((record) => record.opponentRateBand).filter((value) => value.trim().length > 0)
      ]),
    [records]
  );
  const dateRangeFilter = useMemo(() => {
    if (dateFilterPreset === "last30") {
      return { from: Date.now() - 30 * 24 * 60 * 60 * 1000, to: null as number | null };
    }
    if (dateFilterPreset === "custom") {
      const from = dateFrom ? new Date(dateFrom).getTime() : null;
      const to = dateTo ? new Date(dateTo).getTime() : null;
      return {
        from: from !== null && !Number.isNaN(from) ? from : null,
        to: to !== null && !Number.isNaN(to) ? to : null
      };
    }
    return { from: null as number | null, to: null as number | null };
  }, [dateFilterPreset, dateFrom, dateTo]);
  const filterOptionCounts = useMemo(() => {
    const ruleCounts = new Map<string, number>();
    const stageCounts = new Map<string, number>();
    const myCharacterCounts = new Map<string, number>();
    const myRacketCounts = new Map<string, number>();
    const opponentCharacterCounts = new Map<string, number>();
    const opponentRacketCounts = new Map<string, number>();
    const opponentRateBandCounts = new Map<string, number>();

    const matchesOtherFilters = (record: MatchRecord, ignore?: FilterFieldKey) => {
      if (ignore !== "rule" && selectedRules.length > 0 && !selectedRules.includes(record.rule)) {
        return false;
      }
      if (ignore !== "stage" && selectedStages.length > 0 && !selectedStages.includes(record.stage)) {
        return false;
      }
      if (
        ignore !== "myCharacter" &&
        selectedMyCharacters.length > 0 &&
        !selectedMyCharacters.includes(record.myCharacter)
      ) {
        return false;
      }
      if (ignore !== "myRacket" && selectedMyRackets.length > 0 && !selectedMyRackets.includes(record.myRacket)) {
        return false;
      }
      if (
        ignore !== "opponentCharacter" &&
        selectedOpponentCharacters.length > 0 &&
        !selectedOpponentCharacters.includes(record.opponentCharacter)
      ) {
        return false;
      }
      if (
        ignore !== "opponentRacket" &&
        selectedOpponentRackets.length > 0 &&
        !selectedOpponentRackets.includes(record.opponentRacket)
      ) {
        return false;
      }
      if (
        ignore !== "opponentRateBand" &&
        selectedOpponentRateBands.length > 0 &&
        !selectedOpponentRateBands.includes(record.opponentRateBand)
      ) {
        return false;
      }

      const playedAtTs = parsePlayedAtTimestamp(record.playedAt);
      if (dateRangeFilter.from !== null && playedAtTs < dateRangeFilter.from) {
        return false;
      }
      if (dateRangeFilter.to !== null && playedAtTs > dateRangeFilter.to) {
        return false;
      }

      return true;
    };

    records.forEach((record) => {
      if (matchesOtherFilters(record, "rule")) {
        incrementCount(ruleCounts, record.rule);
      }
      if (matchesOtherFilters(record, "stage")) {
        incrementCount(stageCounts, record.stage);
      }
      if (matchesOtherFilters(record, "myCharacter")) {
        incrementCount(myCharacterCounts, record.myCharacter);
      }
      if (matchesOtherFilters(record, "myRacket")) {
        incrementCount(myRacketCounts, record.myRacket);
      }
      if (matchesOtherFilters(record, "opponentCharacter")) {
        incrementCount(opponentCharacterCounts, record.opponentCharacter);
      }
      if (matchesOtherFilters(record, "opponentRacket")) {
        incrementCount(opponentRacketCounts, record.opponentRacket);
      }
      if (matchesOtherFilters(record, "opponentRateBand")) {
        incrementCount(opponentRateBandCounts, record.opponentRateBand);
      }
    });

    return {
      ruleCounts,
      stageCounts,
      myCharacterCounts,
      myRacketCounts,
      opponentCharacterCounts,
      opponentRacketCounts,
      opponentRateBandCounts
    };
  }, [
    dateRangeFilter.from,
    dateRangeFilter.to,
    records,
    selectedMyCharacters,
    selectedMyRackets,
    selectedOpponentCharacters,
    selectedOpponentRackets,
    selectedOpponentRateBands,
    selectedRules,
    selectedStages
  ]);
  const sortedStageFilterOptions = useMemo(
    () =>
      [...stageFilterOptions].sort((left, right) => {
        const countDiff =
          (filterOptionCounts.stageCounts.get(right) ?? 0) -
          (filterOptionCounts.stageCounts.get(left) ?? 0);
        if (countDiff !== 0) {
          return countDiff;
        }
        return left.localeCompare(right, "ja");
      }),
    [filterOptionCounts.stageCounts, stageFilterOptions]
  );
  const sortedMyCharacterFilterOptions = useMemo(
    () =>
      [...CHARACTER_OPTIONS].sort((left, right) => {
        const countDiff =
          (filterOptionCounts.myCharacterCounts.get(right.value) ?? 0) -
          (filterOptionCounts.myCharacterCounts.get(left.value) ?? 0);
        if (countDiff !== 0) {
          return countDiff;
        }
        return left.label.localeCompare(right.label, "ja");
      }),
    [filterOptionCounts.myCharacterCounts]
  );
  const sortedOpponentCharacterFilterOptions = useMemo(
    () =>
      [...CHARACTER_OPTIONS].sort((left, right) => {
        const countDiff =
          (filterOptionCounts.opponentCharacterCounts.get(right.value) ?? 0) -
          (filterOptionCounts.opponentCharacterCounts.get(left.value) ?? 0);
        if (countDiff !== 0) {
          return countDiff;
        }
        return left.label.localeCompare(right.label, "ja");
      }),
    [filterOptionCounts.opponentCharacterCounts]
  );
  const sortedMyRacketFilterOptions = useMemo(
    () =>
      [...myRacketFilterOptions].sort((left, right) => {
        const countDiff =
          (filterOptionCounts.myRacketCounts.get(right) ?? 0) -
          (filterOptionCounts.myRacketCounts.get(left) ?? 0);
        if (countDiff !== 0) {
          return countDiff;
        }
        return left.localeCompare(right, "ja");
      }),
    [filterOptionCounts.myRacketCounts, myRacketFilterOptions]
  );
  const sortedOpponentRacketFilterOptions = useMemo(
    () =>
      [...opponentRacketFilterOptions].sort((left, right) => {
        const countDiff =
          (filterOptionCounts.opponentRacketCounts.get(right) ?? 0) -
          (filterOptionCounts.opponentRacketCounts.get(left) ?? 0);
        if (countDiff !== 0) {
          return countDiff;
        }
        return left.localeCompare(right, "ja");
      }),
    [filterOptionCounts.opponentRacketCounts, opponentRacketFilterOptions]
  );
  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        if (selectedRules.length > 0 && !selectedRules.includes(record.rule)) {
          return false;
        }
        if (selectedStages.length > 0 && !selectedStages.includes(record.stage)) {
          return false;
        }
        if (selectedMyCharacters.length > 0 && !selectedMyCharacters.includes(record.myCharacter)) {
          return false;
        }
        if (selectedMyRackets.length > 0 && !selectedMyRackets.includes(record.myRacket)) {
          return false;
        }
        if (
          selectedOpponentCharacters.length > 0 &&
          !selectedOpponentCharacters.includes(record.opponentCharacter)
        ) {
          return false;
        }
        if (selectedOpponentRackets.length > 0 && !selectedOpponentRackets.includes(record.opponentRacket)) {
          return false;
        }
        if (
          selectedOpponentRateBands.length > 0 &&
          !selectedOpponentRateBands.includes(record.opponentRateBand)
        ) {
          return false;
        }

        const playedAtTs = parsePlayedAtTimestamp(record.playedAt);
        if (dateRangeFilter.from !== null && playedAtTs < dateRangeFilter.from) {
          return false;
        }
        if (dateRangeFilter.to !== null && playedAtTs > dateRangeFilter.to) {
          return false;
        }

        return true;
      }),
    [
      dateRangeFilter.from,
      dateRangeFilter.to,
      records,
      selectedMyCharacters,
      selectedMyRackets,
      selectedOpponentCharacters,
      selectedOpponentRackets,
      selectedOpponentRateBands,
      selectedRules,
      selectedStages
    ]
  );
  const activeFilterCount =
    Number(selectedRules.length > 0) +
    Number(selectedStages.length > 0) +
    Number(selectedMyCharacters.length > 0) +
    Number(selectedMyRackets.length > 0) +
    Number(selectedOpponentCharacters.length > 0) +
    Number(selectedOpponentRackets.length > 0) +
    Number(selectedOpponentRateBands.length > 0) +
    Number(dateRangeFilter.from !== null || dateRangeFilter.to !== null);
  const summary = useMemo(() => {
    const total = filteredRecords.length;
    const winCount = filteredRecords.filter((record) => record.result === "WIN").length;
    const winRate = total > 0 ? (winCount / total) * 100 : null;
    return { total, winCount, winRate };
  }, [filteredRecords]);
  const opponentRateBandWinStats = useMemo(() => {
    const displayBands = [...RATE_BAND_OPTIONS].reverse();
    return displayBands
      .map((rateBand) => {
        const targets = filteredRecords.filter((record) => record.opponentRateBand === rateBand);
        const total = targets.length;
        const wins = targets.filter((record) => record.result === "WIN").length;
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        return { rateBand, total, wins, winRate };
      })
      .filter((item) => item.total > 0);
  }, [filteredRecords]);
  const myCharacterWinStats = useMemo(() => {
    const statsByCharacter = new Map<string, { total: number; wins: number }>();

    filteredRecords.forEach((record) => {
      const current = statsByCharacter.get(record.myCharacter) ?? { total: 0, wins: 0 };
      current.total += 1;
      if (record.result === "WIN") {
        current.wins += 1;
      }
      statsByCharacter.set(record.myCharacter, current);
    });

    return Array.from(statsByCharacter.entries())
      .map(([character, stats]) => ({
        character,
        label: characterLabelByValue[character] ?? character,
        total: stats.total,
        wins: stats.wins,
        winRate: (stats.wins / stats.total) * 100
      }))
      .sort((left, right) => {
        const winRateDiff = right.winRate - left.winRate;
        if (winRateDiff !== 0) {
          return winRateDiff;
        }
        return left.label.localeCompare(right.label, "ja");
      });
  }, [characterLabelByValue, filteredRecords]);
  const opponentCharacterWinStats = useMemo(() => {
    const statsByCharacter = new Map<string, { total: number; wins: number }>();

    filteredRecords.forEach((record) => {
      const current = statsByCharacter.get(record.opponentCharacter) ?? { total: 0, wins: 0 };
      current.total += 1;
      if (record.result === "WIN") {
        current.wins += 1;
      }
      statsByCharacter.set(record.opponentCharacter, current);
    });

    return Array.from(statsByCharacter.entries())
      .map(([character, stats]) => ({
        character,
        label: characterLabelByValue[character] ?? character,
        total: stats.total,
        wins: stats.wins,
        winRate: (stats.wins / stats.total) * 100
      }))
      .sort((left, right) => {
        const winRateDiff = right.winRate - left.winRate;
        if (winRateDiff !== 0) {
          return winRateDiff;
        }
        return left.label.localeCompare(right.label, "ja");
      });
  }, [characterLabelByValue, filteredRecords]);
  const opponentCharacterUsageStats = useMemo(() => {
    const totalMatches = filteredRecords.length;
    if (totalMatches === 0) {
      return [];
    }

    const countByCharacter = new Map<string, number>();
    filteredRecords.forEach((record) => {
      incrementCount(countByCharacter, record.opponentCharacter);
    });

    return Array.from(countByCharacter.entries())
      .map(([character, count]) => ({
        character,
        label: characterLabelByValue[character] ?? character,
        count,
        usageRate: (count / totalMatches) * 100
      }))
      .sort((left, right) => {
        const usageRateDiff = right.usageRate - left.usageRate;
        if (usageRateDiff !== 0) {
          return usageRateDiff;
        }
        return left.label.localeCompare(right.label, "ja");
      });
  }, [characterLabelByValue, filteredRecords]);
  const myCharacterUsageStats = useMemo(() => {
    const totalMatches = filteredRecords.length;
    if (totalMatches === 0) {
      return [];
    }

    const countByCharacter = new Map<string, number>();
    filteredRecords.forEach((record) => {
      incrementCount(countByCharacter, record.myCharacter);
    });

    return Array.from(countByCharacter.entries())
      .map(([character, count]) => ({
        character,
        label: characterLabelByValue[character] ?? character,
        count,
        usageRate: (count / totalMatches) * 100
      }))
      .sort((left, right) => {
        const usageRateDiff = right.usageRate - left.usageRate;
        if (usageRateDiff !== 0) {
          return usageRateDiff;
        }
        return left.label.localeCompare(right.label, "ja");
      });
  }, [characterLabelByValue, filteredRecords]);
  const rateTrendSeries = useMemo<RateTrendLineSeries[]>(() => {
    const samples = records
      .map((record) => ({
        id: record.id,
        rule: record.rule,
        timestamp: parsePlayedAtTimestamp(record.playedAt),
        playedAt: record.playedAt,
        rate: Number(record.myRate),
        rateBand: record.myRateBand.trim()
      }))
      .filter((sample) => sample.timestamp > 0 && !Number.isNaN(sample.rate))
      .sort((left, right) => {
        const timestampDiff = left.timestamp - right.timestamp;
        if (timestampDiff !== 0) {
          return timestampDiff;
        }
        return left.id - right.id;
      });

    const pointsByRule = new Map<MatchRecordValues["rule"], RateTrendLineSeries["points"]>();
    samples.forEach((sample) => {
      const points = pointsByRule.get(sample.rule) ?? [];
      points.push({
        id: sample.id,
        timestamp: sample.timestamp,
        playedAt: sample.playedAt,
        rate: sample.rate,
        rateBand: sample.rateBand
      });
      pointsByRule.set(sample.rule, points);
    });

    return RULE_OPTIONS.map((option) => ({
      rule: option.value,
      label: option.label,
      color: RULE_TREND_COLORS[option.value],
      points: pointsByRule.get(option.value) ?? []
    })).filter((series) => series.points.length > 0);
  }, [records]);
  const rateTrendStepSeries = useMemo<RateTrendStepSeries[]>(() => {
    const samples = records
      .map((record) => ({
        id: record.id,
        rule: record.rule,
        timestamp: parsePlayedAtTimestamp(record.playedAt),
        playedAt: record.playedAt,
        rate: Number(record.myRate),
        rateBand: record.myRateBand.trim()
      }))
      .filter((sample) => sample.timestamp > 0 && !Number.isNaN(sample.rate))
      .sort((left, right) => {
        const timestampDiff = left.timestamp - right.timestamp;
        if (timestampDiff !== 0) {
          return timestampDiff;
        }
        return left.id - right.id;
      });

    const dailyByRule = new Map<
      MatchRecordValues["rule"],
      Map<
        string,
        {
          dateKey: string;
          dayStartTimestamp: number;
          end: (typeof samples)[number];
        }
      >
    >();

    samples.forEach((sample) => {
      const dateKey = toDateKey(sample.timestamp);
      if (dateKey.length === 0) {
        return;
      }

      const dayStartTimestamp = toDateStartTimestamp(dateKey);
      const groupedByDay = dailyByRule.get(sample.rule) ?? new Map();
      const current = groupedByDay.get(dateKey);
      if (!current) {
        groupedByDay.set(dateKey, {
          dateKey,
          dayStartTimestamp,
          end: sample
        });
        dailyByRule.set(sample.rule, groupedByDay);
        return;
      }

      current.end = sample;
    });

    return RULE_OPTIONS.map((option) => {
      const groupedByDay = dailyByRule.get(option.value);
      if (!groupedByDay || groupedByDay.size === 0) {
        return {
          rule: option.value,
          label: option.label,
          color: RULE_TREND_COLORS[option.value],
          points: []
        };
      }

      const points = Array.from(groupedByDay.values())
        .sort((left, right) => left.dayStartTimestamp - right.dayStartTimestamp)
        .map((item) => ({
          id: item.end.id,
          timestamp: item.dayStartTimestamp,
          playedAt: item.end.playedAt,
          rate: item.end.rate,
          rateBand: item.end.rateBand,
          dateKey: item.dateKey
        }));

      return {
        rule: option.value,
        label: option.label,
        color: RULE_TREND_COLORS[option.value],
        points
      };
    }).filter((series) => series.points.length > 0);
  }, [records]);
  const dailyRateCandles = useMemo<DailyRateCandle[]>(() => {
    const samples = records
      .filter((record) => record.rule === selectedTrendRule)
      .map((record) => ({
        id: record.id,
        timestamp: parsePlayedAtTimestamp(record.playedAt),
        rate: Number(record.myRate)
      }))
      .filter((sample) => sample.timestamp > 0 && !Number.isNaN(sample.rate))
      .sort((left, right) => {
        const timestampDiff = left.timestamp - right.timestamp;
        if (timestampDiff !== 0) {
          return timestampDiff;
        }
        return left.id - right.id;
      });

    const grouped = new Map<
      string,
      DailyRateCandle & { firstTimestamp: number; lastTimestamp: number }
    >();

    samples.forEach((sample) => {
      const dateKey = toDateKey(sample.timestamp);
      if (dateKey.length === 0) {
        return;
      }

      const current = grouped.get(dateKey);
      if (!current) {
        grouped.set(dateKey, {
          date: dateKey,
          open: sample.rate,
          high: sample.rate,
          low: sample.rate,
          close: sample.rate,
          matches: 1,
          firstTimestamp: sample.timestamp,
          lastTimestamp: sample.timestamp
        });
        return;
      }

      current.high = Math.max(current.high, sample.rate);
      current.low = Math.min(current.low, sample.rate);
      current.matches += 1;
      if (sample.timestamp < current.firstTimestamp) {
        current.firstTimestamp = sample.timestamp;
        current.open = sample.rate;
      }
      if (sample.timestamp >= current.lastTimestamp) {
        current.lastTimestamp = sample.timestamp;
        current.close = sample.rate;
      }
    });

    return Array.from(grouped.values())
      .sort((left, right) => left.firstTimestamp - right.firstTimestamp)
      .map(({ firstTimestamp, lastTimestamp, ...candle }) => candle);
  }, [records, selectedTrendRule]);
  const ruleRateOverviewStats = useMemo(
    () =>
      RULE_OPTIONS.map((option) => {
        const samples = records
          .filter((record) => record.rule === option.value)
          .map((record) => {
            const rate = Number(record.myRate);
            const playedAtTimestamp = parsePlayedAtTimestamp(record.playedAt);
            const createdAtTimestamp = new Date(record.createdAt).getTime();
            return {
              id: record.id,
              rate,
              rateBand: record.myRateBand.trim(),
              playedAtTimestamp,
              createdAtTimestamp: Number.isNaN(createdAtTimestamp) ? 0 : createdAtTimestamp
            };
          })
          .filter((sample) => sample.playedAtTimestamp > 0 && !Number.isNaN(sample.rate))
          .sort((left, right) => {
            const playedAtDiff = left.playedAtTimestamp - right.playedAtTimestamp;
            if (playedAtDiff !== 0) {
              return playedAtDiff;
            }

            const createdAtDiff = left.createdAtTimestamp - right.createdAtTimestamp;
            if (createdAtDiff !== 0) {
              return createdAtDiff;
            }

            return left.id - right.id;
          });

        if (samples.length === 0) {
          return {
            rule: option.value,
            ruleTypeLabel: option.isDoubles ? "ダブルス" : "シングルス",
            feverLabel: `フィーバーラケット${option.hasFeverRacket ? "あり" : "なし"}`,
            currentRate: null as number | null,
            currentRateBand: null as string | null,
            maxRate: null as number | null,
            maxRateBand: null as string | null
          };
        }

        const latest = samples[samples.length - 1];
        const maxRate = Math.max(...samples.map((sample) => sample.rate));
        const maxRateSample = [...samples]
          .reverse()
          .find((sample) => sample.rate === maxRate) ?? null;
        return {
          rule: option.value,
          ruleTypeLabel: option.isDoubles ? "ダブルス" : "シングルス",
          feverLabel: `フィーバーラケット${option.hasFeverRacket ? "あり" : "なし"}`,
          currentRate: latest.rate,
          currentRateBand: latest.rateBand,
          maxRate,
          maxRateBand: maxRateSample?.rateBand ?? null
        };
      }),
    [records]
  );
  const resetFilters = () => {
    setSelectedRules([]);
    setSelectedStages([]);
    setSelectedMyCharacters([]);
    setSelectedMyRackets([]);
    setSelectedOpponentCharacters([]);
    setSelectedOpponentRackets([]);
    setSelectedOpponentRateBands([]);
    setDateFilterPreset("all");
    setDateFrom("");
    setDateTo("");
  };
  const myRateDeltaByRecordId = useMemo(() => {
    const deltas = new Map<number, number | null>();
    const groupedByRule = new Map<MatchRecord["rule"], MatchRecord[]>();

    records.forEach((record) => {
      const list = groupedByRule.get(record.rule);
      if (list) {
        list.push(record);
        return;
      }
      groupedByRule.set(record.rule, [record]);
    });

    groupedByRule.forEach((ruleRecords) => {
      const sorted = [...ruleRecords].sort((left, right) => {
        const playedAtDiff = parsePlayedAtTimestamp(left.playedAt) - parsePlayedAtTimestamp(right.playedAt);
        if (playedAtDiff !== 0) {
          return playedAtDiff;
        }

        const createdAtDiff = new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
        if (!Number.isNaN(createdAtDiff) && createdAtDiff !== 0) {
          return createdAtDiff;
        }

        return left.id - right.id;
      });

      for (let index = 0; index < sorted.length; index += 1) {
        const current = sorted[index];
        const currentRate = Number(current.myRate);
        if (index === 0 || Number.isNaN(currentRate)) {
          deltas.set(current.id, null);
          continue;
        }

        const previous = sorted[index - 1];
        const previousRate = Number(previous.myRate);
        if (Number.isNaN(previousRate)) {
          deltas.set(current.id, null);
          continue;
        }

        deltas.set(current.id, currentRate - previousRate);
      }
    });

    return deltas;
  }, [records]);

  const baseColumns = useMemo<GridColDef<MatchRecord>[]>(
    () => [
      {
        field: "playedAt",
        headerName: "試合日時",
        minWidth: 186,
        width: 186,
        maxWidth: 190,
        flex: 0,
        editable: true,
        renderEditCell: DatetimeEditCell,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["playedAt"]>) =>
          formatPlayedAt(params.row.playedAt)
      },
      {
        field: "rule",
        headerName: "ルール",
        minWidth: 136,
        width: 136,
        maxWidth: 144,
        flex: 0,
        editable: true,
        type: "singleSelect",
        valueOptions: RULE_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["rule"]>) =>
          ruleLabelByValue[params.row.rule]
      },
      {
        field: "stage",
        headerName: "ステージ",
        minWidth: 190,
        flex: 1.1,
        editable: true,
        type: "singleSelect",
        valueOptions: stageFilterOptions
      },
      {
        field: "score",
        headerName: "スコア",
        width: 90,
        minWidth: 90,
        maxWidth: 100,
        flex: 0,
        align: "center",
        headerAlign: "center",
        sortable: false,
        renderCell: (params: GridRenderCellParams<MatchRecord>) => (
          <span style={scoreCellTextSx}>{`${params.row.myScore}-${params.row.opponentScore}`}</span>
        )
      },
      {
        field: "result",
        headerName: "勝敗",
        width: 86,
        minWidth: 86,
        maxWidth: 90,
        flex: 0,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["result"]>) => (
          <Chip
            size="small"
            variant="filled"
            color={resultChipColor(params.row.result)}
            label={displayResultLabel(params.row.result)}
            sx={{
              fontWeight: 700,
              minWidth: 56,
              height: 22,
              fontSize: "0.72rem",
              "& .MuiChip-label": { px: 0.8 }
            }}
          />
        )
      },
      {
        field: "myCharacter",
        headerName: "自分キャラ",
        minWidth: 150,
        flex: 0.9,
        editable: true,
        type: "singleSelect",
        valueOptions: CHARACTER_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myCharacter"]>) =>
          displayCharacter(params.row.myCharacter)
      },
      {
        field: "myPartnerCharacter",
        headerName: "自分パートナー",
        minWidth: 150,
        flex: 0.9,
        editable: true,
        type: "singleSelect",
        valueOptions: CHARACTER_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myPartnerCharacter"]>) =>
          displayCharacterOrDash(params.row.myPartnerCharacter)
      },
      {
        field: "opponentCharacter",
        headerName: "相手キャラ",
        minWidth: 150,
        flex: 0.9,
        editable: true,
        type: "singleSelect",
        valueOptions: CHARACTER_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentCharacter"]>) =>
          displayCharacter(params.row.opponentCharacter)
      },
      {
        field: "opponentPartnerCharacter",
        headerName: "相手パートナー",
        minWidth: 150,
        flex: 0.9,
        editable: true,
        type: "singleSelect",
        valueOptions: CHARACTER_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPartnerCharacter"]>) =>
          displayCharacterOrDash(params.row.opponentPartnerCharacter)
      },
      {
        field: "myRacket",
        headerName: "自分ラケット",
        minWidth: 160,
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: RACKET_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myRacket"]>) =>
          displayOrDash(params.row.myRacket)
      },
      {
        field: "myPartnerRacket",
        headerName: "自分パートナーラケット",
        minWidth: 190,
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: RACKET_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myPartnerRacket"]>) =>
          displayOrDash(params.row.myPartnerRacket)
      },
      {
        field: "opponentRacket",
        headerName: "相手ラケット",
        minWidth: 160,
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: RACKET_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentRacket"]>) =>
          displayOrDash(params.row.opponentRacket)
      },
      {
        field: "opponentPartnerRacket",
        headerName: "相手パートナーラケット",
        minWidth: 190,
        flex: 1,
        editable: true,
        type: "singleSelect",
        valueOptions: RACKET_VALUE_OPTIONS,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPartnerRacket"]>) =>
          displayOrDash(params.row.opponentPartnerRacket)
      },
      {
        field: "myRate",
        headerName: "レート",
        minWidth: 112,
        width: 118,
        maxWidth: 124,
        flex: 0,
        editable: true,
        align: "center",
        headerAlign: "center",
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myRate"]>) => {
          const delta = myRateDeltaByRecordId.get(params.row.id) ?? null;
          if (delta === null) {
            return <span style={rateCellTextSx}>{params.row.myRate}</span>;
          }

          const deltaText = `${delta >= 0 ? "+" : ""}${delta}`;
          const deltaColor = delta >= 0 ? "#2e7d32" : "#c62828";
          return (
            <span style={rateCellTextSx}>
              {params.row.myRate} <span style={{ color: deltaColor }}>{deltaText}</span>
            </span>
          );
        }
      },
      {
        field: "myRateBand",
        headerName: "自分レート帯",
        minWidth: 90,
        width: 96,
        maxWidth: 104,
        flex: 0,
        editable: true,
        type: "singleSelect",
        valueOptions: RATE_BAND_VALUE_OPTIONS,
        align: "center",
        headerAlign: "center",
        renderHeader: () => (
          <span style={compactHeaderLabelSx}>
            <span>自分</span>
            <span>レート帯</span>
          </span>
        ),
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myRateBand"]>) => (
          <Chip
            size="small"
            variant="outlined"
            color="default"
            label={params.row.myRateBand}
            sx={{ ...rateBandChipSx, ...getRateBandChipToneSx(params.row.myRateBand) }}
          />
        )
      },
      {
        field: "myPartnerRateBand",
        headerName: "味方パートナーレート帯",
        minWidth: 96,
        width: 104,
        maxWidth: 112,
        flex: 0,
        editable: true,
        type: "singleSelect",
        valueOptions: RATE_BAND_VALUE_OPTIONS,
        align: "center",
        headerAlign: "center",
        renderHeader: () => (
          <span style={compactHeaderLabelSx}>
            <span>味方</span>
            <span>パートナー</span>
            <span>レート帯</span>
          </span>
        ),
        renderCell: (
          params: GridRenderCellParams<MatchRecord, MatchRecord["myPartnerRateBand"]>
        ) => {
          const value = params.row.myPartnerRateBand.trim();
          if (value.length === 0) {
            return <span style={rateCellTextSx}>-</span>;
          }
          return (
            <Chip
              size="small"
              variant="outlined"
              color="default"
              label={value}
              sx={{ ...rateBandChipSx, ...getRateBandChipToneSx(value) }}
            />
          );
        }
      },
      {
        field: "opponentRateBand",
        headerName: "相手レート帯",
        minWidth: 90,
        width: 96,
        maxWidth: 104,
        flex: 0,
        editable: true,
        type: "singleSelect",
        valueOptions: RATE_BAND_VALUE_OPTIONS,
        align: "center",
        headerAlign: "center",
        renderHeader: () => (
          <span style={compactHeaderLabelSx}>
            <span>相手</span>
            <span>レート帯</span>
          </span>
        ),
        renderCell: (
          params: GridRenderCellParams<MatchRecord, MatchRecord["opponentRateBand"]>
        ) => (
          <Chip
            size="small"
            variant="outlined"
            color="default"
            label={params.row.opponentRateBand}
            sx={{ ...rateBandChipSx, ...getRateBandChipToneSx(params.row.opponentRateBand) }}
          />
        )
      },
      {
        field: "opponentPartnerRateBand",
        headerName: "相手パートナーレート帯",
        minWidth: 96,
        width: 104,
        maxWidth: 112,
        flex: 0,
        editable: true,
        type: "singleSelect",
        valueOptions: RATE_BAND_VALUE_OPTIONS,
        align: "center",
        headerAlign: "center",
        renderHeader: () => (
          <span style={compactHeaderLabelSx}>
            <span>相手</span>
            <span>パートナー</span>
            <span>レート帯</span>
          </span>
        ),
        renderCell: (
          params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPartnerRateBand"]>
        ) => {
          const value = params.row.opponentPartnerRateBand.trim();
          if (value.length === 0) {
            return <span style={rateCellTextSx}>-</span>;
          }
          return (
            <Chip
              size="small"
              variant="outlined"
              color="default"
              label={value}
              sx={{ ...rateBandChipSx, ...getRateBandChipToneSx(value) }}
            />
          );
        }
      },
      {
        field: "opponentPlayerName",
        headerName: "相手プレイヤー名",
        minWidth: 170,
        flex: 0.9,
        editable: true,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPlayerName"]>) =>
          displayOrDash(params.row.opponentPlayerName)
      },
      {
        field: "myPartnerPlayerName",
        headerName: "自分パートナー名",
        minWidth: 170,
        flex: 0.9,
        editable: true,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myPartnerPlayerName"]>) =>
          displayOrDash(params.row.myPartnerPlayerName)
      },
      {
        field: "opponentPartnerPlayerName",
        headerName: "相手パートナー名",
        minWidth: 170,
        flex: 0.9,
        editable: true,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPartnerPlayerName"]>) =>
          displayOrDash(params.row.opponentPartnerPlayerName)
      },
      {
        field: "actions",
        headerName: "操作",
        minWidth: 86,
        width: 86,
        maxWidth: 86,
        flex: 0,
        align: "center",
        headerAlign: "center",
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderCell: (params: GridRenderCellParams<MatchRecord>) => (
          <div className="record-actions">
            <Tooltip title="編集" arrow>
              <span>
                <IconButton
                  size="small"
                  className="grid-action-icon"
                  onClick={() => openEditModal(params.row.id)}
                  disabled={deletingRecordId === params.row.id}
                  aria-label="編集"
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="削除" arrow>
              <span>
                <IconButton
                  size="small"
                  className="grid-action-icon grid-action-delete"
                  onClick={() => void handleDelete(params.row.id)}
                  disabled={deletingRecordId === params.row.id}
                  aria-label="削除"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </div>
        )
      }
    ],
    [
      characterLabelByValue,
      deletingRecordId,
      myRateDeltaByRecordId,
      ruleLabelByValue,
      stageFilterOptions
    ]
  );

  const defaultColumnOrder = useMemo(
    () => baseColumns.map((column) => column.field),
    [baseColumns]
  );

  const columnByField = useMemo(
    () => new Map(baseColumns.map((column) => [column.field, column])),
    [baseColumns]
  );

  const resolvedColumnOrder = useMemo(() => {
    const savedOrder = columnOrder.filter((field) => columnByField.has(field));
    const missingFields = defaultColumnOrder.filter((field) => !savedOrder.includes(field));
    return [...savedOrder, ...missingFields];
  }, [columnByField, columnOrder, defaultColumnOrder]);

  const orderedColumns = useMemo(
    () =>
      resolvedColumnOrder
        .map((field) => columnByField.get(field))
        .filter((column): column is GridColDef<MatchRecord> => column !== undefined),
    [columnByField, resolvedColumnOrder]
  );

  const visibleOrderedColumns = useMemo(
    () => orderedColumns.filter((column) => columnVisibilityModel[column.field] !== false),
    [columnVisibilityModel, orderedColumns]
  );

  useEffect(() => {
    setColumnOrder((prev) => {
      const normalized = prev.filter((field) => defaultColumnOrder.includes(field));
      const missing = defaultColumnOrder.filter((field) => !normalized.includes(field));
      const merged = [...normalized, ...missing];
      if (merged.length === prev.length && merged.every((field, index) => field === prev[index])) {
        return prev;
      }
      return merged;
    });
  }, [defaultColumnOrder]);

  useEffect(() => {
    window.localStorage.setItem(COLUMN_ORDER_STORAGE_KEY, JSON.stringify(columnOrder));
  }, [columnOrder]);

  const moveVisibleColumnByDirection = (field: string, direction: "up" | "down") => {
    setColumnOrder((prev) => {
      const current = prev.length > 0 ? [...prev] : [...defaultColumnOrder];
      const visibleFields = current.filter((field) => columnVisibilityModel[field] !== false);
      const sourceIndex = visibleFields.indexOf(field);
      if (sourceIndex < 0) {
        return current;
      }

      const targetIndex = direction === "up" ? sourceIndex - 1 : sourceIndex + 1;
      if (targetIndex < 0 || targetIndex >= visibleFields.length) {
        return current;
      }

      const reorderedVisible = [...visibleFields];
      const [moved] = reorderedVisible.splice(sourceIndex, 1);
      reorderedVisible.splice(targetIndex, 0, moved);

      let pointer = 0;
      return current.map((field) => {
        if (columnVisibilityModel[field] === false) {
          return field;
        }
        const nextField = reorderedVisible[pointer];
        pointer += 1;
        return nextField;
      });
    });
  };

  const handleColumnVisibilityModelChange = (model: GridColumnVisibilityModel) => {
    setColumnVisibilityModel(model);
  };

  return (
    <main className="app">
      <header className="page-header">
        <h1 className="app-title">
          <SportsTennisIcon className="app-title-icon" />
          <span className="app-title-text">MFStat</span>
          <span className="app-version">{versionLabel}</span>
        </h1>
        <div className="page-header-actions">
          <Tooltip title="表示を更新" arrow>
            <span>
              <IconButton
                size="small"
                className={`refresh-button${isRefreshing ? " is-spinning" : ""}`}
                onClick={handleRefreshClick}
                disabled={isLoading || isRefreshing || isSubmitting}
                aria-label="表示を更新"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </header>

      {errorMessage && <p className="status-message error">{errorMessage}</p>}

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="record-list">
            <div className="record-main">
              <div className="record-list-header">
                <div className="record-list-title-group">
                  <h2>記録一覧</h2>
                </div>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setIsColumnOrderEditorOpen((prev) => !prev)}
                >
                  {isColumnOrderEditorOpen ? "列順編集を閉じる" : "列順編集"}
                </button>
              </div>

              {isColumnOrderEditorOpen && (
                <div className="column-order-editor">
                  <p>
                    {visibleOrderedColumns.length <= 1
                      ? "表示中の列が1つ以下のため並び替えできません。"
                      : "表示中の列のみ上下ボタンで並び替えできます（変更内容は保存されます）。"}
                  </p>
                  {visibleOrderedColumns.length === 0 ? (
                    <p className="column-order-empty">表示中の列がありません。</p>
                  ) : (
                    <ul className="column-order-list">
                      {visibleOrderedColumns.map((column, index) => (
                        <li key={column.field} className="column-order-item">
                          <div className="column-order-actions">
                            <button
                              type="button"
                              className="button secondary column-order-button"
                              onClick={() => moveVisibleColumnByDirection(column.field, "up")}
                              disabled={index === 0}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              className="button secondary column-order-button"
                              onClick={() => moveVisibleColumnByDirection(column.field, "down")}
                              disabled={index === visibleOrderedColumns.length - 1}
                            >
                              ↓
                            </button>
                          </div>
                          <span>{String(column.headerName ?? column.field)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

            <div className="record-grid-container">
              <DataGrid
                apiRef={gridApiRef}
                rows={filteredRecords}
                columns={orderedColumns}
                loading={isLoading}
                showToolbar
                editMode="cell"
                columnVisibilityModel={columnVisibilityModel}
                onColumnVisibilityModelChange={handleColumnVisibilityModelChange}
                onCellClick={handleGridCellClick}
                isCellEditable={handleGridIsCellEditable}
                processRowUpdate={handleInlineRowUpdate}
                onProcessRowUpdateError={handleInlineRowUpdateError}
                disableRowSelectionOnClick
                pageSizeOptions={[10, 20, 50]}
                initialState={{
                  pagination: {
                    paginationModel: {
                      pageSize: 10,
                      page: 0
                    }
                  },
                  sorting: {
                    sortModel: [{ field: "playedAt", sort: "desc" }]
                  }
                }}
                localeText={{
                  noRowsLabel:
                    activeFilterCount > 0
                      ? "条件に一致する記録がありません"
                      : "記録がありません",
                  footerRowSelected: (count) => `${count.toLocaleString()} 行選択中`
                }}
              />
            </div>
            </div>
          </section>

          <section className="summary-section">
            <div className="summary-header">
              <h2>集計</h2>
              <div className="summary-view-switcher" aria-label="集計表示切替">
                <button
                  type="button"
                  className={`summary-view-button${summaryViewMode === "rate" ? " is-active" : ""}`}
                  onClick={() => setSummaryViewMode("rate")}
                  aria-pressed={summaryViewMode === "rate"}
                >
                  レート
                </button>
                <button
                  type="button"
                  className={`summary-view-button${summaryViewMode === "winRate" ? " is-active" : ""}`}
                  onClick={() => setSummaryViewMode("winRate")}
                  aria-pressed={summaryViewMode === "winRate"}
                >
                  勝率
                </button>
                <button
                  type="button"
                  className={`summary-view-button${summaryViewMode === "usage" ? " is-active" : ""}`}
                  onClick={() => setSummaryViewMode("usage")}
                  aria-pressed={summaryViewMode === "usage"}
                >
                  使用率
                </button>
              </div>
            </div>
            {summaryViewMode === "rate" && (
              <div className="summary-subsection">
                <div className="summary-rate-overview-grid">
                  {ruleRateOverviewStats.map((item) => (
                    <div key={`rate-overview-${item.rule}`} className="summary-card summary-rate-overview-card">
                      <p className="summary-rate-overview-rule">
                        <span className="summary-rate-overview-rule-line">{item.ruleTypeLabel}</span>
                        <span className="summary-rate-overview-rule-line">{item.feverLabel}</span>
                      </p>
                      <p className="summary-rate-overview-line">
                        <span>現在</span>
                        <strong>{formatRateWithBand(item.currentRate, item.currentRateBand)}</strong>
                      </p>
                      <p className="summary-rate-overview-line">
                        <span>最大</span>
                        <strong>{formatRateWithBand(item.maxRate, item.maxRateBand)}</strong>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="summary-card summary-trend-card">
                  <div className="summary-trend-header">
                    <p className="summary-label">レート推移</p>
                    <div className="summary-trend-header-controls">
                      {rateTrendViewMode === "candlestick" && (
                        <FormControl size="small" className="rate-trend-rule-select">
                          <InputLabel id="trend-rule-select-label">集計ルール</InputLabel>
                          <Select<MatchRecordValues["rule"]>
                            labelId="trend-rule-select-label"
                            value={selectedTrendRule}
                            label="集計ルール"
                            onChange={(event) =>
                              setSelectedTrendRule(event.target.value as MatchRecordValues["rule"])
                            }
                          >
                            {RULE_OPTIONS.map((rule) => (
                              <MenuItem key={`trend-rule-${rule.value}`} value={rule.value}>
                                {rule.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      <RateTrendViewSwitcher
                        value={rateTrendViewMode}
                        onChange={setRateTrendViewMode}
                      />
                    </div>
                  </div>
                  {rateTrendViewMode === "candlestick" ? (
                    dailyRateCandles.length === 0 ? (
                      <p className="summary-sub rate-trend-placeholder">
                        選択したルールの対象レコードなし
                      </p>
                    ) : (
                      <RateTrendStockChart
                        candles={dailyRateCandles}
                        ruleLabel={ruleLabelByValue[selectedTrendRule]}
                      />
                    )
                  ) : rateTrendViewMode === "step" ? (
                    rateTrendStepSeries.length === 0 ? (
                      <p className="summary-sub">対象レコードなし</p>
                    ) : (
                      <RateTrendStepChart series={rateTrendStepSeries} />
                    )
                  ) : rateTrendSeries.length === 0 ? (
                    <p className="summary-sub">対象レコードなし</p>
                  ) : (
                    <RateTrendLineChart series={rateTrendSeries} />
                  )}
                </div>
              </div>
            )}
            {summaryViewMode === "winRate" && (
              <div className="summary-subsection">
                <div className="summary-win-grid">
                  <div className="summary-win-left-stack">
                    <div className="summary-card">
                      <p className="summary-label">合計勝率</p>
                      <p className="summary-value">
                        {summary.winRate === null ? "-" : `${summary.winRate.toFixed(1)}%`}
                      </p>
                      <p className="summary-sub">
                        {summary.total === 0
                          ? "対象レコードなし"
                          : `${summary.winCount}勝 / ${summary.total}試合`}
                      </p>
                    </div>

                    <div className="summary-card">
                      <p className="summary-label">相手レート帯別 勝率</p>
                      {opponentRateBandWinStats.length === 0 ? (
                        <p className="summary-sub">対象レコードなし</p>
                      ) : (
                        <div className="rate-band-chart">
                          {opponentRateBandWinStats.map((item) => (
                            <div key={item.rateBand} className="rate-band-row rate-band-row-overlay">
                              <span className="rate-band-label">{item.rateBand}</span>
                              <span className="rate-band-value">{formatPercent(item.winRate)}</span>
                              <div className="rate-band-track">
                                <div
                                  className="rate-band-fill"
                                  style={{ width: `${Math.max(2, item.winRate)}%` }}
                                />
                                <span className="rate-band-meta">
                                  {item.wins}/{item.total}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="summary-card">
                    <p className="summary-label">自分キャラ別 勝率</p>
                    {myCharacterWinStats.length === 0 ? (
                      <p className="summary-sub">対象レコードなし</p>
                    ) : (
                      <div className="rate-band-chart opponent-character-chart">
                        {myCharacterWinStats.map((item) => (
                          <div
                            key={item.character}
                            className="rate-band-row rate-band-row-character rate-band-row-overlay"
                          >
                            <span className="rate-band-label rate-band-label-character">{item.label}</span>
                            <span className="rate-band-value">{formatPercent(item.winRate)}</span>
                            <div className="rate-band-track">
                              <div
                                className="rate-band-fill"
                                style={{ width: `${Math.max(2, item.winRate)}%` }}
                              />
                              <span className="rate-band-meta">
                                {item.wins}/{item.total}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="summary-card">
                    <p className="summary-label">相手キャラ別 勝率</p>
                    {opponentCharacterWinStats.length === 0 ? (
                      <p className="summary-sub">対象レコードなし</p>
                    ) : (
                      <div className="rate-band-chart opponent-character-chart">
                        {opponentCharacterWinStats.map((item) => (
                          <div
                            key={item.character}
                            className="rate-band-row rate-band-row-character rate-band-row-overlay"
                          >
                            <span className="rate-band-label rate-band-label-character">{item.label}</span>
                            <span className="rate-band-value">{formatPercent(item.winRate)}</span>
                            <div className="rate-band-track">
                              <div
                                className="rate-band-fill"
                                style={{ width: `${Math.max(2, item.winRate)}%` }}
                              />
                              <span className="rate-band-meta">
                                {item.wins}/{item.total}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {summaryViewMode === "usage" && (
              <div className="summary-subsection">
                <div className="summary-usage-grid">
                  <div className="summary-card">
                    <p className="summary-label">自分キャラ使用率</p>
                    {myCharacterUsageStats.length === 0 ? (
                      <p className="summary-sub">対象レコードなし</p>
                    ) : (
                      <div className="rate-band-chart opponent-character-chart">
                        {myCharacterUsageStats.map((item) => (
                          <div
                            key={`my-usage-${item.character}`}
                            className="rate-band-row rate-band-row-character rate-band-row-usage rate-band-row-overlay"
                          >
                            <span className="rate-band-label rate-band-label-character">{item.label}</span>
                            <span className="rate-band-value">{formatPercent(item.usageRate)}</span>
                            <div className="rate-band-track">
                              <div
                                className="rate-band-fill"
                                style={{ width: `${Math.max(2, item.usageRate)}%` }}
                              />
                              <span className="rate-band-meta">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="summary-card">
                    <p className="summary-label">相手キャラ使用率</p>
                    {opponentCharacterUsageStats.length === 0 ? (
                      <p className="summary-sub">対象レコードなし</p>
                    ) : (
                      <div className="rate-band-chart opponent-character-chart">
                        {opponentCharacterUsageStats.map((item) => (
                          <div
                            key={`usage-${item.character}`}
                            className="rate-band-row rate-band-row-character rate-band-row-usage rate-band-row-overlay"
                          >
                            <span className="rate-band-label rate-band-label-character">{item.label}</span>
                            <span className="rate-band-value">{formatPercent(item.usageRate)}</span>
                            <div className="rate-band-track">
                              <div
                                className="rate-band-fill"
                                style={{ width: `${Math.max(2, item.usageRate)}%` }}
                              />
                              <span className="rate-band-meta">{item.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="dashboard-sidebar">
          <button type="button" className="button primary sidebar-create-button" onClick={openCreateModal}>
            記録を作成
          </button>

          <div className="record-filter-panel">
            <div className="record-filter-header">
              <h3>絞り込み</h3>
              <button
                type="button"
                className="button secondary filter-clear-button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
              >
                クリア
              </button>
            </div>
            <p className="record-filter-count">
              表示: {filteredRecords.length} / {records.length} 件
            </p>

            <Stack spacing={1.2}>
            <FormControl size="small" fullWidth>
              <InputLabel id="filter-rule-label">ルール</InputLabel>
              <Select
                labelId="filter-rule-label"
                multiple
                value={selectedRules}
                onChange={(event) =>
                  setSelectedRules(
                    typeof event.target.value === "string"
                      ? (event.target.value.split(",") as MatchRecordValues["rule"][])
                      : (event.target.value as MatchRecordValues["rule"][])
                  )
                }
                input={<OutlinedInput label="ルール" />}
                renderValue={(selected) =>
                  (selected as string[])
                    .map((value) => ruleLabelByValue[value as MatchRecordValues["rule"]] ?? value)
                    .join(", ")
                }
              >
                {RULE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox size="small" checked={selectedRules.includes(option.value)} />
                    <ListItemText
                      primary={`${option.label} (${filterOptionCounts.ruleCounts.get(option.value) ?? 0})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="filter-stage-label">ステージ</InputLabel>
              <Select
                labelId="filter-stage-label"
                multiple
                value={selectedStages}
                onChange={(event) =>
                  setSelectedStages(
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : (event.target.value as string[])
                  )
                }
                input={<OutlinedInput label="ステージ" />}
                renderValue={(selected) => (selected as string[]).join(", ")}
              >
                {sortedStageFilterOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox size="small" checked={selectedStages.includes(option)} />
                    <ListItemText
                      primary={`${option} (${filterOptionCounts.stageCounts.get(option) ?? 0})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="filter-my-character-label">自分キャラ</InputLabel>
              <Select
                labelId="filter-my-character-label"
                multiple
                value={selectedMyCharacters}
                onChange={(event) =>
                  setSelectedMyCharacters(
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : (event.target.value as string[])
                  )
                }
                input={<OutlinedInput label="自分キャラ" />}
                renderValue={(selected) =>
                  (selected as string[])
                    .map((value) => characterLabelByValue[value] ?? value)
                    .join(", ")
                }
              >
                {sortedMyCharacterFilterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox size="small" checked={selectedMyCharacters.includes(option.value)} />
                    <ListItemText
                      primary={`${option.label} (${filterOptionCounts.myCharacterCounts.get(option.value) ?? 0})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="filter-my-racket-label">自分ラケット</InputLabel>
              <Select
                labelId="filter-my-racket-label"
                multiple
                value={selectedMyRackets}
                onChange={(event) =>
                  setSelectedMyRackets(
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : (event.target.value as string[])
                  )
                }
                input={<OutlinedInput label="自分ラケット" />}
                renderValue={(selected) => (selected as string[]).join(", ")}
              >
                {sortedMyRacketFilterOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox size="small" checked={selectedMyRackets.includes(option)} />
                    <ListItemText
                      primary={`${option} (${filterOptionCounts.myRacketCounts.get(option) ?? 0})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="filter-opponent-character-label">相手キャラ</InputLabel>
              <Select
                labelId="filter-opponent-character-label"
                multiple
                value={selectedOpponentCharacters}
                onChange={(event) =>
                  setSelectedOpponentCharacters(
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : (event.target.value as string[])
                  )
                }
                input={<OutlinedInput label="相手キャラ" />}
                renderValue={(selected) =>
                  (selected as string[])
                    .map((value) => characterLabelByValue[value] ?? value)
                    .join(", ")
                }
              >
                {sortedOpponentCharacterFilterOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    <Checkbox size="small" checked={selectedOpponentCharacters.includes(option.value)} />
                    <ListItemText
                      primary={`${option.label} (${filterOptionCounts.opponentCharacterCounts.get(option.value) ?? 0})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="filter-opponent-racket-label">相手ラケット</InputLabel>
              <Select
                labelId="filter-opponent-racket-label"
                multiple
                value={selectedOpponentRackets}
                onChange={(event) =>
                  setSelectedOpponentRackets(
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : (event.target.value as string[])
                  )
                }
                input={<OutlinedInput label="相手ラケット" />}
                renderValue={(selected) => (selected as string[]).join(", ")}
              >
                {sortedOpponentRacketFilterOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox size="small" checked={selectedOpponentRackets.includes(option)} />
                    <ListItemText
                      primary={`${option} (${filterOptionCounts.opponentRacketCounts.get(option) ?? 0})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" fullWidth>
              <InputLabel id="filter-opponent-rate-band-label">相手レート帯</InputLabel>
              <Select
                labelId="filter-opponent-rate-band-label"
                multiple
                value={selectedOpponentRateBands}
                onChange={(event) =>
                  setSelectedOpponentRateBands(
                    typeof event.target.value === "string"
                      ? event.target.value.split(",")
                      : (event.target.value as string[])
                  )
                }
                input={<OutlinedInput label="相手レート帯" />}
                renderValue={(selected) => (selected as string[]).join(", ")}
              >
                {opponentRateBandFilterOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    <Checkbox size="small" checked={selectedOpponentRateBands.includes(option)} />
                    <ListItemText
                      primary={`${option} (${filterOptionCounts.opponentRateBandCounts.get(option) ?? 0})`}
                    />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

              <Box sx={{ pt: 0.6 }}>
                <Box className="filter-date-section">
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={dateFilterPreset}
                    onChange={(_, value: DateFilterPreset | null) => {
                      if (value !== null) {
                        setDateFilterPreset(value);
                      }
                    }}
                    fullWidth
                    color="primary"
                  >
                    <ToggleButton value="all">全期間</ToggleButton>
                    <ToggleButton value="last30">直近30日</ToggleButton>
                    <ToggleButton value="custom">範囲</ToggleButton>
                  </ToggleButtonGroup>

                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      size="small"
                      type="datetime-local"
                      label="開始"
                      value={dateFrom}
                      onChange={(event) => setDateFrom(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={dateFilterPreset !== "custom"}
                      fullWidth
                    />
                    <TextField
                      size="small"
                      type="datetime-local"
                      label="終了"
                      value={dateTo}
                      onChange={(event) => setDateTo(event.target.value)}
                      InputLabelProps={{ shrink: true }}
                      disabled={dateFilterPreset !== "custom"}
                      fullWidth
                    />
                  </Stack>
                </Box>
              </Box>
            </Stack>
          </div>
        </aside>
      </div>

      <MatchRecordModal
        isOpen={isModalOpen}
        mode={editingRecord ? "edit" : "create"}
        initialValues={editingRecord}
        createInitialValues={createInitialValues}
        historyRecords={records}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

export default App;
