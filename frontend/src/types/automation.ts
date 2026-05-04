export type AutomationNodeKind = "process" | "resource";
export type AutomationResourceKind = "item" | "fluid";
export type AutomationNodeShape = "square" | "circle" | "diamond";
export type AutomationProcessingTimeMode = "ticks" | "seconds";
export type AutomationExportSchema = "multi-mc-automation-calculator";
export type AutomationExportVersion = 1;

export interface AutomationBaseNode {
  id: string;
  kind: AutomationNodeKind;
  name: string;
  shape: AutomationNodeShape;
  color: string;
  position: {
    x: number;
    y: number;
  };
}

export interface AutomationItemInput {
  id: string;
  name: string;
  amount: number;
  color: string;
  perTick: string;
  perTickChance: number;
  processChance: number;
  notConsumed: boolean;
}

export interface AutomationFluidInput {
  id: string;
  name: string;
  amountMb: number;
  color: string;
  perTick: string;
  perTickChance: number;
  processChance: number;
  notConsumed: boolean;
}

export interface AutomationItemOutput {
  id: string;
  name: string;
  amount: number;
  color: string;
  chance: number;
}

export interface AutomationFluidOutput {
  id: string;
  name: string;
  amountMb: number;
  color: string;
  chance: number;
}

export interface AutomationProcessNode extends AutomationBaseNode {
  kind: "process";
  inputs: {
    items: AutomationItemInput[];
    fluids: AutomationFluidInput[];
  };
  outputs: {
    items: AutomationItemOutput[];
    fluids: AutomationFluidOutput[];
  };
  power: {
    consumePerTick: number | null;
    producePerTick: number | null;
    unit: string;
  };
  processingTime: {
    mode: AutomationProcessingTimeMode;
    value: number;
  };
}

export interface AutomationResourceNode extends AutomationBaseNode {
  kind: "resource";
  resource: {
    kind: AutomationResourceKind;
    name: string;
    amount: number;
    color: string;
  };
}

export type AutomationNode = AutomationProcessNode | AutomationResourceNode;

export interface AutomationExportFile {
  schema: AutomationExportSchema;
  version: AutomationExportVersion;
  savedAt: string;
  nodes: AutomationNode[];
}
