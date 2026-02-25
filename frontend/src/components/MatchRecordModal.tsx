import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import RemoveIcon from "@mui/icons-material/Remove";
import {
  CHARACTER_OPTIONS,
  RATE_BAND_OPTIONS,
  RACKET_OPTIONS,
  RULE_OPTIONS,
  RuleOption,
  SCORE_OPTIONS,
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
  opponentRateBand: string;
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

const defaultValues: MatchRecordValues = {
  playedAt: "",
  rule: RULE_OPTIONS[0].value,
  stage: STAGE_OPTIONS[0],
  myScore: "3",
  opponentScore: "3",
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
  opponentRateBand: RATE_BAND_OPTIONS[0],
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

const shiftScore = (current: string, direction: -1 | 1) => {
  const currentIndex = SCORE_OPTIONS.indexOf(current);
  const safeIndex = currentIndex === -1 ? 3 : currentIndex;
  const nextIndex = Math.min(SCORE_OPTIONS.length - 1, Math.max(0, safeIndex + direction));
  return SCORE_OPTIONS[nextIndex];
};

const sectionSx = {
  p: 2,
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

const fieldWidthSx = {
  datetime: { width: { xs: "100%", sm: 220 } },
  rule: { width: { xs: "100%", sm: 300 } },
  stage: { width: { xs: "100%", sm: 300 } },
  score: { width: { xs: "100%", sm: 132 } },
  character: { width: { xs: "100%", sm: 220 } },
  racket: { width: { xs: "100%", sm: 220 } },
  rate: { width: { xs: "100%", sm: 150 } },
  rateBand: { width: { xs: "100%", sm: 127 } },
  playerName: { width: { xs: "100%", sm: 220 } }
} as const;

const rateBandControlSx = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  width: { xs: "100%", sm: 189 },
  gap: 0.5
} as const;

const rateBandButtonsSx = {
  display: "flex",
  alignItems: "center",
  gap: 0.25
} as const;

const scoreControlSx = {
  display: "flex",
  alignItems: "flex-end",
  gap: 0.5
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
  const opponentRateBandIndex = RATE_BAND_OPTIONS.indexOf(values.opponentRateBand);
  const myScoreIndex = SCORE_OPTIONS.indexOf(values.myScore);
  const opponentScoreIndex = SCORE_OPTIONS.indexOf(values.opponentScore);

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
      normalizedValues.myPartnerPlayerName = "";
      normalizedValues.opponentPartnerPlayerName = "";
    }

    if (!hasFeverRacket) {
      normalizedValues.myRacket = "";
      normalizedValues.opponentRacket = "";
      normalizedValues.myPartnerRacket = "";
      normalizedValues.opponentPartnerRacket = "";
    }

    return normalizedValues;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    void onSubmit(buildNormalizedValues());
  };

  const handleSaveAndContinue = () => {
    if (isSubmitting || mode !== "create") {
      return;
    }
    void onSubmit(buildNormalizedValues(), { keepOpenAfterSave: true });
  };

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
        <Stack spacing={0.2}>
          <Typography component="div" variant="h6" fontWeight={700}>
            {modalTitle}
          </Typography>
          <Typography component="div" variant="body2" color="text.secondary">
            試合情報を入力して保存します。
          </Typography>
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
            borderBottomColor: "#d6e1eb"
          }}
        >
          <Stack spacing={2}>
            <Box sx={sectionSx}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  基本情報
                </Typography>
                <Box sx={twoColSx}>
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
                    sx={fieldWidthSx.datetime}
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
                    sx={fieldWidthSx.rule}
                  >
                    {RULE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={singleFieldRowSx}>
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
                    sx={fieldWidthSx.stage}
                  >
                    {stageOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                <Box sx={twoColSx}>
                  <Box sx={scoreControlSx}>
                    <TextField
                      select
                      label="スコア（自分）"
                      value={values.myScore}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          myScore: event.target.value
                        }))
                      }
                      size="small"
                      required
                      sx={fieldWidthSx.score}
                    >
                      {SCORE_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Box sx={rateBandButtonsSx}>
                      <IconButton
                        size="small"
                        aria-label="自分スコアを下げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myScore: shiftScore(prev.myScore, -1)
                          }))
                        }
                        disabled={myScoreIndex <= 0}
                        sx={{ width: 28, height: 28 }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="自分スコアを上げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            myScore: shiftScore(prev.myScore, 1)
                          }))
                        }
                        disabled={myScoreIndex >= SCORE_OPTIONS.length - 1}
                        sx={{ width: 28, height: 28 }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={scoreControlSx}>
                    <TextField
                      select
                      label="スコア（相手）"
                      value={values.opponentScore}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          opponentScore: event.target.value
                        }))
                      }
                      size="small"
                      required
                      sx={fieldWidthSx.score}
                    >
                      {SCORE_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </TextField>
                    <Box sx={rateBandButtonsSx}>
                      <IconButton
                        size="small"
                        aria-label="相手スコアを下げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            opponentScore: shiftScore(prev.opponentScore, -1)
                          }))
                        }
                        disabled={opponentScoreIndex <= 0}
                        sx={{ width: 28, height: 28 }}
                      >
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="相手スコアを上げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            opponentScore: shiftScore(prev.opponentScore, 1)
                          }))
                        }
                        disabled={opponentScoreIndex >= SCORE_OPTIONS.length - 1}
                        sx={{ width: 28, height: 28 }}
                      >
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Box sx={sectionSx}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  使用キャラ
                </Typography>
                <Box sx={twoColSx}>
                  <TextField
                    select
                    label="自分"
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

                  <TextField
                    select
                    label="相手"
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
                </Box>

                {isDoubles && (
                  <Box sx={twoColSx}>
                    <TextField
                      select
                      label="自分側パートナー"
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

                    <TextField
                      select
                      label="相手側パートナー"
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
                  </Box>
                )}
              </Stack>
            </Box>

            {hasFeverRacket && (
              <Box sx={sectionSx}>
                <Stack spacing={1.5}>
                  <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                    使用ラケット
                  </Typography>

                  <Box sx={twoColSx}>
                    <TextField
                      select
                      label="自分"
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

                    <TextField
                      select
                      label="相手"
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
                  </Box>

                  {isDoubles && (
                    <Box sx={twoColSx}>
                      <TextField
                        select
                        label="自分側パートナー"
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

                      <TextField
                        select
                        label="相手側パートナー"
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
                    </Box>
                  )}
                </Stack>
              </Box>
            )}

            <Box sx={sectionSx}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  レート情報
                </Typography>

                <Box sx={threeColSx}>
                  <TextField
                    label="自分のレート"
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
                    sx={fieldWidthSx.rate}
                  />

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
                    </Box>
                  </Box>

                  <Box sx={rateBandControlSx}>
                    <TextField
                      select
                      label="相手のレート帯"
                      value={values.opponentRateBand}
                      onChange={(event) =>
                        setValues((prev) => ({
                          ...prev,
                          opponentRateBand: event.target.value
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
                        aria-label="相手のレート帯を上げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            opponentRateBand: shiftRateBand(prev.opponentRateBand, 1)
                          }))
                        }
                        disabled={opponentRateBandIndex >= RATE_BAND_OPTIONS.length - 1}
                        sx={{ width: 28, height: 28 }}
                      >
                        <KeyboardArrowUpIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="相手のレート帯を下げる"
                        onClick={() =>
                          setValues((prev) => ({
                            ...prev,
                            opponentRateBand: shiftRateBand(prev.opponentRateBand, -1)
                          }))
                        }
                        disabled={opponentRateBandIndex <= 0}
                        sx={{ width: 28, height: 28 }}
                      >
                        <KeyboardArrowDownIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Stack>
            </Box>

            <Box sx={sectionSx}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} sx={sectionTitleSx}>
                  プレイヤー名（任意）
                </Typography>

                <Box sx={singleFieldRowSx}>
                  <TextField
                    label="相手プレイヤー名"
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
                </Box>

                {isDoubles && (
                  <Box sx={twoColSx}>
                    <TextField
                      label="自分側パートナー名"
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

                    <TextField
                      label="相手側パートナー名"
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
                  </Box>
                )}
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
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

export default MatchRecordModal;
