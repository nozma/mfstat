type SeasonPoint = {
  id: number;
  timestamp: number;
  season: string;
};

export type SeasonBand = {
  season: string;
  startTimestamp: number;
  endTimestamp: number;
  labelTimestamp: number;
  fillColor: string;
};

const pad2 = (value: number) => value.toString().padStart(2, "0");
const HOUR_MS = 60 * 60 * 1000;

const SEASON_BAND_COLORS: string[] = [
  "rgba(230, 239, 247, 0.28)",
  "rgba(244, 237, 228, 0.3)",
  "rgba(234, 243, 236, 0.28)",
  "rgba(242, 236, 246, 0.28)",
  "rgba(236, 243, 246, 0.3)",
  "rgba(246, 239, 234, 0.3)"
];

const parseSeasonParts = (season: string) => {
  const match = season.trim().match(/^(\d{4})\/(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (Number.isNaN(year) || Number.isNaN(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
};

const getSeasonStartTimestamp = (season: string) => {
  const parts = parseSeasonParts(season);
  if (!parts) {
    return null;
  }

  // Season changes at 09:00 JST, which is 00:00 UTC on the same date.
  return Date.UTC(parts.year, parts.month - 1, 1, 0, 0, 0, 0);
};

const addSeasonMonth = (season: string, offset: number) => {
  const parts = parseSeasonParts(season);
  if (!parts) {
    return null;
  }

  const baseMonthIndex = parts.year * 12 + (parts.month - 1) + offset;
  const year = Math.floor(baseMonthIndex / 12);
  const month = (baseMonthIndex % 12) + 1;
  return `${year}/${pad2(month)}`;
};

const buildSeasonRange = (startSeason: string, endSeason: string) => {
  const start = parseSeasonParts(startSeason);
  const end = parseSeasonParts(endSeason);
  if (!start || !end) {
    return [];
  }

  const startIndex = start.year * 12 + (start.month - 1);
  const endIndex = end.year * 12 + (end.month - 1);
  if (endIndex < startIndex) {
    return [];
  }

  const seasons: string[] = [];
  for (let index = startIndex; index <= endIndex; index += 1) {
    const year = Math.floor(index / 12);
    const month = (index % 12) + 1;
    seasons.push(`${year}/${pad2(month)}`);
  }
  return seasons;
};

const buildSeasonBandsFromRange = (
  points: SeasonPoint[],
  getBoundaryTimestamps: (season: string) => { startTimestamp: number | null; endTimestamp: number | null }
) => {
  const sortedPoints = [...points]
    .filter((point) => point.timestamp > 0 && point.season.trim().length > 0)
    .sort((left, right) => {
      const timestampDiff = left.timestamp - right.timestamp;
      if (timestampDiff !== 0) {
        return timestampDiff;
      }
      return left.id - right.id;
    });

  if (sortedPoints.length === 0) {
    return [];
  }

  const minTimestamp = sortedPoints[0].timestamp;
  const maxTimestamp = sortedPoints[sortedPoints.length - 1].timestamp;
  const seasonRange = buildSeasonRange(sortedPoints[0].season, sortedPoints[sortedPoints.length - 1].season);

  return seasonRange
    .map((season, index) => {
      const nextSeason = addSeasonMonth(season, 1);
      if (!nextSeason) {
        return null;
      }

      const { startTimestamp, endTimestamp } = getBoundaryTimestamps(season);
      if (startTimestamp === null || endTimestamp === null) {
        return null;
      }

      const clippedStartTimestamp = Math.max(startTimestamp, minTimestamp);
      const clippedEndTimestamp = Math.min(endTimestamp, maxTimestamp);
      if (clippedEndTimestamp <= clippedStartTimestamp) {
        return null;
      }

      return {
        season,
        startTimestamp: clippedStartTimestamp,
        endTimestamp: clippedEndTimestamp,
        labelTimestamp: clippedStartTimestamp + (clippedEndTimestamp - clippedStartTimestamp) / 2,
        fillColor: SEASON_BAND_COLORS[index % SEASON_BAND_COLORS.length]
      };
    })
    .filter((band): band is SeasonBand => band !== null);
};

export const buildSeasonBands = (points: SeasonPoint[]) =>
  buildSeasonBandsFromRange(points, (season) => {
    const nextSeason = addSeasonMonth(season, 1);
    return {
      startTimestamp: getSeasonStartTimestamp(season),
      endTimestamp: nextSeason ? getSeasonStartTimestamp(nextSeason) : null
    };
  });

export const buildDailyAggregatedSeasonBands = (points: SeasonPoint[]) =>
  buildSeasonBandsFromRange(points, (season) => {
    const nextSeason = addSeasonMonth(season, 1);
    const seasonBoundary = getSeasonStartTimestamp(season);
    const nextSeasonBoundary = nextSeason ? getSeasonStartTimestamp(nextSeason) : null;

    return {
      startTimestamp: seasonBoundary === null ? null : seasonBoundary - 21 * HOUR_MS,
      endTimestamp: nextSeasonBoundary === null ? null : nextSeasonBoundary - 21 * HOUR_MS
    };
  });
