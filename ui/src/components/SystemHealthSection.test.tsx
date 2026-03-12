import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SystemHealthSection } from "./SystemHealthSection";

describe("SystemHealthSection", () => {
  it("renders subsystem summaries with blocking and advisory labels", () => {
    const html = renderToStaticMarkup(
      <SystemHealthSection
        isLoading={false}
        isRefetching={false}
        onRefresh={() => {}}
        data={{
          status: "yellow",
          testedAt: "2026-03-09T10:00:00.000Z",
          checks: [
            {
              id: "database",
              label: "Database",
              status: "green",
              summary: "Database is reachable and migrations are current.",
              detail: "28 migrations applied.",
              hint: null,
              blocking: true,
              testedAt: "2026-03-09T10:00:00.000Z",
            },
            {
              id: "qmd",
              label: "QMD",
              status: "yellow",
              summary: "QMD is not installed.",
              detail: "Knowledge recall will be degraded.",
              hint: "Install qmd to enable full memory support.",
              blocking: false,
              testedAt: "2026-03-09T10:00:00.000Z",
            },
          ],
        }}
      />,
    );

    expect(html).toContain("System Health");
    expect(html).toContain("Database is reachable and migrations are current.");
    expect(html).toContain("QMD is not installed.");
    expect(html).toContain("blocking");
    expect(html).toContain("advisory");
    expect(html).toContain("Refresh");
  });
});
