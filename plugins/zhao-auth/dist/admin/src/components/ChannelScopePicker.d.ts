import { default as React } from 'react';
export interface ChannelScopePickerProps {
    value?: {
        all: boolean;
        channelIds: string[];
    };
    onChange?: (value: {
        all: boolean;
        channelIds: string[];
    }) => void;
    channels?: {
        id: string;
        name: string;
        parentId?: string;
    }[];
    loading?: boolean;
}
export declare const ChannelScopePicker: React.FC<ChannelScopePickerProps>;
export default ChannelScopePicker;
//# sourceMappingURL=ChannelScopePicker.d.ts.map