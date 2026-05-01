import { Modal } from "./Modal.js";
import type { AppSettings } from "../types/settings.js";
import type { getTranslations } from "../i18n/translations.js";

interface SettingsModalProps {
  settings: AppSettings;
  labels: ReturnType<typeof getTranslations>;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
}

export function SettingsModal({ settings, labels, onChange, onClose }: SettingsModalProps) {
  return (
    <Modal title={labels.settings} closeLabel={labels.close} onClose={onClose}>
      <div className="modal-section">
        <h3>{labels.display}</h3>
        <div className="segmented">
          <button className={settings.theme === "light" ? "selected" : ""} onClick={() => onChange({ ...settings, theme: "light" })}>{labels.themeLight}</button>
          <button className={settings.theme === "dark" ? "selected" : ""} onClick={() => onChange({ ...settings, theme: "dark" })}>{labels.themeDark}</button>
          <button className={settings.theme === "system" ? "selected" : ""} onClick={() => onChange({ ...settings, theme: "system" })}>{labels.themeSystem}</button>
        </div>
      </div>
      <div className="modal-section">
        <h3>{labels.language}</h3>
        <div className="segmented">
          <button className={settings.language === "en" ? "selected" : ""} onClick={() => onChange({ ...settings, language: "en" })}>{labels.english}</button>
          <button className={settings.language === "ko" ? "selected" : ""} onClick={() => onChange({ ...settings, language: "ko" })}>{labels.korean}</button>
        </div>
      </div>
    </Modal>
  );
}
