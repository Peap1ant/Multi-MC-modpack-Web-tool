import { useState } from "react";
import { createPreset } from "../storage/presetStorage.js";
import type { getTranslations } from "../i18n/translations.js";
import type { AlloyFormState } from "../types/form.js";
import type { SavedPreset } from "../types/preset.js";
import { Modal } from "./Modal.js";

interface SaveLoadModalProps {
  labels: ReturnType<typeof getTranslations>;
  form: AlloyFormState;
  presets: SavedPreset[];
  onSavePresets: (presets: SavedPreset[]) => void;
  onLoad: (preset: SavedPreset) => void;
  onClose: () => void;
}

export function SaveLoadModal({ labels, form, presets, onSavePresets, onLoad, onClose }: SaveLoadModalProps) {
  const [presetName, setPresetName] = useState("");
  const [message, setMessage] = useState("");

  function handleSave() {
    const name = presetName.trim();
    if (!name) {
      setMessage(labels.saveNameRequired);
      return;
    }
    const existing = presets.find((preset) => preset.name.toLowerCase() === name.toLowerCase());
    if (existing && !window.confirm(labels.overwriteConfirm)) return;

    const nextPreset = createPreset(name, form);
    const nextPresets = existing
      ? presets.map((preset) => preset.id === existing.id ? { ...nextPreset, id: existing.id, createdAt: existing.createdAt } : preset)
      : [nextPreset, ...presets];
    onSavePresets(nextPresets);
    setPresetName("");
    setMessage(labels.saved);
  }

  function handleDelete(preset: SavedPreset) {
    if (!window.confirm(labels.deleteConfirm)) return;
    onSavePresets(presets.filter((item) => item.id !== preset.id));
    setMessage(labels.deleted);
  }

  return (
    <Modal title={labels.saveLoad} closeLabel={labels.close} onClose={onClose}>
      <div className="modal-section">
        <h3>{labels.savePreset}</h3>
        <div className="save-row">
          <label>
            {labels.presetName}
            <input value={presetName} placeholder={labels.presetNamePlaceholder} onChange={(event) => setPresetName(event.target.value)} />
          </label>
          <button type="button" className="calculate-button" onClick={handleSave}>{labels.save}</button>
        </div>
        {message && <p className="modal-note">{message}</p>}
      </div>

      <div className="modal-section">
        <h3>{labels.loadSection}</h3>
        <div className="preset-list">
          {presets.length === 0 && <p className="empty-state compact">{labels.noPresets}</p>}
          {presets.map((preset) => (
            <div className="preset-row" key={preset.id}>
              <div>
                <strong>{preset.name}</strong>
                <span>{new Date(preset.createdAt).toLocaleString()}</span>
              </div>
              <button type="button" className="secondary-button" onClick={() => onLoad(preset)}>{labels.load}</button>
              <button type="button" className="icon-button danger" onClick={() => handleDelete(preset)}>{labels.delete}</button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
