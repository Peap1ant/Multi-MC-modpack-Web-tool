export const AVAILABLE_COLORS = [
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "black",
  "white",
  "gray",
  "brown"
] as const;

export const AVAILABLE_COLOR_SET = new Set<string>(AVAILABLE_COLORS);
