import { setRuntimeState } from "./runtime.js";
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
export declare const colors: {
    bright(text: string): string;
    primary(text: string): string;
    mid(text: string): string;
    dim(text: string): string;
    green(text: string): string;
    emerald(text: string): string;
    sage(text: string): string;
    cyan(text: string): string;
    amber(text: string): string;
    red(text: string): string;
    purple(text: string): string;
};
export declare const symbols: {
    success: string;
    error: string;
    info: string;
    warning: string;
    dot: string;
};
export interface StatusResult {
    succeed: (text?: string) => void;
    fail: (text?: string) => void;
    update: (text: string) => void;
    stop: () => void;
}
export declare function status(text: string): StatusResult;
export declare function banner(): Promise<void>;
export declare function kv(label: string, value: string, opts?: {
    overflow?: OverflowMode;
}): KvRow;
export declare function text(value: string, opts?: {
    overflow?: OverflowMode;
    indent?: number;
}): TextRow;
export declare function spacer(): SpacerRow;
export declare function panel(title: string, rows: PanelRow[], opts?: {
    width?: number;
    labelWidth?: number;
    borderColor?: ((text: string) => string);
}): void;
export declare function listPanel(title: string, lines: string[], opts?: {
    width?: number;
    borderColor?: ((text: string) => string);
}): void;
export declare function cards(items: CardItem[], opts?: {
    width?: number;
    labelWidth?: number;
}): void;
export declare function box(title: string, content: string[], opts?: {
    width?: number;
    borderColor?: ((text: string) => string);
}): void;
export declare function cardList(items: CardItem[]): void;
export declare function formatShortId(id: string): string;
export declare function formatDateTime(value: string | Date): string;
export declare function formatServerUrl(url: string, mode?: OverflowMode): string;
export declare function formatSecretValue(value: string, mode?: "masked" | "plain"): string;
export declare function formatBadge(text: string, tone?: Tone): string;
export declare function formatBooleanState(enabled: boolean): string;
export declare function info(text: string): void;
export declare function warn(text: string): void;
export declare function success(text: string): void;
export declare function error(text: string, suggestions?: string[]): void;
export declare function printJson(data: unknown): void;
export declare function newline(): void;
export declare function shortId(id: string): string;
export declare function matchId(partial: string, fullId: string): boolean;
export { setRuntimeState };
//# sourceMappingURL=ui.d.ts.map