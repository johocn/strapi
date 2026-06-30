import { ModalForm, ProFormText, ProFormSelect, ProFormDigit, ProFormSwitch, ProFormDatePicker, ProFormGroup } from '@ant-design/pro-components';
import { Collapse, message } from 'antd';
import { useApi } from '../../hooks/useApi';
import { PRODUCT_TYPES, RISK_LEVELS, TERM_TYPES, RECOMMEND_TAGS } from '../../constants/enums';

const toOptions = (map: Record<string, string>) => Object.entries(map).map(([value, label]) => ({ value, label }));

const ProductForm = ({ open, onClose, onSuccess, initialValues }: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialValues?: any;
}) => {
  const api = useApi();
  const isEdit = !!initialValues?.id;

  return (
    <ModalForm
      title={isEdit ? '编辑产品' : '新建产品'}
      open={open}
      onOpenChange={(v) => !v && onClose()}
      initialValues={initialValues ? {
        ...initialValues,
        company: initialValues.company?.id,
        issueDate: initialValues.issueDate,
        maturityDate: initialValues.maturityDate,
        recommendTags: Array.isArray(initialValues.recommendTags) ? initialValues.recommendTags : [],
      } : {
        productType: 'bank-wealth',
        riskLevel: 'R2',
        recommendWeight: 0,
        recommendEnabled: false,
      }}
      modalProps={{ destroyOnClose: true, width: 720 }}
      onFinish={async (values) => {
        try {
          const data = {
            ...values,
            company: values.company ? Number(values.company) : null,
            issueDate: values.issueDate ? values.issueDate.toISOString().slice(0, 10) : null,
            maturityDate: values.maturityDate ? values.maturityDate.toISOString().slice(0, 10) : null,
          };
          if (isEdit) {
            await api.updateProduct(initialValues.id, data);
            message.success('更新成功');
          } else {
            await api.createProduct(data);
            message.success('创建成功');
          }
          onSuccess();
          return true;
        } catch (e: any) {
          message.error(e.message || '操作失败');
          return false;
        }
      }}
    >
      <ProFormGroup>
        <ProFormText name="productCode" label="产品代码" rules={[{ required: true }]} placeholder="请输入产品代码" />
        <ProFormText name="productName" label="产品名称" rules={[{ required: true }]} placeholder="请输入产品名称" />
      </ProFormGroup>
      <ProFormGroup>
        <ProFormSelect name="productType" label="产品类型" options={toOptions(PRODUCT_TYPES)} rules={[{ required: true }]} />
        <ProFormSelect name="riskLevel" label="风险等级" options={toOptions(RISK_LEVELS)} />
      </ProFormGroup>
      <ProFormGroup>
        <ProFormText name="registerCode" label="登记编码" placeholder="请输入登记编码" />
        <ProFormSelect name="termType" label="期限类型" options={toOptions(TERM_TYPES)} allowClear />
      </ProFormGroup>
      <ProFormGroup>
        <ProFormSelect name="company" label="发行机构" request={async () => {
          const res = await api.getCompanies({ pageSize: 200 });
          return (res.records || []).map((c: any) => ({ value: c.id, label: c.name }));
        }} allowClear />
        <ProFormDatePicker name="issueDate" label="发行日期" />
        <ProFormDatePicker name="maturityDate" label="到期日期" />
      </ProFormGroup>

      <Collapse
        items={[{
          key: 'recommend',
          label: '推荐配置',
          children: (
            <>
              <ProFormSwitch name="recommendEnabled" label="启用推荐" />
              <ProFormDigit name="recommendWeight" label="推荐权重" min={0} fieldProps={{ precision: 0 }} />
              <ProFormSelect name="recommendTags" label="推荐标签" mode="multiple" options={RECOMMEND_TAGS} />
              <ProFormText name="recommendReason" label="推荐理由" placeholder="请输入推荐理由" />
            </>
          ),
        }]}
      />
    </ModalForm>
  );
};

export default ProductForm;
