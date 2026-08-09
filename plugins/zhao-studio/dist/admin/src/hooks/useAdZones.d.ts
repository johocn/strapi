export interface AdZone {
    id: string;
    documentId?: string;
    name: string;
    code: string;
    position: string;
    displayMode: string;
    suggestedWidth?: number;
    suggestedHeight?: number;
    adSlotCode?: string;
    description?: string;
    isActive: boolean;
    sortOrder?: number;
}
export declare const useAdZones: () => {
    zones: AdZone[];
    loading: boolean;
    createZone: (data: Partial<AdZone>) => Promise<void>;
    updateZone: (id: string, data: Partial<AdZone>) => Promise<void>;
    deleteZone: (id: string) => Promise<void>;
    fetchZones: () => Promise<void>;
};
export default useAdZones;
//# sourceMappingURL=useAdZones.d.ts.map