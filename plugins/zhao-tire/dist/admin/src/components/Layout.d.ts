import { default as React } from 'react';
import { PermissionState } from '../utils/api';
export declare const usePermissions: () => PermissionState;
export declare const PermissionProvider: ({ children, }: {
    children: React.ReactNode;
}) => React.JSX.Element;
declare const PluginLayout: ({ children }: {
    children?: React.ReactNode;
}) => React.JSX.Element;
export { PluginLayout };
export default PluginLayout;
