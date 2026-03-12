export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string | {
        code?: string;
        message?: string;
    };
    message?: string;
}
export declare class ApiError extends Error {
    statusCode: number;
    details?: unknown | undefined;
    constructor(statusCode: number, message: string, details?: unknown | undefined);
}
export declare function get<T>(path: string): Promise<T>;
export declare function post<T>(path: string, body?: unknown, opts?: {
    skipAuth?: boolean;
}): Promise<T>;
export declare function put<T>(path: string, body?: unknown): Promise<T>;
export declare function del<T>(path: string): Promise<T>;
//# sourceMappingURL=api-client.d.ts.map