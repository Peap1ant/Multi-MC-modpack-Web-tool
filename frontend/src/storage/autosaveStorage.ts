import { STORAGE_KEYS } from "./storageKeys.js";
import type { AlloyFormState, MaterialFormRow } from "../types/form.js";

export const EMPTY_FORM_STATE: AlloyFormState = {
  rows: [{ rowId: 1, name: "", owned: "", mbPerItem: "", minRatio: "", maxRatio: "", color: "" }],
  alloyName: "",
  targetIngots: "",
  mbPerIngot: "",
  mode: "Vessel",
  crucibleCapacity: ""
};

export function loadAutosave(): AlloyFormState | null {
  const raw = localStorage.getItem(STORAGE_KEYS.AUTOSAVE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AlloyFormState>;
    const rows = Array.isArray(parsed.rows) ? parsed.rows.map(normalizeRow).filter(Boolean) as MaterialFormRow[] : [];
    if (!rows.length) return null;
    return {
      rows,
      alloyName: String(parsed.alloyName ?? ""),
      targetIngots: String(parsed.targetIngots ?? ""),
      mbPerIngot: String(parsed.mbPerIngot ?? ""),
      mode: parsed.mode === "Crucible" ? "Crucible" : "Vessel",
      crucibleCapacity: String(parsed.crucibleCapacity ?? "")
    };
  } catch {
    return null;
  }
}

export function saveAutosave(form: AlloyFormState): void {
  localStorage.setItem(STORAGE_KEYS.AUTOSAVE, JSON.stringify(form));
}

function normalizeRow(row: unknown, index: number): MaterialFormRow | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Partial<MaterialFormRow>;
  return {
    rowId: typeof value.rowId === "number" && Number.isInteger(value.rowId) ? value.rowId : index + 1,
    name: String(value.name ?? ""),
    owned: String(value.owned ?? ""),
    mbPerItem: String(value.mbPerItem ?? ""),
    minRatio: String(value.minRatio ?? ""),
    maxRatio: String(value.maxRatio ?? ""),
    color: String(value.color ?? "")
  };
}
