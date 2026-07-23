import { Core } from '@strapi/strapi';
import { AdapterRegistry } from './adapters/adapter-registry';
export declare function initRegistry(strapi: Core.Strapi): Promise<AdapterRegistry>;
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => AdapterRegistry;
export default _default;
