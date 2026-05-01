export type AlloyMode = "Vessel" | "Crucible";

export interface MaterialRowData {
  rowId: number;
  name: string;
  owned: number;
  mbPerItem: number;
  minRatio: number;
  maxRatio: number;
  color: string;
}

export interface Candidate {
  mb: number;
  itemCount: number;
  rowCounts: Record<number, number>;
  slotCount: number;
}

export interface CombinedCandidate {
  itemCount: number;
  rowCounts: Record<number, number>;
  materialMbs: Record<string, number>;
  slotCount: number;
}

export interface FastAlloyResult {
  possible: boolean;
  message: string;
  totalMb: number;
  targetMb: number;
  itemCount: number;
  slotCount: number;
  materialMbs: Record<string, number>;
  rowCounts: Record<number, number>;
  elapsedMs: number;
  searchedCapacity: number;
}

export interface CalculationRequest {
  rows: MaterialRowData[];
  alloyName: string;
  targetIngots: number;
  mbPerIngot: number;
  mode: AlloyMode;
  crucibleCapacity?: number;
}

export interface CalculationResult {
  possible: boolean;
  message: string;
  alloyName: string;
  targetIngots: number;
  actualIngots: number;
  totalMb: number;
  targetMb: number;
  leftoverMb: number;
  materialMbs: Record<string, number>;
  materialRatios: Record<string, number>;
  rowCounts: Record<number, number>;
  colors: Record<string, string>;
  constraintNotes: string[];
  elapsedMs: number;
  mode: AlloyMode;
  capacity: number;
  slotCount: number;
  searchedCapacity: number;
  ratioIgnored: boolean;
}
