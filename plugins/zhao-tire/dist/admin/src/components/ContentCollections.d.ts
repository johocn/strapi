import { default as React } from 'react';
type ManagerProps = {
    name: string;
    title: string;
    onChanged?: () => void;
};
declare const FaqManager: ({ name, title, onChanged }: ManagerProps) => React.JSX.Element;
declare const ReviewManager: ({ name, title, onChanged }: ManagerProps) => React.JSX.Element;
declare const GalleryManager: ({ name, title, onChanged }: ManagerProps) => React.JSX.Element;
export { FaqManager, ReviewManager, GalleryManager };
