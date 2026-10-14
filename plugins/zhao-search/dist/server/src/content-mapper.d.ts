import { KbDocument } from './services/meili';
export interface ContentTypeMap {
    type: string;
    titleField: string;
    bodyFields: string[];
    publishedField: string;
    statusField?: string;
    statusValue?: string;
    deletedField?: string;
    tagsField?: string;
    localized: boolean;
}
export declare const CONTENT_MAP: Record<string, ContentTypeMap>;
export declare const isPublishedEntry: (m: ContentTypeMap, entry: any) => boolean;
export declare const toContentDocuments: (modelUid: string, entry: any) => Array<{
    locale: string;
    doc: KbDocument;
}>;
export declare const documentIdsFor: (modelUid: string, entryId: any) => string[];
