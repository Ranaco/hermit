declare module "conf" {
  export interface ConfOptions<T extends object> {
    projectName: string;
    schema?: Record<string, unknown>;
    encryptionKey?: string;
  }

  export default class Conf<T extends object> {
    constructor(options: ConfOptions<T>);
    get<K extends keyof T>(key: K): T[K];
    set<K extends keyof T>(key: K, value: T[K]): void;
    readonly path: string;
  }
}

declare module "yaml" {
  export function parse(input: string): unknown;
}

declare module "@inquirer/prompts" {
  export function input(options: unknown): Promise<string>;
  export function password(options: unknown): Promise<string>;
  export function confirm(options: unknown): Promise<boolean>;
  export function editor(options: unknown): Promise<string>;
  export function select<T>(options: unknown): Promise<T>;
}

declare module "figlet" {
  export interface FigletOptions {
    font?: string;
  }

  export interface Figlet {
    text(
      input: string,
      options: FigletOptions,
      callback: (error: Error | null, result?: string) => void,
    ): void;
  }

  const figlet: Figlet;
  export default figlet;
}

declare module "clipboardy" {
  const clipboardy: {
    write(text: string): Promise<void>;
  };

  export default clipboardy;
}

