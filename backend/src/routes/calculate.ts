import { Router } from "express";
import { calculateAlloy } from "../services/alloyService.js";

export const calculationRouter = Router();

calculationRouter.post("/calculate", (request, response) => {
  const started = performance.now();
  try {
    const result = calculateAlloy(request.body);
    const apiElapsedMs = performance.now() - started;
    console.info("POST /api/calculate", {
      possible: result.possible,
      totalMb: result.totalMb,
      elapsedMs: Number(result.elapsedMs.toFixed(3)),
      apiElapsedMs: Number(apiElapsedMs.toFixed(3))
    });
    response.json({ result, elapsedMs: result.elapsedMs, apiElapsedMs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid calculation request.";
    response.status(400).json({ error: message, elapsedMs: performance.now() - started });
  }
});
