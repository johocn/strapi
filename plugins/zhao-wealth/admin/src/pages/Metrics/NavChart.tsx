import ReactECharts from 'echarts-for-react';
import { useApi } from '../../hooks/useApi';
import { useEffect, useState } from 'react';

const NavChart = ({ productId }: { productId: number }) => {
  const api = useApi();
  const [option, setOption] = useState<any>({});

  useEffect(() => {
    if (!productId) return;
    api.getNavData(productId, { pageSize: 500 }).then(res => {
      const navs = (res.records || []).sort((a: any, b: any) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());
      const dates = navs.map((n: any) => n.navDate);
      const unitNavs = navs.map((n: any) => n.unitNav);
      const accNavs = navs.map((n: any) => n.accNav);

      // 计算回撤区间（基于单位净值）
      let peak = unitNavs[0] || 0;
      const drawdowns = unitNavs.map((v: number) => {
        if (v > peak) peak = v;
        return peak > 0 ? (v - peak) / peak : 0;
      });

      setOption({
        title: { text: '净值走势与回撤' },
        tooltip: { trigger: 'axis' },
        legend: { data: ['单位净值', '累计净值', '回撤'] },
        xAxis: { type: 'category', data: dates },
        yAxis: [
          { type: 'value', name: '净值', scale: true },
          { type: 'value', name: '回撤', axisLabel: { formatter: (v: number) => (v * 100).toFixed(1) + '%' } },
        ],
        series: [
          { name: '单位净值', type: 'line', data: unitNavs, smooth: true },
          { name: '累计净值', type: 'line', data: accNavs, smooth: true },
          { name: '回撤', type: 'line', data: drawdowns, yAxisIndex: 1, areaStyle: { opacity: 0.3 }, lineStyle: { color: '#ff4d4f' } },
        ],
        grid: { left: 60, right: 60, top: 60, bottom: 40 },
      });
    });
  }, [productId]);

  return <ReactECharts option={option} style={{ height: 360 }} />;
};

export default NavChart;
