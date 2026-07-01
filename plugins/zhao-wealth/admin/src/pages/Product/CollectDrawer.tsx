import { Drawer, Steps, Select, Input, Button, Descriptions, Tag, Alert, Spin, message } from 'antd';
import { SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { RISK_LEVELS, TERM_TYPES, PRODUCT_TYPES } from '../../constants/enums';

const SOURCES = [
  { value: 'cbhb', label: '渤银理财' },
];

interface CollectResult {
  sourceData: any;
  officialData: any;
  verification: {
    status: string;
    matchScore: number;
    differences: Array<{
      field: string;
      sourceValue: string;
      officialValue: string;
      severity: 'info' | 'warning' | 'error';
      description: string;
    }>;
    error?: string;
  };
}

const severityColor: Record<string, string> = {
  info: '#faad14',
  warning: '#fa8c16',
  error: '#ff4d4f',
};

const CollectDrawer = ({ open, onClose, onSuccess }: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) => {
  const api = useApi();
  const [step, setStep] = useState(0);
  const [source, setSource] = useState('cbhb');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CollectResult | null>(null);
  const [productNameChoice, setProductNameChoice] = useState<'source' | 'official'>('source');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCollect = async () => {
    if (!query.trim()) {
      message.warning('请输入产品编码或名称');
      return;
    }
    setLoading(true);
    try {
      const res = await api.collectProduct(source, query.trim());
      if (res.code !== 200) {
        message.error(res.msg || '采集失败');
        return;
      }
      setResult(res.data);
      setStep(1);

      // 自动生成校验备注
      if (res.data?.verification?.differences?.length > 0) {
        const notes = res.data.verification.differences
          .map((d: any) => `${d.description}（官网: ${d.sourceValue}, 理财网: ${d.officialValue}）`)
          .join('；');
        setRemark(`[采集校验] ${notes}`);
      } else if (res.data?.verification?.status === 'full_match') {
        setRemark('[采集校验] 数据一致');
      }
    } catch (e: any) {
      message.error(e.message || '采集失败');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!result?.sourceData) return;
    setSubmitting(true);
    try {
      const sd = result.sourceData;
      const od = result.officialData;

      const productName = productNameChoice === 'official' && od?.productName ? od.productName : sd.productName;

      const data = {
        productCode: sd.productCode,
        productName,
        registerCode: sd.registerCode,
        productType: sd.productType,
        riskLevel: sd.riskLevel || 'R2',
        termType: sd.termType,
        issueDate: sd.issueDate || null,
        maturityDate: sd.maturityDate || null,
        benchmark: sd.benchmark || null,
        remark: remark || null,
        company: null, // 需要通过公司名查找 id
        recommendEnabled: false,
        status: true,
      };

      // 查找公司 id
      const companiesRes = await api.getCompanies({ pageSize: 200 });
      const companies = companiesRes?.data?.list || companiesRes?.records || [];
      const company = companies.find((c: any) => c.name?.includes('渤银'));
      if (company) {
        data.company = company.id;
      }

      const res = await api.collectConfirm(data);
      if (res.code !== 200) {
        message.error(res.msg || '入库失败');
        return;
      }
      setStep(3);
      message.success('入库成功');
      onSuccess();
    } catch (e: any) {
      message.error(e.message || '入库失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep(0);
    setQuery('');
    setResult(null);
    setProductNameChoice('source');
    setRemark('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Drawer
      title="采集产品"
      open={open}
      onClose={handleClose}
      width={720}
      destroyOnClose
    >
      <Steps
        current={step}
        items={[
          { title: '输入查询' },
          { title: '双源对比' },
          { title: '确认入库' },
          { title: '完成' },
        ]}
        style={{ marginBottom: 24 }}
      />

      {/* Step 0: 输入查询 */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>数据源</div>
            <Select
              value={source}
              onChange={setSource}
              options={SOURCES}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>产品编码或名称</div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="如 CSFB1Y26152"
              onPressEnter={handleCollect}
            />
          </div>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            loading={loading}
            onClick={handleCollect}
            block
          >
            开始采集
          </Button>
        </div>
      )}

      {/* Step 1: 双源对比 */}
      {step === 1 && result && (
        <div>
          {result.verification.status === 'verification_failed' && (
            <Alert
              type="warning"
              message="中国理财网校验失败"
              description={result.verification.error}
              style={{ marginBottom: 16 }}
              showIcon
            />
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* 官网数据 */}
            <div>
              <h4 style={{ marginBottom: 8 }}>官网数据（{SOURCES.find(s => s.value === source)?.label}）</h4>
              <Descriptions column={1} size="small" bordered>
                <Descriptions.Item label="产品名称">{result.sourceData.productName}</Descriptions.Item>
                <Descriptions.Item label="销售编码">{result.sourceData.productCode}</Descriptions.Item>
                <Descriptions.Item label="登记编码">{result.sourceData.registerCode}</Descriptions.Item>
                <Descriptions.Item label="风险等级">
                  <Tag color={result.sourceData.riskLevel === 'R1' ? 'green' : result.sourceData.riskLevel === 'R2' ? 'blue' : 'orange'}>
                    {result.sourceData.riskLevelRaw || RISK_LEVELS[result.sourceData.riskLevel]}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="期限类型">{result.sourceData.termTypeRaw || TERM_TYPES[result.sourceData.termType]}</Descriptions.Item>
                <Descriptions.Item label="发行日期">{result.sourceData.issueDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="到期日期">{result.sourceData.maturityDate || '-'}</Descriptions.Item>
                <Descriptions.Item label="业绩基准">{result.sourceData.benchmark || '-'}</Descriptions.Item>
              </Descriptions>
            </div>

            {/* 理财网数据 */}
            <div>
              <h4 style={{ marginBottom: 8 }}>中国理财网数据</h4>
              {result.officialData ? (
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="产品名称">{result.officialData.productName}</Descriptions.Item>
                  <Descriptions.Item label="登记编码">{result.officialData.registerCode}</Descriptions.Item>
                  <Descriptions.Item label="风险等级">
                    <Tag color={result.officialData.riskLevel === 'R1' ? 'green' : result.officialData.riskLevel === 'R2' ? 'blue' : 'orange'}>
                      {result.officialData.riskLevelRaw || RISK_LEVELS[result.officialData.riskLevel]}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="期限类型">{result.officialData.termTypeRaw || TERM_TYPES[result.officialData.termType]}</Descriptions.Item>
                  <Descriptions.Item label="投资性质">{result.officialData.productTypeRaw || PRODUCT_TYPES[result.officialData.productType]}</Descriptions.Item>
                  <Descriptions.Item label="产品状态">{result.officialData.productStatus || '-'}</Descriptions.Item>
                  <Descriptions.Item label="运作模式">{result.officialData.operationMode || '-'}</Descriptions.Item>
                  <Descriptions.Item label="发行机构">{result.officialData.companyName || '-'}</Descriptions.Item>
                </Descriptions>
              ) : (
                <Alert type="info" message="中国理财网未查到匹配数据" />
              )}
            </div>
          </div>

          {/* 差异列表 */}
          {result.verification.differences?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h4 style={{ marginBottom: 8 }}>差异项</h4>
              {result.verification.differences.map((d, i) => (
                <Alert
                  key={i}
                  type={d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warning' : 'info'}
                  message={`${d.description}`}
                  description={
                    <div>
                      <span>官网: <b>{d.sourceValue}</b></span>
                      <span style={{ marginLeft: 16 }}>理财网: <b>{d.officialValue}</b></span>
                    </div>
                  }
                  style={{ marginBottom: 8 }}
                  showIcon
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <Button onClick={handleReset}>重新查询</Button>
            <Button type="primary" onClick={() => setStep(2)}>确认并入库</Button>
          </div>
        </div>
      )}

      {/* Step 2: 确认入库 */}
      {step === 2 && result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Alert type="info" message="请确认入库数据，可选择使用官网或理财网的产品名称" />

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>产品名称来源</div>
            <Select
              value={productNameChoice}
              onChange={setProductNameChoice}
              style={{ width: '100%' }}
              options={[
                { value: 'source', label: `官网: ${result.sourceData.productName}` },
                ...(result.officialData?.productName ? [{
                  value: 'official' as const,
                  label: `理财网: ${result.officialData.productName}`,
                }] : []),
              ]}
            />
          </div>

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>校验备注（可修改）</div>
            <Input.TextArea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder="校验备注将写入产品 remark 字段"
            />
          </div>

          <Descriptions title="入库数据预览" column={2} size="small" bordered>
            <Descriptions.Item label="产品代码">{result.sourceData.productCode}</Descriptions.Item>
            <Descriptions.Item label="产品名称">
              {productNameChoice === 'official' && result.officialData?.productName
                ? result.officialData.productName
                : result.sourceData.productName}
            </Descriptions.Item>
            <Descriptions.Item label="登记编码">{result.sourceData.registerCode}</Descriptions.Item>
            <Descriptions.Item label="风险等级">{RISK_LEVELS[result.sourceData.riskLevel]}</Descriptions.Item>
            <Descriptions.Item label="业绩基准">{result.sourceData.benchmark || '-'}</Descriptions.Item>
            <Descriptions.Item label="期限类型">{TERM_TYPES[result.sourceData.termType] || '-'}</Descriptions.Item>
          </Descriptions>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setStep(1)}>返回对比</Button>
            <Button type="primary" loading={submitting} onClick={handleConfirm}>
              确认入库
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: 完成 */}
      {step === 3 && result && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
          <h3 style={{ marginTop: 16 }}>
            {result.sourceData.productName} 入库成功
          </h3>
          <p style={{ color: '#999' }}>产品代码: {result.sourceData.productCode}</p>
          <div style={{ marginTop: 24, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <Button onClick={handleReset}>继续采集</Button>
            <Button type="primary" onClick={handleClose}>关闭</Button>
          </div>
        </div>
      )}
    </Drawer>
  );
};

export default CollectDrawer;
