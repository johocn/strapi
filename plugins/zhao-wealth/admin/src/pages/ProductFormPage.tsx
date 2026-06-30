import { useEffect, useState } from "react";
import { Main, Box, Flex, Typography, Button, Loader, Field, TextInput, SingleSelect, SingleSelectOption, Toggle, DatePicker } from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { useNavigate, useParams } from "react-router-dom";
import { PLUGIN_ID } from "../pluginId";

const PRODUCT_TYPES = [
  { value: "bank-wealth", label: "银行理财" },
  { value: "stock-fund", label: "股票基金" },
  { value: "bond-fund", label: "债券基金" },
  { value: "mixed-fund", label: "混合基金" },
  { value: "money-fund", label: "货币基金" },
];

const RISK_LEVELS = [
  { value: "R1", label: "低风险" },
  { value: "R2", label: "中低风险" },
  { value: "R3", label: "中风险" },
  { value: "R4", label: "中高风险" },
  { value: "R5", label: "高风险" },
];

const TERM_TYPES = [
  { value: "short", label: "短期" },
  { value: "medium", label: "中期" },
  { value: "long", label: "长期" },
];

const ProductFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, post, put } = useFetchClient();
  const [loading, setLoading] = useState(id ? true : false);
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState<{
    productCode: string;
    productName: string;
    productType: string;
    registerCode: string;
    riskLevel: string;
    termType: string;
    issueDate: Date | undefined;
    maturityDate: Date | undefined;
    company: string;
    recommendWeight: number;
    status: boolean;
  }>({
    productCode: "",
    productName: "",
    productType: "bank-wealth",
    registerCode: "",
    riskLevel: "R2",
    termType: "",
    issueDate: undefined,
    maturityDate: undefined,
    company: "",
    recommendWeight: 0,
    status: true,
  });

  useEffect(() => {
    fetchCompanies();
    if (id) {
      fetchProduct(Number(id));
    }
  }, [id]);

  const fetchCompanies = async () => {
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/companies`, { params: { pageSize: 100 } });
      setCompanies(data.records || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProduct = async (productId: number) => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/products/${productId}`);
      const product = data.record || data;
      setFormData({
        productCode: product.productCode || "",
        productName: product.productName || "",
        productType: product.productType || "bank-wealth",
        registerCode: product.registerCode || "",
        riskLevel: product.riskLevel || "R2",
        termType: product.termType || "",
        issueDate: product.issueDate ? new Date(product.issueDate) : undefined,
        maturityDate: product.maturityDate ? new Date(product.maturityDate) : undefined,
        company: product.company?.id || "",
        recommendWeight: product.recommendWeight || 0,
        status: product.status ?? true,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.productCode || !formData.productName) {
      alert("请填写必填字段");
      return;
    }

    const submitData = {
      ...formData,
      company: formData.company ? Number(formData.company) : null,
      issueDate: formData.issueDate ? formData.issueDate.toISOString().split("T")[0] : null,
      maturityDate: formData.maturityDate ? formData.maturityDate.toISOString().split("T")[0] : null,
    };

    try {
      if (id) {
        await put(`/admin/plugins/${PLUGIN_ID}/products/${id}`, submitData);
      } else {
        await post(`/admin/plugins/${PLUGIN_ID}/products`, submitData);
      }
      navigate(`/plugins/${PLUGIN_ID}/products`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) {
    return <Main><Box padding={8}><Loader>加载中...</Loader></Box></Main>;
  }

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={6} alignItems="stretch">
          <Typography variant="alpha">{id ? "编辑产品" : "新建产品"}</Typography>

          <Flex direction="column" gap={4}>
            <Field.Root>
              <Field.Label>产品代码 *</Field.Label>
              <TextInput
                value={formData.productCode}
                onChange={(e: any) => setFormData({ ...formData, productCode: e.target.value })}
                placeholder="请输入产品代码"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>产品名称 *</Field.Label>
              <TextInput
                value={formData.productName}
                onChange={(e: any) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="请输入产品名称"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>产品类型 *</Field.Label>
              <SingleSelect
                value={formData.productType}
                onChange={(value: any) => setFormData({ ...formData, productType: value })}
              >
                {PRODUCT_TYPES.map((t) => (
                  <SingleSelectOption key={t.value} value={t.value}>{t.label}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>

            <Field.Root>
              <Field.Label>登记编码</Field.Label>
              <TextInput
                value={formData.registerCode}
                onChange={(e: any) => setFormData({ ...formData, registerCode: e.target.value })}
                placeholder="请输入登记编码"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>风险等级</Field.Label>
              <SingleSelect
                value={formData.riskLevel}
                onChange={(value: any) => setFormData({ ...formData, riskLevel: value })}
              >
                {RISK_LEVELS.map((r) => (
                  <SingleSelectOption key={r.value} value={r.value}>{r.label}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>

            <Field.Root>
              <Field.Label>期限类型</Field.Label>
              <SingleSelect
                value={formData.termType}
                onChange={(value: any) => setFormData({ ...formData, termType: value })}
                placeholder="请选择期限类型"
              >
                {TERM_TYPES.map((t) => (
                  <SingleSelectOption key={t.value} value={t.value}>{t.label}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>

            <Field.Root>
              <Field.Label>发行机构</Field.Label>
              <SingleSelect
                value={formData.company}
                onChange={(value: any) => setFormData({ ...formData, company: value })}
                placeholder="请选择发行机构"
              >
                {companies.map((c) => (
                  <SingleSelectOption key={c.id} value={c.id}>{c.name}</SingleSelectOption>
                ))}
              </SingleSelect>
            </Field.Root>

            <Field.Root>
              <Field.Label>发行日期</Field.Label>
              <DatePicker
                value={formData.issueDate}
                onChange={(date: any) => setFormData({ ...formData, issueDate: date })}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>到期日期</Field.Label>
              <DatePicker
                value={formData.maturityDate}
                onChange={(date: any) => setFormData({ ...formData, maturityDate: date })}
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>推荐权重</Field.Label>
              <TextInput
                type="number"
                value={formData.recommendWeight.toString()}
                onChange={(e: any) => setFormData({ ...formData, recommendWeight: parseInt(e.target.value) || 0 })}
                placeholder="推荐权重（数字越大优先级越高）"
              />
            </Field.Root>

            <Field.Root>
              <Field.Label>状态</Field.Label>
              <Toggle
                checked={formData.status}
                onChange={() => setFormData({ ...formData, status: !formData.status })}
                onLabel="启用"
                offLabel="停用"
              />
            </Field.Root>
          </Flex>

          <Flex gap={4}>
            <Button onClick={handleSave}>保存</Button>
            <Button variant="tertiary" onClick={() => navigate(`/plugins/${PLUGIN_ID}/products`)}>取消</Button>
          </Flex>
        </Flex>
      </Box>
    </Main>
  );
};

export { ProductFormPage };