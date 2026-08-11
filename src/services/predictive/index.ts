/**
 * Predictive Analytics Engine
 * Uses statistical models and ML heuristics to forecast project health trends
 */
import type { HealthMetrics, TimeSeriesDataPoint } from "@/types";

// ─── Simple Moving Average ───

export function simpleMovingAverage(data: number[], window: number): number[] {
  if (data.length < window) return data;
  const result: number[] = [];
  for (let i = window - 1; i < data.length; i++) {
    const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / window);
  }
  return result;
}

// ─── Exponential Moving Average ───

export function exponentialMovingAverage(data: number[], alpha: number = 0.3): number[] {
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

// ─── Linear Regression ───

export interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number; // R-squared (goodness of fit)
  predictions: number[];
  trend: "rising" | "falling" | "stable";
  confidence: number; // 0-1
}

export function linearRegression(
  yValues: number[],
  forecastPeriods: number = 4
): RegressionResult {
  const n = yValues.length;
  const xValues = Array.from({ length: n }, (_, i) => i);

  // Calculate means
  const meanX = xValues.reduce((a, b) => a + b, 0) / n;
  const meanY = yValues.reduce((a, b) => a + b, 0) / n;

  // Calculate slope and intercept
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (xValues[i] - meanX) * (yValues[i] - meanY);
    denominator += (xValues[i] - meanX) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = meanY - slope * meanX;

  // Calculate R-squared
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xValues[i] + intercept;
    ssRes += (yValues[i] - predicted) ** 2;
    ssTot += (yValues[i] - meanY) ** 2;
  }
  const r2 = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  // Generate predictions
  const predictions: number[] = [];
  for (let i = 0; i < forecastPeriods; i++) {
    const x = n + i;
    predictions.push(Math.max(0, slope * x + intercept));
  }

  // Determine trend
  let trend: "rising" | "falling" | "stable" = "stable";
  if (slope > 0.5) trend = "rising";
  else if (slope < -0.5) trend = "falling";

  return {
    slope,
    intercept,
    r2: Math.max(0, Math.min(1, r2)),
    predictions,
    trend,
    confidence: r2,
  };
}

// ─── Issue Burndown Prediction ───

export interface BurndownPrediction {
  currentIssues: number;
  weeklyCloseRate: number;
  weeksToZero: number;
  projectedDate: Date;
  isImproving: boolean;
  recommendedActions: string[];
}

export function predictIssueBurndown(
  openIssues: number,
  weeklyClosedHistory: number[],
  weeklyOpenedHistory: number[]
): BurndownPrediction {
  const avgClosed = weeklyClosedHistory.length > 0
    ? weeklyClosedHistory.reduce((a, b) => a + b, 0) / weeklyClosedHistory.length
    : 0;

  const avgOpened = weeklyOpenedHistory.length > 0
    ? weeklyOpenedHistory.reduce((a, b) => a + b, 0) / weeklyOpenedHistory.length
    : 0;

  const netChange = avgClosed - avgOpened;
  const weeksToZero = netChange > 0 ? Math.ceil(openIssues / netChange) : Infinity;

  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + weeksToZero * 7);

  const isImproving = weeklyClosedHistory.length >= 2 &&
    weeklyClosedHistory[weeklyClosedHistory.length - 1] > weeklyClosedHistory[weeklyClosedHistory.length - 2];

  const recommendedActions: string[] = [];
  if (netChange <= 0) {
    recommendedActions.push("Issue count is growing — consider a bug bash or closing stale issues");
    recommendedActions.push("Add 'stale' label and auto-close issues inactive > 90 days");
  }
  if (avgOpened > avgClosed * 1.5) {
    recommendedActions.push("New issues outpace closures — review issue templates to reduce low-quality submissions");
  }
  if (weeksToZero > 26) {
    recommendedActions.push(`Backlog would take ${weeksToZero} weeks to clear — prioritize with AI triage`);
  }

  return {
    currentIssues: openIssues,
    weeklyCloseRate: avgClosed,
    weeksToZero,
    projectedDate,
    isImproving,
    recommendedActions,
  };
}

// ─── PR Merge Time Prediction ───

export interface PRPrediction {
  avgMergeTimeHours: number;
  predictedNextPRMergeHours: number;
  bottleneckFiles: string[];
  optimalReviewerCount: number;
  weekendDelayFactor: number;
}

export function predictPRMergeTime(
  historicalMergeTimes: number[],
  recentPRFiles: { files: number; additions: number; deletions: number }[]
): PRPrediction {
  const avgMergeTime = historicalMergeTimes.length > 0
    ? historicalMergeTimes.reduce((a, b) => a + b, 0) / historicalMergeTimes.length
    : 48;

  // Heuristic: merge time correlates with PR size
  const avgFiles = recentPRFiles.length > 0
    ? recentPRFiles.reduce((a, b) => a + b.files, 0) / recentPRFiles.length
    : 5;

  const predictedTime = avgMergeTime * (1 + (avgFiles - 5) * 0.15);

  // Bottleneck detection
  const bottleneckFiles: string[] = [];
  if (avgFiles > 20) bottleneckFiles.push("Large PRs (>20 files) take significantly longer to review");
  if (avgMergeTime > 72) bottleneckFiles.push("Reviews spanning >3 days — consider automated PR review");

  return {
    avgMergeTimeHours: avgMergeTime,
    predictedNextPRMergeHours: Math.round(predictedTime),
    bottleneckFiles,
    optimalReviewerCount: Math.min(3, Math.ceil(avgFiles / 10)),
    weekendDelayFactor: 1.3,
  };
}

// ─── Contributor Churn Prediction ───

export interface ChurnPrediction {
  activeContributors: number;
  atRiskContributors: number;
  churnRate: number;
  projectedContributors30Days: number;
  retentionSuggestions: string[];
}

export function predictContributorChurn(
  currentContributors: number,
  monthlyNewContributors: number[],
  monthlyLostContributors: number[]
): ChurnPrediction {
  const avgNew = monthlyNewContributors.length > 0
    ? monthlyNewContributors.reduce((a, b) => a + b, 0) / monthlyNewContributors.length
    : 0;

  const avgLost = monthlyLostContributors.length > 0
    ? monthlyLostContributors.reduce((a, b) => a + b, 0) / monthlyLostContributors.length
    : 0;

  const churnRate = currentContributors > 0 ? avgLost / currentContributors : 0;
  const projected = Math.max(0, currentContributors + avgNew - avgLost);

  const retentionSuggestions: string[] = [];
  if (churnRate > 0.1) {
    retentionSuggestions.push("High churn detected — add contributor recognition (badges, shoutouts)");
    retentionSuggestions.push("Create 'good first issue' labels to onboard newcomers");
  }
  if (avgNew < 1) {
    retentionSuggestions.push("Low new contributor inflow — promote project on social media and dev communities");
  }

  return {
    activeContributors: currentContributors,
    atRiskContributors: Math.round(currentContributors * churnRate),
    churnRate: Math.round(churnRate * 100) / 100,
    projectedContributors30Days: Math.round(projected),
    retentionSuggestions,
  };
}

// ─── Health Score Forecasting ───

export function forecastHealthScore(
  healthHistory: number[],
  periods: number = 6
): { forecast: number[]; confidence: number[]; warningZone: boolean } {
  if (healthHistory.length < 3) {
    return {
      forecast: Array(periods).fill(healthHistory[0] || 50),
      confidence: Array(periods).fill(0.3),
      warningZone: false,
    };
  }

  // Apply exponential smoothing
  const smoothed = exponentialMovingAverage(healthHistory, 0.4);

  // Linear regression for trend
  const regression = linearRegression(smoothed, periods);

  // Confidence decreases with forecast horizon
  const confidence = Array.from({ length: periods }, (_, i) =>
    Math.max(0.1, regression.confidence * (1 - i * 0.12))
  );

  const warningZone = regression.predictions.some((p) => p < 40);

  return {
    forecast: regression.predictions.map((p) => Math.round(Math.min(100, Math.max(0, p)))),
    confidence: confidence.map((c) => Math.round(c * 100) / 100),
    warningZone,
  };
}

// ─── Anomaly Detection ───

export interface Anomaly {
  metric: string;
  value: number;
  expectedRange: [number, number];
  severity: "critical" | "warning" | "info";
  timestamp: Date;
  description: string;
}

export function detectAnomalies(
  metrics: { name: string; values: number[]; thresholds: { min: number; max: number } }[]
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const metric of metrics) {
    if (metric.values.length < 5) continue;

    const recent = metric.values.slice(-3);
    const historical = metric.values.slice(0, -3);
    const histMean = historical.reduce((a, b) => a + b, 0) / historical.length;
    const histStd = Math.sqrt(
      historical.reduce((a, b) => a + (b - histMean) ** 2, 0) / historical.length
    );

    const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;

    // Z-score anomaly detection
    const zScore = histStd > 0 ? Math.abs(recentMean - histMean) / histStd : 0;

    if (zScore > 3) {
      anomalies.push({
        metric: metric.name,
        value: recentMean,
        expectedRange: [histMean - 2 * histStd, histMean + 2 * histStd],
        severity: "critical",
        timestamp: new Date(),
        description: `${metric.name} is ${recentMean > histMean ? "significantly above" : "significantly below"} normal range (z-score: ${zScore.toFixed(2)})`,
      });
    } else if (zScore > 2) {
      anomalies.push({
        metric: metric.name,
        value: recentMean,
        expectedRange: [histMean - 2 * histStd, histMean + 2 * histStd],
        severity: "warning",
        timestamp: new Date(),
        description: `${metric.name} shows unusual deviation (z-score: ${zScore.toFixed(2)})`,
      });
    }
  }

  return anomalies;
}

// ─── Seasonality Detection ───

export function detectSeasonality(data: number[], periodLength: number = 7): {
  hasSeasonality: boolean;
  seasonalPattern: number[];
  strength: number;
} {
  if (data.length < periodLength * 3) {
    return { hasSeasonality: false, seasonalPattern: [], strength: 0 };
  }

  // Calculate average for each position in the period
  const seasonalAvg: number[] = Array(periodLength).fill(0);
  const counts: number[] = Array(periodLength).fill(0);

  for (let i = 0; i < data.length; i++) {
    const pos = i % periodLength;
    seasonalAvg[pos] += data[i];
    counts[pos]++;
  }

  for (let i = 0; i < periodLength; i++) {
    seasonalAvg[i] = counts[i] > 0 ? seasonalAvg[i] / counts[i] : 0;
  }

  // Calculate overall mean
  const overallMean = data.reduce((a, b) => a + b, 0) / data.length;

  // Calculate seasonal strength
  let seasonalVariance = 0;
  for (const val of seasonalAvg) {
    seasonalVariance += (val - overallMean) ** 2;
  }
  seasonalVariance /= periodLength;

  const totalVariance = data.reduce((a, b) => a + (b - overallMean) ** 2, 0) / data.length;
  const strength = totalVariance > 0 ? seasonalVariance / totalVariance : 0;

  return {
    hasSeasonality: strength > 0.1,
    seasonalPattern: seasonalAvg.map((v) => Math.round(v * 100) / 100),
    strength: Math.round(strength * 100) / 100,
  };
}
