interface UseFetchResult<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}
export declare function useFetch<T = any>(url: string | null, options?: RequestInit): UseFetchResult<T>;
export declare function postJSON(url: string, body: any): Promise<any>;
export declare function putJSON(url: string, body: any): Promise<any>;
export declare function deleteJSON(url: string): Promise<any>;
export {};
