"use client";

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ScatterChart, Scatter, ZAxis,
  Treemap, Sankey,
} from "recharts";
import { cn } from "@/lib/utils";

// ─── Color Palettes ───

export const CHART_COLORS = {
  primary: ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"],
  health: ["#22c55e", "#f59e0b", "#ef4444"],
  priority: { critical: "#ef4444", high: "#f59e0b", medium: "#3b82f6", low: "#22c55e" },
  sentiment: { positive: "#22c55e", neutral: "#3b82f6", negative: "#ef4444" },
  risk: { high: "#ef4444", medium: "#f59e0b", low: "#22c55e" },
};

// ─── Chart Container ───

interface ChartContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  height?: number;
}

export function ChartContainer({ children, title, subtitle, className, height = 300 }: ChartContainerProps) {
  return (
    <div className={cn("card", className)}>
      {title && <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>}
      {subtitle && <p className="text-surface-400 text-sm mb-4">{subtitle}</p>}
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

// ─── Activity Bar Chart ───

interface ActivityBarProps {
  data: { name: string; issues?: number; prs?: number; commits?: number }[];
  height?: number;
  showLegend?: boolean;
}

export function ActivityBarChart({ data, height = 300, showLegend = true }: ActivityBarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        {showLegend && <Legend wrapperStyle={{ fontSize: "12px" }} />}
        {data.some((d) => d.issues !== undefined) && (
          <Bar dataKey="issues" fill={CHART_COLORS.primary[0]} radius={[4, 4, 0, 0]} name="Issues" />
        )}
        {data.some((d) => d.prs !== undefined) && (
          <Bar dataKey="prs" fill={CHART_COLORS.primary[3]} radius={[4, 4, 0, 0]} name="PRs" />
        )}
        {data.some((d) => d.commits !== undefined) && (
          <Bar dataKey="commits" fill={CHART_COLORS.primary[1]} radius={[4, 4, 0, 0]} name="Commits" />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Health Score Line Chart ───

interface HealthLineProps {
  data: { date: string; score: number }[];
  height?: number;
  threshold?: number;
}

export function HealthScoreLineChart({ data, height = 300, threshold = 40 }: HealthLineProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
        <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Area
          type="monotone"
          dataKey="score"
          fill="#22c55e20"
          stroke="#22c55e"
          strokeWidth={2}
          name="Health Score"
        />
        <Line
          type="monotone"
          dataKey={() => threshold}
          stroke="#ef4444"
          strokeDasharray="5 5"
          strokeWidth={1}
          name="Warning Zone"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Issue Distribution Pie ───

interface IssuePieProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  innerRadius?: number;
  showLegend?: boolean;
}

export function IssuePieChart({
  data,
  height = 300,
  innerRadius = 50,
  showLegend = true,
}: IssuePieProps) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={Math.min(height / 2.5, 120)}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || CHART_COLORS.primary[index % CHART_COLORS.primary.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="flex flex-wrap gap-3 justify-center mt-2">
          {data.map((item, idx) => (
            <div key={item.name} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: item.color || CHART_COLORS.primary[idx % CHART_COLORS.primary.length],
                }}
              />
              <span className="text-xs text-surface-400">
                {item.name}: {item.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Capability Radar ───

interface RadarProps {
  data: { metric: string; [key: string]: number | string }[];
  dataKeys: string[];
  colors?: string[];
  height?: number;
}

export function CapabilityRadarChart({ data, dataKeys, colors, height = 350 }: RadarProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="metric" stroke="#94a3b8" fontSize={11} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#64748b" fontSize={10} />
        {dataKeys.map((key, i) => (
          <Radar
            key={key}
            name={key}
            dataKey={key}
            stroke={colors?.[i] || CHART_COLORS.primary[i % CHART_COLORS.primary.length]}
            fill={colors?.[i] || CHART_COLORS.primary[i % CHART_COLORS.primary.length]}
            fillOpacity={0.15}
            strokeWidth={2}
          />
        ))}
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Sentiment Trend Area ───

interface SentimentAreaProps {
  data: { date: string; positive: number; neutral: number; negative: number }[];
  height?: number;
}

export function SentimentAreaChart({ data, height = 300 }: SentimentAreaProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Area
          type="monotone"
          dataKey="positive"
          stackId="1"
          stroke="#22c55e"
          fill="#22c55e30"
          name="Positive"
        />
        <Area
          type="monotone"
          dataKey="neutral"
          stackId="1"
          stroke="#3b82f6"
          fill="#3b82f630"
          name="Neutral"
        />
        <Area
          type="monotone"
          dataKey="negative"
          stackId="1"
          stroke="#ef4444"
          fill="#ef444430"
          name="Negative"
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Burn Down Chart ───

interface BurnDownProps {
  data: { week: string; actual: number; ideal: number }[];
  height?: number;
}

export function BurnDownChart({ data, height = 300 }: BurnDownProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="week" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#22c55e"
          strokeWidth={2}
          dot={{ fill: "#22c55e" }}
          name="Actual"
        />
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="#64748b"
          strokeDasharray="5 5"
          dot={false}
          name="Ideal"
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Contributor Scatter ───

interface ContributorScatterProps {
  data: { name: string; contributions: number; issues: number; prs: number }[];
  height?: number;
}

export function ContributorScatterChart({ data, height = 300 }: ContributorScatterProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="contributions" stroke="#64748b" fontSize={12} name="Contributions" />
        <YAxis dataKey="issues" stroke="#64748b" fontSize={12} name="Issues" />
        <ZAxis dataKey="prs" range={[30, 200]} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
          cursor={{ strokeDasharray: "3 3" }}
        />
        <Scatter data={data} fill="#22c55e" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}

// ─── Forecast Line ───

interface ForecastLineProps {
  historical: { date: string; value: number }[];
  forecast: { date: string; value: number; isPrediction: boolean }[];
  height?: number;
}

export function ForecastLineChart({ historical, forecast, height = 300 }: ForecastLineProps) {
  const combined = [
    ...historical.map((h) => ({ ...h, isPrediction: false })),
    ...forecast.map((f) => ({ ...f, isPrediction: true })),
  ];

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={combined}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
        <YAxis stroke="#64748b" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "8px",
            color: "#f1f5f9",
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#22c55e"
          strokeWidth={2}
          dot={false}
          name="Historical"
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="8 4"
          dot={{ fill: "#f59e0b", r: 3 }}
          name="Forecast"
          data={forecast}
        />
        <Legend wrapperStyle={{ fontSize: "12px" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── KPI Card ───

interface KPICardProps {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  icon?: React.ReactNode;
  color?: string;
  subtitle?: string;
}

export function KPICard({ label, value, trend, icon, color, subtitle }: KPICardProps) {
  const trendIcon = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const trendColor = trend === "up" ? "text-green-400" : trend === "down" ? "text-red-400" : "text-surface-400";

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className={color || "text-brand-400"}>{icon}</span>}
        <span className="text-surface-400 text-sm">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-white">{value}</span>
        {trend && <span className={`text-lg ${trendColor}`}>{trendIcon}</span>}
      </div>
      {subtitle && <p className="text-surface-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

// ─── Stat Grid ───

interface StatGridProps {
  items: { label: string; value: string | number; icon?: React.ReactNode }[];
  columns?: 2 | 3 | 4;
}

export function StatGrid({ items, columns = 4 }: StatGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-4`}>
      {items.map((item) => (
        <div key={item.label} className="card py-4">
          <div className="flex items-center gap-2 mb-1">
            {item.icon}
            <span className="text-surface-400 text-xs">{item.label}</span>
          </div>
          <div className="text-xl font-bold text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
