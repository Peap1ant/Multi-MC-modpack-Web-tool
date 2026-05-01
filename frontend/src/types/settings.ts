export type ThemePreference = "light" | "dark" | "system";
export type Language = "en" | "ko";

export interface AppSettings {
  theme: ThemePreference;
  language: Language;
}
