import { default as React } from 'react';
type PhotoUploaderProps = {
    max?: number;
    disabled?: boolean;
    onChange?: (files: File[]) => void;
};
declare const PhotoUploader: ({ max, disabled, onChange }: PhotoUploaderProps) => React.JSX.Element;
export type MediaValue = {
    id: number;
    url: string;
} | null;
type MediaPickerProps = {
    value?: MediaValue;
    onChange?: (value: MediaValue) => void;
    disabled?: boolean;
    hint?: string;
};
declare const MediaPicker: ({ value, onChange, disabled, hint }: MediaPickerProps) => React.JSX.Element;
export { PhotoUploader, MediaPicker };
export default PhotoUploader;
