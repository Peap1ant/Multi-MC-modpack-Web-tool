import { AlloyCalculator } from "@tfc-alloy/shared";
import type { CalculationRequest, CalculationResult } from "@tfc-alloy/shared";

const calculator = new AlloyCalculator();

export interface CalculateResponse {
  result: CalculationResult;
  elapsedMs: number;
  uiElapsedMs: number;
}

/** Runs the shared TypeScript calculation engine in-browser for static hosting. */
export function calculateAlloy(request: CalculationRequest): Promise<CalculateResponse> {
  const started = performance.now();
  const result = calculator.calculate(request);
  const uiElapsedMs = performance.now() - started;
  return Promise.resolve({
    result,
    elapsedMs: result.elapsedMs,
    uiElapsedMs
  });
}
