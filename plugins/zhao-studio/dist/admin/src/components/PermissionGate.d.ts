import { default as React } from 'react';
import { Button } from 'antd';
export interface PermissionGateProps {
    action: string | string[];
    fallback?: React.ReactNode;
    mode?: 'hide' | 'disable';
    children: React.ReactNode;
}
export declare const PermissionGate: React.FC<PermissionGateProps>;
export interface PermissionButtonProps extends React.ComponentProps<typeof Button> {
    action: string | string[];
    hideIfNoPermission?: boolean;
}
export declare const PermissionButton: React.FC<PermissionButtonProps>;
export default PermissionGate;
//# sourceMappingURL=PermissionGate.d.ts.map