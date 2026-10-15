type ApiMetric = { at: number; status: number; durationMs: number };

declare global {
  var __mackhenApiMetrics: ApiMetric[] | undefined;
}

function store(): ApiMetric[] {
  globalThis.__mackhenApiMetrics ??= [];
  return globalThis.__mackhenApiMetrics;
}

export function recordApiMetric(status: number, durationMs: number): void {
  const metrics = store();
  const now = Date.now();
  metrics.push({ at: now, status, durationMs: Math.max(0, Math.round(durationMs)) });
  const cutoff = now - 15 * 60 * 1000;
  while (metrics.length && (metrics.length > 3000 || metrics[0].at < cutoff)) metrics.shift();
}

export function getApiMetrics() {
  const cutoff = Date.now() - 15 * 60 * 1000;
  const recent = store().filter((metric) => metric.at >= cutoff);
  const total = recent.length;
  const errors500 = recent.filter((metric) => metric.status === 500).length;
  const errors504 = recent.filter((metric) => metric.status === 504).length;
  return {
    sampleCount: total,
    averageLatencyMs: total ? Math.round(recent.reduce((sum, metric) => sum + metric.durationMs, 0) / total) : null,
    errors500,
    errors504,
    errorRate5xxPercent: total ? Number((recent.filter((metric) => metric.status >= 500).length / total * 100).toFixed(2)) : null,
    windowMinutes: 15,
  };
}
