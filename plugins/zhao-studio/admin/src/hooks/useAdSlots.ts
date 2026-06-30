// admin/src/hooks/useAdSlots.ts

import { useState, useEffect } from 'react';
import { analyticsApi } from '../utils/analyticsApi';

export interface AdSlot {
  id: string;
  documentId: string;
  name: string;
  code: string;
  position: 'article-content' | 'sidebar' | 'footer' | 'header' | 'list-page' | 'home-page';
  type: 'product-link' | 'banner' | 'popup' | 'native';
  targetUrl?: string;
  productId?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useAdSlots() {
  const [adSlots, setAdSlots] = useState<AdSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.listAdSlots();
      setAdSlots(response.data || []);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const createAdSlot = async (data: Partial<AdSlot>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.createAdSlot(data);
      if (response.data) {
        setAdSlots([...adSlots, response.data]);
      }
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateAdSlot = async (id: string, data: Partial<AdSlot>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.updateAdSlot(id, data);
      if (response.data) {
        setAdSlots(adSlots.map((slot) => (slot.documentId === id ? response.data : slot)));
      }
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deleteAdSlot = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await analyticsApi.deleteAdSlot(id);
      setAdSlots(adSlots.filter((slot) => slot.documentId !== id));
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const toggleAdSlot = async (id: string, isActive: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const response = await analyticsApi.toggleAdSlot(id, isActive);
      if (response.data) {
        setAdSlots(adSlots.map((slot) => (slot.documentId === id ? { ...slot, isActive } : slot)));
      }
      return response.data;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdSlots();
  }, []);

  return {
    adSlots,
    loading,
    error,
    fetchAdSlots,
    createAdSlot,
    updateAdSlot,
    deleteAdSlot,
    toggleAdSlot,
  };
}