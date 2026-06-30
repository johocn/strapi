import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader, EmptyStateLayout,
  Table, Thead, Tbody, Tr, Th, Td, Badge, Modal, TextInput, Field,
  SingleSelect, SingleSelectOption, Textarea,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const COLLECT_METHODS: Record<string, string> = {
  "web-crawler": "网页爬虫",
  "zip-pdf": "ZIP+PDF解析",
  "manual": "手动录入",
  "api": "三方API",
};

const COLLECT_STATUS: Record<string, { label: string; color: string }> = {
  "pending": { label: "待采集", color: "warning600" },
  "success": { label: "成功", color: "success600" },
  "failed": { label: "失败", color: "danger600" },
};

const CollectConfigPage = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    collectMethod: "web-crawler",
    collectUrl: "",
    collectRules: "",
  });
  const { get, put, post } = useFetchClient();

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await get(`/admin/plugins/${PLUGIN_ID}/collect-configs`, { params: { pageSize: 100 } });
      setConfigs(data.records || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleEdit = (config: any) => {
    setEditConfig(config);
    setFormData({
      collectMethod: config.collectMethod || "web-crawler",
      collectUrl: config.collectUrl || "",
      collectRules: config.collectRules ? JSON.stringify(config.collectRules, null, 2) : "",
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const submitData = {
        collectMethod: formData.collectMethod,
        collectUrl: formData.collectUrl,
        collectRules: formData.collectRules ? JSON.parse(formData.collectRules) : null,
      };
      await put(`/admin/plugins/${PLUGIN_ID}/collect-configs/${editConfig.id}`, submitData);
      setModalOpen(false);
      fetchConfigs();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleTriggerCollect = async (productId: number) => {
    try {
      await post(`/admin/plugins/${PLUGIN_ID}/collect/trigger`, { productId });
      alert("采集任务已触发");
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={4} alignItems="stretch">
          <Typography variant="alpha">采集配置管理</Typography>

          {loading ? (
            <Loader>加载中...</Loader>
          ) : configs.length === 0 ? (
            <EmptyStateLayout content="暂无采集配置，请先创建产品" />
          ) : (
            <Table colCount={7} rowCount={configs.length}>
              <Thead>
                <Tr>
                  <Th><Typography variant="sigma">产品名称</Typography></Th>
                  <Th><Typography variant="sigma">采集方式</Typography></Th>
                  <Th><Typography variant="sigma">采集URL</Typography></Th>
                  <Th><Typography variant="sigma">状态</Typography></Th>
                  <Th><Typography variant="sigma">最后采集</Typography></Th>
                  <Th><Typography variant="sigma">失败次数</Typography></Th>
                  <Th><Typography variant="sigma">操作</Typography></Th>
                </Tr>
              </Thead>
              <Tbody>
                {configs.map((c: any) => (
                  <Tr key={c.id}>
                    <Td><Typography variant="pi" fontWeight="bold">{c.product?.productName || "-"}</Typography></Td>
                    <Td>
                      <Badge textColor="neutral600">{COLLECT_METHODS[c.collectMethod] || c.collectMethod}</Badge>
                    </Td>
                    <Td><Typography variant="pi">{c.collectUrl || "-"}</Typography></Td>
                    <Td>
                      <Badge textColor={COLLECT_STATUS[c.collectStatus]?.color || "neutral600"}>
                        {COLLECT_STATUS[c.collectStatus]?.label || c.collectStatus}
                      </Badge>
                    </Td>
                    <Td><Typography variant="pi">{c.lastCollectTime ? new Date(c.lastCollectTime).toLocaleString() : "-"}</Typography></Td>
                    <Td><Typography variant="pi">{c.failCount || 0}</Typography></Td>
                    <Td>
                      <Flex gap={2}>
                        <Button size="S" variant="secondary" onClick={() => handleEdit(c)}>
                          配置
                        </Button>
                        <Button size="S" variant="secondary" onClick={() => handleTriggerCollect(c.product?.id)}>
                          采集
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
              <Modal.Title>编辑采集配置</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4}>
                <Field.Root>
                  <Field.Label>采集方式</Field.Label>
                  <SingleSelect
                    value={formData.collectMethod}
                    onChange={(value: any) => setFormData({ ...formData, collectMethod: value })}
                  >
                    {Object.entries(COLLECT_METHODS).map(([key, label]) => (
                      <SingleSelectOption key={key} value={key}>{label}</SingleSelectOption>
                    ))}
                  </SingleSelect>
                </Field.Root>
                <Field.Root>
                  <Field.Label>采集URL</Field.Label>
                  <TextInput
                    value={formData.collectUrl}
                    onChange={(e: any) => setFormData({ ...formData, collectUrl: e.target.value })}
                    placeholder="请输入采集URL（可使用{productCode}占位符）"
                  />
                </Field.Root>
                <Field.Root>
                  <Field.Label>采集规则（JSON格式）</Field.Label>
                  <Textarea
                    value={formData.collectRules}
                    onChange={(e: any) => setFormData({ ...formData, collectRules: e.target.value })}
                    placeholder="请输入JSON格式的采集规则"
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

export { CollectConfigPage };