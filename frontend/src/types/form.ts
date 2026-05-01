import type { AlloyMode } from "@tfc-alloy/shared";

export interface MaterialFormRow {
  rowId: number;
  name: string;
  owned: string;
  mbPerItem: string;
  minRatio: string;
  maxRatio: string;
  color: string;
}

export interface AlloyFormState {
  rows: MaterialFormRow[];
  alloyName: string;
  targetIngots: string;
  mbPerIngot: string;
  mode: AlloyMode;
  crucibleCapacity: string;
}
