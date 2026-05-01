import { AVAILABLE_COLOR_SET } from "../constants/availableColors.js";

export function isValidCssColorInput(value: string): boolean {
  const color = value.trim().toLowerCase();
  if (!color) return false;
  return AVAILABLE_COLOR_SET.has(color) || /^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color);
}
