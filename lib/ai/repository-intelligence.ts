/**
 * Repository Intelligence Service
 * Analyzes repository structure to extract framework, architecture, and configuration.
 */

export type Framework = {
    name: string;
    version: string;
    type: "frontend" | "fullstack" | "backend";
};

export type Authentication = {
    provider: string | null;
    type: "oauth" | "session" | "jwt" | "none";
    libraries: string[];
};

export type Database = {
    type: string | null;
    host: string | null;
    name: string | null;
};

export type ORM = {
    name: string | null;
    version: string | null;
};

export type Routing = {
    type: "app-router" | "pages-router" | "custom" | "none";
    basePath: string | null;
};

export type Middleware = {
    present: boolean;
    type: "nextjs" | "custom" | "none";
};

export type API = {
    type: "route-handlers" | "api-routes" | "custom" | "none";
    basePath: string | null;
};

export type Forms = {
    library: string | null;
    validation: string | null;
};

export type Validation = {
    library: string | null;
    schemaLocation: string | null;
};

export type BusinessModule = {
    name: string;
    path: string;
    type: string;
};

export type Library = {
    name: string;
    version: string;
    category: string;
};

export type PackageManager = "npm" | "yarn" | "pnpm" | "bun" | "unknown";

export type BuildTool = {
    name: string;
    version: string;
};

export type EnvironmentVariable = {
    name: string;
    description: string;
    required: boolean;
};

export type ApplicationArchitecture = {
    pattern: "mvc" | "clean-architecture" | "microservices" | "monolith" | "unknown";
    layers: string[];
};

export type RepositoryIntelligence = {
    framework: Framework;
    authentication: Authentication;
    database: Database;
    orm: ORM;
    routing: Routing;
    middleware: Middleware;
    api: API;
    forms: Forms;
    validation: Validation;
    businessModules: BusinessModule[];
    libraries: Library[];
    packageManager: PackageManager;
    buildTool: BuildTool;
    environmentVariables: EnvironmentVariable[];
    architecture: ApplicationArchitecture;
    analyzedAt: string;
    repositoryHash: string;
};

export class RepositoryIntelligenceService {
    /**
     * Analyze package.json to extract framework and dependencies
     */
    private analyzePackageJson(packageJson: any): {
        framework: Framework;
        libraries: Library[];
        packageManager: PackageManager;
        buildTool: BuildTool;
    } {
        const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
        const libraries: Library[] = [];

        // Detect framework
        let framework: Framework = {
            name: "unknown",
            version: "0.0.0",
            type: "frontend",
        };

        if (dependencies.next) {
            framework = {
                name: "Next.js",
                version: dependencies.next,
                type: "fullstack",
            };
        } else if (dependencies.react) {
            framework = {
                name: "React",
                version: dependencies.react,
                type: "frontend",
            };
        } else if (dependencies.vue) {
            framework = {
                name: "Vue",
                version: dependencies.vue,
                type: "frontend",
            };
        }

        // Categorize libraries
        for (const [name, version] of Object.entries(dependencies)) {
            let category = "other";

            if (name.includes("@auth") || name.includes("next-auth") || name.includes("clerk")) {
                category = "authentication";
            } else if (name.includes("prisma") || name.includes("drizzle")) {
                category = "orm";
            } else if (name.includes("pg") || name.includes("mysql") || name.includes("sqlite")) {
                category = "database";
            } else if (name.includes("zod") || name.includes("yup")) {
                category = "validation";
            } else if (name.includes("react-hook-form") || name.includes("formik")) {
                category = "forms";
            } else if (name.includes("tailwind")) {
                category = "styling";
            } else if (name.includes("shadcn")) {
                category = "components";
            }

            libraries.push({ name, version: version as string, category });
        }

        // Detect package manager
        let packageManager: PackageManager = "unknown";
        if (packageJson.packageManager) {
            if (packageJson.packageManager.startsWith("npm")) packageManager = "npm";
            else if (packageJson.packageManager.startsWith("yarn")) packageManager = "yarn";
            else if (packageJson.packageManager.startsWith("pnpm")) packageManager = "pnpm";
            else if (packageManager.startsWith("bun")) packageManager = "bun";
        }

        // Detect build tool
        const buildTool: BuildTool = {
            name: framework.name,
            version: framework.version,
        };

        return { framework, libraries, packageManager, buildTool };
    }

    /**
     * Analyze directory structure to detect routing, middleware, and architecture
     */
    private analyzeStructure(files: string[]): {
        routing: Routing;
        middleware: Middleware;
        api: API;
        businessModules: BusinessModule[];
        architecture: ApplicationArchitecture;
    } {
        const routing: Routing = { type: "none", basePath: null };
        const middleware: Middleware = { present: false, type: "none" };
        const api: API = { type: "none", basePath: null };
        const businessModules: BusinessModule[] = [];
        const layers: string[] = [];

        // Detect routing
        if (files.some((f) => f.includes("app/") && f.includes("page."))) {
            routing.type = "app-router";
            routing.basePath = "app";
        } else if (files.some((f) => f.includes("pages/") && f.includes("index."))) {
            routing.type = "pages-router";
            routing.basePath = "pages";
        }

        // Detect middleware
        if (files.some((f) => f.includes("middleware."))) {
            middleware.present = true;
            middleware.type = "nextjs";
        }

        // Detect API structure
        if (files.some((f) => f.includes("app/api/") && f.includes("route."))) {
            api.type = "route-handlers";
            api.basePath = "app/api";
        } else if (files.some((f) => f.includes("pages/api/"))) {
            api.type = "api-routes";
            api.basePath = "pages/api";
        }

        // Detect business modules
        const modulePatterns = [
            { name: "lib", type: "utilities" },
            { name: "components", type: "ui" },
            { name: "hooks", type: "state" },
            { name: "services", type: "business" },
            { name: "utils", type: "utilities" },
            { name: "contexts", type: "state" },
            { name: "store", type: "state" },
        ];

        for (const pattern of modulePatterns) {
            if (files.some((f) => f.includes(`${pattern.name}/`))) {
                businessModules.push({
                    name: pattern.name,
                    path: pattern.name,
                    type: pattern.type,
                });
                layers.push(pattern.type);
            }
        }

        // Detect architecture pattern
        let architecture: ApplicationArchitecture = {
            pattern: "unknown",
            layers,
        };

        if (layers.includes("business") && layers.includes("ui") && layers.includes("utilities")) {
            architecture.pattern = "clean-architecture";
        } else if (layers.includes("ui") && layers.includes("state")) {
            architecture.pattern = "mvc";
        } else if (layers.length > 3) {
            architecture.pattern = "monolith";
        }

        return { routing, middleware, api, businessModules, architecture };
    }

    /**
     * Analyze environment files to detect environment variables
     */
    private analyzeEnvironment(envContent: string): EnvironmentVariable[] {
        const variables: EnvironmentVariable[] = [];
        const lines = envContent.split("\n");

        for (const line of lines) {
            if (line.trim().startsWith("#") || !line.includes("=")) continue;

            const [name, ...valueParts] = line.split("=");
            const value = valueParts.join("=").trim();

            if (name) {
                variables.push({
                    name: name.trim(),
                    description: this.inferEnvDescription(name),
                    required: !value || value === '""',
                });
            }
        }

        return variables;
    }

    private inferEnvDescription(name: string): string {
        const lower = name.toLowerCase();
        if (lower.includes("database") || lower.includes("db")) return "Database connection";
        if (lower.includes("api") || lower.includes("key")) return "API key or token";
        if (lower.includes("auth") || lower.includes("secret")) return "Authentication secret";
        if (lower.includes("url")) return "Service URL";
        return "Configuration variable";
    }

    /**
     * Analyze code to detect authentication, forms, validation
     */
    private analyzeCode(files: { path: string; content: string }[]): {
        authentication: Authentication;
        forms: Forms;
        validation: Validation;
        database: Database;
        orm: ORM;
    } {
        const authentication: Authentication = {
            provider: null,
            type: "none",
            libraries: [],
        };

        const forms: Forms = { library: null, validation: null };
        const validation: Validation = { library: null, schemaLocation: null };
        const database: Database = { type: null, host: null, name: null };
        const orm: ORM = { name: null, version: null };

        for (const file of files) {
            const content = file.content.toLowerCase();

            // Detect authentication
            if (content.includes("clerk")) {
                authentication.provider = "Clerk";
                authentication.type = "oauth";
                if (!authentication.libraries.includes("clerk")) {
                    authentication.libraries.push("clerk");
                }
            } else if (content.includes("nextauth") || content.includes("next-auth")) {
                authentication.provider = "NextAuth";
                authentication.type = "oauth";
                if (!authentication.libraries.includes("next-auth")) {
                    authentication.libraries.push("next-auth");
                }
            } else if (content.includes("jsonwebtoken") || content.includes("jwt")) {
                authentication.type = "jwt";
            }

            // Detect forms
            if (content.includes("react-hook-form")) {
                forms.library = "react-hook-form";
            } else if (content.includes("formik")) {
                forms.library = "formik";
            }

            // Detect validation
            if (content.includes("zod")) {
                validation.library = "zod";
                validation.schemaLocation = file.path;
            } else if (content.includes("yup")) {
                validation.library = "yup";
                validation.schemaLocation = file.path;
            }

            // Detect database
            if (content.includes("postgresql") || content.includes("postgres")) {
                database.type = "PostgreSQL";
            } else if (content.includes("mysql")) {
                database.type = "MySQL";
            } else if (content.includes("sqlite")) {
                database.type = "SQLite";
            }

            // Detect ORM
            if (content.includes("prisma")) {
                orm.name = "Prisma";
            } else if (content.includes("drizzle")) {
                orm.name = "Drizzle";
            }
        }

        return { authentication, forms, validation, database, orm };
    }

    /**
     * Generate repository intelligence from repository data
     */
    async analyzeRepository(data: {
        packageJson: any;
        files: string[];
        codeFiles: { path: string; content: string }[];
        envContent?: string;
        repositoryHash: string;
    }): Promise<RepositoryIntelligence> {
        const { framework, libraries, packageManager, buildTool } = this.analyzePackageJson(data.packageJson);
        const { routing, middleware, api, businessModules, architecture } = this.analyzeStructure(data.files);
        const { authentication, forms, validation, database, orm } = this.analyzeCode(data.codeFiles);
        const environmentVariables = data.envContent ? this.analyzeEnvironment(data.envContent) : [];

        return {
            framework,
            authentication,
            database,
            orm,
            routing,
            middleware,
            api,
            forms,
            validation,
            businessModules,
            libraries,
            packageManager,
            buildTool,
            environmentVariables,
            architecture,
            analyzedAt: new Date().toISOString(),
            repositoryHash: data.repositoryHash,
        };
    }

    /**
     * Generate a hash for repository change detection
     */
    generateRepositoryHash(data: {
        packageJson: any;
        files: string[];
        envContent?: string;
    }): string {
        const content = JSON.stringify(data.packageJson) + data.files.join(",") + (data.envContent || "");
        // Simple hash for demonstration - use crypto in production
        return Buffer.from(content).toString("base64").substring(0, 32);
    }
}
