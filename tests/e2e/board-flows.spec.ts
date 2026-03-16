import { expect, test } from "@playwright/test";
import { createAgent, createApproval, createCompany, createProject, listCompanies } from "./helpers";

const suffix = Date.now().toString(36);
const primaryCompanyName = `E2E Primary ${suffix}`;
const secondaryCompanyName = `E2E Secondary ${suffix}`;
const primaryMission = "Ship stronger regression coverage.";
const agentName = `Builder Bot ${suffix}`;
const projectName = `Coverage Project ${suffix}`;
const approvalTitle = `Roadmap Plan ${suffix}`;
const createdIssueTitle = `Coverage gap ${suffix}`;
const updatedIssueTitle = `Coverage hardened ${suffix}`;

const seed: {
  primaryCompanyId?: string;
  primaryPrefix?: string;
  primaryCompanyName?: string;
  secondaryPrefix?: string;
  agentId?: string;
  projectId?: string;
  approvalId?: string;
} = {};

function requireSeedValue<T>(value: T | undefined, label: string): T {
  expect(value, `${label} should be seeded before this step`).toBeTruthy();
  return value as T;
}

test.describe.serial("board UI flows", () => {
  test("creates the first company in onboarding and switches companies", async ({ page, request }) => {
    await page.goto("/");

    await expect(page.getByText("Create your first company")).toBeVisible();
    await page.getByPlaceholder("Acme Corp").fill(primaryCompanyName);
    await page.getByPlaceholder("What is this company trying to achieve?").fill(primaryMission);
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Create your first agent")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page).toHaveURL(/\/[^/]+\/dashboard$/);

    const companies = await listCompanies(request);
    const primaryCompany = companies.find((company) => company.name === primaryCompanyName);
    expect(primaryCompany).toBeTruthy();

    seed.primaryCompanyId = primaryCompany?.id as string;
    seed.primaryPrefix = primaryCompany?.issuePrefix as string;
    seed.primaryCompanyName = primaryCompanyName;

    const secondaryCompany = await createCompany(request, {
      name: secondaryCompanyName,
      description: "Verify switching and route synchronization.",
    });
    seed.secondaryPrefix = secondaryCompany.issuePrefix as string;

    const createdAgent = await createAgent(request, seed.primaryCompanyId, {
      name: agentName,
      role: "engineer",
      adapterConfig: {
        command: "node",
        args: ["-e", "setTimeout(() => process.exit(0), 50)"],
        timeoutSec: 10,
      },
    });
    seed.agentId = createdAgent.id as string;

    const createdProject = await createProject(request, seed.primaryCompanyId, {
      name: projectName,
      description: "Project for browser-driven issue edits.",
    });
    seed.projectId = createdProject.id as string;

    const createdApproval = await createApproval(request, seed.primaryCompanyId, {
      requestedByAgentId: seed.agentId,
      payload: {
        title: approvalTitle,
        summary: "Promote the next testing pass with a real approval decision flow.",
      },
    });
    seed.approvalId = createdApproval.id as string;

    await page.reload();
    await page.goto("/companies");
    await page.getByRole("button", { name: new RegExp(secondaryCompanyName) }).click();
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`/${seed.secondaryPrefix}/dashboard$`));
    await expect(
      page.getByRole("heading", { name: new RegExp(`${secondaryCompanyName} operations`) }),
    ).toBeVisible();

    await page.goto("/companies");
    await page.getByRole("button", { name: new RegExp(primaryCompanyName) }).click();
    await page.goto("/");
    await expect(page).toHaveURL(new RegExp(`/${seed.primaryPrefix}/dashboard$`));
  });

  test("creates, edits, and assigns an issue from the board UI and reflects it on the dashboard", async ({ page }) => {
    const primaryPrefix = requireSeedValue(seed.primaryPrefix, "primary company prefix");

    await page.goto(`/${primaryPrefix}/issues`);
    await page.locator("#main-content").getByRole("button", { name: /New Issue/i }).click();
    await page.getByPlaceholder("Issue title").fill(createdIssueTitle);
    await page.getByRole("button", { name: "Create Issue" }).click();

    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 15_000 });

    const createdIssueLink = page.getByRole("link", { name: new RegExp(createdIssueTitle) });
    await expect(createdIssueLink).toBeVisible({ timeout: 15_000 });
    await createdIssueLink.click();

    const titleHeading = page.locator("h2", { hasText: createdIssueTitle });
    await expect(titleHeading).toBeVisible();
    await titleHeading.click();
    const titleEditor = page.locator("textarea").first();
    await titleEditor.fill(updatedIssueTitle);
    await titleEditor.press("Enter");
    await expect(page.locator("h2", { hasText: updatedIssueTitle })).toBeVisible();

    await page.getByRole("button", { name: /Unassigned|No assignee/i }).click();
    await page.getByRole("button", { name: agentName }).click();
    await expect(page.getByText(agentName)).toBeVisible();

    await page.getByRole("button", { name: /No project/i }).click();
    await page.getByRole("button", { name: projectName }).last().click();
    await expect(page.getByText(projectName)).toBeVisible();

    await page.getByRole("button", { name: "Todo" }).first().click();
    await page.getByRole("button", { name: "In Progress" }).click();
    await expect(page.getByRole("button", { name: "In Progress" }).first()).toBeVisible();

    await page.goto(`/${primaryPrefix}/dashboard`);
    const tasksCard = page.getByRole("link", { name: /Tasks In Progress/ });
    await expect(tasksCard).toContainText("1");
  });

  test("approves pending work and persists company settings mutations", async ({ page }) => {
    const primaryPrefix = requireSeedValue(seed.primaryPrefix, "primary company prefix");
    const currentPrimaryName = requireSeedValue(seed.primaryCompanyName, "primary company name");
    const nextPrimaryName = `${currentPrimaryName} Labs`;

    await page.goto(`/${primaryPrefix}/approvals/pending`);
    await expect(page.getByText(approvalTitle)).toBeVisible();
    await page.getByRole("button", { name: "Approve" }).click();
    await expect(page).toHaveURL(new RegExp(`/approvals/${requireSeedValue(seed.approvalId, "approval id")}`));
    await expect(page.getByText(/approved/i).first()).toBeVisible();

    await page.goto(`/${primaryPrefix}/company/settings`);
    const companyNameInput = page.getByRole("textbox").first();
    await expect(companyNameInput).toHaveValue(currentPrimaryName);
    await companyNameInput.fill(nextPrimaryName);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(companyNameInput).toHaveValue(nextPrimaryName);
    await expect(page.getByText(nextPrimaryName).first()).toBeVisible();

    await page.getByRole("button", { name: "Generate OpenClaw Invite Prompt" }).click();
    await expect(page.getByText("OpenClaw Invite Prompt", { exact: true })).toBeVisible();

    seed.primaryCompanyName = nextPrimaryName;
  });
});
