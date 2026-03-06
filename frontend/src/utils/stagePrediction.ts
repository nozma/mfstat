const STAGE_ROTATION_INTERVAL_MS = 30 * 60 * 1000;

// This anchor is derived from the recorded history and represents a slot that
// consistently matched the inferred shared 30-minute stage rotation.
const STAGE_ROTATION_ANCHOR_TIMESTAMP = Date.parse("2026-02-26T09:00:00.000Z");

const STAGE_ROTATION_CYCLE = [
  "アカデミー ハード",
  "ワンダーコート",
  "アカデミー クレイ",
  "スタジアム グラス",
  "アカデミー ウッド",
  "飛行船コート",
  "スタジアム ハード",
  "アカデミー ブロック",
  "ラケットファクトリー",
  "スタジアム クレイ",
  "アカデミー サンド",
  "フォレストコート",
  "アカデミー グラス",
  "アカデミー カーペット",
  "ワルイージピンボール"
] as const;

const modulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

const toRotationSlotTimestamp = (timestamp: number) =>
  Math.floor(timestamp / STAGE_ROTATION_INTERVAL_MS) * STAGE_ROTATION_INTERVAL_MS;

export const predictStageFromTimestamp = (timestamp: number) => {
  if (!Number.isFinite(timestamp)) {
    return null;
  }

  const slotTimestamp = toRotationSlotTimestamp(timestamp);
  const elapsedSlots = Math.floor(
    (slotTimestamp - STAGE_ROTATION_ANCHOR_TIMESTAMP) / STAGE_ROTATION_INTERVAL_MS
  );
  const cycleIndex = modulo(elapsedSlots, STAGE_ROTATION_CYCLE.length);
  return STAGE_ROTATION_CYCLE[cycleIndex];
};

export const predictStageFromPlayedAt = (playedAt: string) => {
  const timestamp = new Date(playedAt).getTime();
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return predictStageFromTimestamp(timestamp);
};

