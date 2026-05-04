import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CalculationRequest, CalculationResult, MaterialRowData } from "@tfc-alloy/shared";
import { Header } from "./components/Header.js";
import { InfoModal } from "./components/InfoModal.js";
import { SaveLoadModal } from "./components/SaveLoadModal.js";
import { SettingsModal } from "./components/SettingsModal.js";
import { APP_MENU_ITEMS, DEFAULT_APP_TAB_ID, TAB_IDS, type AppTabId } from "./constants/tabs.js";
import { getTranslations } from "./i18n/translations.js";
import { calculateAlloy } from "./services/calculate.js";
import { EMPTY_FORM_STATE, loadAutosave, saveAutosave } from "./storage/autosaveStorage.js";
import { applyPresetToForm, loadPresets, savePresets } from "./storage/presetStorage.js";
import { loadSettings, saveSettings } from "./storage/settingsStorage.js";
import { AutomationCalculatorTab } from "./tabs/AutomationCalculatorTab.js";
import { HomeTab } from "./tabs/HomeTab.js";
import { TfcAlloyCalculatorTab } from "./tabs/TfcAlloyCalculatorTab.js";
import type { AlloyFormState, MaterialFormRow } from "./types/form.js";
import type { SavedPreset } from "./types/preset.js";
import type { AppSettings } from "./types/settings.js";
import { isValidCssColorInput } from "./utils/validation.js";

type ActiveModal = "settings" | "info" | "saveLoad" | null;

export function App() {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [activeTabId, setActiveTabId] = useState<AppTabId>(DEFAULT_APP_TAB_ID);
  const [form, setForm] = useState<AlloyFormState>(() => loadAutosave() ?? EMPTY_FORM_STATE);
  const [presets, setPresets] = useState<SavedPreset[]>(() => loadPresets());
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uiElapsedMs, setUiElapsedMs] = useState<number | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const labels = useMemo(() => getTranslations(settings.language), [settings.language]);

  const menuItems = useMemo(
    () => APP_MENU_ITEMS.map((item) => {
      if (item.type === "tab") {
        return {
          type: "tab" as const,
          id: item.id,
          label: labels.menuItems.tabs[item.labelKey]
        };
      }

      return {
        type: "category" as const,
        id: item.id,
        label: labels.menuItems.categories[item.labelKey],
        children: item.children.map((child) => ({
          id: child.id,
          label: labels.menuItems.tabs[child.labelKey]
        }))
      };
    }),
    [labels]
  );

  const currentTabLabel = useMemo(() => {
    for (const item of menuItems) {
      if (item.type === "tab" && item.id === activeTabId) return item.label;
      if (item.type === "category") {
        const child = item.children.find((candidate) => candidate.id === activeTabId);
        if (child) return child.label;
      }
    }

    return labels.menuItems.tabs.home;
  }, [activeTabId, labels.menuItems.tabs.home, menuItems]);

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
    setActiveTabId(TAB_IDS.TFC_ALLOY);
  }

  return (
    <>
      <Header
        menuLabel={labels.menuButton}
        currentTabLabel={currentTabLabel}
        menuItems={menuItems}
        activeTabId={activeTabId}
        settingsLabel={labels.settings}
        infoLabel={labels.info}
        onSelectTab={setActiveTabId}
        onOpenSettings={() => setActiveModal("settings")}
        onOpenInfo={() => setActiveModal("info")}
      />

      {activeTabId === TAB_IDS.HOME && (
        <HomeTab labels={labels} settings={settings} onChangeSettings={setSettings} />
      )}
      {activeTabId === TAB_IDS.TFC_ALLOY && (
        <TfcAlloyCalculatorTab
          labels={labels}
          form={form}
          result={result}
          error={error}
          statusMessage={statusMessage}
          loading={loading}
          uiElapsedMs={uiElapsedMs}
          ratioIgnored={ratioIgnored}
          onSubmit={handleSubmit}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          onUpdateForm={updateForm}
          onUpdateRow={updateRow}
          onOpenSaveLoad={() => setActiveModal("saveLoad")}
        />
      )}
      {activeTabId === TAB_IDS.ETC_AUTOMATION_CALCULATOR && (
        <AutomationCalculatorTab labels={labels} />
      )}

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
