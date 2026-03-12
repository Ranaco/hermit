import chalk from "chalk";
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
function createAnsiState() {
    return { activeCodes: [] };
}
function visibleLength(value) {
    return value.replace(ANSI_PATTERN, "").length;
}
function terminalWidth() {
    return process.stdout.columns || DEFAULT_FRAME_WIDTH;
}
function clampFrameWidth(preferred = DEFAULT_FRAME_WIDTH) {
    return Math.max(MIN_FRAME_WIDTH, Math.min(preferred, MAX_FRAME_WIDTH, terminalWidth() - 2));
}
function createLayout(preferredWidth, preferredLabelWidth) {
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
function splitAnsi(value) {
    return value.split(ANSI_TOKEN_PATTERN).filter(Boolean);
}
function nextLine(state) {
    return state.activeCodes.join("");
}
function applyAnsiToken(token, line, state) {
    if (token === RESET) {
        state.activeCodes = [];
        return `${line}${token}`;
    }
    state.activeCodes.push(token);
    return `${line}${token}`;
}
function finishAnsiLine(line, state) {
    if (!line)
        return line;
    if (state.activeCodes.length && !line.endsWith(RESET)) {
        return `${line}${RESET}`;
    }
    return line;
}
function sliceAnsi(value, width) {
    if (width <= 0)
        return "";
    if (visibleLength(value) <= width)
        return value;
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
function truncateAnsi(value, width) {
    if (width <= 0)
        return "";
    if (visibleLength(value) <= width)
        return value;
    if (width === 1)
        return "…";
    return `${sliceAnsi(value, width - 1)}…`;
}
function wrapAnsi(value, width) {
    if (width <= 0)
        return [""];
    if (visibleLength(value) <= width)
        return [value];
    const state = createAnsiState();
    const lines = [];
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
function fitAnsi(value, width, overflow) {
    if (overflow === "truncate") {
        return [truncateAnsi(value, width)];
    }
    return wrapAnsi(value, width);
}
function createChalk() {
    const ChalkConstructor = chalk.constructor;
    return new ChalkConstructor({ level: getRuntimeState().colorEnabled ? 3 : 0 });
}
function chalkRef() {
    return createChalk();
}
export const colors = {
    bright(text) {
        return chalkRef().white(text);
    },
    primary(text) {
        return chalkRef().hex("#e0e0e0")(text);
    },
    mid(text) {
        return chalkRef().hex("#9ca3af")(text);
    },
    dim(text) {
        return chalkRef().hex("#4b5563")(text);
    },
    green(text) {
        return chalkRef().hex("#4ade80")(text);
    },
    emerald(text) {
        return chalkRef().hex("#6ee7b7")(text);
    },
    sage(text) {
        return chalkRef().hex("#6b8f71")(text);
    },
    cyan(text) {
        return chalkRef().hex("#22d3ee")(text);
    },
    amber(text) {
        return chalkRef().hex("#fbbf24")(text);
    },
    red(text) {
        return chalkRef().hex("#f87171")(text);
    },
    purple(text) {
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
const defaultWaveColors = {
    peak: [255, 255, 255],
    mid: [156, 163, 175],
    dim: [75, 85, 99],
};
function rgb(text, value) {
    return chalkRef().rgb(...value)(text);
}
function lerpColor(a, b, t) {
    return [
        Math.round(a[0] + (b[0] - a[0]) * t),
        Math.round(a[1] + (b[1] - a[1]) * t),
        Math.round(a[2] + (b[2] - a[2]) * t),
    ];
}
function renderWaveFrame(text, position, waveColors = defaultWaveColors) {
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
export function status(text) {
    if (!isInteractiveMode()) {
        return {
            succeed(finalText) {
                info(finalText || text);
            },
            fail(finalText) {
                error(finalText || text);
            },
            update() { },
            stop() { },
        };
    }
    const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let frame = 0;
    let currentText = text;
    let wavePosition = 0;
    let running = true;
    const interval = setInterval(() => {
        if (!running)
            return;
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
        succeed(finalText) {
            clear();
            success(finalText || currentText);
        },
        fail(finalText) {
            clear();
            error(finalText || currentText);
        },
        update(nextText) {
            currentText = nextText;
            wavePosition = 0;
        },
        stop() {
            clear();
        },
    };
}
export async function banner() {
    if (!isInteractiveMode() || isJsonMode()) {
        return;
    }
    await new Promise((resolve) => {
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
export function kv(label, value, opts = {}) {
    return {
        kind: "kv",
        label,
        value,
        overflow: opts.overflow || "truncate",
    };
}
export function text(value, opts = {}) {
    return {
        kind: "text",
        value,
        overflow: opts.overflow || "wrap",
        indent: opts.indent || 0,
    };
}
export function spacer() {
    return { kind: "spacer" };
}
function renderPanelLine(content, layout, borderColor) {
    const padding = Math.max(0, layout.innerWidth - visibleLength(content));
    console.log(`  ${borderColor("│")}  ${content}${" ".repeat(padding)}${borderColor("│")}`);
}
function renderKvRow(row, layout, borderColor) {
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
function renderTextRow(row, layout, borderColor) {
    const indent = " ".repeat(Math.max(0, row.indent || 0));
    const width = Math.max(1, layout.innerWidth - (row.indent || 0));
    for (const line of fitAnsi(row.value, width, row.overflow || "wrap")) {
        renderPanelLine(`${indent}${line}`, layout, borderColor);
    }
}
function renderTitle(title, width) {
    return truncateAnsi(title, Math.max(1, width));
}
export function panel(title, rows, opts = {}) {
    if (isJsonMode())
        return;
    const layout = createLayout(opts.width, opts.labelWidth);
    const borderColor = typeof opts.borderColor === "function" ? opts.borderColor : (value) => (opts.borderColor ? opts.borderColor(value) : colors.dim(value));
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
export function listPanel(title, lines, opts = {}) {
    panel(title, lines.map((line) => text(line, { overflow: "wrap" })), opts);
}
function renderCardHeader(item, layout) {
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
function renderCardField(field, layout) {
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
    return fitAnsi(value, layout.valueWidth, field.overflow || "truncate").map((line, index) => `${index === 0 ? `${label}  ` : `${" ".repeat(layout.labelWidth)}  `}${line}`);
}
export function cards(items, opts = {}) {
    if (isJsonMode())
        return;
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
export function box(title, content, opts = {}) {
    panel(title, content.map((line) => (line ? text(line, { overflow: "wrap" }) : spacer())), opts);
}
export function cardList(items) {
    cards(items);
}
export function formatShortId(id) {
    return colors.cyan(shortId(id));
}
export function formatDateTime(value) {
    const date = value instanceof Date ? value : new Date(value);
    return colors.primary(date.toLocaleString());
}
export function formatServerUrl(url, mode = "truncate") {
    return mode === "wrap" ? colors.cyan(url) : colors.cyan(url);
}
export function formatSecretValue(value, mode = "plain") {
    return mode === "masked" ? colors.purple("●".repeat(Math.min(12, Math.max(6, value.length)))) : colors.bright(value);
}
export function formatBadge(text, tone = "accent") {
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
export function formatBooleanState(enabled) {
    return enabled ? colors.green("enabled") : colors.amber("disabled");
}
export function info(text) {
    if (isJsonMode())
        return;
    console.log(`  ${colors.cyan(symbols.info)} ${colors.primary(text)}`);
}
export function warn(text) {
    if (isJsonMode())
        return;
    console.log(`  ${colors.amber(symbols.warning)} ${colors.amber(text)}`);
}
export function success(text) {
    if (isJsonMode())
        return;
    console.log(`  ${colors.green(symbols.success)} ${colors.primary(text)}`);
}
export function error(text, suggestions) {
    if (isJsonMode())
        return;
    console.error(`  ${colors.red(symbols.error)} ${colors.red(text)}`);
    if (suggestions?.length) {
        console.error();
        for (const suggestion of suggestions) {
            console.error(`  ${colors.dim(symbols.dot)} ${colors.mid(suggestion)}`);
        }
    }
}
export function printJson(data) {
    process.stdout.write(`${JSON.stringify(data, null, 2)}\n`);
}
export function newline() {
    if (!isJsonMode()) {
        console.log();
    }
}
export function shortId(id) {
    return id.slice(0, 8);
}
export function matchId(partial, fullId) {
    return partial.length >= 4 && fullId.toLowerCase().startsWith(partial.toLowerCase());
}
export { setRuntimeState };
