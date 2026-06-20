import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Modal, TextInput, Field,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const RuleTemplatePage = () => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPoints, setDefaultPoints] = useState("");

  const { get, post, del } = useFetchClient();

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/rule-templates`);
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/rule-templates`, {
        name,
        description,
        defaultPoints: parseInt(defaultPoints),
        category: "increase",
        configSchema: {},
      });
      setCreateModalOpen(false);
      setName("");
      setDescription("");
      setDefaultPoints("");
      fetchTemplates();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定删除此模板？")) return;
    try {
      await del(`/admin/plugins/${PLUGIN_ID}/rule-templates/${id}`);
      fetchTemplates();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Flex justifyContent="space-between">
            <Typography variant="alpha">规则模板</Typography>
            <Button onClick={() => setCreateModalOpen(true)}>新建模板</Button>
          </Flex>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : templates.length === 0 ? (
            <EmptyStateLayout content="暂无模板" />
          ) : (
            <Table colCount={5} rowCount={templates.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">名称</Typography></Th>
                  <Th><Typography variant="sigma">描述</Typography></Th>
                  <Th><Typography variant="sigma">默认积分</Typography></Th>
                  <Th><Typography variant="sigma">内置</Typography></Th>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {templates.map((t: any) => (
                  <Tr key={t.id}>
                    <Td><Typography variant="pi" fontWeight="bold">{t.name}</Typography></Td>
                    <Td><Typography variant="pi">{t.description}</Typography></Td>
                    <Td><Typography variant="pi">{t.defaultPoints}</Typography></Td>
                    <Td><Typography variant="pi">{t.builtIn ? "是" : "否"}</Typography></Td>
                    <Td>
                      {!t.builtIn && (
                        <Button variant="danger-light" size="S" onClick={() => handleDelete(t.id)}>
                          删除
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </Flex>
      </Box>

      {createModalOpen && (
        <Modal.Root open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <Modal.Content>
            <Modal.Header>
              <Modal.Title>新建规则模板</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>模板名称</Field.Label>
                  <TextInput value={name} onChange={(e: any) => setName(e.target.value)} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>描述</Field.Label>
                  <TextInput value={description} onChange={(e: any) => setDescription(e.target.value)} />
                </Field.Root>
                <Field.Root>
                  <Field.Label>默认积分</Field.Label>
                  <TextInput value={defaultPoints} onChange={(e: any) => setDefaultPoints(e.target.value)} />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Button onClick={handleCreate}>创建</Button>
              <Button variant="tertiary" onClick={() => setCreateModalOpen(false)}>取消</Button>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { RuleTemplatePage };
