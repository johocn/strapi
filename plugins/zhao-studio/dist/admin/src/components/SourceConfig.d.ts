import { default as React } from 'react';
import { CollectSource } from '../hooks/useCollectSources';
interface SourceConfigProps {
    source?: CollectSource | null;
    onSave: (data: any) => void;
    onCancel: () => void;
}
declare const SourceConfig: React.FC<SourceConfigProps>;
export default SourceConfig;
//# sourceMappingURL=SourceConfig.d.ts.map