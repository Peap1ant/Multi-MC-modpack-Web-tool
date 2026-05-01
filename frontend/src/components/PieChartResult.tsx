import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CalculationResult } from "@tfc-alloy/shared";
import type { getTranslations } from "../i18n/translations.js";

interface PieChartResultProps {
  result: CalculationResult;
  labels: ReturnType<typeof getTranslations>;
}

export function PieChartResult({ result, labels }: PieChartResultProps) {
  const data = Object.entries(result.materialMbs)
    .filter(([, mb]) => mb > 0)
    .map(([name, mb]) => ({
      name,
      value: mb,
      ratio: result.materialRatios[name] ?? 0,
      color: result.colors[name] ?? "#64748b"
    }));

  if (data.length === 0) return null;

  return (
    <section>
      <h3>{labels.compositionChart}</h3>
      <div className="chart-box">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" outerRadius={86} label={({ name, ratio }) => `${name} ${Number(ratio).toFixed(1)}%`}>
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <Tooltip formatter={(value, _name, item) => [`${value} mB (${Number(item.payload.ratio).toFixed(2)}%)`, labels.materialRatio]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
