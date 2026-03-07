import { Chalk, type ChalkInstance } from "chalk";
import figlet from "figlet";
import { getRuntimeState, isInteractiveMode, isJsonMode, setRuntimeState } from "./runtime.js";

const ESCAPE = String.fromCharCode(27);
const ANSI_PATTERN = new RegExp(`${ESCAPE}\\[[0-9;]*m`, "g");
const ANSI_TOKEN_PATTERN = new RegExp(`(${ESCAPE}\\[[0-9;]*m)`, "g");
const RESET = `${ESCAPE}[0m`;
const DEFAULT_FRAME_WIDTH = 62;
const MIN_FRAME_WIDTH = 40;
const MAX_FRAME_WIDTH = 88;
const DEFAULT_LABEL_WIDTH = 10;

export type OverflowMode = "wrap" | "truncate";
export type Tone = "neutral" | "success" | "warning" | "danger" | "accent";

export interface KvRow {
  kind: "kv";
  label: string;
  value: string;
  overflow?: OverflowMode;
}

export interface TextRow {
  kind: "text";
  value: string;
  overflow?: OverflowMode;
  indent?: number;
}

export interface SpacerRow {
  kind: "spacer";
}

export type PanelRow = KvRow | TextRow | SpacerRow;

export interface CardField {
  label?: string;
  value: string;
  overflow?: OverflowMode;
}

export interface CardItem {
  id: string;
  name: string;
  active?: boolean;
  badge?: string;
  fields: CardField[];
}

interface Layout {
  width: number;
  innerWidth: number;
  labelWidth: number;
  valueWidth: number;
  stacked: boolean;
}

interface AnsiState {
  activeCodes: string[];
}

function createAnsiState(): AnsiState {
  return { activeCodes: [] };
}

function visibleLength(value: string): number {
  return value.replace(ANSI_PATTERN, "").length;
}

function terminalWidth(): number {
  return process.stdout.columns || DEFAULT_FRAME_WIDTH;
}

function clampFrameWidth(preferred: number = DEFAULT_FRAME_WIDTH): number {
  return Math.max(MIN_FRAME_WIDTH, Math.min(preferred, MAX_FRAME_WIDTH, terminalWidth() - 2));
}

function createLayout(preferredWidth?: number, preferredLabelWidth?: number): Layout {
  const width = clampFrameWidth(preferredWidth);
  const innerWidth = width - 6;
  const labelWidth = Math.max(6, Math.min(preferredLabelWidth || DEFAULT_LABEL_WIDTH, 14));
  const valueWidth = innerWidth - labelWidth - 2;
  const stacked = valueWidth < 32;
  return {
    width,
    innerWidth,
    labelWidth,
    valueWidth: stacked ? innerWidth : valueWidth,
    stacked,
  };
}

function splitAnsi(value: string): string[] {
  return value.split(ANSI_TOKEN_PATTERN).filter(Boolean);
}

function nextLine(state: AnsiState): string {
  return state.activeCodes.join("");
}

function applyAnsiToken(token: string, line: string, state: AnsiState): string {
  if (token === RESET) {
    state.activeCodes = [];
    return `${line}${token}`;
  }
  state.activeCodes.push(token);
  return `${line}${token}`;
}

function finishAnsiLine(line: string, state: AnsiState): string {
  if (!line) return line;
  if (state.activeCodes.length && !line.endsWith(RESET)) {
    return `${line}${RESET}`;
  }
  return line;
}

function sliceAnsi(value: string, width: number): string {
  if (width <= 0) return "";
  if (visibleLength(value) <= width) return value;

  const state = createAnsiState();
  let line = "";
  let visible = 0;

  for (const token of splitAnsi(value)) {
    if (token.startsWith(`${ESCAPE}[`) && token.endsWith("m")) {
      line = applyAnsiToken(token, line, state);
      continue;
    }

    for (const char of token) {
      if (visible >= width) {
        return finishAnsiLine(line, state);
      }
      line += char;
      visible += 1;
    }
  }

  return finishAnsiLine(line, state);
}

function truncateAnsi(value: string, width: number): string {
  if (width <= 0) return "";
  if (visibleLength(value) <= width) return value;
  if (width === 1) return "…";
  return `${sliceAnsi(value, width - 1)}…`;
}

function wrapAnsi(value: string, width: number): string[] {
  if (width <= 0) return [""];
  if (visibleLength(value) <= width) return [value];

  const state = createAnsiState();
  const lines: string[] = [];
  let line = "";
  let visible = 0;

  const pushLine = () => {
    lines.push(finishAnsiLine(line, state));
    line = nextLine(state);
    visible = 0;
  };

  for (const token of splitAnsi(value)) {
    if (token.startsWith(`${ESCAPE}[`) && token.endsWith("m")) {
      line = applyAnsiToken(token, line, state);
      continue;
    }

    for (const char of token) {
      if (visible >= width) {
        pushLine();
      }
      line += char;
      visible += 1;
    }
  }

  if (line) {
    lines.push(finishAnsiLine(line, state));
  }

  return lines.length > 0 ? lines : [""];
}

function fitAnsi(value: string, width: number, overflow: OverflowMode): string[] {
  if (overflow === "truncate") {
    return [truncateAnsi(value, width)];
  }
  return wrapAnsi(value, width);
}

function createChalk(): ChalkInstance {
  return new Chalk({ level: getRuntimeState().colorEnabled ? 3 : 0 });
}

function chalkRef(): ChalkInstance {
  return createChalk();
}

export const colors = {
  bright(text: string) {
    return chalkRef().white(text);
  },
  primary(text: string) {
    return chalkRef().hex("#e0e0e0")(text);
  },
  mid(text: string) {
    return chalkRef().hex("#9ca3af")(text);
  },
  dim(text: string) {
    return chalkRef().hex("#4b5563")(text);
  },
  green(text: string) {
    return chalkRef().hex("#4ade80")(text);
  },
  emerald(text: string) {
    return chalkRef().hex("#6ee7b7")(text);
  },
  sage(text: string) {
    return chalkRef().hex("#6b8f71")(text);
  },
  cyan(text: string) {
    return chalkRef().hex("#22d3ee")(text);
  },
  amber(text: string) {
    return chalkRef().hex("#fbbf24")(text);
  },
  red(text: string) {
    return chalkRef().hex("#f87171")(text);
  },
  purple(text: string) {
    return chalkRef().hex("#a78bfa")(text);
  },
};

export const symbols = {
  success: "▼",
  error: "✗",
  info: "◆",
  warning: "▲",
  dot: "·",
};

const WAVE_WIDTH = 4;

interface WaveColors {
  peak: [number, number, number];
  mid: [number, number, number];
  dim: [number, number, number];
}

const defaultWaveColors: WaveColors = {
  peak: [255, 255, 255],
  mid: [156, 163, 175],
  dim: [75, 85, 99],
};

function rgb(text: string, value: [number, number, number]): string {
  return chalkRef().rgb(...value)(text);
}

function lerpColor(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function renderWaveFrame(text: string, position: number, waveColors: WaveColors = defaultWaveColors): string {
  return text
    .split("")
    .map((char, index) => {
      const distance = Math.abs(index - position);
      if (distance === 0) {
        return rgb(char, waveColors.peak);
      }
      if (distance <= WAVE_WIDTH) {
        return rgb(char, lerpColor(waveColors.peak, waveColors.mid, distance / WAVE_WIDTH));
      }
      return rgb(char, waveColors.dim);
    })
    .join("");
}

export interface StatusResult {
  succeed: (text?: string) => void;
  fail: (text?: string) => void;
  update: (text: string) => void;
  stop: () => void;
}

export function status(text: string): StatusResult {
  if (!isInteractiveMode()) {
    return {
      succeed(finalText?: string) {
        info(finalText || text);
      },
      fail(finalText?: string) {
        error(finalText || text);
      },
      update() {},
      stop() {},
    };
  }

  const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let frame = 0;
  let currentText = text;
  let wavePosition = 0;
  let running = true;

  const interval = setInterval(() => {
    if (!running) return;
    const spinner = colors.dim(spinnerChars[frame % spinnerChars.length] || spinnerChars[0]);
    process.stdout.write(`\r  ${spinner} ${renderWaveFrame(currentText, wavePosition)}  `);
    frame += 1;
    wavePosition = (wavePosition + 1) % (currentText.length + WAVE_WIDTH);
  }, 80);

  const clear = () => {
    running = false;
    clearInterval(interval);
    process.stdout.write("\r" + " ".repeat(currentText.length + 24) + "\r");
  };

  return {
    succeed(finalText?: string) {
      clear();
      success(finalText || currentText);
    },
    fail(finalText?: string) {
      clear();
      error(finalText || currentText);
    },
    update(nextText: string) {
      currentText = nextText;
      wavePosition = 0;
    },
    stop() {
      clear();
    },
  };
}

export async function banner(): Promise<void> {
  if (!isInteractiveMode() || isJsonMode()) {
    return;
  }

  await new Promise<void>((resolve) => {
    figlet.text("HERMES", { font: "ANSI Shadow" }, (_err, result) => {
      if (!result) {
        console.log(colors.sage("  HERMES"));
        resolve();
        return;
      }

      for (const line of result.split("\n")) {
        console.log("  " + colors.sage(line));
      }
      console.log();
      resolve();
    });
  });
}

export function kv(label: string, value: string, opts: { overflow?: OverflowMode } = {}): KvRow {
  return {
    kind: "kv",
    label,
    value,
    overflow: opts.overflow || "truncate",
  };
}

export function text(value: string, opts: { overflow?: OverflowMode; indent?: number } = {}): TextRow {
  return {
    kind: "text",
    value,
    overflow: opts.overflow || "wrap",
    indent: opts.indent || 0,
  };
}

export function spacer(): SpacerRow {
  return { kind: "spacer" };
}

function renderPanelLine(content: string, layout: Layout, borderColor: (text: string) => string): void {
  const padding = Math.max(0, layout.innerWidth - visibleLength(content));
  console.log(`  ${borderColor("│")}  ${content}${" ".repeat(padding)}${borderColor("│")}`);
}

function renderKvRow(row: KvRow, layout: Layout, borderColor: (text: string) => string): void {
  const label = colors.dim(row.label.padEnd(layout.labelWidth));
  if (layout.stacked) {
    renderPanelLine(label, layout, borderColor);
    for (const line of fitAnsi(row.value, Math.max(1, layout.valueWidth - 4), row.overflow || "truncate")) {
      renderPanelLine(`    ${line}`, layout, borderColor);
    }
    return;
  }

  const fitted = fitAnsi(row.value, layout.valueWidth, row.overflow || "truncate");
  const labelPrefix = `${label}  `;
  for (const [index, line] of fitted.entries()) {
    const prefix = index === 0 ? labelPrefix : `${" ".repeat(layout.labelWidth)}  `;
    renderPanelLine(`${prefix}${line}`, layout, borderColor);
  }
}

function renderTextRow(row: TextRow, layout: Layout, borderColor: (text: string) => string): void {
  const indent = " ".repeat(Math.max(0, row.indent || 0));
  const width = Math.max(1, layout.innerWidth - (row.indent || 0));
  for (const line of fitAnsi(row.value, width, row.overflow || "wrap")) {
    renderPanelLine(`${indent}${line}`, layout, borderColor);
  }
}

function renderTitle(title: string, width: number): string {
  return truncateAnsi(title, Math.max(1, width));
}

export function panel(
  title: string,
  rows: PanelRow[],
  opts: { width?: number; labelWidth?: number; borderColor?: ChalkInstance | ((text: string) => string) } = {},
): void {
  if (isJsonMode()) return;

  const layout = createLayout(opts.width, opts.labelWidth);
  const borderColor =
    typeof opts.borderColor === "function" ? opts.borderColor : (value: string) => (opts.borderColor ? opts.borderColor(value) : colors.dim(value));
  const titleValue = renderTitle(title, Math.max(1, layout.innerWidth - 2));
  const titleText = `─ ${titleValue} `;
  const top = borderColor(`  ┌${titleText}${"─".repeat(Math.max(0, layout.width - 4 - visibleLength(titleText)))}┐`);
  const bottom = borderColor(`  └${"─".repeat(layout.width - 4)}┘`);

  console.log(top);
  for (const row of rows) {
    if (row.kind === "spacer") {
      renderPanelLine("", layout, borderColor);
      continue;
    }
    if (row.kind === "text") {
      renderTextRow(row, layout, borderColor);
      continue;
    }
    renderKvRow(row, layout, borderColor);
  }
  console.log(bottom);
}

export function listPanel(
  title: string,
  lines: string[],
  opts: { width?: number; borderColor?: ChalkInstance | ((text: string) => string) } = {},
): void {
  panel(
    title,
    lines.map((line) => text(line, { overflow: "wrap" })),
    opts,
  );
}

function renderCardHeader(item: CardItem, layout: Layout): string {
  const badge = item.active ? formatBadge("active", "success") : item.badge || "";
  const badgeWidth = badge ? visibleLength(badge) + 1 : 0;
  const maxNameWidth = Math.max(8, layout.innerWidth - badgeWidth - 16);
  const headerName = truncateAnsi(colors.bright(item.name), maxNameWidth);
  const idText = formatShortId(item.id);
  const divider = colors.dim("·");
  const prefix = `─ ${idText} ${divider} ${headerName} `;
  const filler = Math.max(1, layout.width - 4 - visibleLength(prefix) - badgeWidth);
  return colors.dim(`  ┌${prefix}${"─".repeat(filler)}${badge ? `${badge} ` : ""}┐`);
}

function renderCardField(field: CardField, layout: Layout): string[] {
  if (!field.label) {
    return fitAnsi(colors.primary(field.value), layout.innerWidth, field.overflow || "wrap");
  }

  const label = colors.dim(field.label.padEnd(layout.labelWidth));
  const value = colors.primary(field.value);

  if (layout.stacked) {
    return [
      `${label}`,
      ...fitAnsi(value, layout.innerWidth - 4, field.overflow || "truncate").map((line) => `    ${line}`),
    ];
  }

  return fitAnsi(value, layout.valueWidth, field.overflow || "truncate").map(
    (line, index) => `${index === 0 ? `${label}  ` : `${" ".repeat(layout.labelWidth)}  `}${line}`,
  );
}

export function cards(items: CardItem[], opts: { width?: number; labelWidth?: number } = {}): void {
  if (isJsonMode()) return;
  const layout = createLayout(opts.width || 58, opts.labelWidth);

  for (const item of items) {
    console.log(renderCardHeader(item, layout));
    for (const field of item.fields) {
      for (const line of renderCardField(field, layout)) {
        renderPanelLine(line, layout, colors.dim);
      }
    }
    console.log(colors.dim(`  └${"─".repeat(layout.width - 4)}┘`));
    console.log();
  }
}

export function box(
  title: string,
  content: string[],
  opts: { width?: number; borderColor?: ChalkInstance | ((text: string) => string) } = {},
): void {
  panel(title, content.map((line) => (line ? text(line, { overflow: "wrap" }) : spacer())), opts);
}

export function cardList(items: CardItem[]): void {
  cards(items);
}

export function formatShortId(id: string): string {
  return colors.cyan(shortId(id));
}

export function formatDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return colors.primary(date.toLocaleString());
}

export function formatServerUrl(url: string, mode: OverflowMode = "truncate"): string {
  return mode === "wrap" ? colors.cyan(url) : colors.cyan(url);
}

export function formatSecretValue(value: string, mode: "masked" | "plain" = "plain"): string {
  return mode === "masked" ? colors.purple("●".repeat(Math.min(12, Math.max(6, value.length)))) : colors.bright(value);
}

export function formatBadge(text: string, tone: Tone = "accent"): string {
  switch (tone) {
    case "success":
      return colors.green(`● ${text}`);
    case "warning":
      return colors.amber(`● ${text}`);
    case "danger":
      return colors.red(`● ${text}`);
    case "neutral":
      return colors.mid(text);
    default:
      return colors.purple(text);
  }
}

export function formatBooleanState(enabled: boolean): string {
  return enabled ? colors.green("enabled") : colors.amber("disabled");
}

export function info(text: string): void {
  if (isJsonMode()) return;
  console.log(`  ${colors.cyan(symbols.info)} ${colors.primary(text)}`);
}

export function warn(text: string): void {
  if (isJsonMode()) return;
  console.log(`  ${colors.amber(symbols.warning)} ${colors.amber(text)}`);
}

export function success(text: string): void {
  if (isJsonMode()) return;
  console.log(`  ${colors.green(symbols.success)} ${colors.primary(text)}`);
}

export function error(text: string, suggestions?: string[]): void {
  if (isJsonMode()) return;
  console.error(`  ${colors.red(symbols.error)} ${colors.red(text)}`);
  if (suggestions?.length) {
    console.error();
    for (const suggestion of suggestions) {
      console.error(`  ${colors.dim(symbols.dot)} ${colors.mid(suggestion)}`);
    }
  }
}

export function printJson(data: unknown): void {
  process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}

export function newline(): void {
  if (!isJsonMode()) {
    console.log();
  }
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function matchId(partial: string, fullId: string): boolean {
  return partial.length >= 4 && fullId.toLowerCase().startsWith(partial.toLowerCase());
}

export { setRuntimeState };
