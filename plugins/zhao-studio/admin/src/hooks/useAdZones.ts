import React from 'react';
import { normalizeRecord } from '../utils/fieldNormalizer';
import { adApi } from '../utils/adApi';

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

export const useAdZones = () => {
  const [zones, setZones] = React.useState<AdZone[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchZones = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await adApi.listZones();
      const normalized = (list || []).map((z: any) => normalizeRecord<AdZone>(z));
      setZones(normalized);
    } catch (err) {
      console.error('fetchZones error:', err);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createZone = async (data: Partial<AdZone>) => {
    await adApi.createZone(data);
    await fetchZones();
  };

  const updateZone = async (id: string, data: Partial<AdZone>) => {
    await adApi.updateZone(id, data);
    await fetchZones();
  };

  const deleteZone = async (id: string) => {
    await adApi.deleteZone(id);
    await fetchZones();
  };

  React.useEffect(() => {
    fetchZones();
  }, [fetchZones]);

  return { zones, loading, createZone, updateZone, deleteZone, fetchZones };
};

export default useAdZones;
