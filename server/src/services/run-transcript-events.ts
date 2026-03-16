import type { StdoutLineParser, TranscriptEntry } from "@paperclipai/adapter-utils";
import { parseClaudeStdoutLine } from "@paperclipai/adapter-claude-local/ui";
import { parseCodexStdoutLine } from "@paperclipai/adapter-codex-local/ui";
import { parseCursorStdoutLine } from "@paperclipai/adapter-cursor-local/ui";
import { parseOpenCodeStdoutLine } from "@paperclipai/adapter-opencode-local/ui";
import { parsePiStdoutLine } from "@paperclipai/adapter-pi-local/ui";

type PersistableRunEvent = {
  eventType: string;
  stream?: "system" | "stdout" | "stderr";
  level?: "info" | "warn" | "error";
  message?: string;
  payload?: Record<string, unknown>;
};

type CommandExecutionDetails = {
  command: string | null;
  status: string | null;
  exitCode: number | null;
  outputSnippet: string | null;
};

export type ChunkedLineParseResult = {
  lines: string[];
  remainder: string;
};

const STDOUT_PARSER_REGISTRY: Record<string, StdoutLineParser> = {
  claude_local: parseClaudeStdoutLine,
  codex_local: parseCodexStdoutLine,
  cursor: parseCursorStdoutLine,
  opencode_local: parseOpenCodeStdoutLine,
  pi_local: parsePiStdoutLine,
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// Stream chunks may split lines arbitrarily; keep the trailing partial line for the next chunk.
export function consumeChunkLines(chunk: string, remainder = ""): ChunkedLineParseResult {
  const combined = remainder + chunk;
  const parts = combined.split(/\r?\n/);
  const nextRemainder = parts.pop() ?? "";
  return {
    lines: parts
      .map((line) => line.trim())
      .filter(Boolean),
    remainder: nextRemainder,
  };
}

export function flushChunkRemainder(remainder: string): string[] {
  const trailing = remainder.trim();
  return trailing ? [trailing] : [];
}

function normalizeText(value: string) {
  return value.replace(/\s+$/, "");
}

function parseCommandExecutionResult(content: string): CommandExecutionDetails {
  const normalized = normalizeText(content);
  const commandMatch = normalized.match(/^command:\s*(.+)$/m);
  const statusMatch = normalized.match(/^status:\s*(.+)$/m);
  const exitCodeMatch = normalized.match(/^exit(?:_code)?:\s*(-?\d+)$/m);
  const outputStart = normalized.indexOf("\n\n");

  return {
    command: commandMatch?.[1]?.trim() ?? null,
    status: statusMatch?.[1]?.trim() ?? null,
    exitCode: exitCodeMatch ? Number.parseInt(exitCodeMatch[1]!, 10) : null,
    outputSnippet:
      outputStart >= 0
        ? normalized.slice(outputStart + 2).trim() || null
        : null,
  };
}

function transcriptEntryToRunEvent(entry: TranscriptEntry): PersistableRunEvent {
  switch (entry.kind) {
    case "assistant":
      return {
        eventType: "assistant.message",
        stream: "stdout",
        level: "info",
        message: entry.text,
        payload: { text: entry.text, delta: entry.delta === true },
      };
    case "thinking":
      return {
        eventType: "assistant.thinking",
        stream: "stdout",
        level: "info",
        message: entry.text,
        payload: { text: entry.text, delta: entry.delta === true },
      };
    case "user":
      return {
        eventType: "user.message",
        stream: "stdout",
        level: "info",
        message: entry.text,
        payload: { text: entry.text },
      };
    case "tool_call":
      return entry.name === "command_execution"
        ? {
            eventType: "command.execution.started",
            stream: "stdout",
            level: "info",
            message:
              typeof entry.input === "object" &&
              entry.input !== null &&
              typeof (entry.input as Record<string, unknown>).command === "string"
                ? String((entry.input as Record<string, unknown>).command)
                : "command execution started",
            payload: {
              toolName: entry.name,
              input: entry.input,
            },
          }
        : {
            eventType: "tool.call",
            stream: "stdout",
            level: "info",
            message: entry.name,
            payload: {
              toolName: entry.name,
              input: entry.input,
            },
          };
    case "tool_result": {
      const commandDetails = parseCommandExecutionResult(entry.content);
      return commandDetails.command || commandDetails.status || commandDetails.exitCode !== null
        ? {
            eventType: "command.execution.completed",
            stream: entry.isError ? "stderr" : "stdout",
            level: entry.isError ? "error" : "info",
            message: commandDetails.command ?? entry.toolUseId,
            payload: {
              toolUseId: entry.toolUseId,
              command: commandDetails.command,
              status: commandDetails.status,
              exitCode: commandDetails.exitCode,
              outputSnippet: commandDetails.outputSnippet,
              content: entry.content,
              isError: entry.isError,
            },
          }
        : {
            eventType: "tool.result",
            stream: entry.isError ? "stderr" : "stdout",
            level: entry.isError ? "error" : "info",
            message: entry.toolUseId,
            payload: {
              toolUseId: entry.toolUseId,
              content: entry.content,
              isError: entry.isError,
            },
          };
    }
    case "init":
      return {
        eventType: "adapter.session.init",
        stream: "system",
        level: "info",
        message: entry.sessionId || entry.model,
        payload: {
          model: entry.model,
          sessionId: entry.sessionId,
        },
      };
    case "result":
      return {
        eventType: "adapter.result",
        stream: entry.isError ? "stderr" : "system",
        level: entry.isError ? "error" : "info",
        message: entry.text || entry.subtype,
        payload: {
          text: entry.text,
          inputTokens: entry.inputTokens,
          outputTokens: entry.outputTokens,
          cachedTokens: entry.cachedTokens,
          costUsd: entry.costUsd,
          subtype: entry.subtype,
          isError: entry.isError,
          errors: entry.errors,
        },
      };
    case "stderr":
      return {
        eventType: "transcript.stderr",
        stream: "stderr",
        level: "error",
        message: entry.text,
        payload: { text: entry.text },
      };
    case "system":
      return {
        eventType: "transcript.system",
        stream: "system",
        level: "info",
        message: entry.text,
        payload: { text: entry.text },
      };
    case "stdout":
      return {
        eventType: "transcript.stdout",
        stream: "stdout",
        level: "info",
        message: entry.text,
        payload: { text: entry.text },
      };
  }
}

export function getStructuredStdoutParser(adapterType: string): StdoutLineParser | null {
  return STDOUT_PARSER_REGISTRY[adapterType] ?? null;
}

export function parseStructuredStdoutLine(
  adapterType: string,
  line: string,
  ts: string,
): PersistableRunEvent[] {
  const parser = getStructuredStdoutParser(adapterType);
  if (!parser) return [];
  return parser(line, ts).map((entry) => transcriptEntryToRunEvent(entry));
}

export function stderrLinesToRunEvents(lines: string[]): PersistableRunEvent[] {
  return lines
    .filter(Boolean)
    .map((line) => ({
      eventType: "transcript.stderr",
      stream: "stderr" as const,
      level: "error" as const,
      message: line,
      payload: { text: line },
    }));
}

export function stderrChunkToRunEvents(chunk: string): PersistableRunEvent[] {
  return stderrLinesToRunEvents(consumeChunkLines(chunk).lines);
}

export function eventHasStructuredTranscriptContent(eventType: string): boolean {
  return (
    eventType.startsWith("assistant.") ||
    eventType === "user.message" ||
    eventType === "tool.call" ||
    eventType === "tool.result" ||
    eventType.startsWith("command.execution.") ||
    eventType === "adapter.session.init" ||
    eventType === "adapter.result" ||
    eventType === "transcript.stderr" ||
    eventType === "transcript.system" ||
    eventType === "transcript.stdout"
  );
}

export function eventPayloadAsRecord(payload: unknown): Record<string, unknown> | null {
  return asRecord(payload);
}
