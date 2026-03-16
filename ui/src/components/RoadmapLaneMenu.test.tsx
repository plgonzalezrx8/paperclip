// @vitest-environment jsdom

import type { ReactNode } from "react";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RoadmapLaneMenu } from "./RoadmapLaneMenu";

const onMoveMock = vi.fn();

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    disabled,
    onSelect,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onSelect?: () => void;
  }) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.()}
    >
      {children}
    </button>
  ),
}));

describe("RoadmapLaneMenu", () => {
  beforeEach(() => {
    onMoveMock.mockReset();
  });

  it("omits status when moving between planning lanes", async () => {
    const user = userEvent.setup();

    render(
      <RoadmapLaneMenu
        goal={{ planningHorizon: "now", status: "active" }}
        onMove={onMoveMock}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(onMoveMock).toHaveBeenCalledWith({ planningHorizon: "next" });
  });

  it("sends the expected terminal status transitions", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <RoadmapLaneMenu
        goal={{ planningHorizon: "now", status: "active" }}
        onMove={onMoveMock}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onMoveMock).toHaveBeenLastCalledWith({ status: "achieved" });

    rerender(
      <RoadmapLaneMenu
        goal={{ planningHorizon: "now", status: "achieved" }}
        onMove={onMoveMock}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onMoveMock).toHaveBeenLastCalledWith({
      planningHorizon: "next",
      status: "planned",
    });
  });
});
