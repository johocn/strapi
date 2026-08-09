import React from 'react';
import { normalizeRecord } from '../utils/fieldNormalizer';
import { posterApi } from '../utils/posterApi';

export interface PosterTemplate {
  id: string;
  documentId?: string;
  name: string;
  code: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundMode?: string;
  isActive: boolean;
  isDefault: boolean;
  description?: string;
  requiredVariables?: string;
  optionalVariables?: string;
  elements?: any[];
}

export const usePosterTemplates = () => {
  const [templates, setTemplates] = React.useState<PosterTemplate[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchTemplates = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await posterApi.listTemplates();
      const normalized = (list || []).map((t: any) => normalizeRecord<PosterTemplate>(t));
      setTemplates(normalized);
    } catch (err) {
      console.error('fetchTemplates error:', err);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = async (data: Partial<PosterTemplate>) => {
    const result = await posterApi.createTemplate(data);
    await fetchTemplates();
    return result;
  };

  const findOneTemplate = async (id: string) => {
    const result = await posterApi.findOneTemplate(id);
    return normalizeRecord<PosterTemplate>(result);
  };

  const updateTemplate = async (id: string, data: Partial<PosterTemplate>) => {
    const result = await posterApi.updateTemplate(id, data);
    await fetchTemplates();
    return result;
  };

  const deleteTemplate = async (id: string) => {
    await posterApi.deleteTemplate(id);
    await fetchTemplates();
  };

  const cloneTemplate = async (id: string) => {
    const result = await posterApi.cloneTemplate(id);
    await fetchTemplates();
    return result;
  };

  const batchSaveElements = async (templateId: string, elements: any[]) => {
    const result = await posterApi.batchSaveElements(templateId, elements);
    await fetchTemplates();
    return result;
  };

  React.useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    loading,
    createTemplate,
    findOneTemplate,
    updateTemplate,
    deleteTemplate,
    cloneTemplate,
    batchSaveElements,
    fetchTemplates,
  };
};

export default usePosterTemplates;
