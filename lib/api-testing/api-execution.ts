/**
 * API Execution Service
 * Executes API tests with session reuse and validation
 */

import type { APIEndpoint } from "./api-discovery";

export interface APIExecutionResult {
    success: boolean;
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
    error: string | null;
}

export interface APICoverageReport {
    totalEndpoints: number;
    testedEndpoints: number;
    coverage: number;
    byMethod: Record<string, { total: number; tested: number }>;
}

export class APIExecutionService {
    private sessionCookies: Map<string, string> = new Map();
    
    async executeEndpoint(params: {
        endpoint: APIEndpoint;
        baseUrl: string;
        body?: any;
        headers?: Record<string, string>;
    }): Promise<APIExecutionResult> {
        const { endpoint, baseUrl, body, headers } = params;
        
        const startTime = Date.now();
        
        try {
            const url = endpoint.fullPath || `${baseUrl}${endpoint.path}`;
            const requestHeaders = {
                "Content-Type": "application/json",
                ...headers,
            };
            
            const response = await fetch(url, {
                method: endpoint.method,
                headers: requestHeaders,
                body: endpoint.method !== "GET" && body ? JSON.stringify(body) : undefined,
            });
            
            const responseTime = Date.now() - startTime;
            
            // Extract session cookies
            const setCookie = response.headers.get("set-cookie");
            if (setCookie) {
                const cookies = setCookie.split(";").map(c => c.trim());
                cookies.forEach(cookie => {
                    const match = cookie.match(/^([^=]+)=([^;]+)/);
                    if (match) {
                        this.sessionCookies.set(match[1], match[2]);
                    }
                });
            }
            
            return {
                success: response.ok,
                endpoint: endpoint.path,
                method: endpoint.method,
                statusCode: response.status,
                responseTime,
                error: null,
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                endpoint: endpoint.path,
                method: endpoint.method,
                statusCode: 0,
                responseTime,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    
    generateCoverageReport(params: {
        endpoints: APIEndpoint[];
        executionResults: APIExecutionResult[];
    }): APICoverageReport {
        const { endpoints, executionResults } = params;
        
        const byMethod: Record<string, { total: number; tested: number }> = {};
        
        endpoints.forEach(endpoint => {
            if (!byMethod[endpoint.method]) {
                byMethod[endpoint.method] = { total: 0, tested: 0 };
            }
            byMethod[endpoint.method].total++;
        });
        
        executionResults.forEach(result => {
            const endpoint = endpoints.find(e => e.path === result.endpoint && e.method === result.method);
            if (endpoint) {
                byMethod[endpoint.method].tested++;
            }
        });
        
        const testedEndpoints = executionResults.length;
        const totalEndpoints = endpoints.length;
        const coverage = totalEndpoints > 0 ? Math.round((testedEndpoints / totalEndpoints) * 100) : 0;
        
        return {
            totalEndpoints,
            testedEndpoints,
            coverage,
            byMethod,
        };
    }
    
    clearSession(): void {
        this.sessionCookies.clear();
    }
}
