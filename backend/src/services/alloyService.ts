import { AlloyCalculator, validateCalculationRequest } from "@tfc-alloy/shared";
import type { AlloyMode, CalculationRequest, CalculationResult, MaterialRowData } from "@tfc-alloy/shared";

const calculator = new AlloyCalculator();

/** Parses unknown JSON into the strict calculation request shape used by the core engine. */
export function parseCalculationRequest(input: unknown): CalculationRequest {
  if (!input || typeof input !== "object") throw new Error("Request body must be a JSON object.");
  const body = input as Record<string, unknown>;
  if (!Array.isArray(body.rows)) throw new Error("rows must be an array.");

  const mode = body.mode === "Crucible" ? "Crucible" : body.mode === "Vessel" ? "Vessel" : undefined;
  if (!mode) throw new Error("mode must be Vessel or Crucible.");

  const rows: MaterialRowData[] = body.rows.map((row, index) => parseMaterialRow(row, index));
  const request: CalculationRequest = {
    rows,
    alloyName: String(body.alloyName ?? "").trim(),
    targetIngots: Number(body.targetIngots),
    mbPerIngot: Number(body.mbPerIngot),
    mode,
    crucibleCapacity: body.crucibleCapacity === undefined || body.crucibleCapacity === null || body.crucibleCapacity === ""
      ? undefined
      : Number(body.crucibleCapacity)
  };
  validateCalculationRequest(request);
  return request;
}

/** Runs validation and delegates all alloy math to the shared pure TypeScript engine. */
export function calculateAlloy(input: unknown): CalculationResult {
  return calculator.calculate(parseCalculationRequest(input));
}

function parseMaterialRow(row: unknown, index: number): MaterialRowData {
  if (!row || typeof row !== "object") throw new Error(`rows[${index}] must be an object.`);
  const value = row as Record<string, unknown>;
  return {
    rowId: Number(value.rowId ?? index + 1),
    name: String(value.name ?? "").trim(),
    owned: Number(value.owned),
    mbPerItem: Number(value.mbPerItem),
    minRatio: Number(value.minRatio ?? 0),
    maxRatio: Number(value.maxRatio ?? 100),
    color: String(value.color ?? "")
  };
}
