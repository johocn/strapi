import { default as React } from 'react';
type StatusTagProps = {
    status?: string | null;
    prefix?: string;
};
declare const StatusTag: ({ status, prefix }: StatusTagProps) => React.JSX.Element;
export { StatusTag };
export default StatusTag;
