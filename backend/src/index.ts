import cors from "cors";
import express from "express";
import { calculationRouter } from "./routes/calculate.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:5173" }));
app.use(express.json({ limit: "256kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.use("/api", calculationRouter);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  response.status(500).json({ error: message });
});

app.listen(port, () => {
  console.log(`TFC alloy calculator API listening on http://localhost:${port}`);
});
