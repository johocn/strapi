declare const _default: {
    schema: {
        kind: string;
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
            name: {
                type: string;
                required: boolean;
            };
            adZone: {
                type: string;
                relation: string;
                target: string;
                inversedBy: string;
                required: boolean;
            };
            site: {
                type: string;
                relation: string;
                target: string;
                required: boolean;
            };
            contentType: {
                type: string;
                enum: string[];
                default: string;
                required: boolean;
            };
            isActive: {
                type: string;
                default: boolean;
            };
            sortOrder: {
                type: string;
                default: number;
            };
            priority: {
                type: string;
                default: number;
            };
            startAt: {
                type: string;
            };
            endAt: {
                type: string;
            };
            frequencyLimit: {
                type: string;
                default: number;
            };
            frequencyPeriod: {
                type: string;
                enum: string[];
                default: string;
            };
            title: {
                type: string;
            };
            titleColor: {
                type: string;
                default: string;
            };
            titleFontSize: {
                type: string;
                default: number;
            };
            titleFontWeight: {
                type: string;
                enum: string[];
                default: string;
            };
            titleAlign: {
                type: string;
                enum: string[];
                default: string;
            };
            titleOverflow: {
                type: string;
                enum: string[];
                default: string;
            };
            titleMaxLines: {
                type: string;
                default: number;
            };
            titleLineHeight: {
                type: string;
                default: number;
            };
            subtitle: {
                type: string;
            };
            subtitleColor: {
                type: string;
                default: string;
            };
            subtitleFontSize: {
                type: string;
                default: number;
            };
            subtitleOverflow: {
                type: string;
                enum: string[];
                default: string;
            };
            subtitleMaxLines: {
                type: string;
                default: number;
            };
            ctaText: {
                type: string;
            };
            ctaTextColor: {
                type: string;
                default: string;
            };
            ctaBgColor: {
                type: string;
                default: string;
            };
            ctaFontSize: {
                type: string;
                default: number;
            };
            ctaBorderRadius: {
                type: string;
                default: number;
            };
            ctaPosition: {
                type: string;
                enum: string[];
                default: string;
            };
            badgeText: {
                type: string;
            };
            badgeBgColor: {
                type: string;
                default: string;
            };
            badgeTextColor: {
                type: string;
                default: string;
            };
            badgePosition: {
                type: string;
                enum: string[];
                default: string;
            };
            images: {
                type: string;
                default: never[];
            };
            videoUrl: {
                type: string;
            };
            videoPoster: {
                type: string;
            };
            videoAutoplay: {
                type: string;
                default: boolean;
            };
            videoMuted: {
                type: string;
                default: boolean;
            };
            videoLoop: {
                type: string;
                default: boolean;
            };
            videoControls: {
                type: string;
                default: boolean;
            };
            htmlContent: {
                type: string;
            };
            linkType: {
                type: string;
                enum: string[];
                default: string;
            };
            linkUrl: {
                type: string;
            };
            linkTarget: {
                type: string;
                enum: string[];
                default: string;
            };
            displayStyle: {
                type: string;
                enum: string[];
                default: string;
            };
            width: {
                type: string;
            };
            height: {
                type: string;
            };
            borderRadius: {
                type: string;
                default: number;
            };
            backgroundColor: {
                type: string;
                default: string;
            };
            slideshowAutoplay: {
                type: string;
                default: boolean;
            };
            slideshowInterval: {
                type: string;
                default: number;
            };
            slideshowEffect: {
                type: string;
                enum: string[];
                default: string;
            };
            slideshowLoop: {
                type: string;
                default: boolean;
            };
            slideshowShowDots: {
                type: string;
                default: boolean;
            };
            slideshowShowArrows: {
                type: string;
                default: boolean;
            };
            slideshowPauseOnHover: {
                type: string;
                default: boolean;
            };
            closeDelay: {
                type: string;
                default: number;
            };
            showCountdown: {
                type: string;
                default: boolean;
            };
            createdAt: {
                type: string;
            };
            updatedAt: {
                type: string;
            };
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map