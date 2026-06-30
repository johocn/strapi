import { ProTable, type ProColumns, type ActionType, ModalForm, ProFormText, ProFormSelect, ProFormSwitch } from '@ant-design/pro-components';
import { Button, Popconfirm, message, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { COMPANY_TYPES } from '../../constants/enums';

const CompanyList = () => {
  const api = useApi();
  const actionRef = useRef<ActionType>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [current, setCurrent] = useState<any>(undefined);

  const columns: ProColumns<any>[] = [
    { title: '公司名称', dataIndex: 'name', width: 200 },
    { title: '简称', dataIndex: 'shortName', width: 120, render: (_, r) => r.shortName || '-' },
    { title: '类型', dataIndex: 'companyType', width: 120, render: (_, r) => <Tag>{COMPANY_TYPES[r.companyType] || r.companyType}</Tag> },
    { title: '官网', dataIndex: 'website', ellipsis: true, render: (_, r) => r.website || '-' },
    { title: '状态', dataIndex: 'status', width: 80, render: (_, r) => <Tag color={r.status ? 'green' : 'default'}>{r.status ? '启用' : '停用'}</Tag> },
    {
      title: '操作', width: 180, valueType: 'option',
      render: (_, r) => [
        <a key="edit" onClick={() => { setCurrent(r); setFormOpen(true); }}>编辑</a>,
        <Popconfirm key="del" title="确定删除？" onConfirm={async () => {
          try { await api.deleteCompany(r.id); message.success('删除成功'); actionRef.current?.reload(); } catch (e: any) { message.error(e.message); }
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
        search={false}
        request={async (params) => {
          const res = await api.getCompanies({ page: params.current, pageSize: params.pageSize });
          return { data: res.records || [], total: res.total || 0, success: true };
        }}
        toolBarRender={() => [
          <Button key="new" type="primary" icon={<PlusOutlined />} onClick={() => { setCurrent(undefined); setFormOpen(true); }}>新建公司</Button>,
        ]}
      />
      <ModalForm
        title={current ? '编辑公司' : '新建公司'}
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setCurrent(undefined); }}
        initialValues={current || { companyType: 'bank-subsidiary', status: true }}
        modalProps={{ destroyOnClose: true }}
        onFinish={async (values) => {
          try {
            if (current) { await api.updateCompany(current.id, values); message.success('更新成功'); }
            else { await api.createCompany(values); message.success('创建成功'); }
            actionRef.current?.reload();
            return true;
          } catch (e: any) { message.error(e.message); return false; }
        }}
      >
        <ProFormText name="name" label="公司名称" rules={[{ required: true }]} />
        <ProFormText name="shortName" label="简称" />
        <ProFormSelect name="companyType" label="类型" options={Object.entries(COMPANY_TYPES).map(([v, l]) => ({ value: v, label: l }))} />
        <ProFormText name="website" label="官网地址" />
        <ProFormSwitch name="status" label="状态" />
      </ModalForm>
    </>
  );
};

export default CompanyList;
