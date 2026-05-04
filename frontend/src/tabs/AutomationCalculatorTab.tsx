import { useMemo, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent, ReactNode } from "react";
import { AVAILABLE_COLORS } from "../constants/availableColors.js";
import type { getTranslations } from "../i18n/translations.js";
import {
  AUTOMATION_NONE,
  AutomationExportParseError,
  createAutomationExport,
  loadAutomationNodes,
  parseAutomationExport
} from "../storage/automationStorage.js";
import type {
  AutomationFluidInput,
  AutomationFluidOutput,
  AutomationItemInput,
  AutomationItemOutput,
  AutomationNode,
  AutomationNodeShape,
  AutomationProcessNode,
  AutomationResourceKind,
  AutomationResourceNode
} from "../types/automation.js";
import { isValidCssColorInput } from "../utils/validation.js";

const TICKS_PER_SECOND = 20;
const NODE_WIDTH = 132;
const NODE_HEIGHT = 112;
const GRAPH_PADDING = 64;
const DEFAULT_NODE_X = 64;
const DEFAULT_NODE_Y = 64;
const NODE_STEP_X = 172;
const NODE_STEP_Y = 142;
const NODE_COLUMNS = 4;

type ResourceKind = "inputItem" | "inputFluid" | "outputItem" | "outputFluid";

interface AutomationCalculatorTabProps {
  labels: ReturnType<typeof getTranslations>;
}

interface GraphEdge {
  id: string;
  from: string;
  to: string;
  color: string;
}

interface PanState {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  scrollTop: number;
}

interface NodeDragState {
  pointerId: number;
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface ResourceMatch {
  type: AutomationResourceKind;
  name: string;
  color: string;
}

export function AutomationCalculatorTab({ labels }: AutomationCalculatorTabProps) {
  const text = labels.automationCalculator;
  const initialNodesRef = useRef<AutomationNode[] | null>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panStateRef = useRef<PanState | null>(null);
  const nodeDragStateRef = useRef<NodeDragState | null>(null);
  const [nodes, setNodes] = useState<AutomationNode[]>(() => {
    const loadedNodes = loadAutomationNodes();
    initialNodesRef.current = loadedNodes;
    return loadedNodes;
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(() => initialNodesRef.current?.[0]?.id ?? null);
  const [expandedResourceIds, setExpandedResourceIds] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [panning, setPanning] = useState(false);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;
  const graph = useMemo(() => buildGraph(nodes), [nodes]);

  function setNextNodes(updater: (current: AutomationNode[]) => AutomationNode[]) {
    setNodes((current) => updater(current));
    setError("");
    setStatusMessage("");
  }

  function addProcessNode() {
    setNextNodes((current) => {
      const node = createProcessNode(getNextNodePosition(current));
      setSelectedNodeId(node.id);
      return [...current, node];
    });
  }

  function addResourceNode() {
    setNextNodes((current) => {
      const node = createResourceNode(getNextNodePosition(current));
      setSelectedNodeId(node.id);
      return [...current, node];
    });
  }

  function deleteSelectedNode() {
    if (!selectedNode) return;
    setNextNodes((current) => {
      const next = current.filter((node) => node.id !== selectedNode.id);
      setSelectedNodeId(next[0]?.id ?? null);
      return next;
    });
  }

  function updateSelectedNode(patch: Partial<AutomationNode>) {
    if (!selectedNode) return;
    setNextNodes((current) => current.map((node) => node.id === selectedNode.id ? { ...node, ...patch } as AutomationNode : node));
  }

  function updateSelectedProcessNode(updater: (node: AutomationProcessNode) => AutomationProcessNode) {
    if (!selectedNode || selectedNode.kind !== "process") return;
    setNextNodes((current) => current.map((node) => node.id === selectedNode.id && node.kind === "process" ? updater(node) : node));
  }

  function updateSelectedResourceNode(updater: (node: AutomationResourceNode) => AutomationResourceNode) {
    if (!selectedNode || selectedNode.kind !== "resource") return;
    setNextNodes((current) => current.map((node) => node.id === selectedNode.id && node.kind === "resource" ? updater(node) : node));
  }

  function handleSave() {
    const validationError = validateNodes(nodes, text);
    if (validationError) {
      setError(validationError);
      setStatusMessage("");
      return;
    }

    const rawName = window.prompt(text.saveNamePrompt);
    const saveName = rawName?.trim();
    if (!saveName) {
      setError("");
      setStatusMessage("");
      return;
    }

    const exportFile = createAutomationExport(nodes);
    const blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${getLocalDateStamp()}_${sanitizeFileName(saveName)}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setError("");
    setStatusMessage(text.fileSaved);
  }

  function handleLoad() {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const importedNodes = parseAutomationExport(parsed);
      setNodes(importedNodes);
      setSelectedNodeId(importedNodes[0]?.id ?? null);
      setExpandedResourceIds(new Set());
      setError("");
      setStatusMessage(text.fileLoaded);
    } catch (caught) {
      const message = caught instanceof AutomationExportParseError && caught.code === "unsupported-version"
        ? text.unsupportedAutomationFileVersion
        : text.invalidAutomationFile;
      setError(message);
      setStatusMessage("");
    }
  }

  function addResource(kind: ResourceKind) {
    updateSelectedProcessNode((node) => {
      if (kind === "inputItem") return { ...node, inputs: { ...node.inputs, items: [...node.inputs.items, createInputItem()] } };
      if (kind === "inputFluid") return { ...node, inputs: { ...node.inputs, fluids: [...node.inputs.fluids, createInputFluid()] } };
      if (kind === "outputItem") return { ...node, outputs: { ...node.outputs, items: [...node.outputs.items, createOutputItem()] } };
      return { ...node, outputs: { ...node.outputs, fluids: [...node.outputs.fluids, createOutputFluid()] } };
    });
  }

  function removeResource(kind: ResourceKind, rowId: string) {
    updateSelectedProcessNode((node) => {
      if (kind === "inputItem") return { ...node, inputs: { ...node.inputs, items: node.inputs.items.filter((row) => row.id !== rowId) } };
      if (kind === "inputFluid") return { ...node, inputs: { ...node.inputs, fluids: node.inputs.fluids.filter((row) => row.id !== rowId) } };
      if (kind === "outputItem") return { ...node, outputs: { ...node.outputs, items: node.outputs.items.filter((row) => row.id !== rowId) } };
      return { ...node, outputs: { ...node.outputs, fluids: node.outputs.fluids.filter((row) => row.id !== rowId) } };
    });
    setExpandedResourceIds((current) => {
      const next = new Set(current);
      next.delete(rowId);
      return next;
    });
  }

  function toggleResource(rowId: string) {
    setExpandedResourceIds((current) => {
      const next = new Set(current);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  function moveNode(nodeId: string, x: number, y: number) {
    setNextNodes((current) => current.map((node) => node.id === nodeId ? { ...node, position: { x: Math.max(0, x), y: Math.max(0, y) } } as AutomationNode : node));
  }

  function isGraphControlTarget(target: EventTarget | null): boolean {
    return target instanceof Element && Boolean(target.closest("[data-automation-graph-control='true']"));
  }

  function isNodeTarget(target: EventTarget | null): boolean {
    return target instanceof Element && Boolean(target.closest("[data-automation-node='true']"));
  }

  function handleGraphPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!graphRef.current || isNodeTarget(event.target) || isGraphControlTarget(event.target)) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    nodeDragStateRef.current = null;
    setDraggingNodeId(null);
    setSelectedNodeId(null);
    panStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: graphRef.current.scrollLeft,
      scrollTop: graphRef.current.scrollTop
    };
    setPanning(true);
  }

  function handleGraphPointerMove(event: PointerEvent<HTMLDivElement>) {
    const panState = panStateRef.current;
    const graphElement = graphRef.current;
    if (!panState || !graphElement || panState.pointerId !== event.pointerId) return;
    graphElement.scrollLeft = panState.scrollLeft - (event.clientX - panState.startX);
    graphElement.scrollTop = panState.scrollTop - (event.clientY - panState.startY);
  }

  function handleGraphPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    panStateRef.current = null;
    setPanning(false);
  }

  function handleNodePointerDown(event: PointerEvent<HTMLButtonElement>, node: AutomationNode) {
    event.stopPropagation();
    const graphElement = graphRef.current;
    if (!graphElement) return;
    graphElement.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    panStateRef.current = null;
    setPanning(false);
    setSelectedNodeId(node.id);
    nodeDragStateRef.current = {
      pointerId: event.pointerId,
      nodeId: node.id,
      offsetX: event.clientX - event.currentTarget.getBoundingClientRect().left,
      offsetY: event.clientY - event.currentTarget.getBoundingClientRect().top
    };
    setDraggingNodeId(node.id);
  }

  function handleNodePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const dragState = nodeDragStateRef.current;
    const graphElement = graphRef.current;
    if (!dragState || !graphElement || dragState.pointerId !== event.pointerId) return;
    event.stopPropagation();
    const graphRect = graphElement.getBoundingClientRect();
    const x = event.clientX - graphRect.left + graphElement.scrollLeft - dragState.offsetX;
    const y = event.clientY - graphRect.top + graphElement.scrollTop - dragState.offsetY;
    moveNode(dragState.nodeId, x, y);
  }

  function handleNodePointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    nodeDragStateRef.current = null;
    setDraggingNodeId(null);
  }

  return (
    <main className="automation-shell">
      <section className="automation-graph-panel panel">
        <div className="topbar automation-topbar">
          <div>
            <h1>{labels.menuItems.tabs.automationCalculator}</h1>
            <p>{text.description}</p>
            <p className="automation-topbar-help">{text.graphPanHelp}</p>
          </div>
          <div className="automation-topbar-actions">
            <button type="button" className="secondary-button" data-automation-graph-control="true" onClick={addProcessNode}>{text.addProcessNode}</button>
            <button type="button" className="secondary-button subtle" data-automation-graph-control="true" onClick={addResourceNode}>{text.addResourceNode}</button>
          </div>
        </div>

        <div className={`automation-graph-grid ${panning ? "panning" : ""}`} ref={graphRef} tabIndex={0}>
          <div
            className="automation-graph-canvas"
            style={{ width: graph.width, height: graph.height }}
            onPointerDown={handleGraphPointerDown}
            onPointerMove={handleGraphPointerMove}
            onPointerUp={handleGraphPointerUp}
            onPointerCancel={handleGraphPointerUp}
          >
            {nodes.length === 0 && <div className="empty-state automation-empty">{text.emptyGraph}</div>}
            <svg className="automation-edge-layer" width={graph.width} height={graph.height} viewBox={`0 0 ${graph.width} ${graph.height}`} aria-hidden="true">
              <defs>
                {graph.edges.map((edge, index) => (
                  <marker key={`${edge.id}-marker`} id={`automation-arrow-${index}`} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill={safeColor(edge.color)} />
                  </marker>
                ))}
              </defs>
              {graph.edges.map((edge, index) => {
                const from = nodes.find((node) => node.id === edge.from);
                const to = nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.position.x + NODE_WIDTH;
                const y1 = from.position.y + NODE_HEIGHT / 2 - 10;
                const x2 = to.position.x;
                const y2 = to.position.y + NODE_HEIGHT / 2 - 10;
                const controlOffset = Math.max(56, Math.abs(x2 - x1) / 2);
                return (
                  <path
                    key={edge.id}
                    className="automation-edge"
                    style={{ stroke: safeColor(edge.color), markerEnd: `url(#automation-arrow-${index})` }}
                    d={`M ${x1} ${y1} C ${x1 + controlOffset} ${y1}, ${x2 - controlOffset} ${y2}, ${x2} ${y2}`}
                  />
                );
              })}
            </svg>

            {nodes.map((node) => (
              <button
                type="button"
                data-automation-node="true"
                key={node.id}
                className={`automation-node-card ${selectedNodeId === node.id ? "selected" : ""} ${draggingNodeId === node.id ? "dragging" : ""}`}
                style={{ left: node.position.x, top: node.position.y }}
                onPointerDown={(event) => handleNodePointerDown(event, node)}
                onPointerMove={handleNodePointerMove}
                onPointerUp={handleNodePointerUp}
                onPointerCancel={handleNodePointerUp}
              >
                <span className={`automation-node-shape ${node.shape}`} style={{ background: safeColor(node.color) }}></span>
                <span className="automation-node-name">{node.name || text.none}</span>
              </button>
            ))}
            <div className="automation-graph-actions" data-automation-graph-control="true">
              <button type="button" className="secondary-button subtle" onClick={handleLoad}>{text.loadFile}</button>
              <button type="button" className="secondary-button" onClick={handleSave}>{text.saveFile}</button>
              <input ref={fileInputRef} className="automation-file-input" type="file" accept=".json,application/json" onChange={handleFileChange} />
            </div>
          </div>
        </div>
      </section>

      <aside className="automation-settings panel">
        <div className="automation-settings-header">
          <h2>{text.settings}</h2>
        </div>
        {error && <div className="error-box">{error}</div>}
        {statusMessage && !error && <div className="empty-state compact">{statusMessage}</div>}

        {!selectedNode && <div className="empty-state">{text.emptySettings}</div>}
        {selectedNode && (
          <div className="automation-form">
            <datalist id="automation-color-options">
              {AVAILABLE_COLORS.map((color) => <option key={color} value={color} />)}
              <option value="#ffffff" />
              <option value="#000000" />
              <option value="#facc15" />
              <option value="#268bd2" />
            </datalist>

            <NodeBaseSettings node={selectedNode} labels={text} onChange={updateSelectedNode} />
            {selectedNode.kind === "process" ? (
              <ProcessNodeSettings
                node={selectedNode}
                labels={text}
                expandedResourceIds={expandedResourceIds}
                onAddResource={addResource}
                onRemoveResource={removeResource}
                onToggleResource={toggleResource}
                onUpdatePower={updatePower}
                onUpdatePowerUnit={updatePowerUnit}
                onUpdateProcessingMode={updateProcessingMode}
                onUpdateProcessingTime={updateProcessingTime}
                onUpdateInputItem={updateInputItem}
                onUpdateInputFluid={updateInputFluid}
                onUpdateOutputItem={updateOutputItem}
                onUpdateOutputFluid={updateOutputFluid}
              />
            ) : (
              <ResourceNodeSettings node={selectedNode} labels={text} onChange={updateResourceNode} />
            )}

            <section className="automation-form-section">
              <h3>{text.storageActions}</h3>
              <div className="automation-actions">
                <button type="button" className="icon-button danger automation-delete-button" onClick={deleteSelectedNode}>{text.deleteNode}</button>
              </div>
            </section>
          </div>
        )}
      </aside>
    </main>
  );

  function updatePower(field: "consumePerTick" | "producePerTick", value: string) {
    if (!selectedNode || selectedNode.kind !== "process") return;
    const parsed = value.trim() === "" ? null : Number(value);
    updateSelectedProcessNode((node) => ({ ...node, power: { ...node.power, [field]: Number.isFinite(parsed) ? parsed : node.power[field] } }));
  }

  function updateProcessingTime(value: string) {
    const parsed = Number(value);
    updateSelectedProcessNode((node) => ({ ...node, processingTime: { ...node.processingTime, value: value.trim() === "" ? "" : Number.isFinite(parsed) ? parsed : node.processingTime.value } }));
  }

  function updatePowerUnit(value: string) {
    updateSelectedProcessNode((node) => ({ ...node, power: { ...node.power, unit: value || AUTOMATION_NONE } }));
  }

  function updateProcessingMode(value: string) {
    updateSelectedProcessNode((node) => ({
      ...node,
      processingTime: {
        mode: value === "ticks" ? "ticks" : "seconds",
        value: ""
      }
    }));
  }

  function updateInputItem(rowId: string, patch: Partial<AutomationItemInput>) {
    updateSelectedProcessNode((node) => ({ ...node, inputs: { ...node.inputs, items: node.inputs.items.map((row) => row.id === rowId ? { ...row, ...patch } : row) } }));
  }

  function updateInputFluid(rowId: string, patch: Partial<AutomationFluidInput>) {
    updateSelectedProcessNode((node) => ({ ...node, inputs: { ...node.inputs, fluids: node.inputs.fluids.map((row) => row.id === rowId ? { ...row, ...patch } : row) } }));
  }

  function updateOutputItem(rowId: string, patch: Partial<AutomationItemOutput>) {
    updateSelectedProcessNode((node) => ({ ...node, outputs: { ...node.outputs, items: node.outputs.items.map((row) => row.id === rowId ? { ...row, ...patch } : row) } }));
  }

  function updateOutputFluid(rowId: string, patch: Partial<AutomationFluidOutput>) {
    updateSelectedProcessNode((node) => ({ ...node, outputs: { ...node.outputs, fluids: node.outputs.fluids.map((row) => row.id === rowId ? { ...row, ...patch } : row) } }));
  }

  function updateResourceNode(patch: Partial<AutomationResourceNode["resource"]>) {
    updateSelectedResourceNode((node) => {
      const resource = { ...node.resource, ...patch };
      return {
        ...node,
        name: resource.name,
        resource
      };
    });
  }
}

function NodeBaseSettings({ node, labels, onChange }: { node: AutomationNode; labels: ReturnType<typeof getTranslations>["automationCalculator"]; onChange: (patch: Partial<AutomationNode>) => void }) {
  return (
    <>
      <section className="automation-form-section">
        <h3>{labels.basicInfo}</h3>
        <div className="automation-kind-pill">{node.kind === "process" ? labels.processNode : labels.resourceNode}</div>
        {node.kind === "process" && (
          <label>{labels.nodeName}<input value={node.name} onChange={(event) => onChange({ name: event.target.value || AUTOMATION_NONE } as Partial<AutomationNode>)} /></label>
        )}
      </section>
      <section className="automation-form-section">
        <h3>{labels.shapeAndColor}</h3>
        <label>{labels.nodeColor}<input list="automation-color-options" title={labels.colorHelp} value={node.color} onChange={(event) => onChange({ color: event.target.value } as Partial<AutomationNode>)} /></label>
        <div className="automation-shape-row" role="radiogroup" aria-label={labels.shape}>
          {(["square", "circle", "diamond"] as AutomationNodeShape[]).map((shape) => (
            <button
              type="button"
              key={shape}
              className={node.shape === shape ? "selected" : ""}
              onClick={() => onChange({ shape } as Partial<AutomationNode>)}
            >
              <span className={`automation-shape-preview ${shape}`} style={{ background: safeColor(node.color) }}></span>
              <span>{labels.shapes[shape]}</span>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}

function ProcessNodeSettings({
  node,
  labels,
  expandedResourceIds,
  onAddResource,
  onRemoveResource,
  onToggleResource,
  onUpdatePower,
  onUpdatePowerUnit,
  onUpdateProcessingMode,
  onUpdateProcessingTime,
  onUpdateInputItem,
  onUpdateInputFluid,
  onUpdateOutputItem,
  onUpdateOutputFluid
}: {
  node: AutomationProcessNode;
  labels: ReturnType<typeof getTranslations>["automationCalculator"];
  expandedResourceIds: Set<string>;
  onAddResource: (kind: ResourceKind) => void;
  onRemoveResource: (kind: ResourceKind, rowId: string) => void;
  onToggleResource: (rowId: string) => void;
  onUpdatePower: (field: "consumePerTick" | "producePerTick", value: string) => void;
  onUpdatePowerUnit: (value: string) => void;
  onUpdateProcessingMode: (value: string) => void;
  onUpdateProcessingTime: (value: string) => void;
  onUpdateInputItem: (rowId: string, patch: Partial<AutomationItemInput>) => void;
  onUpdateInputFluid: (rowId: string, patch: Partial<AutomationFluidInput>) => void;
  onUpdateOutputItem: (rowId: string, patch: Partial<AutomationItemOutput>) => void;
  onUpdateOutputFluid: (rowId: string, patch: Partial<AutomationFluidOutput>) => void;
}) {
  return (
    <>
      <section className="automation-form-section">
        <h3>{labels.power}</h3>
        <div className="automation-field-grid three">
          <label>{labels.consumePower}<input inputMode="decimal" value={node.power.consumePerTick ?? ""} onChange={(event) => onUpdatePower("consumePerTick", event.target.value)} /></label>
          <label>{labels.producePower}<input inputMode="decimal" value={node.power.producePerTick ?? ""} onChange={(event) => onUpdatePower("producePerTick", event.target.value)} /></label>
          <label>{labels.powerUnit}<input value={node.power.unit} placeholder="FE/t" onChange={(event) => onUpdatePowerUnit(event.target.value)} /></label>
        </div>
        <p>{labels.blankPowerAllowed}</p>
      </section>

      <section className="automation-form-section">
        <h3>{labels.processingTime}</h3>
        <div className="automation-field-grid">
          <label>{labels.timeMode}
            <select value={node.processingTime.mode} onChange={(event) => onUpdateProcessingMode(event.target.value)}>
              <option value="ticks">{labels.ticks}</option>
              <option value="seconds">{labels.seconds}</option>
            </select>
          </label>
          <label>{labels.timeValue}<input inputMode="numeric" value={node.processingTime.value} onChange={(event) => onUpdateProcessingTime(event.target.value)} /></label>
        </div>
        <p>{labels.tickRule}</p>
      </section>

      <ResourceSection title={labels.inputItems} addLabel={labels.addItem} onAdd={() => onAddResource("inputItem")}>
        {node.inputs.items.map((row) => (
          <InputItemRow key={row.id} row={row} labels={labels} expanded={expandedResourceIds.has(row.id)} onToggle={() => onToggleResource(row.id)} onChange={(patch) => onUpdateInputItem(row.id, patch)} onRemove={() => onRemoveResource("inputItem", row.id)} />
        ))}
      </ResourceSection>
      <ResourceSection title={labels.inputFluids} addLabel={labels.addFluid} onAdd={() => onAddResource("inputFluid")}>
        {node.inputs.fluids.map((row) => (
          <InputFluidRow key={row.id} row={row} labels={labels} expanded={expandedResourceIds.has(row.id)} onToggle={() => onToggleResource(row.id)} onChange={(patch) => onUpdateInputFluid(row.id, patch)} onRemove={() => onRemoveResource("inputFluid", row.id)} />
        ))}
      </ResourceSection>
      <ResourceSection title={labels.outputItems} addLabel={labels.addItem} onAdd={() => onAddResource("outputItem")}>
        {node.outputs.items.map((row) => (
          <OutputItemRow key={row.id} row={row} labels={labels} expanded={expandedResourceIds.has(row.id)} onToggle={() => onToggleResource(row.id)} onChange={(patch) => onUpdateOutputItem(row.id, patch)} onRemove={() => onRemoveResource("outputItem", row.id)} />
        ))}
      </ResourceSection>
      <ResourceSection title={labels.outputFluids} addLabel={labels.addFluid} onAdd={() => onAddResource("outputFluid")}>
        {node.outputs.fluids.map((row) => (
          <OutputFluidRow key={row.id} row={row} labels={labels} expanded={expandedResourceIds.has(row.id)} onToggle={() => onToggleResource(row.id)} onChange={(patch) => onUpdateOutputFluid(row.id, patch)} onRemove={() => onRemoveResource("outputFluid", row.id)} />
        ))}
      </ResourceSection>
    </>
  );
}

function ResourceNodeSettings({ node, labels, onChange }: { node: AutomationResourceNode; labels: ReturnType<typeof getTranslations>["automationCalculator"]; onChange: (patch: Partial<AutomationResourceNode["resource"]>) => void }) {
  return (
    <section className="automation-form-section">
      <h3>{labels.resourceNode}</h3>
      <div className="automation-field-grid">
        <label>{labels.resourceType}
          <select value={node.resource.kind} onChange={(event) => onChange({ kind: event.target.value === "fluid" ? "fluid" : "item" })}>
            <option value="item">{labels.item}</option>
            <option value="fluid">{labels.fluid}</option>
          </select>
        </label>
        <label>{labels.resourceName}<input value={node.resource.name} onChange={(event) => onChange({ name: event.target.value })} /></label>
        <label>{labels.resourceAmount}<input inputMode="decimal" value={node.resource.amount} onChange={(event) => onChange({ amount: toPositiveNumber(event.target.value, node.resource.amount) })} /></label>
        <label>{labels.resourceColor}<input list="automation-color-options" title={labels.colorHelp} value={node.resource.color} onChange={(event) => onChange({ color: event.target.value })} /></label>
      </div>
    </section>
  );
}

function ResourceSection({ title, addLabel, children, onAdd }: { title: string; addLabel: string; children: ReactNode; onAdd: () => void }) {
  return (
    <section className="automation-form-section">
      <div className="automation-section-heading">
        <h3>{title}</h3>
        <button type="button" className="secondary-button subtle" onClick={onAdd}>{addLabel}</button>
      </div>
      <div className="automation-resource-list">{children}</div>
    </section>
  );
}

function ResourceShell({
  children,
  expanded,
  moreLabel,
  lessLabel,
  onToggle,
  onRemove
}: {
  children: ReactNode;
  expanded: boolean;
  moreLabel: string;
  lessLabel: string;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="automation-resource-card">
      {children}
      <div className="automation-resource-actions">
        <button type="button" className="secondary-button subtle" onClick={onToggle}>{expanded ? lessLabel : moreLabel}</button>
        <button type="button" className="icon-button danger" onClick={onRemove}>x</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="automation-inline-field"><span>{label}</span>{children}</label>;
}

function InputItemRow({ row, labels, expanded, onToggle, onChange, onRemove }: { row: AutomationItemInput; labels: ReturnType<typeof getTranslations>["automationCalculator"]; expanded: boolean; onToggle: () => void; onChange: (patch: Partial<AutomationItemInput>) => void; onRemove: () => void }) {
  return (
    <ResourceShell expanded={expanded} moreLabel={labels.more} lessLabel={labels.less} onToggle={onToggle} onRemove={onRemove}>
      <div className="automation-resource-main">
        <Field label={labels.name}><input value={row.name} onChange={(event) => onChange({ name: event.target.value })} /></Field>
        <Field label={labels.amount}><input inputMode="decimal" value={row.amount} onChange={(event) => onChange({ amount: toPositiveNumber(event.target.value, row.amount) })} /></Field>
        <Field label={labels.color}><input list="automation-color-options" title={labels.colorHelp} value={row.color} onChange={(event) => onChange({ color: event.target.value })} /></Field>
      </div>
      {expanded && (
        <div className="automation-resource-details">
          <Field label={labels.perTick}><input value={row.perTick} onChange={(event) => onChange({ perTick: event.target.value || AUTOMATION_NONE })} /></Field>
          <Field label={labels.perTickChance}><input inputMode="decimal" value={row.perTickChance} onChange={(event) => onChange({ perTickChance: toNonNegativeNumber(event.target.value, row.perTickChance) })} /></Field>
          <Field label={labels.processChance}><input inputMode="decimal" value={row.processChance} onChange={(event) => onChange({ processChance: toNonNegativeNumber(event.target.value, row.processChance) })} /></Field>
          <label className="automation-checkbox"><input type="checkbox" checked={row.notConsumed} onChange={(event) => onChange({ notConsumed: event.target.checked })} />{labels.notConsumed}</label>
        </div>
      )}
    </ResourceShell>
  );
}

function InputFluidRow({ row, labels, expanded, onToggle, onChange, onRemove }: { row: AutomationFluidInput; labels: ReturnType<typeof getTranslations>["automationCalculator"]; expanded: boolean; onToggle: () => void; onChange: (patch: Partial<AutomationFluidInput>) => void; onRemove: () => void }) {
  return (
    <ResourceShell expanded={expanded} moreLabel={labels.more} lessLabel={labels.less} onToggle={onToggle} onRemove={onRemove}>
      <div className="automation-resource-main">
        <Field label={labels.name}><input value={row.name} onChange={(event) => onChange({ name: event.target.value })} /></Field>
        <Field label={labels.amountMb}><input inputMode="decimal" value={row.amountMb} onChange={(event) => onChange({ amountMb: toPositiveNumber(event.target.value, row.amountMb) })} /></Field>
        <Field label={labels.color}><input list="automation-color-options" title={labels.colorHelp} value={row.color} onChange={(event) => onChange({ color: event.target.value })} /></Field>
      </div>
      {expanded && (
        <div className="automation-resource-details">
          <Field label={labels.perTick}><input value={row.perTick} onChange={(event) => onChange({ perTick: event.target.value || AUTOMATION_NONE })} /></Field>
          <Field label={labels.perTickChance}><input inputMode="decimal" value={row.perTickChance} onChange={(event) => onChange({ perTickChance: toNonNegativeNumber(event.target.value, row.perTickChance) })} /></Field>
          <Field label={labels.processChance}><input inputMode="decimal" value={row.processChance} onChange={(event) => onChange({ processChance: toNonNegativeNumber(event.target.value, row.processChance) })} /></Field>
          <label className="automation-checkbox"><input type="checkbox" checked={row.notConsumed} onChange={(event) => onChange({ notConsumed: event.target.checked })} />{labels.notConsumed}</label>
        </div>
      )}
    </ResourceShell>
  );
}

function OutputItemRow({ row, labels, expanded, onToggle, onChange, onRemove }: { row: AutomationItemOutput; labels: ReturnType<typeof getTranslations>["automationCalculator"]; expanded: boolean; onToggle: () => void; onChange: (patch: Partial<AutomationItemOutput>) => void; onRemove: () => void }) {
  return (
    <ResourceShell expanded={expanded} moreLabel={labels.more} lessLabel={labels.less} onToggle={onToggle} onRemove={onRemove}>
      <div className="automation-resource-main">
        <Field label={labels.name}><input value={row.name} onChange={(event) => onChange({ name: event.target.value })} /></Field>
        <Field label={labels.amount}><input inputMode="decimal" value={row.amount} onChange={(event) => onChange({ amount: toPositiveNumber(event.target.value, row.amount) })} /></Field>
        <Field label={labels.color}><input list="automation-color-options" title={labels.colorHelp} value={row.color} onChange={(event) => onChange({ color: event.target.value })} /></Field>
      </div>
      {expanded && (
        <div className="automation-resource-details compact">
          <Field label={labels.outputChance}><input inputMode="decimal" value={row.chance} onChange={(event) => onChange({ chance: toNonNegativeNumber(event.target.value, row.chance) })} /></Field>
        </div>
      )}
    </ResourceShell>
  );
}

function OutputFluidRow({ row, labels, expanded, onToggle, onChange, onRemove }: { row: AutomationFluidOutput; labels: ReturnType<typeof getTranslations>["automationCalculator"]; expanded: boolean; onToggle: () => void; onChange: (patch: Partial<AutomationFluidOutput>) => void; onRemove: () => void }) {
  return (
    <ResourceShell expanded={expanded} moreLabel={labels.more} lessLabel={labels.less} onToggle={onToggle} onRemove={onRemove}>
      <div className="automation-resource-main">
        <Field label={labels.name}><input value={row.name} onChange={(event) => onChange({ name: event.target.value })} /></Field>
        <Field label={labels.amountMb}><input inputMode="decimal" value={row.amountMb} onChange={(event) => onChange({ amountMb: toPositiveNumber(event.target.value, row.amountMb) })} /></Field>
        <Field label={labels.color}><input list="automation-color-options" title={labels.colorHelp} value={row.color} onChange={(event) => onChange({ color: event.target.value })} /></Field>
      </div>
      {expanded && (
        <div className="automation-resource-details compact">
          <Field label={labels.outputChance}><input inputMode="decimal" value={row.chance} onChange={(event) => onChange({ chance: toNonNegativeNumber(event.target.value, row.chance) })} /></Field>
        </div>
      )}
    </ResourceShell>
  );
}

function buildGraph(nodes: AutomationNode[]) {
  const maxX = Math.max(1400, ...nodes.map((node) => node.position.x + NODE_WIDTH + GRAPH_PADDING));
  const maxY = Math.max(900, ...nodes.map((node) => node.position.y + NODE_HEIGHT + GRAPH_PADDING));
  return { width: maxX, height: maxY, edges: buildEdges(nodes) };
}

function buildEdges(nodes: AutomationNode[]): GraphEdge[] {
  const edgeMap = new Map<string, GraphEdge>();
  for (const source of nodes) {
    for (const target of nodes) {
      if (source.id === target.id || (source.kind === "resource" && target.kind === "resource")) continue;
      const match = findFirstMatch(source, target);
      if (match) {
        const key = `${source.id}-${target.id}`;
        if (!edgeMap.has(key)) edgeMap.set(key, { id: key, from: source.id, to: target.id, color: match.color });
      }
    }
  }
  return [...edgeMap.values()];
}

function findFirstMatch(source: AutomationNode, target: AutomationNode): ResourceMatch | null {
  if (source.kind === "process" && target.kind === "process") {
    return firstMatchingResource(getProcessOutputs(source), getProcessInputs(target));
  }
  if (source.kind === "resource" && target.kind === "process") {
    return firstMatchingResource([resourceNodeToMatch(source)], getProcessInputs(target));
  }
  if (source.kind === "process" && target.kind === "resource") {
    return firstMatchingResource(getProcessOutputs(source), [resourceNodeToMatch(target)]);
  }
  return null;
}

function getProcessInputs(node: AutomationProcessNode): ResourceMatch[] {
  return [
    ...node.inputs.items.map((item) => ({ type: "item" as const, name: item.name, color: item.color })),
    ...node.inputs.fluids.map((fluid) => ({ type: "fluid" as const, name: fluid.name, color: fluid.color }))
  ];
}

function getProcessOutputs(node: AutomationProcessNode): ResourceMatch[] {
  return [
    ...node.outputs.items.map((item) => ({ type: "item" as const, name: item.name, color: item.color })),
    ...node.outputs.fluids.map((fluid) => ({ type: "fluid" as const, name: fluid.name, color: fluid.color }))
  ];
}

function resourceNodeToMatch(node: AutomationResourceNode): ResourceMatch {
  return { type: node.resource.kind, name: node.resource.name, color: node.resource.color };
}

function firstMatchingResource(outputs: ResourceMatch[], inputs: ResourceMatch[]): ResourceMatch | null {
  return outputs.find((output) => inputs.some((input) => resourcesEqual(output, input))) ?? null;
}

function resourcesEqual(left: ResourceMatch, right: ResourceMatch): boolean {
  const leftName = normalizeResourceName(left.name);
  const rightName = normalizeResourceName(right.name);
  return Boolean(leftName && rightName)
    && left.type === right.type
    && leftName === rightName
    && normalizeColor(left.color) === normalizeColor(right.color);
}

function validateNodes(nodes: AutomationNode[], text: ReturnType<typeof getTranslations>["automationCalculator"]): string {
  for (const node of nodes) {
    if (node.color.trim() && !isValidCssColorInput(node.color)) return `${node.name || text.none}: ${text.invalidColor}`;
    if (node.kind === "resource") {
      if (node.resource.color.trim() && !isValidCssColorInput(node.resource.color)) return `${node.resource.name || text.none}: ${text.invalidColor}`;
      if (typeof node.resource.amount !== "number" || node.resource.amount <= 0) return text.invalidAmount;
      continue;
    }
    const rows = [...node.inputs.items, ...node.inputs.fluids, ...node.outputs.items, ...node.outputs.fluids];
    const badRow = rows.find((row) => row.color.trim() && !isValidCssColorInput(row.color));
    if (badRow) return `${badRow.name || node.name || text.none}: ${text.invalidColor}`;
    if (node.processingTime.mode === "ticks" && (typeof node.processingTime.value !== "number" || !Number.isInteger(node.processingTime.value) || node.processingTime.value < 1 || node.processingTime.value > 19)) return text.invalidTicks;
    if (node.processingTime.mode === "seconds" && (typeof node.processingTime.value !== "number" || node.processingTime.value < 1)) return text.invalidSeconds;
    if (node.power.consumePerTick !== null && node.power.consumePerTick < 0) return text.invalidPower;
    if (node.power.producePerTick !== null && node.power.producePerTick < 0) return text.invalidPower;
  }
  return "";
}

function createProcessNode(position: { x: number; y: number }): AutomationProcessNode {
  const color = getDefaultAutomationColor();
  return {
    id: createId("process"),
    kind: "process",
    name: "",
    shape: "square",
    color,
    position,
    inputs: { items: [], fluids: [] },
    outputs: { items: [], fluids: [] },
    power: { consumePerTick: null, producePerTick: null, unit: "FE/t" },
    processingTime: { mode: "seconds", value: "" }
  };
}

function createResourceNode(position: { x: number; y: number }): AutomationResourceNode {
  const color = getDefaultAutomationColor();
  return {
    id: createId("resource"),
    kind: "resource",
    name: "",
    shape: "circle",
    color,
    position,
    resource: {
      kind: "item",
      name: "",
      amount: "",
      color
    }
  };
}

function getNextNodePosition(nodes: AutomationNode[]) {
  const index = nodes.length;
  let candidate = {
    x: DEFAULT_NODE_X + (index % NODE_COLUMNS) * NODE_STEP_X,
    y: DEFAULT_NODE_Y + Math.floor(index / NODE_COLUMNS) * NODE_STEP_Y
  };

  while (nodes.some((node) => Math.abs(node.position.x - candidate.x) < NODE_WIDTH && Math.abs(node.position.y - candidate.y) < NODE_HEIGHT)) {
    candidate = { x: candidate.x + NODE_STEP_X, y: candidate.y };
  }

  return candidate;
}

function createInputItem(): AutomationItemInput {
  return { id: createId("item-in"), name: "", amount: "", color: getDefaultAutomationColor(), perTick: AUTOMATION_NONE, perTickChance: 100, processChance: 100, notConsumed: false };
}

function createInputFluid(): AutomationFluidInput {
  return { id: createId("fluid-in"), name: "", amountMb: "", color: getDefaultAutomationColor(), perTick: AUTOMATION_NONE, perTickChance: 100, processChance: 100, notConsumed: false };
}

function createOutputItem(): AutomationItemOutput {
  return { id: createId("item-out"), name: "", amount: "", color: getDefaultAutomationColor(), chance: 100 };
}

function createOutputFluid(): AutomationFluidOutput {
  return { id: createId("fluid-out"), name: "", amountMb: "", color: getDefaultAutomationColor(), chance: 100 };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function safeColor(color: string): string {
  return color.trim() && isValidCssColorInput(color) ? color : "#64748b";
}

function normalizeResourceName(value: string): string {
  const name = value.trim();
  return name && name !== AUTOMATION_NONE ? name : "";
}

function normalizeColor(value: string): string {
  return value.trim().toLowerCase();
}

function getDefaultAutomationColor(): string {
  const theme = document.documentElement.dataset.theme;
  const systemDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  return theme === "dark" || (theme === "system" && systemDark) || (!theme && systemDark) ? "#000000" : "#ffffff";
}

function toPositiveNumber(value: string, fallback: number | ""): number | "" {
  if (value.trim() === "") return "";
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toNonNegativeNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getLocalDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ").trim() || "automation";
}

export { TICKS_PER_SECOND };
