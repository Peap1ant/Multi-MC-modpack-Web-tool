import type {
  AlloyMode,
  CalculationRequest,
  CalculationResult,
  Candidate,
  CombinedCandidate,
  FastAlloyResult,
  MaterialRowData
} from "../types/alloy.js";

export const EPSILON = 1e-9;
const VESSEL_CAPACITY = 3024;

type Constraints = Map<string, [number, number]>;
type GroupedRows = Map<string, MaterialRowData[]>;

interface GroupSearchData {
  materialName: string;
  minRatio: number;
  maxRatio: number;
  candidates: Candidate[];
  candidateMbs: number[];
}

export class FastAlloyCalculator {
  /** Finds the smallest total mB at or above target that satisfies capacity, slot, and ratio constraints. */
  calculate(rows: MaterialRowData[], targetMb: number, mode: AlloyMode, maxCapacity: number): FastAlloyResult {
    const started = performance.now();
    if (targetMb <= 0) throw new Error("target_mb must be positive");
    if (maxCapacity <= 0) throw new Error("max_capacity must be positive");
    if (targetMb > maxCapacity) {
      return this.emptyResult(false, "Target mB is larger than capacity.", targetMb, performance.now() - started);
    }

    const { groupedRows, constraints } = this.normalize(rows);
    if (groupedRows.size === 1) {
      return this.calculateSingleMaterial(groupedRows, targetMb, mode, maxCapacity, started);
    }

    this.validateRatioBounds(constraints);
    let searchCapacity = this.initialSearchCapacity(targetMb, maxCapacity);
    const maxSearchCapacity = this.maxSearchCapacity(targetMb, maxCapacity);

    while (true) {
      const result = this.calculateWithCapacity(groupedRows, constraints, targetMb, mode, searchCapacity);
      if (result) {
        result.elapsedMs = performance.now() - started;
        result.searchedCapacity = searchCapacity;
        return result;
      }

      if (searchCapacity >= maxCapacity || searchCapacity >= maxSearchCapacity || maxCapacity <= 10000) break;
      const nextCapacity = Math.min(maxCapacity, maxSearchCapacity, Math.max(searchCapacity * 2, searchCapacity + 10000));
      if (nextCapacity === searchCapacity) break;
      searchCapacity = nextCapacity;
    }

    const message = searchCapacity < maxCapacity
      ? `No valid alloy combination was found up to ${searchCapacity} mB.`
      : "No valid alloy combination was found.";
    const result = this.emptyResult(false, message, targetMb, performance.now() - started);
    result.searchedCapacity = searchCapacity;
    return result;
  }

  /** Builds optimal row-count candidates for a single material group using bounded DP by mB amount. */
  generateGroupCandidates(rows: MaterialRowData[], maxCapacity: number, mode: AlloyMode = "Crucible"): Candidate[] {
    let dp = new Map<number, Candidate>([[0, { mb: 0, itemCount: 0, rowCounts: {}, slotCount: 0 }]]);

    for (const row of rows) {
      const nextDp = new Map(dp);
      let maxCount = Math.min(row.owned, Math.floor(maxCapacity / row.mbPerItem));
      if (mode === "Vessel") maxCount = Math.min(maxCount, 64);

      for (const [existingMb, candidate] of dp.entries()) {
        for (let count = 1; count <= maxCount; count += 1) {
          const newMb = existingMb + row.mbPerItem * count;
          if (newMb > maxCapacity) break;

          const rowSlots = Math.ceil(count / 16);
          const newSlotCount = candidate.slotCount + rowSlots;
          if (mode === "Vessel" && newSlotCount > 4) continue;

          const newCandidate: Candidate = {
            mb: newMb,
            itemCount: candidate.itemCount + count,
            rowCounts: { ...candidate.rowCounts, [row.rowId]: count },
            slotCount: newSlotCount
          };
          const old = nextDp.get(newMb);
          if (!old || this.candidateBetter(newCandidate, old)) nextDp.set(newMb, newCandidate);
        }
      }
      dp = nextDp;
    }

    return [...dp.values()].sort((a, b) => a.mb - b.mb || a.itemCount - b.itemCount || a.slotCount - b.slotCount);
  }

  private calculateSingleMaterial(
    groupedRows: GroupedRows,
    targetMb: number,
    mode: AlloyMode,
    maxCapacity: number,
    started: number
  ): FastAlloyResult {
    const [[materialName, materialRows]] = groupedRows.entries();
    const validCandidates = this.generateGroupCandidates(materialRows, maxCapacity, mode)
      .filter((candidate) => candidate.mb >= targetMb && candidate.mb <= maxCapacity);

    if (validCandidates.length === 0) {
      const result = this.emptyResult(false, "No valid alloy combination was found.", targetMb, performance.now() - started);
      result.searchedCapacity = maxCapacity;
      return result;
    }

    const best = validCandidates.reduce((current, candidate) => {
      const currentKey = [current.mb - targetMb, current.itemCount, current.mb];
      const candidateKey = [candidate.mb - targetMb, candidate.itemCount, candidate.mb];
      return compareTuple(candidateKey, currentKey) < 0 ? candidate : current;
    });

    return {
      possible: true,
      message: "Found optimal single-material combination.",
      totalMb: best.mb,
      targetMb,
      itemCount: best.itemCount,
      slotCount: best.slotCount,
      materialMbs: { [materialName]: best.mb },
      rowCounts: best.rowCounts,
      elapsedMs: performance.now() - started,
      searchedCapacity: maxCapacity
    };
  }

  private calculateWithCapacity(
    groupedRows: GroupedRows,
    constraints: Constraints,
    targetMb: number,
    mode: AlloyMode,
    capacity: number
  ): FastAlloyResult | null {
    const groups: GroupSearchData[] = [];
    for (const [materialName, materialRows] of groupedRows.entries()) {
      const [minRatio, maxRatio] = constraints.get(materialName) ?? [0, 100];
      let candidates = this.generateGroupCandidates(materialRows, capacity, mode);
      if (minRatio > EPSILON) candidates = candidates.filter((candidate) => candidate.mb > 0);
      candidates = candidates.filter((candidate) => candidate.mb <= capacity);
      if (candidates.length === 0) return null;
      groups.push({
        materialName,
        minRatio,
        maxRatio,
        candidates,
        candidateMbs: candidates.map((candidate) => candidate.mb)
      });
    }

    groups.sort((a, b) => a.candidates.length - b.candidates.length);

    for (let totalMb = targetMb; totalMb <= capacity; totalMb += 1) {
      const state = this.solveForTotal(groups, totalMb, mode);
      if (!state) continue;
      return {
        possible: true,
        message: "Found optimal alloy combination.",
        totalMb,
        targetMb,
        itemCount: state.itemCount,
        slotCount: state.slotCount,
        materialMbs: state.materialMbs,
        rowCounts: state.rowCounts,
        elapsedMs: 0,
        searchedCapacity: 0
      };
    }
    return null;
  }

  private solveForTotal(groups: GroupSearchData[], totalMb: number, mode: AlloyMode): CombinedCandidate | null {
    let states = new Map<number, CombinedCandidate>([
      [0, { itemCount: 0, rowCounts: {}, materialMbs: {}, slotCount: 0 }]
    ]);

    for (const group of groups) {
      const lowMb = Math.ceil(totalMb * group.minRatio / 100 - EPSILON);
      const highMb = Math.floor(totalMb * group.maxRatio / 100 + EPSILON);
      const left = lowerBound(group.candidateMbs, lowMb);
      const right = upperBound(group.candidateMbs, highMb);
      const validCandidates = group.candidates.slice(left, right);
      if (validCandidates.length === 0) return null;

      const nextStates = new Map<number, CombinedCandidate>();
      for (const [currentMb, state] of states.entries()) {
        const remainingMb = totalMb - currentMb;
        for (const candidate of validCandidates) {
          if (candidate.mb > remainingMb) break;
          const newTotal = currentMb + candidate.mb;
          const newSlotCount = state.slotCount + candidate.slotCount;
          if (mode === "Vessel" && newSlotCount > 4) continue;

          const newState: CombinedCandidate = {
            itemCount: state.itemCount + candidate.itemCount,
            rowCounts: { ...state.rowCounts, ...candidate.rowCounts },
            materialMbs: { ...state.materialMbs, [group.materialName]: candidate.mb },
            slotCount: newSlotCount
          };
          const old = nextStates.get(newTotal);
          if (!old || this.combinedBetter(newState, old)) nextStates.set(newTotal, newState);
        }
      }
      if (nextStates.size === 0) return null;
      states = nextStates;
    }

    const state = states.get(totalMb);
    if (!state) return null;
    if (mode === "Vessel" && !this.vesselCountsValid(state.rowCounts)) return null;
    return state;
  }

  private normalize(rows: MaterialRowData[]): { groupedRows: GroupedRows; constraints: Constraints } {
    const groupedRows: GroupedRows = new Map();
    const constraints: Constraints = new Map();

    for (const row of rows) {
      groupedRows.set(row.name, [...(groupedRows.get(row.name) ?? []), row]);
      const [currentMin, currentMax] = constraints.get(row.name) ?? [0, 100];
      constraints.set(row.name, [Math.max(currentMin, row.minRatio), Math.min(currentMax, row.maxRatio)]);
    }

    if (groupedRows.size >= 2) {
      for (const [name, [minRatio, maxRatio]] of constraints.entries()) {
        if (minRatio > maxRatio) throw new Error(`${name}: conflicting ratio constraints for the same material.`);
      }
    }
    return { groupedRows, constraints };
  }

  private validateRatioBounds(constraints: Constraints): void {
    const values = [...constraints.values()];
    const minSum = values.reduce((sum, value) => sum + value[0], 0);
    const maxSum = values.reduce((sum, value) => sum + value[1], 0);
    if (minSum > 100 + EPSILON) throw new Error("The sum of minimum material ratios is greater than 100.");
    if (maxSum < 100 - EPSILON) throw new Error("The sum of maximum material ratios is less than 100.");
  }

  private initialSearchCapacity(targetMb: number, maxCapacity: number): number {
    if (maxCapacity <= 10000) return maxCapacity;
    return Math.min(maxCapacity, Math.max(10000, targetMb * 2, targetMb + 5000));
  }

  private maxSearchCapacity(targetMb: number, maxCapacity: number): number {
    if (maxCapacity <= 10000) return maxCapacity;
    return Math.min(maxCapacity, Math.max(100000, targetMb * 4, targetMb + 50000));
  }

  private candidateBetter(candidate: Candidate, old: Candidate): boolean {
    return candidate.itemCount < old.itemCount ||
      (candidate.itemCount === old.itemCount && candidate.slotCount < old.slotCount);
  }

  private combinedBetter(candidate: CombinedCandidate, old: CombinedCandidate): boolean {
    return candidate.itemCount < old.itemCount ||
      (candidate.itemCount === old.itemCount && candidate.slotCount < old.slotCount);
  }

  private vesselCountsValid(rowCounts: Record<number, number>): boolean {
    if (Object.values(rowCounts).some((count) => count >= 65)) return false;
    const slotCount = Object.values(rowCounts)
      .filter((count) => count > 0)
      .reduce((sum, count) => sum + Math.ceil(count / 16), 0);
    return slotCount <= 4;
  }

  private emptyResult(possible: boolean, message: string, targetMb: number, elapsedMs: number): FastAlloyResult {
    return {
      possible,
      message,
      totalMb: 0,
      targetMb,
      itemCount: 0,
      slotCount: 0,
      materialMbs: {},
      rowCounts: {},
      elapsedMs,
      searchedCapacity: 0
    };
  }
}

export class AlloyCalculator {
  private readonly fastCalculator = new FastAlloyCalculator();

  /** Adapts user-facing craft inputs into the pure bounded alloy search engine. */
  calculate(request: CalculationRequest): CalculationResult {
    validateCalculationRequest(request);
    const started = performance.now();
    const targetMb = request.targetIngots * request.mbPerIngot;
    const capacity = request.mode === "Vessel" ? VESSEL_CAPACITY : request.crucibleCapacity ?? 0;
    const uniqueMaterialCount = new Set(request.rows.map((row) => row.name)).size;
    const useRatio = uniqueMaterialCount >= 2;

    const { constraints, colors } = groupConstraints(request.rows);
    if (useRatio) validateRatioBounds(constraints);

    const fastResult = this.fastCalculator.calculate(request.rows, targetMb, request.mode, capacity);
    const elapsedMs = performance.now() - started;
    if (!fastResult.possible) {
      return emptyCalculationResult(false, "No valid combination found.", request, targetMb, capacity, elapsedMs);
    }

    const materialRatios = Object.fromEntries(
      Object.entries(fastResult.materialMbs)
        .filter(([, mb]) => mb > 0)
        .map(([material, mb]) => [material, fastResult.totalMb ? mb / fastResult.totalMb * 100 : 0])
    );

    const constraintNotes = [
      `${request.mode} capacity passed: ${fastResult.totalMb} / ${capacity} mB`,
      ...(fastResult.searchedCapacity && fastResult.searchedCapacity < capacity ? [`Search limit: ${fastResult.searchedCapacity} mB`] : []),
      request.mode === "Vessel"
        ? `Vessel item slot limit passed: ${fastResult.slotCount} / 4`
        : "Crucible has no item type slot limit",
      ...(!useRatio ? ["Single material input: ratio constraints ignored"] : [])
    ];

    return {
      possible: true,
      message: "Found the best craftable combination.",
      alloyName: request.alloyName,
      targetIngots: request.targetIngots,
      actualIngots: Math.floor(fastResult.totalMb / request.mbPerIngot),
      totalMb: fastResult.totalMb,
      targetMb,
      leftoverMb: fastResult.totalMb - targetMb,
      materialMbs: fastResult.materialMbs,
      materialRatios,
      rowCounts: fastResult.rowCounts,
      colors,
      constraintNotes,
      elapsedMs,
      mode: request.mode,
      capacity,
      slotCount: fastResult.slotCount,
      searchedCapacity: fastResult.searchedCapacity,
      ratioIgnored: !useRatio
    };
  }
}

/** Validates API/UI inputs before expensive candidate generation begins. */
export function validateCalculationRequest(request: CalculationRequest): void {
  if (!request.rows.length) throw new Error("Please enter at least one material.");
  if (!request.alloyName.trim()) throw new Error("Alloy target name is required.");
  assertPositiveInteger(request.targetIngots, "Target craft count");
  assertPositiveInteger(request.mbPerIngot, "mB per ingot");
  if (request.mode !== "Vessel" && request.mode !== "Crucible") throw new Error("Mode must be Vessel or Crucible.");
  if (request.mode === "Crucible") assertPositiveInteger(request.crucibleCapacity, "Crucible max mB");

  const normalizedNames = new Set(request.rows.map((row) => row.name.trim()).filter(Boolean));
  const ignoreRatio = normalizedNames.size < 2;

  request.rows.forEach((row, index) => {
    const label = row.name.trim() || `row ${index + 1}`;
    if (!row.name.trim()) throw new Error(`Material name is required at row ${index + 1}.`);
    assertNonNegativeInteger(row.owned, `${label}: owned count`);
    assertPositiveInteger(row.mbPerItem, `${label}: mB per item`);
    if (!ignoreRatio) {
      if (!Number.isFinite(row.minRatio) || row.minRatio < 0) throw new Error(`${label}: min ratio must be 0 or greater.`);
      if (!Number.isFinite(row.maxRatio) || row.maxRatio > 100) throw new Error(`${label}: max ratio must be 100 or less.`);
      if (row.minRatio > row.maxRatio) throw new Error(`${label}: min ratio cannot be greater than max ratio.`);
    } else {
      row.minRatio = 0;
      row.maxRatio = 100;
    }
  });

  const capacity = request.mode === "Vessel" ? VESSEL_CAPACITY : request.crucibleCapacity ?? 0;
  const targetMb = request.targetIngots * request.mbPerIngot;
  if (targetMb > capacity) throw new Error(`Target mB (${targetMb}) is larger than ${request.mode} capacity (${capacity} mB).`);
}

function groupConstraints(rows: MaterialRowData[]): { constraints: Constraints; colors: Record<string, string> } {
  const constraints: Constraints = new Map();
  const colors: Record<string, string> = {};
  for (const row of rows) {
    const [currentMin, currentMax] = constraints.get(row.name) ?? [0, 100];
    constraints.set(row.name, [Math.max(currentMin, row.minRatio), Math.min(currentMax, row.maxRatio)]);
    colors[row.name] ??= normalizeColor(row.color);
  }
  for (const [name, [minRatio, maxRatio]] of constraints.entries()) {
    if (minRatio > maxRatio) throw new Error(`${name}: ratio constraints for the same material conflict.`);
  }
  return { constraints, colors };
}

function validateRatioBounds(constraints: Constraints): void {
  const values = [...constraints.values()];
  const minSum = values.reduce((sum, value) => sum + value[0], 0);
  const maxSum = values.reduce((sum, value) => sum + value[1], 0);
  if (minSum > 100 + EPSILON) throw new Error("The sum of minimum material ratios is greater than 100.");
  if (maxSum < 100 - EPSILON) throw new Error("The sum of maximum material ratios is less than 100.");
}

function normalizeColor(value: string): string {
  const color = value.trim().toLowerCase();
  if (/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) return color;
  const named = new Set(["red", "blue", "green", "yellow", "orange", "purple", "black", "white", "gray", "grey", "brown"]);
  if (named.has(color)) return color === "grey" ? "gray" : color;
  return "#64748b";
}

function emptyCalculationResult(
  possible: boolean,
  message: string,
  request: CalculationRequest,
  targetMb: number,
  capacity: number,
  elapsedMs: number
): CalculationResult {
  return {
    possible,
    message,
    alloyName: request.alloyName,
    targetIngots: request.targetIngots,
    actualIngots: 0,
    totalMb: 0,
    targetMb,
    leftoverMb: 0,
    materialMbs: {},
    materialRatios: {},
    rowCounts: {},
    colors: {},
    constraintNotes: [],
    elapsedMs,
    mode: request.mode,
    capacity,
    slotCount: 0,
    searchedCapacity: 0,
    ratioIgnored: false
  };
}

function assertPositiveInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer.`);
  if ((value as number) <= 0) throw new Error(`${label} must be greater than 0.`);
}

function assertNonNegativeInteger(value: unknown, label: string): asserts value is number {
  if (!Number.isInteger(value)) throw new Error(`${label} must be an integer.`);
  if ((value as number) < 0) throw new Error(`${label} must be 0 or greater.`);
}

function lowerBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] < target) low = mid + 1;
    else high = mid;
  }
  return low;
}

function upperBound(values: number[], target: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (values[mid] <= target) low = mid + 1;
    else high = mid;
  }
  return low;
}

function compareTuple(left: number[], right: number[]): number {
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    if (left[i] !== right[i]) return left[i] - right[i];
  }
  return left.length - right.length;
}
