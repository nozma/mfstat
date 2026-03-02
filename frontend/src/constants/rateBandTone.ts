const getRateBandTier = (rateBand: string) => rateBand.trim().charAt(0).toUpperCase();

const blendHexWithWhite = (hex: string, ratio: number) => {
  const normalized = hex.replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * ratio)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(red)}${mix(green)}${mix(blue)}`;
};

export const getRateBandChipToneSx = (rateBand: string) => {
  const tier = getRateBandTier(rateBand);

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

export const getRateBandButtonToneSx = (rateBand: string, isSelected: boolean) => {
  const tone = getRateBandChipToneSx(rateBand);

  if (isSelected) {
    return {
      backgroundColor: tone.backgroundColor,
      borderColor: tone.color,
      color: tone.color,
      boxShadow: `inset 0 0 0 1px ${tone.color}, 0 2px 6px rgba(32, 62, 84, 0.12)`,
      "&:hover": {
        backgroundColor: tone.backgroundColor,
        borderColor: tone.color,
        boxShadow: `inset 0 0 0 1px ${tone.color}, 0 3px 8px rgba(32, 62, 84, 0.16)`
      }
    } as const;
  }

  return {
    backgroundColor: blendHexWithWhite(tone.backgroundColor, 0.64),
    borderColor: blendHexWithWhite(tone.borderColor, 0.52),
    color: blendHexWithWhite(tone.color, 0.28),
    "&:hover": {
      backgroundColor: blendHexWithWhite(tone.backgroundColor, 0.48),
      borderColor: blendHexWithWhite(tone.borderColor, 0.26),
      color: blendHexWithWhite(tone.color, 0.1)
    }
  } as const;
};
