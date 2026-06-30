// admin/src/pages/StatsProPage.tsx

import React from 'react';
import { Box, Typography, Button, Flex } from '@strapi/design-system';
import { useStats } from '../hooks/useStats';
import OverviewCard from '../components/OverviewCard';
import StatsChart from '../components/StatsChart';
import StatsTable from '../components/StatsTable';
import { getDateRange } from '../utils/statsCalculator';

const StatsProPage = () => {
  const { overview, articleStats, adSlotStats, deviceStats, regionStats, userStats, loading, error, fetchAll } = useStats('pro');
  const [dateType, setDateType] = React.useState<'today' | 'yesterday' | 'week' | 'month'>('today');

  React.useEffect(() => {
    fetchAll(getDateRange(dateType));
  }, [dateType, fetchAll]);

  const handleRefresh = () => {
    fetchAll(getDateRange(dateType));
  };

  const topArticles = articleStats.slice(0, 10).map((s) => ({ label: s.title || s.articleId, value: s.pv }));
  const topAdSlots = adSlotStats.slice(0, 10).map((s) => ({ label: s.name, value: s.clickCount }));

  const deviceData = deviceStats
    ? [
        { label: '桌面', value: deviceStats.desktop },
        { label: '移动端', value: deviceStats.mobile },
        { label: '平板', value: deviceStats.tablet },
      ]
    : [];

  const regionData = regionStats.slice(0, 10).map((s) => ({
    label: s.city ? `${s.country} - ${s.city}` : s.country,
    value: s.count,
  }));

  return (
    <Box padding={4}>
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="delta">高级统计看板</Typography>
        <Flex gap={2}>
          <Button variant={dateType === 'today' ? 'default' : 'secondary'} size="S" onClick={() => setDateType('today')}>
            今日
          </Button>
          <Button variant={dateType === 'yesterday' ? 'default' : 'secondary'} size="S" onClick={() => setDateType('yesterday')}>
            昨日
          </Button>
          <Button variant={dateType === 'week' ? 'default' : 'secondary'} size="S" onClick={() => setDateType('week')}>
            本周
          </Button>
          <Button variant={dateType === 'month' ? 'default' : 'secondary'} size="S" onClick={() => setDateType('month')}>
            本月
          </Button>
          <Button variant="secondary" size="S" onClick={handleRefresh}>
            刷新
          </Button>
        </Flex>
      </Flex>

      {error && (
        <Box marginTop={4} padding={3} background="danger100" hasRadius>
          <Typography variant="pi" textColor="danger700">{error}</Typography>
        </Box>
      )}

      {loading && (
        <Box marginTop={4} padding={4}>
          <Typography variant="pi" textColor="neutral600">加载中...</Typography>
        </Box>
      )}

      {/* 概览卡片 */}
      <Flex marginTop={4} gap={3}>
        <Box flex={1}>
          <OverviewCard title="页面浏览量" value={overview?.pv || 0} change={overview?.pvChange || 0} unit="次" />
        </Box>
        <Box flex={1}>
          <OverviewCard title="独立访客" value={overview?.uv || 0} change={overview?.uvChange || 0} unit="人" />
        </Box>
        <Box flex={1}>
          <OverviewCard title="广告点击" value={overview?.clickCount || 0} change={overview?.clickChange || 0} unit="次" />
        </Box>
        <Box flex={1}>
          <OverviewCard title="点击率" value={overview?.clickRate || 0} change={0} type="percent" />
        </Box>
      </Flex>

      {/* 阅读行为统计 */}
      <Flex marginTop={4} gap={3}>
        <Box flex={1}>
          <OverviewCard title="平均阅读时长" value={overview?.avgReadDuration || 0} change={0} type="duration" />
        </Box>
        <Box flex={1}>
          <OverviewCard title="平均滚动深度" value={overview?.avgScrollDepth || 0} change={0} type="percent" />
        </Box>
      </Flex>

      {/* 用户转化统计 */}
      <Flex marginTop={4} gap={3}>
        <Box flex={1}>
          <OverviewCard title="总访客数" value={userStats?.total || 0} change={0} unit="人" />
        </Box>
        <Box flex={1}>
          <OverviewCard title="注册用户" value={userStats?.registered || 0} change={0} unit="人" />
        </Box>
        <Box flex={1}>
          <OverviewCard title="未注册用户" value={userStats?.unregistered || 0} change={0} unit="人" />
        </Box>
        <Box flex={1}>
          <OverviewCard title="注册转化率" value={userStats?.registerRate || 0} change={0} type="percent" />
        </Box>
      </Flex>

      {/* 设备分布 */}
      <Flex marginTop={4} gap={3}>
        <Box flex={1}>
          <StatsChart type="pie" data={deviceData} title="设备类型分布" />
        </Box>
        <Box flex={1}>
          <StatsChart type="bar" data={regionData} title="地域分布 Top 10" />
        </Box>
      </Flex>

      {/* 文章浏览排行 */}
      <Flex marginTop={4} gap={3}>
        <Box flex={1}>
          <StatsChart type="bar" data={topArticles} title="Top 10 文章浏览排行" />
        </Box>
        <Box flex={1}>
          <StatsTable
            title="文章统计详情"
            columns={[
              { key: 'title', label: '文章' },
              { key: 'pv', label: 'PV' },
              { key: 'uv', label: 'UV' },
              { key: 'avgReadDuration', label: '阅读时长' },
            ]}
            data={articleStats.map((s, i) => ({
              id: i,
              title: s.title || s.articleId,
              pv: s.pv,
              uv: s.uv,
              avgReadDuration: `${Math.floor(s.avgReadDuration / 60)}分`,
            }))}
          />
        </Box>
      </Flex>

      {/* 广告位点击排行 */}
      <Flex marginTop={4} gap={3}>
        <Box flex={1}>
          <StatsChart type="bar" data={topAdSlots} title="Top 10 广告位点击排行" />
        </Box>
        <Box flex={1}>
          <StatsTable
            title="广告位统计详情"
            columns={[
              { key: 'name', label: '广告位' },
              { key: 'position', label: '位置' },
              { key: 'clickCount', label: '点击数' },
              { key: 'clickRate', label: '点击率' },
            ]}
            data={adSlotStats.map((s, i) => ({
              id: i,
              name: s.name,
              position: s.position,
              clickCount: s.clickCount,
              clickRate: `${s.clickRate.toFixed(1)}%`,
            }))}
          />
        </Box>
      </Flex>

      {/* 地域统计详情 */}
      <Box marginTop={4}>
        <StatsTable
          title="地域统计详情"
          columns={[
            { key: 'country', label: '国家' },
            { key: 'city', label: '城市' },
            { key: 'count', label: '访客数' },
          ]}
          data={regionStats.map((s, i) => ({
            id: i,
            country: s.country,
            city: s.city || '-',
            count: s.count,
          }))}
        />
      </Box>
    </Box>
  );
};

export default StatsProPage;