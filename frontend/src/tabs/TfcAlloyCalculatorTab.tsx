import type { FormEvent } from "react";
import type { CalculationResult } from "@tfc-alloy/shared";
import { PieChartResult } from "../components/PieChartResult.js";
import type { getTranslations } from "../i18n/translations.js";
import type { AlloyFormState, MaterialFormRow } from "../types/form.js";

interface TfcAlloyCalculatorTabProps {
  labels: ReturnType<typeof getTranslations>;
  form: AlloyFormState;
  result: CalculationResult | null;
  error: string;
  statusMessage: string;
  loading: boolean;
  uiElapsedMs: number | null;
  ratioIgnored: boolean;
  onSubmit: (event: FormEvent) => void;
  onAddRow: () => void;
  onRemoveRow: (rowId: number) => void;
  onUpdateForm: (patch: Partial<AlloyFormState>) => void;
  onUpdateRow: (rowId: number, patch: Partial<MaterialFormRow>) => void;
  onOpenSaveLoad: () => void;
}

export function TfcAlloyCalculatorTab({
  labels,
  form,
  result,
  error,
  statusMessage,
  loading,
  uiElapsedMs,
  ratioIgnored,
  onSubmit,
  onAddRow,
  onRemoveRow,
  onUpdateForm,
  onUpdateRow,
  onOpenSaveLoad
}: TfcAlloyCalculatorTabProps) {
  return (
    <main className="app-shell">
      <section className="workspace">
        <div className="topbar">
          <div>
            <h1>{labels.menuItems.tabs.tfcAlloy}</h1>
            <p>{labels.calculatorDescription}</p>
          </div>
          <button type="button" className="secondary-button" onClick={onAddRow}>{labels.addMaterial}</button>
        </div>

        <form onSubmit={onSubmit} className="calculator-grid">
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
                  <input value={row.name} onChange={(event) => onUpdateRow(row.rowId, { name: event.target.value })} placeholder={labels.placeholders.materialName} />
                  <input inputMode="numeric" value={row.owned} onChange={(event) => onUpdateRow(row.rowId, { owned: event.target.value })} placeholder={labels.placeholders.owned} />
                  <input inputMode="numeric" value={row.mbPerItem} onChange={(event) => onUpdateRow(row.rowId, { mbPerItem: event.target.value })} placeholder={labels.placeholders.mbPerItem} />
                  <input inputMode="decimal" value={row.minRatio} disabled={ratioIgnored} onChange={(event) => onUpdateRow(row.rowId, { minRatio: event.target.value })} placeholder={labels.placeholders.minRatio} />
                  <input inputMode="decimal" value={row.maxRatio} disabled={ratioIgnored} onChange={(event) => onUpdateRow(row.rowId, { maxRatio: event.target.value })} placeholder={labels.placeholders.maxRatio} />
                  <input value={row.color} title={labels.colorHelp} aria-label={`${labels.color}. ${labels.colorHelp}`} onChange={(event) => onUpdateRow(row.rowId, { color: event.target.value })} placeholder={labels.placeholders.color} />
                  <button type="button" aria-label={labels.removeMaterial} className="icon-button danger" onClick={() => onRemoveRow(row.rowId)}>x</button>
                </div>
              ))}
            </div>
          </section>

          <section className="panel target-panel">
            <h2>{labels.alloyTarget}</h2>
            <div className="target-grid">
              <label>{labels.alloyTargetName}<input value={form.alloyName} placeholder={labels.placeholders.alloyName} onChange={(event) => onUpdateForm({ alloyName: event.target.value })} /></label>
              <label>{labels.targetCraftCount}<input inputMode="numeric" value={form.targetIngots} placeholder={labels.placeholders.targetIngots} onChange={(event) => onUpdateForm({ targetIngots: event.target.value })} /></label>
              <label>{labels.mbPerIngot}<input inputMode="numeric" value={form.mbPerIngot} placeholder={labels.placeholders.mbPerIngot} onChange={(event) => onUpdateForm({ mbPerIngot: event.target.value })} /></label>
              <label>{labels.crucibleMaxMb}<input inputMode="numeric" disabled={form.mode === "Vessel"} value={form.crucibleCapacity} placeholder={labels.placeholders.crucibleCapacity} onChange={(event) => onUpdateForm({ crucibleCapacity: event.target.value })} /></label>
            </div>
            <div className="action-row">
              <div className="mode-row" role="radiogroup" aria-label={labels.calculationMode}>
                <button type="button" className={form.mode === "Vessel" ? "selected" : ""} onClick={() => onUpdateForm({ mode: "Vessel" })}>{labels.vessel}</button>
                <button type="button" className={form.mode === "Crucible" ? "selected" : ""} onClick={() => onUpdateForm({ mode: "Crucible" })}>{labels.crucible}</button>
              </div>
              <button className="calculate-button" disabled={loading}>{loading ? labels.calculating : labels.calculate}</button>
              <button type="button" className="secondary-button" onClick={onOpenSaveLoad}>{labels.saveLoad}</button>
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
