import { useEffect, useMemo, useState } from "react";
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
import {
  DataGrid,
  GridColDef,
  GridColumnVisibilityModel,
  GridRenderCellParams
} from "@mui/x-data-grid";
import MatchRecordModal, {
  MatchRecordValues
} from "./components/MatchRecordModal";
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
type DateFilterPreset = "all" | "last7" | "last30" | "custom";
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

const RULE_TREND_COLORS: Record<MatchRecordValues["rule"], string> = {
  singles_fever_on: "#2e7d32",
  singles_fever_off: "#1565c0",
  doubles_fever_on: "#ef6c00",
  doubles_fever_off: "#6a1b9a"
};

const formatTrendDate = (timestamp: number) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const APP_VERSION = __APP_VERSION__;

function App() {
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
      opponentRateBand: latestRecord.opponentRateBand
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

  useEffect(() => {
    void loadRecords("initial");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      COLUMN_VISIBILITY_STORAGE_KEY,
      JSON.stringify(columnVisibilityModel)
    );
  }, [columnVisibilityModel]);

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

  const handleSubmit = async (values: MatchRecordValues) => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (editingRecordId === null) {
        const createdRecord = await createRecord(values);
        setRecords((prev) => [createdRecord, ...prev]);
      } else {
        const updatedRecord = await updateRecord(editingRecordId, values);
        setRecords((prev) =>
          prev.map((record) => (record.id === updatedRecord.id ? updatedRecord : record))
        );
      }

      setIsModalOpen(false);
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
    if (dateFilterPreset === "last7") {
      return { from: Date.now() - 7 * 24 * 60 * 60 * 1000, to: null as number | null };
    }
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
  const rateTrendChart = useMemo(() => {
    const width = 760;
    const height = 300;
    const margin = { top: 16, right: 16, bottom: 42, left: 52 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;

    const samples = filteredRecords
      .map((record) => ({
        id: record.id,
        rule: record.rule,
        timestamp: parsePlayedAtTimestamp(record.playedAt),
        playedAt: record.playedAt,
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

    if (samples.length === 0) {
      return {
        width,
        height,
        margin,
        plotHeight,
        series: [] as Array<{
          rule: MatchRecordValues["rule"];
          label: string;
          color: string;
          path: string;
          points: Array<{ x: number; y: number; rate: number; playedAt: string; id: number }>;
        }>,
        yTicks: [] as Array<{ y: number; label: string }>,
        xTicks: [] as Array<{ x: number; label: string; key: string }>
      };
    }

    const minTimestamp = samples[0].timestamp;
    const maxTimestamp = samples[samples.length - 1].timestamp;

    let minRate = Math.min(...samples.map((sample) => sample.rate));
    let maxRate = Math.max(...samples.map((sample) => sample.rate));
    if (minRate === maxRate) {
      minRate -= 1;
      maxRate += 1;
    }
    const ratePadding = Math.max(8, (maxRate - minRate) * 0.1);
    const yMin = Math.floor(minRate - ratePadding);
    const yMax = Math.ceil(maxRate + ratePadding);
    const normalizedYMax = yMax === yMin ? yMin + 1 : yMax;

    const xFor = (timestamp: number) => {
      if (maxTimestamp === minTimestamp) {
        return margin.left + plotWidth / 2;
      }
      return (
        margin.left + ((timestamp - minTimestamp) / (maxTimestamp - minTimestamp)) * plotWidth
      );
    };
    const yFor = (rate: number) =>
      margin.top + (1 - (rate - yMin) / (normalizedYMax - yMin)) * plotHeight;

    const pointsByRule = new Map<
      MatchRecordValues["rule"],
      Array<{ x: number; y: number; rate: number; playedAt: string; id: number }>
    >();
    samples.forEach((sample) => {
      const point = {
        x: xFor(sample.timestamp),
        y: yFor(sample.rate),
        rate: sample.rate,
        playedAt: sample.playedAt,
        id: sample.id
      };
      const points = pointsByRule.get(sample.rule) ?? [];
      points.push(point);
      pointsByRule.set(sample.rule, points);
    });

    const series = RULE_OPTIONS.map((option) => {
      const points = pointsByRule.get(option.value) ?? [];
      const path = points
        .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
        .join(" ");
      return {
        rule: option.value,
        label: option.label,
        color: RULE_TREND_COLORS[option.value],
        path,
        points
      };
    }).filter((entry) => entry.points.length > 0);

    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const value = yMin + ((normalizedYMax - yMin) * (4 - index)) / 4;
      return { y: yFor(value), label: Math.round(value).toString() };
    });

    const tickTimestamps =
      maxTimestamp === minTimestamp
        ? [minTimestamp]
        : [minTimestamp, minTimestamp + (maxTimestamp - minTimestamp) / 2, maxTimestamp];
    const xTicks = tickTimestamps.map((timestamp, index) => ({
      x: xFor(timestamp),
      label: formatTrendDate(timestamp),
      key: `${Math.round(timestamp)}-${index}`
    }));

    return { width, height, margin, plotHeight, series, yTicks, xTicks };
  }, [filteredRecords]);
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
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["playedAt"]>) =>
          formatPlayedAt(params.row.playedAt)
      },
      {
        field: "rule",
        headerName: "ルール",
        minWidth: 220,
        flex: 1.2,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["rule"]>) =>
          ruleLabelByValue[params.row.rule]
      },
      { field: "stage", headerName: "ステージ", minWidth: 190, flex: 1.1 },
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
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myCharacter"]>) =>
          displayCharacter(params.row.myCharacter)
      },
      {
        field: "myPartnerCharacter",
        headerName: "自分パートナー",
        minWidth: 150,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myPartnerCharacter"]>) =>
          displayCharacterOrDash(params.row.myPartnerCharacter)
      },
      {
        field: "opponentCharacter",
        headerName: "相手キャラ",
        minWidth: 150,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentCharacter"]>) =>
          displayCharacter(params.row.opponentCharacter)
      },
      {
        field: "opponentPartnerCharacter",
        headerName: "相手パートナー",
        minWidth: 150,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPartnerCharacter"]>) =>
          displayCharacterOrDash(params.row.opponentPartnerCharacter)
      },
      {
        field: "myRacket",
        headerName: "自分ラケット",
        minWidth: 160,
        flex: 1,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myRacket"]>) =>
          displayOrDash(params.row.myRacket)
      },
      {
        field: "myPartnerRacket",
        headerName: "自分パートナーラケット",
        minWidth: 190,
        flex: 1,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myPartnerRacket"]>) =>
          displayOrDash(params.row.myPartnerRacket)
      },
      {
        field: "opponentRacket",
        headerName: "相手ラケット",
        minWidth: 160,
        flex: 1,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentRacket"]>) =>
          displayOrDash(params.row.opponentRacket)
      },
      {
        field: "opponentPartnerRacket",
        headerName: "相手パートナーラケット",
        minWidth: 190,
        flex: 1,
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
        field: "opponentRateBand",
        headerName: "相手レート帯",
        minWidth: 90,
        width: 96,
        maxWidth: 104,
        flex: 0,
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
        field: "opponentPlayerName",
        headerName: "相手プレイヤー名",
        minWidth: 170,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPlayerName"]>) =>
          displayOrDash(params.row.opponentPlayerName)
      },
      {
        field: "myPartnerPlayerName",
        headerName: "自分パートナー名",
        minWidth: 170,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["myPartnerPlayerName"]>) =>
          displayOrDash(params.row.myPartnerPlayerName)
      },
      {
        field: "opponentPartnerPlayerName",
        headerName: "相手パートナー名",
        minWidth: 170,
        flex: 0.9,
        renderCell: (params: GridRenderCellParams<MatchRecord, MatchRecord["opponentPartnerPlayerName"]>) =>
          displayOrDash(params.row.opponentPartnerPlayerName)
      },
      {
        field: "actions",
        headerName: "操作",
        minWidth: 110,
        flex: 0.6,
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
    [characterLabelByValue, deletingRecordId, myRateDeltaByRecordId, ruleLabelByValue]
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
          MFStat
          <span className="app-version">v{APP_VERSION}</span>
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
          <button type="button" className="button primary" onClick={openCreateModal}>
            記録を追加
          </button>
        </div>
      </header>

      {errorMessage && <p className="status-message error">{errorMessage}</p>}

      <div className="dashboard-layout">
        <div className="dashboard-main">
          <section className="record-list">
            <div className="record-main">
            <div className="record-list-header">
              <h2>記録一覧</h2>
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
                rows={filteredRecords}
                columns={orderedColumns}
                loading={isLoading}
                showToolbar
                columnVisibilityModel={columnVisibilityModel}
                onColumnVisibilityModelChange={handleColumnVisibilityModelChange}
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
            <h2>集計</h2>
            <div className="summary-split-grid">
              <div className="summary-left-stack">
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
                        <div key={item.rateBand} className="rate-band-row">
                          <span className="rate-band-label">{item.rateBand}</span>
                          <span className="rate-band-value">{item.winRate.toFixed(1)}%</span>
                          <div className="rate-band-track">
                            <div
                              className="rate-band-fill"
                              style={{ width: `${Math.max(2, item.winRate)}%` }}
                            />
                          </div>
                          <span className="rate-band-meta">
                            {item.wins}/{item.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="summary-card">
                <p className="summary-label">相手キャラ別 勝率</p>
                {opponentCharacterWinStats.length === 0 ? (
                  <p className="summary-sub">対象レコードなし</p>
                ) : (
                  <div className="rate-band-chart opponent-character-chart">
                    {opponentCharacterWinStats.map((item) => (
                      <div key={item.character} className="rate-band-row rate-band-row-character">
                        <span className="rate-band-label rate-band-label-character">{item.label}</span>
                        <span className="rate-band-value">{item.winRate.toFixed(1)}%</span>
                        <div className="rate-band-track">
                          <div
                            className="rate-band-fill"
                            style={{ width: `${Math.max(2, item.winRate)}%` }}
                          />
                        </div>
                        <span className="rate-band-meta">
                          {item.wins}/{item.total}
                        </span>
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
                        className="rate-band-row rate-band-row-character rate-band-row-usage"
                      >
                        <span className="rate-band-label rate-band-label-character">{item.label}</span>
                        <span className="rate-band-value">{item.usageRate.toFixed(1)}%</span>
                        <div className="rate-band-track">
                          <div
                            className="rate-band-fill"
                            style={{ width: `${Math.max(2, item.usageRate)}%` }}
                          />
                        </div>
                        <span className="rate-band-meta">{item.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="summary-card summary-trend-card">
              <p className="summary-label">レート推移</p>
              {rateTrendChart.series.length === 0 ? (
                <p className="summary-sub">対象レコードなし</p>
              ) : (
                <>
                  <div className="rate-trend-legend">
                    {rateTrendChart.series.map((series) => (
                      <span key={series.rule} className="rate-trend-legend-item">
                        <span
                          className="rate-trend-legend-swatch"
                          style={{ backgroundColor: series.color }}
                        />
                        <span>{ruleLabelByValue[series.rule]}</span>
                      </span>
                    ))}
                  </div>
                  <div className="rate-trend-chart-wrap">
                    <svg
                      viewBox={`0 0 ${rateTrendChart.width} ${rateTrendChart.height}`}
                      className="rate-trend-svg"
                      role="img"
                      aria-label="ルール別レート推移グラフ"
                    >
                      {rateTrendChart.yTicks.map((tick) => (
                        <g key={`y-${tick.label}-${tick.y}`}>
                          <line
                            x1={rateTrendChart.margin.left}
                            y1={tick.y}
                            x2={rateTrendChart.width - rateTrendChart.margin.right}
                            y2={tick.y}
                            className="rate-trend-grid-line"
                          />
                          <text
                            x={rateTrendChart.margin.left - 8}
                            y={tick.y + 4}
                            textAnchor="end"
                            className="rate-trend-axis-text"
                          >
                            {tick.label}
                          </text>
                        </g>
                      ))}

                      <line
                        x1={rateTrendChart.margin.left}
                        y1={rateTrendChart.margin.top + rateTrendChart.plotHeight}
                        x2={rateTrendChart.width - rateTrendChart.margin.right}
                        y2={rateTrendChart.margin.top + rateTrendChart.plotHeight}
                        className="rate-trend-axis-line"
                      />

                      {rateTrendChart.xTicks.map((tick) => (
                        <g key={`x-${tick.key}`}>
                          <line
                            x1={tick.x}
                            y1={rateTrendChart.margin.top + rateTrendChart.plotHeight}
                            x2={tick.x}
                            y2={rateTrendChart.margin.top + rateTrendChart.plotHeight + 5}
                            className="rate-trend-axis-line"
                          />
                          <text
                            x={tick.x}
                            y={rateTrendChart.margin.top + rateTrendChart.plotHeight + 18}
                            textAnchor="middle"
                            className="rate-trend-axis-text"
                          >
                            {tick.label}
                          </text>
                        </g>
                      ))}

                      {rateTrendChart.series.map((series) => (
                        <g key={`line-${series.rule}`}>
                          <path
                            d={series.path}
                            className="rate-trend-path"
                            style={{ stroke: series.color }}
                          />
                          {series.points.map((point) => (
                            <circle
                              key={`${series.rule}-${point.id}`}
                              cx={point.x}
                              cy={point.y}
                              r={3}
                              className="rate-trend-point"
                              style={{ fill: series.color }}
                            >
                              <title>{`${ruleLabelByValue[series.rule]} ${point.rate} (${formatPlayedAt(point.playedAt)})`}</title>
                            </circle>
                          ))}
                        </g>
                      ))}
                    </svg>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>

        <aside className="record-filter-panel">
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

            <Box className="filter-date-section">
              <p className="filter-field-label">試合日時</p>
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
                <ToggleButton value="last7">直近7日</ToggleButton>
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
          </Stack>
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
