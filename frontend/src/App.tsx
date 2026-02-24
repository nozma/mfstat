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
import { CHARACTER_OPTIONS, RACKET_OPTIONS, RULE_OPTIONS, STAGE_OPTIONS } from "./constants/options";

const COLUMN_VISIBILITY_STORAGE_KEY = "mfstat.recordGrid.columnVisibility";
const COLUMN_ORDER_STORAGE_KEY = "mfstat.recordGrid.columnOrder";
type DateFilterPreset = "all" | "last7" | "last30" | "custom";

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

function App() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isColumnOrderEditorOpen, setIsColumnOrderEditorOpen] = useState(false);
  const [selectedRules, setSelectedRules] = useState<MatchRecordValues["rule"][]>([]);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [selectedMyCharacters, setSelectedMyCharacters] = useState<string[]>([]);
  const [selectedMyRackets, setSelectedMyRackets] = useState<string[]>([]);
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

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const fetchedRecords = await listRecords();
        setRecords(fetchedRecords);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "記録の取得に失敗しました。");
      } finally {
        setIsLoading(false);
      }
    };

    void load();
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
      selectedRules,
      selectedStages
    ]
  );
  const activeFilterCount =
    Number(selectedRules.length > 0) +
    Number(selectedStages.length > 0) +
    Number(selectedMyCharacters.length > 0) +
    Number(selectedMyRackets.length > 0) +
    Number(dateRangeFilter.from !== null || dateRangeFilter.to !== null);
  const resetFilters = () => {
    setSelectedRules([]);
    setSelectedStages([]);
    setSelectedMyCharacters([]);
    setSelectedMyRackets([]);
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
        <h1>MFStat</h1>
        <button type="button" className="button primary" onClick={openCreateModal}>
          記録を追加
        </button>
      </header>

      {errorMessage && <p className="status-message error">{errorMessage}</p>}

      <section className="record-list">
        <div className="record-layout">
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
                      <ListItemText primary={option.label} />
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
                  {stageFilterOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      <Checkbox size="small" checked={selectedStages.includes(option)} />
                      <ListItemText primary={option} />
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
                  {CHARACTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Checkbox size="small" checked={selectedMyCharacters.includes(option.value)} />
                      <ListItemText primary={option.label} />
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
                  {myRacketFilterOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      <Checkbox size="small" checked={selectedMyRackets.includes(option)} />
                      <ListItemText primary={option} />
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
      </section>

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
