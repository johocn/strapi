interface AdSlot {
    id: string;
    documentId?: string;
    name: string;
    position: string;
    type?: string;
    width?: number;
    height?: number;
    adCode?: string;
    code?: string;
    isActive?: boolean;
}
export declare const useAdSlots: () => {
    slots: AdSlot[];
    loading: boolean;
    createSlot: (data: Partial<AdSlot>) => Promise<void>;
    updateSlot: (id: string, data: Partial<AdSlot>) => Promise<void>;
    deleteSlot: (id: string) => Promise<void>;
};
export default useAdSlots;
//# sourceMappingURL=useAdSlots.d.ts.map