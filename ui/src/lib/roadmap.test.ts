import { describe, expect, it } from "vitest";
import {
  buildRoadmapLanePatch,
  getGoalStatusLabel,
  getRoadmapLane,
} from "./roadmap";

describe("roadmap lane helpers", () => {
  it("moves terminal roadmap items into dedicated board lanes", () => {
    expect(
      getRoadmapLane({ planningHorizon: "now", status: "achieved" })
    ).toBe("done");
    expect(
      getRoadmapLane({ planningHorizon: "later", status: "cancelled" })
    ).toBe("archived");
  });

  it("reopens terminal roadmap items when they move back into planning lanes", () => {
    expect(
      buildRoadmapLanePatch(
        { planningHorizon: "now", status: "achieved" },
        "next"
      )
    ).toEqual({
      planningHorizon: "next",
      status: "planned",
    });
  });

  it("omits stale status when moving between planning lanes", () => {
    expect(
      buildRoadmapLanePatch(
        { planningHorizon: "now", status: "active" },
        "next"
      )
    ).toEqual({
      planningHorizon: "next",
    });
  });

  it("sends explicit terminal statuses only when the lane transition requires it", () => {
    expect(
      buildRoadmapLanePatch(
        { planningHorizon: "now", status: "active" },
        "done"
      )
    ).toEqual({
      status: "achieved",
    });

    expect(
      buildRoadmapLanePatch(
        { planningHorizon: "later", status: "active" },
        "archived"
      )
    ).toEqual({
      status: "cancelled",
    });
  });

  it("keeps user-facing roadmap labels aligned with board language", () => {
    expect(getGoalStatusLabel("achieved")).toBe("done");
    expect(getGoalStatusLabel("cancelled")).toBe("archived");
    expect(getGoalStatusLabel("active")).toBe("active");
  });
});
