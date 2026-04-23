export const HEALTH_STATUS = {
  HEALTHY: "healthy",
  DEGRADED: "degraded",
} as const;

export type HealthStatus = typeof HEALTH_STATUS[keyof typeof HEALTH_STATUS];
