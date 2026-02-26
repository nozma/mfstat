import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  CHARACTER_OPTIONS,
  RATE_BAND_OPTIONS,
  RACKET_OPTIONS,
  RULE_OPTIONS,
  RuleOption,
  STAGE_OPTIONS
} from "../constants/options";

export type MatchRecordValues = {
  playedAt: string;
  rule: RuleOption["value"];
  stage: string;
  myScore: string;
  opponentScore: string;
  myCharacter: string;
  myPartnerCharacter: string;
  opponentCharacter: string;
  opponentPartnerCharacter: string;
  myRacket: string;
  myPartnerRacket: string;
  opponentRacket: string;
  opponentPartnerRacket: string;
  myRate: string;
  myRateBand: string;
  myPartnerRateBand: string;
  opponentRateBand: string;
  opponentPartnerRateBand: string;
  opponentPlayerName: string;
  myPartnerPlayerName: string;
  opponentPartnerPlayerName: string;
};

type MatchRecordModalProps = {
  isOpen: boolean;
  mode: "create" | "edit";
  initialValues?: MatchRecordValues;
  createInitialValues?: Partial<MatchRecordValues>;
  historyRecords?: MatchRecordValues[];
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (
    values: MatchRecordValues,
    options?: { keepOpenAfterSave?: boolean }
  ) => void | Promise<void>;
};

const PLAYER_NAME_RECORDING_STORAGE_KEY = "mfstat.modal.playerNameRecording";

const defaultValues: MatchRecordValues = {
  playedAt: "",
  rule: RULE_OPTIONS[0].value,
  stage: STAGE_OPTIONS[0],
  myScore: "",
  opponentScore: "",
  myCharacter: CHARACTER_OPTIONS[0].value,
  myPartnerCharacter: CHARACTER_OPTIONS[0].value,
  opponentCharacter: CHARACTER_OPTIONS[0].value,
  opponentPartnerCharacter: CHARACTER_OPTIONS[0].value,
  myRacket: RACKET_OPTIONS[0],
  myPartnerRacket: RACKET_OPTIONS[0],
  opponentRacket: RACKET_OPTIONS[1],
  opponentPartnerRacket: RACKET_OPTIONS[1],
  myRate: "",
  myRateBand: RATE_BAND_OPTIONS[0],
  myPartnerRateBand: RATE_BAND_OPTIONS[0],
  opponentRateBand: RATE_BAND_OPTIONS[0],
  opponentPartnerRateBand: RATE_BAND_OPTIONS[0],
  opponentPlayerName: "",
  myPartnerPlayerName: "",
  opponentPartnerPlayerName: ""
};

const pad2 = (value: number) => value.toString().padStart(2, "0");

const getCurrentDatetimeLocalValue = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());
  const hours = pad2(now.getHours());
  const minutes = pad2(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const buildCreateDefaults = (overrideValues?: Partial<MatchRecordValues>): MatchRecordValues => ({
  ...defaultValues,
  ...overrideValues,
  playedAt: getCurrentDatetimeLocalValue()
});

type UsageStat = {
  count: number;
  latestPlayedAt: number;
};

const parsePlayedAt = (playedAt: string) => {
  const timestamp = new Date(playedAt).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const buildUsageStats = (records: MatchRecordValues[], key: keyof MatchRecordValues) => {
  const stats = new Map<string, UsageStat>();

  records.forEach((record) => {
    const rawValue = record[key];
    if (typeof rawValue !== "string") {
      return;
    }

    const value = rawValue.trim();
    if (value.length === 0) {
      return;
    }

    const current = stats.get(value);
    const timestamp = parsePlayedAt(record.playedAt);
    if (!current) {
      stats.set(value, { count: 1, latestPlayedAt: timestamp });
      return;
    }

    stats.set(value, {
      count: current.count + 1,
      latestPlayedAt: Math.max(current.latestPlayedAt, timestamp)
    });
  });

  return stats;
};

const sortCharacterOptions = (stats: Map<string, UsageStat>): typeof CHARACTER_OPTIONS => {
  return [...CHARACTER_OPTIONS].sort((left, right) => {
    const leftStat = stats.get(left.value);
    const rightStat = stats.get(right.value);

    const countDiff = (rightStat?.count ?? 0) - (leftStat?.count ?? 0);
    if (countDiff !== 0) {
      return countDiff;
    }

    const latestDiff = (rightStat?.latestPlayedAt ?? 0) - (leftStat?.latestPlayedAt ?? 0);
    if (latestDiff !== 0) {
      return latestDiff;
    }

    return left.label.localeCompare(right.label, "ja");
  });
};

const sortRacketOptions = (stats: Map<string, UsageStat>) => {
  return [...RACKET_OPTIONS].sort((left, right) => {
    const leftStat = stats.get(left);
    const rightStat = stats.get(right);

    const countDiff = (rightStat?.count ?? 0) - (leftStat?.count ?? 0);
    if (countDiff !== 0) {
      return countDiff;
    }

    const latestDiff = (rightStat?.latestPlayedAt ?? 0) - (leftStat?.latestPlayedAt ?? 0);
    if (latestDiff !== 0) {
      return latestDiff;
    }

    return left.localeCompare(right, "ja");
  });
};

const shiftRateBand = (current: string, direction: -1 | 1) => {
  const currentIndex = RATE_BAND_OPTIONS.indexOf(current);
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const nextIndex = Math.min(
    RATE_BAND_OPTIONS.length - 1,
    Math.max(0, safeIndex + direction)
  );
  return RATE_BAND_OPTIONS[nextIndex];
};

const shiftRateValue = (current: string, amount: number) => {
  const parsed = Number.parseInt(current, 10);
  const base = Number.isNaN(parsed) ? 0 : parsed;
  const next = Math.max(0, base + amount);
  return String(next);
};

const SCORE_SELECTION_OPTIONS = ["0", "1", "2", "3", "4", "5", "6"] as const;

const toWinningScore = (selectedScore: string) => (selectedScore === "6" ? "8" : "7");

const sectionSx = {
  px: 2,
  py: 1,
  border: "1px solid #cfdae4",
  borderRadius: 2.5,
  backgroundColor: "#ffffff",
  boxShadow: "0 6px 16px rgba(14, 40, 67, 0.08), 0 1px 2px rgba(14, 40, 67, 0.08)"
} as const;

const sectionTitleSx = {
  color: "#11324a",
  letterSpacing: "0.01em"
} as const;

const formRowSx = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "flex-start",
  columnGap: 1.5,
  rowGap: 1.25
} as const;

const twoColSx = formRowSx;
const threeColSx = {
  ...formRowSx,
  flexWrap: { xs: "wrap", sm: "nowrap" }
} as const;
const singleFieldRowSx = formRowSx;
const resultGridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "1fr", sm: "max-content max-content" },
  columnGap: 4.5,
  rowGap: 1.25,
  alignItems: "start"
} as const;

const fieldWidthSx = {
  datetime: { width: { xs: "100%", sm: 170 } },
  rule: { width: { xs: "100%", sm: 136 } },
  stage: {
    width: { xs: "100%", sm: "auto" },
    minWidth: { xs: "100%", sm: 170 },
    flex: { xs: "0 0 100%", sm: "1 1 auto" }
  },
  character: { width: { xs: "100%", sm: 220 } },
  racket: { width: { xs: "100%", sm: 220 } },
  rate: { width: { xs: "100%", sm: 72 } },
  rateBand: { width: { xs: "100%", sm: 120 } },
  playerName: { width: { xs: "100%", sm: 220 } }
} as const;

const compactInputTextSx = {
  "& .MuiInputBase-input, & .MuiSelect-select": {
    fontSize: "0.9rem"
  }
} as const;

const numberInputNoSpinnerSx = {
  "& input[type=number]": {
    MozAppearance: "textfield"
  },
  "& input[type=number]::-webkit-outer-spin-button, & input[type=number]::-webkit-inner-spin-button":
    {
      WebkitAppearance: "none",
      margin: 0
    }
} as const;

const rateBandControlSx = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: { xs: "100%", sm: 189 },
  gap: 0.5
} as const;

const rateBandButtonsSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.25
} as const;

const opponentRateBandSelectorSx = {
  width: "100%"
} as const;

const rateBandFieldLabelSx = {
  mb: 0.45,
  fontSize: "0.74rem",
  fontWeight: 500,
  color: "#28455a"
} as const;

const opponentRateBandButtonRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.45,
  flexWrap: "nowrap",
  overflowX: "auto",
  pb: 0.25
} as const;

const opponentRateBandButtonSx = {
  minWidth: 34,
  height: 30,
  px: 0.65,
  fontWeight: 700,
  fontSize: "0.78rem",
  borderRadius: 1.4,
  flex: "0 0 auto"
} as const;

const scoreSelectorSx = {
  gridColumn: "1 / -1",
  width: "100%"
} as const;

const scoreSelectorRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.35,
  flexWrap: { xs: "wrap", sm: "nowrap" }
} as const;

const scoreSelectorLabelSx = {
  width: { xs: "100%", sm: 80 },
  fontSize: "0.74rem",
  fontWeight: 500,
  color: "#28455a"
} as const;

const scoreSelectorButtonRowSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.45,
  flexWrap: "nowrap",
  flex: "1 1 auto",
  minWidth: 0,
  overflowX: "auto",
  pb: 0.2
} as const;

const scoreSelectorButtonSx = {
  minWidth: 34,
  height: 30,
  px: 0.65,
  fontWeight: 700,
  fontSize: "0.78rem",
  borderRadius: 1.4,
  flex: "0 0 auto"
} as const;

const scoreSelectorButtonSelectedSx = {
  backgroundColor: "#1e5b82",
  borderColor: "#1e5b82",
  color: "#fff",
  "&:hover": {
    backgroundColor: "#184b6c",
    borderColor: "#184b6c"
  }
} as const;

const scoreSelectorButtonUnselectedSx = {
  backgroundColor: "#fff",
  borderColor: "#b8c9d7",
  color: "#2d4f67",
  "&:hover": {
    borderColor: "#8ca9be",
    backgroundColor: "#f4f8fc"
  }
} as const;

const scoreWinningBadgeSx = {
  ...scoreSelectorButtonSx,
  ...scoreSelectorButtonSelectedSx
} as const;

const rateControlSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
  flexWrap: { xs: "wrap", sm: "nowrap" }
} as const;

const rateStepButtonsSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.25,
  flexWrap: "nowrap"
} as const;

function MatchRecordModal({
  isOpen,
  mode,
  initialValues,
  createInitialValues,
  historyRecords = [],
  isSubmitting = false,
  onClose,
  onSubmit
}: MatchRecordModalProps) {
  const [values, setValues] = useState<MatchRecordValues>(() => buildCreateDefaults(createInitialValues));
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isPlayerNameRecordingEnabled, setIsPlayerNameRecordingEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    const saved = window.localStorage.getItem(PLAYER_NAME_RECORDING_STORAGE_KEY);
    if (saved === "false") {
      return false;
    }
    return true;
  });

  const selectedRule = RULE_OPTIONS.find((option) => option.value === values.rule) ?? RULE_OPTIONS[0];
  const isDoubles = selectedRule.isDoubles;
  const hasFeverRacket = selectedRule.hasFeverRacket;

  const myCharacterOptions = useMemo(
    () => sortCharacterOptions(buildUsageStats(historyRecords, "myCharacter")),
    [historyRecords]
  );
  const opponentCharacterOptions = useMemo(
    () => sortCharacterOptions(buildUsageStats(historyRecords, "opponentCharacter")),
    [historyRecords]
  );
  const myPartnerCharacterOptions = useMemo(
    () => sortCharacterOptions(buildUsageStats(historyRecords, "myPartnerCharacter")),
    [historyRecords]
  );
  const opponentPartnerCharacterOptions = useMemo(
    () => sortCharacterOptions(buildUsageStats(historyRecords, "opponentPartnerCharacter")),
    [historyRecords]
  );
  const myRacketOptions = useMemo(
    () => sortRacketOptions(buildUsageStats(historyRecords, "myRacket")),
    [historyRecords]
  );
  const opponentRacketOptions = useMemo(
    () => sortRacketOptions(buildUsageStats(historyRecords, "opponentRacket")),
    [historyRecords]
  );
  const myPartnerRacketOptions = useMemo(
    () => sortRacketOptions(buildUsageStats(historyRecords, "myPartnerRacket")),
    [historyRecords]
  );
  const opponentPartnerRacketOptions = useMemo(
    () => sortRacketOptions(buildUsageStats(historyRecords, "opponentPartnerRacket")),
    [historyRecords]
  );
  const stageOptions = useMemo(() => {
    if (values.stage.length > 0 && !STAGE_OPTIONS.includes(values.stage)) {
      return [values.stage, ...STAGE_OPTIONS];
    }
    return STAGE_OPTIONS;
  }, [values.stage]);
  const rateBandSelectOptions = useMemo(() => [...RATE_BAND_OPTIONS].reverse(), []);
  const myRateBandIndex = RATE_BAND_OPTIONS.indexOf(values.myRateBand);
  const myRateValue = Number.parseInt(values.myRate, 10);
  const canDecreaseRate = Number.isNaN(myRateValue) ? false : myRateValue > 0;
  const isOpponentScoreSelected = (score: string) =>
    values.opponentScore === score && values.myScore === toWinningScore(score);
  const isMyScoreSelected = (score: string) =>
    values.myScore === score && values.opponentScore === toWinningScore(score);
  const hasScoreSelection = SCORE_SELECTION_OPTIONS.some(
    (score) => isOpponentScoreSelected(score) || isMyScoreSelected(score)
  );
  const selectedScore =
    SCORE_SELECTION_OPTIONS.find((score) => isOpponentScoreSelected(score) || isMyScoreSelected(score)) ??
    null;
  const winningScore = selectedScore ? toWinningScore(selectedScore) : null;
  const selectedScoreOwner = selectedScore
    ? isOpponentScoreSelected(selectedScore)
      ? "opponent"
      : "my"
    : null;

  useEffect(() => {
    window.localStorage.setItem(
      PLAYER_NAME_RECORDING_STORAGE_KEY,
      String(isPlayerNameRecordingEnabled)
    );
  }, [isPlayerNameRecordingEnabled]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === "edit" && initialValues) {
      setValues(initialValues);
      return;
    }

    setValues(buildCreateDefaults(createInitialValues));
  }, [createInitialValues, initialValues, isOpen, mode]);

  useEffect(() => {
    if (!isOpen || mode !== "create") {
      return;
    }

    const firstMyPartner = myPartnerCharacterOptions[0]?.value ?? CHARACTER_OPTIONS[0].value;
    const firstOpponent = opponentCharacterOptions[0]?.value ?? CHARACTER_OPTIONS[0].value;
    const firstOpponentPartner =
      opponentPartnerCharacterOptions[0]?.value ?? CHARACTER_OPTIONS[0].value;

    setValues((prev) => {
      if (
        prev.myPartnerCharacter === firstMyPartner &&
        prev.opponentCharacter === firstOpponent &&
        prev.opponentPartnerCharacter === firstOpponentPartner
      ) {
        return prev;
      }

      return {
        ...prev,
        myPartnerCharacter: firstMyPartner,
        opponentCharacter: firstOpponent,
        opponentPartnerCharacter: firstOpponentPartner
      };
    });
  }, [
    isOpen,
    mode,
    myPartnerCharacterOptions,
    opponentCharacterOptions,
    opponentPartnerCharacterOptions
  ]);

  const modalTitle = mode === "create" ? "記録を登録" : "記録を編集";

  const buildNormalizedValues = (): MatchRecordValues => {
    const normalizedValues: MatchRecordValues = { ...values };

    if (!isDoubles) {
      normalizedValues.myPartnerCharacter = "";
      normalizedValues.opponentPartnerCharacter = "";
      normalizedValues.myPartnerRacket = "";
      normalizedValues.opponentPartnerRacket = "";
      normalizedValues.myPartnerRateBand = "";
      normalizedValues.opponentPartnerRateBand = "";
      normalizedValues.myPartnerPlayerName = "";
      normalizedValues.opponentPartnerPlayerName = "";
    }

    if (!hasFeverRacket) {
      normalizedValues.myRacket = "";
      normalizedValues.opponentRacket = "";
      normalizedValues.myPartnerRacket = "";
      normalizedValues.opponentPartnerRacket = "";
    }

    if (!isPlayerNameRecordingEnabled) {
      normalizedValues.opponentPlayerName = "";
      normalizedValues.myPartnerPlayerName = "";
      normalizedValues.opponentPartnerPlayerName = "";
    }

    return normalizedValues;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !hasScoreSelection) {
      return;
    }
    void onSubmit(buildNormalizedValues());
  };

  const handleSaveAndContinue = () => {
    if (isSubmitting || mode !== "create" || !hasScoreSelection) {
      return;
    }
    void onSubmit(buildNormalizedValues(), { keepOpenAfterSave: true });
  };

  const handleScoreSelection = (target: "opponent" | "my", selectedScore: string) => {
    const winningScore = toWinningScore(selectedScore);
    setValues((prev) =>
      target === "opponent"
        ? {
            ...prev,
            opponentScore: selectedScore,
            myScore: winningScore
          }
        : {
            ...prev,
            myScore: selectedScore,
            opponentScore: winningScore
          }
    );
  };

  const renderRateBandButtons = (
    ariaLabel: string,
    selectedValue: string,
    onSelect: (value: string) => void
  ) => (
    <Box role="radiogroup" aria-label={ariaLabel} sx={opponentRateBandButtonRowSx}>
      {rateBandSelectOptions.map((option) => {
        const isSelected = selectedValue === option;
        return (
          <Button
            key={`${ariaLabel}-${option}`}
            type="button"
            variant={isSelected ? "contained" : "outlined"}
            onClick={() => onSelect(option)}
            aria-pressed={isSelected}
            sx={{
              ...opponentRateBandButtonSx,
              ...(isSelected
                ? {
                    backgroundColor: "#1e5b82",
                    borderColor: "#1e5b82",
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: "#184b6c",
                      borderColor: "#184b6c"
                    }
                  }
                : {
                    backgroundColor: "#fff",
                    borderColor: "#b8c9d7",
                    color: "#2d4f67",
                    "&:hover": {
                      borderColor: "#8ca9be",
                      backgroundColor: "#f4f8fc"
                    }
                  })
            }}
          >
            {option}
          </Button>
        );
      })}
    </Box>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          border: "1px solid #c7d5e2",
          boxShadow: "0 28px 56px rgba(7, 22, 39, 0.26), 0 8px 18px rgba(7, 22, 39, 0.16)",
          backgroundColor: "#f5f9fe",
          overflow: "hidden"
        }
      }}
    >
      <DialogTitle
        sx={{
          pb: 1.1,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          borderBottom: "1px solid #d6e1eb"
        }}
      >
        <Stack spacing={0.7}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
            <Stack spacing={0.2}>
              <Typography component="div" variant="h6" fontWeight={700}>
                {modalTitle}
              </Typography>
            </Stack>
            <IconButton
              size="small"
              aria-label="オプション設定"
              onClick={() => setIsOptionsOpen((prev) => !prev)}
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>
          <Collapse in={isOptionsOpen}>
            <Box
              sx={{
                border: "1px solid #d6e1eb",
                borderRadius: 1.5,
                px: 1.2,
                py: 0.6,
                backgroundColor: "#f8fbff"
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={isPlayerNameRecordingEnabled}
                    onChange={(event) => setIsPlayerNameRecordingEnabled(event.target.checked)}
                  />
                }
                label="プレイヤー名記録"
              />
            </Box>
          </Collapse>
        </Stack>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent
          dividers
          sx={{
            maxHeight: "72vh",
            p: 2.2,
            background:
              "radial-gradient(circle at top right, rgba(221, 237, 251, 0.5) 0%, rgba(245, 249, 254, 1) 42%)",
            borderTopColor: "#d6e1eb",
            borderBottomColor: "#d6e1eb",
            "& .MuiInputBase-input, & .MuiSelect-select": {
              fontSize: "0.9rem"
            },
            "& .MuiInputLabel-root": {
              fontSize: "0.9rem"
            },
            "& .MuiTextField-root .MuiOutlinedInput-root": {
              minHeight: "34px"
            },
            "& .MuiTextField-root .MuiOutlinedInput-input, & .MuiTextField-root .MuiSelect-select": {
              paddingTop: "7px",
              paddingBottom: "7px"
            }
          }}
        >
          <Stack spacing={1}>
            <Box sx={sectionSx}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  試合情報
                </Typography>
                <Box sx={threeColSx}>
                  <TextField
                    label="試合日時"
                    type="datetime-local"
                    value={values.playedAt}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        playedAt: event.target.value
                      }))
                    }
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    required
                    sx={{ ...fieldWidthSx.datetime, ...compactInputTextSx }}
                  />

                  <TextField
                    select
                    label="ルール"
                    value={values.rule}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        rule: event.target.value as RuleOption["value"]
                      }))
                    }
                    size="small"
                    required
                    sx={{ ...fieldWidthSx.rule, ...compactInputTextSx }}
                  >
                    {RULE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    label="ステージ"
                    value={values.stage}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        stage: event.target.value
                      }))
                    }
                    size="small"
                    required
                    sx={{ ...fieldWidthSx.stage, ...compactInputTextSx }}
                  >
                    {stageOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

              </Stack>
            </Box>

            <Box sx={sectionSx}>
              <Stack
                spacing={1.5}
                sx={{
                  "& > .partner-rate-band-row": {
                    mt: "2px !important"
                  }
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  対戦相手情報
                </Typography>
                <Box sx={singleFieldRowSx}>
                  <Box sx={opponentRateBandSelectorSx}>
                    {renderRateBandButtons("相手のレート帯", values.opponentRateBand, (option) =>
                      setValues((prev) => ({
                        ...prev,
                        opponentRateBand: option
                      }))
                    )}
                  </Box>
                </Box>

                {isDoubles && (
                  <Box className="partner-rate-band-row" sx={singleFieldRowSx}>
                    <Box sx={opponentRateBandSelectorSx}>
                      <Typography variant="body2" sx={rateBandFieldLabelSx}>
                        パートナー
                      </Typography>
                      {renderRateBandButtons(
                        "相手パートナーのレート帯",
                        values.opponentPartnerRateBand,
                        (option) =>
                          setValues((prev) => ({
                            ...prev,
                            opponentPartnerRateBand: option
                          }))
                      )}
                    </Box>
                  </Box>
                )}

                <Box sx={twoColSx}>
                  <TextField
                    select
                    label="相手キャラ"
                    value={values.opponentCharacter}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        opponentCharacter: event.target.value
                      }))
                    }
                    size="small"
                    required
                    sx={fieldWidthSx.character}
                  >
                    {opponentCharacterOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {isDoubles && (
                    <TextField
                      select
                      label="相手パートナーキャラ"
                      value={values.opponentPartnerCharacter}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          opponentPartnerCharacter: event.target.value
                        }))
                      }
                      size="small"
                      required
                      sx={fieldWidthSx.character}
                    >
                      {opponentPartnerCharacterOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>

                {hasFeverRacket && (
                  <Box sx={twoColSx}>
                    <TextField
                      select
                      label="相手ラケット"
                      value={values.opponentRacket}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          opponentRacket: event.target.value
                        }))
                      }
                      size="small"
                      required
                      sx={fieldWidthSx.racket}
                    >
                      {opponentRacketOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    {isDoubles && (
                      <TextField
                        select
                        label="相手パートナーラケット"
                        value={values.opponentPartnerRacket}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            opponentPartnerRacket: event.target.value
                          }))
                        }
                        size="small"
                        required
                        sx={fieldWidthSx.racket}
                      >
                        {opponentPartnerRacketOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Box>
                )}

                {isPlayerNameRecordingEnabled && (
                  <Box sx={twoColSx}>
                    <TextField
                      label="相手プレイヤー名（任意）"
                      value={values.opponentPlayerName}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          opponentPlayerName: event.target.value
                        }))
                      }
                      placeholder="例: Rival01"
                      size="small"
                      sx={fieldWidthSx.playerName}
                    />
                    {isDoubles && (
                      <TextField
                        label="相手パートナープレイヤー名（任意）"
                        value={values.opponentPartnerPlayerName}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            opponentPartnerPlayerName: event.target.value
                          }))
                        }
                        placeholder="例: Rival02"
                        size="small"
                        sx={fieldWidthSx.playerName}
                      />
                    )}
                  </Box>
                )}
              </Stack>
            </Box>

            <Box sx={sectionSx}>
              <Stack
                spacing={1.5}
                sx={{
                  "& > .partner-rate-band-row": {
                    mt: "2px !important"
                  }
                }}
              >
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  自キャラ・自チーム情報
                </Typography>
                {isDoubles && (
                  <Box className="partner-rate-band-row" sx={singleFieldRowSx}>
                    <Box sx={opponentRateBandSelectorSx}>
                      <Typography variant="body2" sx={rateBandFieldLabelSx}>
                        パートナー
                      </Typography>
                      {renderRateBandButtons("味方パートナーのレート帯", values.myPartnerRateBand, (option) =>
                        setValues((prev) => ({
                          ...prev,
                          myPartnerRateBand: option
                        }))
                      )}
                    </Box>
                  </Box>
                )}
                <Box sx={twoColSx}>
                  <TextField
                    select
                    label="自分キャラ"
                    value={values.myCharacter}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        myCharacter: event.target.value
                      }))
                    }
                    size="small"
                    required
                    sx={fieldWidthSx.character}
                  >
                    {myCharacterOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                  {isDoubles && (
                    <TextField
                      select
                      label="自分側パートナーキャラ"
                      value={values.myPartnerCharacter}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          myPartnerCharacter: event.target.value
                        }))
                      }
                      size="small"
                      required
                      sx={fieldWidthSx.character}
                    >
                      {myPartnerCharacterOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Box>

                {hasFeverRacket && (
                  <Box sx={twoColSx}>
                    <TextField
                      select
                      label="自分ラケット"
                      value={values.myRacket}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          myRacket: event.target.value
                        }))
                      }
                      size="small"
                      required
                      sx={fieldWidthSx.racket}
                    >
                      {myRacketOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    {isDoubles && (
                      <TextField
                        select
                        label="自分側パートナーラケット"
                        value={values.myPartnerRacket}
                        onChange={(event) =>
                          setValues((prev) => ({
                            ...prev,
                            myPartnerRacket: event.target.value
                          }))
                        }
                        size="small"
                        required
                        sx={fieldWidthSx.racket}
                      >
                        {myPartnerRacketOptions.map((option) => (
                          <MenuItem key={option} value={option}>
                            {option}
                          </MenuItem>
                        ))}
                      </TextField>
                    )}
                  </Box>
                )}

                {isDoubles && isPlayerNameRecordingEnabled && (
                  <Box sx={twoColSx}>
                    <Box sx={{ display: { xs: "none", sm: "block" }, ...fieldWidthSx.character }} />
                    <TextField
                      label="自分側パートナー名（任意）"
                      value={values.myPartnerPlayerName}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          myPartnerPlayerName: event.target.value
                        }))
                      }
                      placeholder="例: PartnerA"
                      size="small"
                      sx={fieldWidthSx.playerName}
                    />
                  </Box>
                )}
              </Stack>
            </Box>

            <Box sx={sectionSx}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  試合結果
                </Typography>

                <Box sx={resultGridSx}>
                  <Box sx={scoreSelectorSx}>
                    <Stack spacing={0.75}>
                      <Box sx={scoreSelectorRowSx}>
                        <Typography variant="body2" sx={scoreSelectorLabelSx}>
                          自分スコア
                        </Typography>
                        <Box sx={scoreSelectorButtonRowSx}>
                          {SCORE_SELECTION_OPTIONS.map((score) => (
                            <Button
                              key={`my-score-${score}`}
                              type="button"
                              variant={isMyScoreSelected(score) ? "contained" : "outlined"}
                              onClick={() => handleScoreSelection("my", score)}
                              aria-pressed={isMyScoreSelected(score)}
                              sx={{
                                ...scoreSelectorButtonSx,
                                ...(isMyScoreSelected(score)
                                  ? scoreSelectorButtonSelectedSx
                                  : scoreSelectorButtonUnselectedSx)
                              }}
                            >
                              {score}
                            </Button>
                          ))}
                          {winningScore !== null && selectedScoreOwner === "opponent" && (
                            <Button type="button" tabIndex={-1} aria-hidden sx={scoreWinningBadgeSx}>
                              {winningScore}
                            </Button>
                          )}
                        </Box>
                      </Box>

                      <Box sx={scoreSelectorRowSx}>
                        <Typography variant="body2" sx={scoreSelectorLabelSx}>
                          相手スコア
                        </Typography>
                        <Box sx={scoreSelectorButtonRowSx}>
                          {SCORE_SELECTION_OPTIONS.map((score) => (
                            <Button
                              key={`opponent-score-${score}`}
                              type="button"
                              variant={isOpponentScoreSelected(score) ? "contained" : "outlined"}
                              onClick={() => handleScoreSelection("opponent", score)}
                              aria-pressed={isOpponentScoreSelected(score)}
                              sx={{
                                ...scoreSelectorButtonSx,
                                ...(isOpponentScoreSelected(score)
                                  ? scoreSelectorButtonSelectedSx
                                  : scoreSelectorButtonUnselectedSx)
                              }}
                            >
                              {score}
                            </Button>
                          ))}
                          {winningScore !== null && selectedScoreOwner === "my" && (
                            <Button type="button" tabIndex={-1} aria-hidden sx={scoreWinningBadgeSx}>
                              {winningScore}
                            </Button>
                          )}
                        </Box>
                      </Box>

                    </Stack>
                  </Box>

                  <Box sx={rateControlSx}>
                    <TextField
                      label="レート"
                      type="number"
                      inputMode="numeric"
                      inputProps={{ min: 0, step: 1 }}
                      value={values.myRate}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          myRate: event.target.value
                        }))
                      }
                      placeholder="例: 1540"
                      size="small"
                      required
                      sx={{
                        ...fieldWidthSx.rate,
                        ...numberInputNoSpinnerSx,
                        "& .MuiInputBase-input": {
                          textAlign: "right"
                        }
                      }}
                    />
                    <Box sx={rateStepButtonsSx}>
                      <IconButton
                        size="small"
                        aria-label="レートを5下げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myRate: shiftRateValue(prev.myRate, -5)
                          }))
                        }
                        disabled={!canDecreaseRate}
                        sx={{ width: 28, height: 28, fontSize: "0.8rem", fontWeight: 700, lineHeight: 1 }}
                      >
                        -5
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="レートを1下げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myRate: shiftRateValue(prev.myRate, -1)
                          }))
                        }
                        disabled={!canDecreaseRate}
                        sx={{ width: 28, height: 28, fontSize: "0.8rem", fontWeight: 700, lineHeight: 1 }}
                      >
                        -1
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="レートを1上げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myRate: shiftRateValue(prev.myRate, 1)
                          }))
                        }
                        sx={{ width: 28, height: 28, fontSize: "0.8rem", fontWeight: 700, lineHeight: 1 }}
                      >
                        +1
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="レートを5上げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myRate: shiftRateValue(prev.myRate, 5)
                          }))
                        }
                        sx={{ width: 28, height: 28, fontSize: "0.8rem", fontWeight: 700, lineHeight: 1 }}
                      >
                        +5
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={rateBandControlSx}>
                    <TextField
                      select
                      label="自分のレート帯"
                      value={values.myRateBand}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          myRateBand: event.target.value
                        }))
                      }
                      size="small"
                      required
                      sx={fieldWidthSx.rateBand}
                    >
                      {rateBandSelectOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Box sx={rateBandButtonsSx}>
                      <IconButton
                        size="small"
                        aria-label="自分のレート帯を下げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myRateBand: shiftRateBand(prev.myRateBand, -1)
                          }))
                        }
                        disabled={myRateBandIndex <= 0}
                        sx={{ width: 28, height: 28 }}
                      >
                        <KeyboardArrowDownIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="自分のレート帯を上げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myRateBand: shiftRateBand(prev.myRateBand, 1)
                          }))
                        }
                        disabled={myRateBandIndex >= RATE_BAND_OPTIONS.length - 1}
                        sx={{ width: 28, height: 28 }}
                      >
                        <KeyboardArrowUpIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Stack>
            </Box>

          </Stack>
        </DialogContent>

        <DialogActions
          sx={{
            px: 2.2,
            py: 1.4,
            gap: 1,
            background: "linear-gradient(180deg, #f8fbff 0%, #ffffff 100%)",
            borderTop: "1px solid #d6e1eb"
          }}
        >
          <Button variant="outlined" color="inherit" onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </Button>
          {mode === "create" && (
            <Button
              type="button"
              variant="outlined"
              onClick={handleSaveAndContinue}
              disabled={isSubmitting}
            >
              {isSubmitting ? "保存中..." : "保存して続ける"}
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={isSubmitting || !hasScoreSelection}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default MatchRecordModal;
