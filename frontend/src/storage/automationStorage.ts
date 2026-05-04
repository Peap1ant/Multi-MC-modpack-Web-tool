import { STORAGE_KEYS } from "./storageKeys.js";
import type {
  AutomationExportFile,
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

export const AUTOMATION_EXPORT_SCHEMA = "multi-mc-automation-calculator";
export const AUTOMATION_EXPORT_VERSION = 1;
export const AUTOMATION_NONE = "없음";

const SHAPES = new Set<AutomationNodeShape>(["square", "circle", "diamond"]);
const RESOURCE_KINDS = new Set<AutomationResourceKind>(["item", "fluid"]);
const DEFAULT_NODE_X = 44;
const DEFAULT_NODE_Y = 44;
const NODE_STEP_X = 172;
const NODE_STEP_Y = 128;
const NODE_COLUMNS = 4;
const FALLBACK_COLOR = "#ffffff";

export function loadAutomationNodes(): AutomationNode[] {
  const raw = localStorage.getItem(STORAGE_KEYS.AUTOMATION_NODES);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return normalizeAutomationNodes(parsed);
  } catch {
    return [];
  }
}

export function saveAutomationNodes(nodes: AutomationNode[]): void {
  localStorage.setItem(STORAGE_KEYS.AUTOMATION_NODES, JSON.stringify(nodes));
}

export function normalizeAutomationNodes(value: unknown): AutomationNode[] {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeNode).filter(Boolean) as AutomationNode[];
}

export function createAutomationExport(nodes: AutomationNode[]): AutomationExportFile {
  return {
    schema: AUTOMATION_EXPORT_SCHEMA,
    version: AUTOMATION_EXPORT_VERSION,
    savedAt: new Date().toISOString(),
    nodes: normalizeAutomationNodes(nodes)
  };
}

export type AutomationExportParseErrorCode = "invalid" | "unsupported-version";

export class AutomationExportParseError extends Error {
  code: AutomationExportParseErrorCode;

  constructor(code: AutomationExportParseErrorCode) {
    super(code);
    this.code = code;
  }
}

export function parseAutomationExport(value: unknown): AutomationNode[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AutomationExportParseError("invalid");
  }

  const exportValue = value as Partial<AutomationExportFile>;
  if (exportValue.schema !== AUTOMATION_EXPORT_SCHEMA || !Array.isArray(exportValue.nodes)) {
    throw new AutomationExportParseError("invalid");
  }

  if (exportValue.version !== AUTOMATION_EXPORT_VERSION) {
    throw new AutomationExportParseError("unsupported-version");
  }

  return normalizeAutomationNodes(exportValue.nodes);
}

function normalizeNode(node: unknown, index: number): AutomationNode | null {
  if (!node || typeof node !== "object") return null;
  const value = node as Partial<AutomationNode>;
  return value.kind === "resource" ? normalizeResourceNode(value, index) : normalizeProcessNode(value, index);
}

function normalizeBaseNode(value: Partial<AutomationNode>, index: number) {
  const position = value.position ?? defaultPosition(index);
  const shape = SHAPES.has(value.shape as AutomationNodeShape) ? value.shape as AutomationNodeShape : "square";

  return {
    id: String(value.id ?? `node-${index + 1}`),
    name: normalizeText(value.name),
    shape,
    color: normalizeText(value.color, FALLBACK_COLOR),
    position: {
      x: normalizeCoordinate(position.x, defaultPosition(index).x),
      y: normalizeCoordinate(position.y, defaultPosition(index).y)
    }
  };
}

function normalizeProcessNode(value: Partial<AutomationNode>, index: number): AutomationProcessNode {
  const processValue = value as Partial<AutomationProcessNode>;
  const inputs = processValue.inputs ?? { items: [], fluids: [] };
  const outputs = processValue.outputs ?? { items: [], fluids: [] };
  const power = processValue.power ?? { consumePerTick: null, producePerTick: null, unit: "FE/t" };
  const processingTime = processValue.processingTime ?? { mode: "seconds", value: 1 };

  return {
    ...normalizeBaseNode(processValue, index),
    kind: "process",
    inputs: {
      items: Array.isArray(inputs.items) ? inputs.items.map(normalizeItemInput).filter(Boolean) as AutomationItemInput[] : [],
      fluids: Array.isArray(inputs.fluids) ? inputs.fluids.map(normalizeFluidInput).filter(Boolean) as AutomationFluidInput[] : []
    },
    outputs: {
      items: Array.isArray(outputs.items) ? outputs.items.map(normalizeItemOutput).filter(Boolean) as AutomationItemOutput[] : [],
      fluids: Array.isArray(outputs.fluids) ? outputs.fluids.map(normalizeFluidOutput).filter(Boolean) as AutomationFluidOutput[] : []
    },
    power: {
      consumePerTick: normalizeNullableNumber(power.consumePerTick),
      producePerTick: normalizeNullableNumber(power.producePerTick),
      unit: normalizeText(power.unit, "FE/t")
    },
    processingTime: {
      mode: processingTime.mode === "ticks" ? "ticks" : "seconds",
      value: normalizePositiveNumber(processingTime.value, 1)
    }
  };
}

function normalizeResourceNode(value: Partial<AutomationNode>, index: number): AutomationResourceNode {
  const resourceValue = value as Partial<AutomationResourceNode>;
  const resource = resourceValue.resource ?? { kind: "item", name: AUTOMATION_NONE, amount: 1, color: FALLBACK_COLOR };
  const resourceKind = RESOURCE_KINDS.has(resource.kind as AutomationResourceKind) ? resource.kind as AutomationResourceKind : "item";
  const resourceName = normalizeText(resource.name);

  return {
    ...normalizeBaseNode({ ...resourceValue, name: resourceName }, index),
    kind: "resource",
    name: resourceName,
    resource: {
      kind: resourceKind,
      name: resourceName,
      amount: normalizePositiveNumber(resource.amount, 1),
      color: normalizeText(resource.color, FALLBACK_COLOR)
    }
  };
}

function normalizeItemInput(row: unknown, index: number): AutomationItemInput | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Partial<AutomationItemInput> & { chance?: unknown };
  return {
    id: String(value.id ?? `item-input-${index + 1}`),
    name: normalizeText(value.name),
    amount: normalizePositiveNumber(value.amount, 1),
    color: normalizeText(value.color, FALLBACK_COLOR),
    perTick: normalizeText(value.perTick),
    perTickChance: normalizeChance(value.perTickChance ?? value.chance),
    processChance: normalizeChance(value.processChance ?? value.chance),
    notConsumed: Boolean(value.notConsumed)
  };
}

function normalizeFluidInput(row: unknown, index: number): AutomationFluidInput | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Partial<AutomationFluidInput> & { chance?: unknown };
  return {
    id: String(value.id ?? `fluid-input-${index + 1}`),
    name: normalizeText(value.name),
    amountMb: normalizePositiveNumber(value.amountMb, 1000),
    color: normalizeText(value.color, FALLBACK_COLOR),
    perTick: normalizeText(value.perTick),
    perTickChance: normalizeChance(value.perTickChance ?? value.chance),
    processChance: normalizeChance(value.processChance ?? value.chance),
    notConsumed: Boolean(value.notConsumed)
  };
}

function normalizeItemOutput(row: unknown, index: number): AutomationItemOutput | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Partial<AutomationItemOutput>;
  return {
    id: String(value.id ?? `item-output-${index + 1}`),
    name: normalizeText(value.name),
    amount: normalizePositiveNumber(value.amount, 1),
    color: normalizeText(value.color, FALLBACK_COLOR),
    chance: normalizeChance(value.chance)
  };
}

function normalizeFluidOutput(row: unknown, index: number): AutomationFluidOutput | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Partial<AutomationFluidOutput>;
  return {
    id: String(value.id ?? `fluid-output-${index + 1}`),
    name: normalizeText(value.name),
    amountMb: normalizePositiveNumber(value.amountMb, 1000),
    color: normalizeText(value.color, FALLBACK_COLOR),
    chance: normalizeChance(value.chance)
  };
}

function normalizeText(value: unknown, fallback = AUTOMATION_NONE): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizePositiveNumber(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function normalizeChance(value: unknown): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : 100;
}

function normalizeCoordinate(value: unknown, fallback: number): number {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : fallback;
}

function defaultPosition(index: number) {
  return {
    x: DEFAULT_NODE_X + (index % NODE_COLUMNS) * NODE_STEP_X,
    y: DEFAULT_NODE_Y + Math.floor(index / NODE_COLUMNS) * NODE_STEP_Y
  };
}
