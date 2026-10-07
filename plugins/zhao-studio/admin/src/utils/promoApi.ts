// admin/src/utils/promoApi.ts
// 渠道报表 / 推广数据接口

import { apiFetch } from './http';

export interface VariantReportRow {
  variantId: string;
  variantName: string;
  campaignCode: string;
  campaignName: string;
  weight?: number;
  impressions: number;
  clicks: number;
  ctr: number;
  orders: number;
  matchedCommission: number;
}

export interface ChannelReportData {
  channel: { code: string; name: string; scene?: string };
  groupBy: string;
  byVariant?: VariantReportRow[];
  funnel?: Record<string, number>;
  revenue?: Record<string, number>;
  roi?: number;
  byCampaign?: Array<Record<string, any>>;
}

export const promoApi = {
  /** 渠道列表（下拉选择用） */
  async listChannels(): Promise<Array<{ documentId: string; code: string; name: string; scene?: string }>> {
    const res = await apiFetch<{ data: any[] }>('/channels?pageSize=100');
    return (res.data || []).map((c: any) => ({
      documentId: c.documentId,
      code: c.code,
      name: c.name,
      scene: c.scene,
    }));
  },

  /** 渠道报表：groupBy = variant | day | campaign */
  async getChannelReport(params: {
    channelCode: string;
    startDate: string;
    endDate: string;
    groupBy: 'variant' | 'day' | 'campaign';
  }): Promise<ChannelReportData> {
    const query = new URLSearchParams(params).toString();
    const res = await apiFetch<{ data: ChannelReportData }>(`/channel-report?${query}`);
    return res.data;
  },
};
