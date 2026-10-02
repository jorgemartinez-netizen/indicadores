import React, { memo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
const tooltip = {
  background: "#19232b",
  border: "1px solid #3b4a55",
  borderRadius: 10,
};
export const TurnTrend = memo(function TurnTrend({ data }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%" debounce={150}>
        <LineChart data={data}>
          <CartesianGrid stroke="#29363f" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#9cacb7"
            tickLine={false}
            minTickGap={35}
          />
          <YAxis stroke="#9cacb7" tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={tooltip} />
          <Line
            type="linear"
            dataKey="turns"
            name="Turnos"
            stroke="#f7bc42"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="flagged"
            name="Con inconsistencias"
            stroke="#fa6f74"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
export const ServiceChart = memo(function ServiceChart({ data }) {
  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height="100%" debounce={150}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid stroke="#29363f" horizontal={false} />
          <XAxis type="number" stroke="#9cacb7" allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={120} stroke="#9cacb7" />
          <Tooltip contentStyle={tooltip} />
          <Bar
            dataKey="turns"
            name="Turnos"
            fill="#f7bc42"
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
