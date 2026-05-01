import { APP_INFO } from "../constants/appInfo.js";
import { STORAGE_KEYS } from "./storageKeys.js";
import type { AlloyFormState } from "../types/form.js";
import type { SavedPreset } from "../types/preset.js";

export function loadPresets(): SavedPreset[] {
  const raw = localStorage.getItem(STORAGE_KEYS.PRESETS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSavedPreset);
  } catch {
    return [];
  }
}

export function savePresets(presets: SavedPreset[]): void {
  localStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
}

export function createPreset(name: string, form: AlloyFormState): SavedPreset {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    createdAt: new Date().toISOString(),
    version: APP_INFO.version,
    data: {
      materials: form.rows.map((row) => ({
        name: row.name,
        color: row.color,
        minRatio: row.minRatio,
        maxRatio: row.maxRatio
      })),
      targetAlloyName: form.alloyName,
      ingotPerName: form.mbPerIngot
    }
  };
}

export function applyPresetToForm(preset: SavedPreset, current: AlloyFormState): AlloyFormState {
  return {
    ...current,
    rows: preset.data.materials.length
      ? preset.data.materials.map((material, index) => ({
        rowId: index + 1,
        name: String(material.name ?? ""),
        owned: "",
        mbPerItem: "",
        minRatio: String(material.minRatio ?? ""),
        maxRatio: String(material.maxRatio ?? ""),
        color: String(material.color ?? "")
      }))
      : current.rows,
    alloyName: preset.data.targetAlloyName,
    mbPerIngot: String(preset.data.ingotPerName ?? ""),
    targetIngots: "",
    crucibleCapacity: ""
  };
}

function isSavedPreset(value: unknown): value is SavedPreset {
  if (!value || typeof value !== "object") return false;
  const preset = value as SavedPreset;
  return typeof preset.id === "string" &&
    typeof preset.name === "string" &&
    typeof preset.createdAt === "string" &&
    typeof preset.version === "string" &&
    !!preset.data &&
    Array.isArray(preset.data.materials) &&
    typeof preset.data.targetAlloyName === "string";
}
