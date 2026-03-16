import { expect, type APIRequestContext } from "@playwright/test";

type JsonRecord = Record<string, unknown>;

async function expectOk(response: Awaited<ReturnType<APIRequestContext["get"]>>, label: string) {
  const body = await response.text();
  expect(
    response.ok(),
    `${label} failed with ${response.status()} ${response.statusText()}: ${body}`,
  ).toBeTruthy();
  return body ? JSON.parse(body) : null;
}

export async function listCompanies(request: APIRequestContext) {
  const response = await request.get("/api/companies");
  return await expectOk(response, "list companies") as Array<JsonRecord>;
}

export async function createCompany(
  request: APIRequestContext,
  input: { name: string; description?: string | null; budgetMonthlyCents?: number },
) {
  const response = await request.post("/api/companies", {
    data: {
      name: input.name,
      description: input.description ?? null,
      budgetMonthlyCents: input.budgetMonthlyCents ?? 0,
    },
  });
  return await expectOk(response, "create company") as JsonRecord;
}

export async function createAgent(
  request: APIRequestContext,
  companyId: string,
  input: {
    name: string;
    role?: string;
    adapterType?: string;
    adapterConfig?: JsonRecord;
  },
) {
  const response = await request.post(`/api/companies/${companyId}/agents`, {
    data: {
      name: input.name,
      role: input.role ?? "engineer",
      adapterType: input.adapterType ?? "process",
      adapterConfig: input.adapterConfig ?? {
        command: "node",
        args: ["-e", "process.exit(0)"],
        timeoutSec: 10,
      },
    },
  });
  return await expectOk(response, "create agent") as JsonRecord;
}

export async function createProject(
  request: APIRequestContext,
  companyId: string,
  input: { name: string; description?: string | null; status?: string },
) {
  const response = await request.post(`/api/companies/${companyId}/projects`, {
    data: {
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "in_progress",
      goalId: null,
      goalIds: [],
      leadAgentId: null,
    },
  });
  return await expectOk(response, "create project") as JsonRecord;
}

export async function createApproval(
  request: APIRequestContext,
  companyId: string,
  input: {
    requestedByAgentId: string;
    issueIds?: string[];
    payload: JsonRecord;
  },
) {
  const response = await request.post(`/api/companies/${companyId}/approvals`, {
    data: {
      type: "approve_manager_plan",
      requestedByAgentId: input.requestedByAgentId,
      issueIds: input.issueIds ?? [],
      payload: input.payload,
    },
  });
  return await expectOk(response, "create approval") as JsonRecord;
}
