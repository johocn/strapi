import { ProTable, type ProColumns, type ActionType } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { PRODUCT_TYPES, RISK_LEVELS } from '../../constants/enums';
import { useState, useRef } from 'react';
import ProductForm from './ProductForm';
import CollectDrawer from './CollectDrawer';

const riskColors: Record<string, string> = { R1: 'green', R2: 'blue', R3: 'orange', R4: 'red', R5: 'magenta' };

const ProductList = () => {
  const api = useApi();
  const navigate = useNavigate();
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [current, setCurrent] = useState<any>(undefined);

  const columns: ProColumns<any>[] = [
    { title: '产品名称', dataIndex: 'productName', ellipsis: true, width: 200 },
    { title: '产品代码', dataIndex: 'productCode', width: 120 },
    { title: '类型', dataIndex: 'productType', width: 100, render: (_, r) => <Tag>{PRODUCT_TYPES[r.productType] || r.productType}</Tag> },
    { title: '风险', dataIndex: 'riskLevel', width: 80, render: (_, r) => <Tag color={riskColors[r.riskLevel]}>{RISK_LEVELS[r.riskLevel] || r.riskLevel}</Tag> },
    { title: '发行机构', width: 120, render: (_, r) => r.company?.name || '-' },
    { title: '推荐权重', dataIndex: 'recommendWeight', width: 90 },
    { title: '状态', dataIndex: 'status', width: 80, render: (_, r) => <Tag color={r.status ? 'green' : 'default'}>{r.status ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 200, fixed: 'right', valueType: 'option',
      render: (_, r) => [
        <a key="edit" onClick={() => { setCurrent(r); setFormOpen(true); }}>编辑</a>,
        <a key="metrics" onClick={() => navigate(`/plugins/zhao-wealth/metrics?productId=${r.id}`)}>指标</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          try { await api.deleteProduct(r.id); message.success('删除成功'); actionRef.current?.reload(); } catch (e: any) { message.error(e.message); }
        }}>
          <a style={{ color: '#ff4d4f' }}>删除</a>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <>
      <ProTable<any>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1000 }}
        request={async (params) => {
          const query: any = { page: params.current, pageSize: params.pageSize };
          if (params.productName) query.productName = params.productName;
          if (params.productType) query.productType = params.productType;
          if (params.riskLevel) query.riskLevel = params.riskLevel;
          const res = await api.getProducts(query);
          return { data: res.records || [], total: res.total || 0, success: true };
        }}
        toolBarRender={() => [
          <Button key="collect" icon={<SearchOutlined />} onClick={() => setCollectOpen(true)}>采集产品</Button>,
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setFormOpen(true); }}>新建产品</Button>,
        ]}
      />
      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initialValues={current}
        onSuccess={() => { setFormOpen(false); actionRef.current?.reload(); }}
      />
      <CollectDrawer
        open={collectOpen}
        onClose={() => setCollectOpen(false)}
        onSuccess={() => actionRef.current?.reload()}
      />
    </>
  );
};

export default ProductList;
