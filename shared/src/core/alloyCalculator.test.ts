import { describe, expect, it } from "vitest";
import { AlloyCalculator, EPSILON, FastAlloyCalculator } from "./alloyCalculator.js";
import type { MaterialRowData } from "../types/alloy.js";

function expectRatioValid(result: { possible: boolean; message: string; totalMb: number; materialMbs: Record<string, number> }, constraints: Record<string, [number, number]>) {
  expect(result.possible, result.message).toBe(true);
  for (const [material, [minRatio, maxRatio]] of Object.entries(constraints)) {
    const ratio = (result.materialMbs[material] ?? 0) / result.totalMb * 100;
    expect(ratio + EPSILON).toBeGreaterThanOrEqual(minRatio);
    expect(ratio - EPSILON).toBeLessThanOrEqual(maxRatio);
  }
}

describe("FastAlloyCalculator", () => {
  const calculator = new FastAlloyCalculator();

  it("handles complex mB values and grouped material rows", () => {
    const rows: MaterialRowData[] = [
      { rowId: 1, name: "Copper", owned: 7, mbPerItem: 144, minRatio: 60, maxRatio: 70, color: "red" },
      { rowId: 2, name: "Copper", owned: 9, mbPerItem: 100, minRatio: 60, maxRatio: 70, color: "red" },
      { rowId: 3, name: "Tin", owned: 5, mbPerItem: 111, minRatio: 10, maxRatio: 20, color: "white" },
      { rowId: 4, name: "Tin", owned: 8, mbPerItem: 72, minRatio: 10, maxRatio: 20, color: "white" },
      { rowId: 5, name: "Zinc", owned: 6, mbPerItem: 95, minRatio: 15, maxRatio: 25, color: "blue" },
      { rowId: 6, name: "Zinc", owned: 4, mbPerItem: 137, minRatio: 15, maxRatio: 25, color: "blue" }
    ];

    const result = calculator.calculate(rows, 2400, "Crucible", 5000);

    expect(result.totalMb).toBeGreaterThanOrEqual(2400);
    expect(result.totalMb).toBeLessThanOrEqual(5000);
    expectRatioValid(result, { Copper: [60, 70], Tin: [10, 20], Zinc: [15, 25] });
  });

  it("terminates narrow vessel ratio search and respects slot limits", () => {
    const rows: MaterialRowData[] = [
      { rowId: 1, name: "Copper", owned: 20, mbPerItem: 144, minRatio: 88, maxRatio: 92, color: "red" },
      { rowId: 2, name: "Tin", owned: 10, mbPerItem: 100, minRatio: 8, maxRatio: 12, color: "white" }
    ];

    const result = calculator.calculate(rows, 3024, "Vessel", 3024);

    if (result.possible) {
      expect(result.totalMb).toBeLessThanOrEqual(3024);
      expect(result.slotCount).toBeLessThanOrEqual(4);
      expect(Object.values(result.rowCounts).every((count) => count < 65)).toBe(true);
      expectRatioValid(result, { Copper: [88, 92], Tin: [8, 12] });
    } else {
      expect(result.totalMb).toBe(0);
    }
  });

  it("accepts ratio ranges whose maxima can still cover 100", () => {
    const rows: MaterialRowData[] = [
      { rowId: 1, name: "A", owned: 20, mbPerItem: 100, minRatio: 10, maxRatio: 25, color: "red" },
      { rowId: 2, name: "B", owned: 20, mbPerItem: 100, minRatio: 10, maxRatio: 25, color: "green" },
      { rowId: 3, name: "C", owned: 20, mbPerItem: 100, minRatio: 50, maxRatio: 80, color: "blue" }
    ];

    const result = calculator.calculate(rows, 1000, "Crucible", 3000);

    expect(result.totalMb).toBe(1000);
    expectRatioValid(result, { A: [10, 25], B: [10, 25], C: [50, 80] });
  });

  it("ignores ratio constraints for one unique material", () => {
    const rows: MaterialRowData[] = [
      { rowId: 1, name: "Copper", owned: 10, mbPerItem: 144, minRatio: 90, maxRatio: 91, color: "red" }
    ];

    const result = calculator.calculate(rows, 1000, "Crucible", 3000);

    expect(result.possible).toBe(true);
    expect(result.totalMb).toBe(1008);
    expect(result.itemCount).toBe(7);
    expect(result.materialMbs).toEqual({ Copper: 1008 });
  });

  it("keeps performance below one second for representative input", () => {
    const rows: MaterialRowData[] = [
      { rowId: 1, name: "Copper", owned: 40, mbPerItem: 144, minRatio: 60, maxRatio: 70, color: "red" },
      { rowId: 2, name: "Tin", owned: 40, mbPerItem: 100, minRatio: 30, maxRatio: 40, color: "white" }
    ];

    const result = calculator.calculate(rows, 2400, "Crucible", 5000);

    expect(result.possible).toBe(true);
    expect(result.elapsedMs).toBeLessThan(1000);
  });
});

describe("AlloyCalculator adapter", () => {
  it("returns user-facing totals and leftover mB", () => {
    const calculator = new AlloyCalculator();
    const result = calculator.calculate({
      alloyName: "Copper Only",
      targetIngots: 7,
      mbPerIngot: 144,
      mode: "Crucible",
      crucibleCapacity: 3000,
      rows: [{ rowId: 1, name: "Copper", owned: 10, mbPerItem: 144, minRatio: 0, maxRatio: 100, color: "red" }]
    });

    expect(result.possible).toBe(true);
    expect(result.totalMb).toBe(1008);
    expect(result.leftoverMb).toBe(0);
    expect(result.ratioIgnored).toBe(true);
  });

  it("rejects invalid and boundary inputs", () => {
    const calculator = new AlloyCalculator();
    expect(() => calculator.calculate({
      alloyName: "Bad",
      targetIngots: 0,
      mbPerIngot: 100,
      mode: "Vessel",
      rows: [{ rowId: 1, name: "Copper", owned: 10, mbPerItem: 100, minRatio: 0, maxRatio: 100, color: "red" }]
    })).toThrow("Target craft count must be greater than 0.");

    expect(() => calculator.calculate({
      alloyName: "Too Big",
      targetIngots: 31,
      mbPerIngot: 100,
      mode: "Vessel",
      rows: [{ rowId: 1, name: "Copper", owned: 64, mbPerItem: 100, minRatio: 0, maxRatio: 100, color: "red" }]
    })).toThrow("Target mB (3100) is larger than Vessel capacity (3024 mB).");
  });
});
