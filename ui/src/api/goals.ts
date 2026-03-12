import type { Goal } from "@paperclipai/shared";
import { api } from "./client";

export const goalsApi = {
  list: (companyId: string) => api.get<Goal[]>(`/companies/${companyId}/roadmap`),
  get: (id: string) => api.get<Goal>(`/roadmap/${id}`),
  create: (companyId: string, data: Record<string, unknown>) =>
    api.post<Goal>(`/companies/${companyId}/roadmap`, data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Goal>(`/roadmap/${id}`, data),
  remove: (id: string) => api.delete<Goal>(`/roadmap/${id}`),
};
