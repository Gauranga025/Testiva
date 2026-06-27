/**
 * API Discovery Service
 * Discovers APIs from Repository Intelligence, Next.js API routes, and UI Discovery
 */

import type { RepositoryIntelligence } from "@/lib/ai/repository-intelligence";
import type { DomSummary } from "@/lib/execution/types";

export interface APIEndpoint {
    id: string;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    fullPath: string;
    description: string;
    tags: string[];
    authentication: { type: string; required: boolean };
    source: "repository" | "network" | "ui-discovery";
    confidence: number;
}

export interface APIDiscoveryResult {
    endpoints: APIEndpoint[];
    totalEndpoints: number;
    byMethod: Record<string, number>;
    authenticated: number;
    public: number;
}

export class APIDiscoveryService {
    async discoverAPIs(params: {
        repositoryIntelligence: RepositoryIntelligence;
        domSummary: DomSummary;
        baseUrl: string;
    }): Promise<APIDiscoveryResult> {
        const { repositoryIntelligence, domSummary, baseUrl } = params;
        
        const endpoints: APIEndpoint[] = [];
        
        // Discover from Repository Intelligence
        const repositoryEndpoints = this.discoverFromRepository(repositoryIntelligence, baseUrl);
        endpoints.push(...repositoryEndpoints);
        
        // Discover from UI Discovery
        const uiEndpoints = this.discoverFromUI(domSummary, baseUrl);
        endpoints.push(...uiEndpoints);
        
        // Deduplicate
        const uniqueEndpoints = this.deduplicateEndpoints(endpoints);
        
        const byMethod: Record<string, number> = {};
        let authenticated = 0;
        let public_ = 0;
        
        uniqueEndpoints.forEach(endpoint => {
            byMethod[endpoint.method] = (byMethod[endpoint.method] || 0) + 1;
            if (endpoint.authentication.required) {
                authenticated++;
            } else {
                public_++;
            }
        });
        
        return {
            endpoints: uniqueEndpoints,
            totalEndpoints: uniqueEndpoints.length,
            byMethod,
            authenticated,
            public: public_,
        };
    }
    
    private discoverFromRepository(repositoryIntelligence: RepositoryIntelligence, baseUrl: string): APIEndpoint[] {
        const endpoints: APIEndpoint[] = [];
        
        if (repositoryIntelligence.api?.basePath) {
            const apiBasePath = repositoryIntelligence.api.basePath;
            
            repositoryIntelligence.businessModules.forEach(module => {
                endpoints.push({
                    id: `repo-get-${module.name}`,
                    method: "GET",
                    path: `${apiBasePath}/${module.name.toLowerCase()}`,
                    fullPath: `${baseUrl}${apiBasePath}/${module.name.toLowerCase()}`,
                    description: `Get ${module.name} list`,
                    tags: [module.name, "read"],
                    authentication: { type: "bearer", required: true },
                    source: "repository",
                    confidence: 70,
                });
                
                endpoints.push({
                    id: `repo-post-${module.name}`,
                    method: "POST",
                    path: `${apiBasePath}/${module.name.toLowerCase()}`,
                    fullPath: `${baseUrl}${apiBasePath}/${module.name.toLowerCase()}`,
                    description: `Create ${module.name}`,
                    tags: [module.name, "create"],
                    authentication: { type: "bearer", required: true },
                    source: "repository",
                    confidence: 70,
                });
                
                endpoints.push({
                    id: `repo-put-${module.name}`,
                    method: "PUT",
                    path: `${apiBasePath}/${module.name.toLowerCase()}/:id`,
                    fullPath: `${baseUrl}${apiBasePath}/${module.name.toLowerCase()}/:id`,
                    description: `Update ${module.name}`,
                    tags: [module.name, "update"],
                    authentication: { type: "bearer", required: true },
                    source: "repository",
                    confidence: 70,
                });
                
                endpoints.push({
                    id: `repo-delete-${module.name}`,
                    method: "DELETE",
                    path: `${apiBasePath}/${module.name.toLowerCase()}/:id`,
                    fullPath: `${baseUrl}${apiBasePath}/${module.name.toLowerCase()}/:id`,
                    description: `Delete ${module.name}`,
                    tags: [module.name, "delete"],
                    authentication: { type: "bearer", required: true },
                    source: "repository",
                    confidence: 70,
                });
            });
        }
        
        return endpoints;
    }
    
    private discoverFromUI(domSummary: DomSummary, baseUrl: string): APIEndpoint[] {
        const endpoints: APIEndpoint[] = [];
        
        domSummary.forms?.forEach((form, index) => {
            if (form.action) {
                endpoints.push({
                    id: `ui-form-${index}`,
                    method: "POST",
                    path: form.action,
                    fullPath: form.action.startsWith("http") ? form.action : `${baseUrl}${form.action}`,
                    description: `Form submission endpoint`,
                    tags: ["form", "ui-discovered"],
                    authentication: { type: "session", required: false },
                    source: "ui-discovery",
                    confidence: 60,
                });
            }
        });
        
        return endpoints;
    }
    
    private deduplicateEndpoints(endpoints: APIEndpoint[]): APIEndpoint[] {
        const seen = new Set<string>();
        const unique: APIEndpoint[] = [];
        
        endpoints.forEach(endpoint => {
            const key = `${endpoint.method}:${endpoint.path}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push(endpoint);
            }
        });
        
        return unique;
    }
}
