import { Core } from '@strapi/strapi';
export declare function isRoleGateEnabled(strapi: Core.Strapi, siteDocId?: string): Promise<boolean>;
export declare function mayAccessVisibleToRoles(userRoles: string[] | undefined, visibleToRoles: any): boolean;
