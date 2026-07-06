declare const _default: {
    "sync-record": {
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
                fileId: {
                    type: string;
                    required: boolean;
                    unique: boolean;
                };
                fileHash: {
                    type: string;
                    required: boolean;
                };
                status: {
                    type: string;
                    enum: string[];
                    default: string;
                    required: boolean;
                };
                provider: {
                    type: string;
                    required: boolean;
                };
                remoteUrl: {
                    type: string;
                };
                remoteEtag: {
                    type: string;
                };
                errorMessage: {
                    type: string;
                };
                retryCount: {
                    type: string;
                    default: number;
                    min: number;
                };
                lastSyncedAt: {
                    type: string;
                };
            };
        };
    };
};
export default _default;
