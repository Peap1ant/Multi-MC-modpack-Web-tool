import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CalculationRequest, CalculationResult, MaterialRowData } from "@tfc-alloy/shared";
import { Header } from "./components/Header.js";
import { InfoModal } from "./components/InfoModal.js";
import { PieChartResult } from "./components/PieChartResult.js";
import { SaveLoadModal } from "./components/SaveLoadModal.js";
import { SettingsModal } from "./components/SettingsModal.js";
import { getTranslations } from "./i18n/translations.js";
import { calculateAlloy } from "./services/calculate.js";
import { EMPTY_FORM_STATE, loadAutosave, saveAutosave } from "./storage/autosaveStorage.js";
import { applyPresetToForm, loadPresets, savePresets } from "./storage/presetStorage.js";
import { loadSettings, saveSettings } from "./storage/settingsStorage.js";
import type { AlloyFormState, MaterialFormRow } from "./types/form.js";
import type { SavedPreset } from "./types/preset.js";
import type { AppSettings } from "./types/settings.js";
import { isValidCssColorInput } from "./utils/validation.js";

type ActiveModal = "settings" | "info" | "saveLoad" | null;

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [form, setForm] = useState<AlloyFormState>(() => loadAutosave() ?? EMPTY_FORM_STATE);
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets());
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uiElapsedMs, setUiElapsedMs] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const labels = useMemo(() => getTranslations(settings.language), [settings.language]);

  const ratioIgnored = useMemo(
    () => new Set(form.rows.map((row) => row.name.trim()).filter(Boolean)).size < 2,
    [form.rows]
  );

  useEffect(() => {
    saveSettings(settings);
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.lang = settings.language;
  }, [settings]);

  useEffect(() => {
    saveAutosave(form);
  }, [form]);

  function updateForm(patch: Partial<AlloyFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function updateRow(rowId: number, patch: Partial<MaterialFormRow>) {
    setForm((current) => ({
      ...current,
      rows: current.rows.map((row) => row.rowId === rowId ? { ...row, ...patch } : row)
    }));
  }

  function addRow() {
    setForm((current) => {
      const nextId = Math.max(0, ...current.rows.map((row) => row.rowId)) + 1;
      return {
        ...current,
        rows: [...current.rows, { rowId: nextId, name: "", owned: "", mbPerItem: "", minRatio: "", maxRatio: "", color: "" }]
      };
    });
  }

  function removeRow(rowId: number) {
    setForm((current) => ({
      ...current,
      rows: current.rows.length <= 1 ? current.rows : current.rows.filter((row) => row.rowId !== rowId)
    }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setStatusMessage("");
    setResult(null);
    setUiElapsedMs(null);
    try {
      const badColor = form.rows.find((row) => row.color.trim() && !isValidCssColorInput(row.color));
      if (badColor) throw new Error(`${badColor.name || labels.color}: ${labels.colorInvalid}`);

      const request: CalculationRequest = {
        rows: form.rows.map(toMaterialRow),
        alloyName: form.alloyName,
        targetIngots: Number(form.targetIngots),
        mbPerIngot: Number(form.mbPerIngot),
        mode: form.mode,
        crucibleCapacity: form.mode === "Crucible" ? Number(form.crucibleCapacity) : undefined
      };
      const response = await calculateAlloy(request);
      setResult(response.result);
      setUiElapsedMs(response.uiElapsedMs);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : labels.unknownError);
    } finally {
      setLoading(false);
    }
  }

  function handlePresetSave(nextPresets: SavedPreset[]) {
    setPresets(nextPresets);
    savePresets(nextPresets);
  }

  function handlePresetLoad(preset: SavedPreset) {
    setForm((current) => applyPresetToForm(preset, current));
    setResult(null);
    setError("");
    setStatusMessage(labels.loaded);
    setActiveModal(null);
  }

  return (
    <>
      <Header
        settingsLabel={labels.settings}
        infoLabel={labels.info}
        onOpenSettings={() => setActiveModal("settings")}
        onOpenInfo={() => setActiveModal("info")}
      />

      <main className="app-shell">
        <section className="workspace">
          <div className="topbar">
            <div>
              <h1>{labels.appTitle}</h1>
              <p>{labels.appSubtitle}</p>
            </div>
            <button type="button" className="secondary-button" onClick={addRow}>{labels.addMaterial}</button>
          </div>

          <form onSubmit={handleSubmit} className="calculator-grid">
            <section className="panel materials-panel">
              <div className="panel-heading">
                <h2>{labels.materialInput}</h2>
                {ratioIgnored && <span className="hint">{labels.singleMaterial}</span>}
              </div>
              <div className="material-table" role="table">
                <div className="material-header" role="row">
                  <span>{labels.name}</span>
                  <span>{labels.owned}</span>
                  <span>{labels.mbPerItem}</span>
                  <span>{labels.minRatio}</span>
                  <span>{labels.maxRatio}</span>
                  <span>{labels.color}</span>
                  <span></span>
                </div>
                {form.rows.map((row) => (
                  <div className="material-row" role="row" key={row.rowId}>
                    <input value={row.name} onChange={(event) => updateRow(row.rowId, { name: event.target.value })} placeholder={labels.placeholders.materialName} />
                    <input inputMode="numeric" value={row.owned} onChange={(event) => updateRow(row.rowId, { owned: event.target.value })} placeholder={labels.placeholders.owned} />
                    <input inputMode="numeric" value={row.mbPerItem} onChange={(event) => updateRow(row.rowId, { mbPerItem: event.target.value })} placeholder={labels.placeholders.mbPerItem} />
                    <input inputMode="decimal" value={row.minRatio} disabled={ratioIgnored} onChange={(event) => updateRow(row.rowId, { minRatio: event.target.value })} placeholder={labels.placeholders.minRatio} />
                    <input inputMode="decimal" value={row.maxRatio} disabled={ratioIgnored} onChange={(event) => updateRow(row.rowId, { maxRatio: event.target.value })} placeholder={labels.placeholders.maxRatio} />
                    <input value={row.color} title={labels.colorHelp} aria-label={`${labels.color}. ${labels.colorHelp}`} onChange={(event) => updateRow(row.rowId, { color: event.target.value })} placeholder={labels.placeholders.color} />
                    <button type="button" aria-label={labels.removeMaterial} className="icon-button danger" onClick={() => removeRow(row.rowId)}>×</button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel target-panel">
              <h2>{labels.alloyTarget}</h2>
              <div className="target-grid">
                <label>{labels.alloyTargetName}<input value={form.alloyName} placeholder={labels.placeholders.alloyName} onChange={(event) => updateForm({ alloyName: event.target.value })} /></label>
                <label>{labels.targetCraftCount}<input inputMode="numeric" value={form.targetIngots} placeholder={labels.placeholders.targetIngots} onChange={(event) => updateForm({ targetIngots: event.target.value })} /></label>
                <label>{labels.mbPerIngot}<input inputMode="numeric" value={form.mbPerIngot} placeholder={labels.placeholders.mbPerIngot} onChange={(event) => updateForm({ mbPerIngot: event.target.value })} /></label>
                <label>{labels.crucibleMaxMb}<input inputMode="numeric" disabled={form.mode === "Vessel"} value={form.crucibleCapacity} placeholder={labels.placeholders.crucibleCapacity} onChange={(event) => updateForm({ crucibleCapacity: event.target.value })} /></label>
              </div>
              <div className="action-row">
                <div className="mode-row" role="radiogroup" aria-label={labels.calculationMode}>
                  <button type="button" className={form.mode === "Vessel" ? "selected" : ""} onClick={() => updateForm({ mode: "Vessel" })}>{labels.vessel}</button>
                  <button type="button" className={form.mode === "Crucible" ? "selected" : ""} onClick={() => updateForm({ mode: "Crucible" })}>{labels.crucible}</button>
                </div>
                <button className="calculate-button" disabled={loading}>{loading ? labels.calculating : labels.calculate}</button>
                <button type="button" className="secondary-button" onClick={() => setActiveModal("saveLoad")}>{labels.saveLoad}</button>
              </div>
            </section>
          </form>
        </section>

        <aside className="result-panel">
          <h2>{labels.result}</h2>
          {error && <div className={result ? "empty-state" : "error-box"}>{error}</div>}
          {statusMessage && !error && <div className="empty-state">{statusMessage}</div>}
          {!error && !statusMessage && !result && <div className="empty-state">{labels.emptyState}</div>}
          {result && <ResultView result={result} rows={form.rows} uiElapsedMs={uiElapsedMs} labels={labels} />}
        </aside>
      </main>

      {activeModal === "settings" && <SettingsModal settings={settings} labels={labels} onChange={setSettings} onClose={() => setActiveModal(null)} />}
      {activeModal === "info" && <InfoModal labels={labels} onClose={() => setActiveModal(null)} />}
      {activeModal === "saveLoad" && (
        <SaveLoadModal
          labels={labels}
          form={form}
          presets={presets}
          onSavePresets={handlePresetSave}
          onLoad={handlePresetLoad}
          onClose={() => setActiveModal(null)}
        />
      )}
    </>
  );
}

function ResultView({
  result,
  rows,
  uiElapsedMs,
  labels
}: {
  result: CalculationResult;
  rows: MaterialFormRow[];
  uiElapsedMs: number | null;
  labels: ReturnType<typeof getTranslations>;
}) {
  const rowLookup = new Map(rows.map((row) => [row.rowId, row]));
  const materialEntries = Object.entries(result.materialMbs).filter(([, mb]) => mb > 0);

  if (!result.possible) {
    return <div className="error-box">{labels.noSolution} {labels.coreTime}: {result.elapsedMs.toFixed(3)} ms</div>;
  }

  return (
    <div className="result-stack">
      <div className="metric-grid">
        <Metric label={labels.craftable} value={labels.yes} />
        <Metric label={labels.actualIngots} value={result.actualIngots} />
        <Metric label={labels.totalMb} value={result.totalMb} />
        <Metric label={labels.leftoverMb} value={result.leftoverMb} />
        <Metric label={labels.coreTime} value={`${result.elapsedMs.toFixed(3)} ms`} />
        <Metric label={labels.uiTime} value={uiElapsedMs === null ? "-" : `${uiElapsedMs.toFixed(3)} ms`} />
      </div>

      <PieChartResult result={result} labels={labels} />

      <section>
        <h3>{labels.materialRatio}</h3>
        <div className="ratio-list">
          {materialEntries.map(([material, mb]) => (
            <div className="ratio-row" key={material}>
              <span className="swatch" style={{ background: result.colors[material] ?? "#64748b" }}></span>
              <strong>{material}</strong>
              <span>{mb} mB</span>
              <span>{(result.materialRatios[material] ?? 0).toFixed(4)}%</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>{labels.itemsToUse}</h3>
        <div className="use-list">
          {Object.entries(result.rowCounts).map(([rowId, count]) => {
            const source = rowLookup.get(Number(rowId));
            return (
              <div className="use-row" key={rowId}>
                <span>{source?.name ?? `${labels.row} ${rowId}`}</span>
                <span>{labels.row} {rowId}</span>
                <strong>{count} {labels.items}</strong>
                <span>{source?.mbPerItem ?? "-"} {labels.mbPerItem}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h3>{labels.constraints}</h3>
        <ul className="notes">
          {result.constraintNotes.map((note) => <li key={note}>{note}</li>)}
        </ul>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function toMaterialRow(row: MaterialFormRow): MaterialRowData {
  return {
    rowId: row.rowId,
    name: row.name.trim(),
    owned: Number(row.owned),
    mbPerItem: Number(row.mbPerItem),
    minRatio: Number(row.minRatio),
    maxRatio: Number(row.maxRatio),
    color: row.color.trim()
  };
}
