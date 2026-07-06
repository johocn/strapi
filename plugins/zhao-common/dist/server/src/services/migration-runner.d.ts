import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    ensureMigrationTable(): Promise<void>;
    getExecutedMigrations(plugin: string): Promise<string[]>;
    getMigrationFiles(plugin: string): Promise<Array<{
        version: string;
        name: string;
        filePath: string;
    }>>;
    runMigration(plugin: string, version: string, name: string, filePath: string, direction?: "up" | "down"): Promise<void>;
    runAllMigrations(): Promise<void>;
    rollback(plugin: string, version: string): Promise<void>;
};
export default _default;
