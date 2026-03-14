import { describe, expect, it } from "vitest";
import { parseStructuredStdoutLine } from "../services/run-transcript-events.js";

describe("run transcript event parsing", () => {
  it("normalizes codex command execution events into structured run events", () => {
    const ts = "2026-03-14T12:00:00.000Z";

    const started = parseStructuredStdoutLine(
      "codex_local",
      JSON.stringify({
        type: "item.started",
        item: {
          type: "command_execution",
          id: "cmd-1",
          command: "pnpm -r typecheck",
        },
      }),
      ts,
    );
    const completed = parseStructuredStdoutLine(
      "codex_local",
      JSON.stringify({
        type: "item.completed",
        item: {
          type: "command_execution",
          id: "cmd-1",
          command: "pnpm -r typecheck",
          status: "completed",
          exit_code: 0,
          aggregated_output: "All projects passed\n",
        },
      }),
      ts,
    );

    expect(started).toEqual([
      {
        eventType: "command.execution.started",
        stream: "stdout",
        level: "info",
        message: "pnpm -r typecheck",
        payload: {
          toolName: "command_execution",
          input: {
            id: "cmd-1",
            command: "pnpm -r typecheck",
          },
        },
      },
    ]);

    expect(completed).toEqual([
      {
        eventType: "command.execution.completed",
        stream: "stdout",
        level: "info",
        message: "pnpm -r typecheck",
        payload: {
          toolUseId: "cmd-1",
          command: "pnpm -r typecheck",
          status: "completed",
          exitCode: 0,
          outputSnippet: "All projects passed",
          content: "command: pnpm -r typecheck\nstatus: completed\nexit_code: 0\n\nAll projects passed",
          isError: false,
        },
      },
    ]);
  });

  it("falls back cleanly when an adapter does not have a structured parser", () => {
    expect(parseStructuredStdoutLine("process", "plain stdout", "2026-03-14T12:00:00.000Z")).toEqual([]);
  });
});
