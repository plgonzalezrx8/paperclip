import type { HealthStatus } from "../constants.js";

export interface SubsystemHealthCheck {
  id: string;
  label: string;
  status: HealthStatus;
  summary: string;
  detail: string | null;
  hint: string | null;
  // Blocking checks gate confidence in the control plane itself; advisory checks can be degraded
  // without preventing the rest of the instance from operating.
  blocking: boolean;
  testedAt: string;
}

export interface SubsystemHealthResponse {
  status: HealthStatus;
  checks: SubsystemHealthCheck[];
  testedAt: string;
}
