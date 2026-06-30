import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, TextInput, Field,
  Toggle,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const CompanyPage = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    shortName: "",
    companyType: "bank-subsidiary",
    website: "",
    status: true,
  });
  const { get, post, put, del } = useFetchClient();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/companies`, { params: { pageSize: 100 } });
      setCompanies(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleCreate = () => {
    setEditCompany(null);
    setFormData({
      name: "",
      shortName: "",
      companyType: "bank-subsidiary",
      website: "",
      status: true,
    });
    setModalOpen(true);
  };

  const handleEdit = (company: any) => {
    setEditCompany(company);
    setFormData({
      name: company.name || "",
      shortName: company.shortName || "",
      companyType: company.companyType || "bank-subsidiary",
      website: company.website || "",
      status: company.status ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editCompany) {
        await put(`/admin/plugins/${PLUGIN_ID}/companies/${editCompany.id}`, formData);
      } else {
        await post(`/admin/plugins/${PLUGIN_ID}/companies`, formData);
      }
      setModalOpen(false);
      fetchCompanies();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此理财公司？")) return;
    try {
      await del(`/admin/plugins/${PLUGIN_ID}/companies/${id}`);
      fetchCompanies();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleStatus = async (id: number, currentStatus: boolean) => {
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/companies/${id}`, { status: !currentStatus });
      fetchCompanies();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Flex justifyContent="space-between">
            <Typography variant="alpha">理财公司管理</Typography>
            <Button onClick={handleCreate}>新建公司</Button>
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : companies.length === 0 ? (
            <EmptyStateLayout content="暂无理财公司" />
          ) : (
            <Table colCount={6} rowCount={companies.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">公司名称</Typography></Th>
                  <Th><Typography variant="sigma">简称</Typography></Th>
                  <Th><Typography variant="sigma">类型</Typography></Th>
                  <Th><Typography variant="sigma">官网</Typography></Th>
                  <Th><Typography variant="sigma">状态</Typography></Th>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {companies.map((c: any) => (
                  <Tr key={c.id}>
                    <Td><Typography variant="pi" fontWeight="bold">{c.name}</Typography></Td>
                    <Td><Typography variant="pi">{c.shortName || "-"}</Typography></Td>
                    <Td>
                      <Badge textColor="neutral600">
                        {c.companyType === "bank" ? "银行" : "理财子公司"}
                      </Badge>
                    </Td>
                    <Td><Typography variant="pi">{c.website || "-"}</Typography></Td>
                    <Td>
                      <Badge textColor={c.status ? "success600" : "neutral600"}>
                        {c.status ? "启用" : "停用"}
                      </Badge>
                    </Td>
                    <Td>
                      <Flex gap={2}>
                        <Button size="S" variant="secondary" onClick={() => handleEdit(c)}>
                          编辑
                        </Button>
                        <Button size="S" variant="secondary" onClick={() => handleToggleStatus(c.id, c.status)}>
                          {c.status ? "停用" : "启用"}
                        </Button>
                        <Button size="S" variant="danger-light" onClick={() => handleDelete(c.id)}>
                          删除
                        </Button>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Flex>
      </Box>

      {modalOpen && (
        <Modal.Root open={modalOpen} onOpenChange={setModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>{editCompany ? "编辑公司" : "新建公司"}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>公司名称 *</Field.Label>
                  <TextInput
                    value={formData.name}
                    onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入公司名称"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>简称</Field.Label>
                  <TextInput
                    value={formData.shortName}
                    onChange={(e: any) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="请输入简称"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>类型</Field.Label>
                  <TextInput
                    value={formData.companyType === "bank" ? "银行" : "理财子公司"}
                    disabled
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>官网地址</Field.Label>
                  <TextInput
                    value={formData.website}
                    onChange={(e: any) => setFormData({ ...formData, website: e.target.value })}
                    placeholder="请输入官网地址"
                  />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleSave}>保存</Button>
              <Button variant="tertiary" onClick={() => setModalOpen(false)}>取消</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { CompanyPage };