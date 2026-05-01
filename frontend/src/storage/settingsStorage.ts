import { STORAGE_KEYS } from "./storageKeys.js";
import type { AppSettings } from "../types/settings.js";

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  language: "en"
};

export function loadSettings(): AppSettings {
  const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      theme: parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "system" ? parsed.theme : DEFAULT_SETTINGS.theme,
      language: parsed.language === "ko" || parsed.language === "en" ? parsed.language : DEFAULT_SETTINGS.language
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}
