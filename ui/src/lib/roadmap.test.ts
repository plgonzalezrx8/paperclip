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

  it("keeps user-facing roadmap labels aligned with board language", () => {
    expect(getGoalStatusLabel("achieved")).toBe("done");
    expect(getGoalStatusLabel("cancelled")).toBe("archived");
    expect(getGoalStatusLabel("active")).toBe("active");
  });
});
