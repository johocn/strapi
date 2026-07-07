declare const _default: {
    schema: {
        collectionName: string;
        info: {
            singularName: string;
            pluralName: string;
            displayName: string;
            description: string;
        };
        options: {
            draftAndPublish: boolean;
        };
        pluginOptions: {
            "content-manager": {
                visible: boolean;
            };
            "content-type-builder": {
                visible: boolean;
            };
        };
        attributes: {
            site: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            file: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            fileId: {
                type: string;
                required: boolean;
            };
            folder: {
                type: string;
                relation: string;
                target: string;
            };
            category: {
                type: string;
                enum: string[];
                default: string;
            };
            uploader: {
                type: string;
                relation: string;
                target: string;
            };
            uploaderRole: {
                type: string;
                maxLength: number;
            };
            modifier: {
                type: string;
                relation: string;
                target: string;
            };
            originalFilename: {
                type: string;
                maxLength: number;
            };
            mimeType: {
                type: string;
                maxLength: number;
            };
            fileSize: {
                type: string;
            };
            fileExt: {
                type: string;
                maxLength: number;
            };
            usageCount: {
                type: string;
                default: number;
            };
            lastUsedAt: {
                type: string;
            };
            isPublic: {
                type: string;
                default: boolean;
            };
            tags: {
                type: string;
            };
            deletedAt: {
                type: string;
                default: any;
            };
        };
    };
};
export default _default;
