import { default as React } from 'react';
interface ContentItem {
    title: string;
    content: string;
    author?: string;
    date?: string;
    url?: string;
}
interface ContentPreviewProps {
    contents: ContentItem[];
    onConfirm: (confirmed: ContentItem[]) => void;
    onCancel: () => void;
}
declare const ContentPreview: React.FC<ContentPreviewProps>;
export default ContentPreview;
//# sourceMappingURL=ContentPreview.d.ts.map