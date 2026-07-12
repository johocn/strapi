// admin/src/hooks/useCollectTasks.ts

import { useState, useEffect } from 'react';
import { collectApi } from '../utils/collectApi';

export interface CollectTask {
  id: string;
  source: any;
  titles: any[];
  selectedTitles: any[];
  status: string;
  error?: string;
  createdAt: string;
}

export function useCollectTasks() {
  const [tasks, setTasks] = useState<CollectTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getTasks();
      setTasks(response || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (sourceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.createTask(sourceId);
      await fetchTasks();
      return response;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getTask = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.getTask(id);
      return response;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchSelectedContent = async (taskId: string, selectedTitles: string[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.fetchSelectedContent(taskId, selectedTitles);
      return response;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const confirmImport = async (taskId: string, confirmedContents: any[]) => {
    setLoading(true);
    setError(null);
    try {
      const response = await collectApi.confirmImport(taskId, confirmedContents);
      await fetchTasks();
      return response;
    } catch (err: unknown) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    getTask,
    fetchSelectedContent,
    confirmImport,
  };
}