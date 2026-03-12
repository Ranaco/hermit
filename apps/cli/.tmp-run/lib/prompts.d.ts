import { confirm as baseConfirm, editor as baseEditor, input as baseInput, password as basePassword, select as baseSelect } from "@inquirer/prompts";
export declare function promptInput(opts: Parameters<typeof baseInput>[0], missingMessage: string): Promise<string>;
export declare function promptPassword(opts: Parameters<typeof basePassword>[0], missingMessage: string): Promise<string>;
export declare function promptSelect<T>(opts: Parameters<typeof baseSelect<T>>[0], missingMessage: string): Promise<T>;
export declare function promptConfirm(opts: Parameters<typeof baseConfirm>[0], missingMessage: string): Promise<boolean>;
export declare function promptEditor(opts: Parameters<typeof baseEditor>[0], missingMessage: string): Promise<string>;
//# sourceMappingURL=prompts.d.ts.map