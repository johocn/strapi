import { useEffect, useState } from "react";
import {
  Main, Box, Flex, Typography, Button, Loader,
  Switch, Field, TextInput, Grid,
} from "@strapi/design-system";
import { useFetchClient } from "@strapi/strapi/admin";
import { PLUGIN_ID } from "../pluginId";

const ConfigPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<any>({});
  const { get, put } = useFetchClient();

  useEffect(() => {
    (async () => {
      try {
        const { data } = await get(`/admin/plugins/${PLUGIN_ID}/config`);
        setConfig(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateField = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await put(`/admin/plugins/${PLUGIN_ID}/config`, config);
      alert("保存成功");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader>加载中...</Loader>;

  return (
    <Main>
      <Box padding={8}>
        <Flex direction="column" gap={6} alignItems="stretch" maxWidth="600px">
          <Typography variant="alpha">系统配置</Typography>

          <Box background="neutral100" padding={6} borderRadius={4}>
            <Typography variant="delta" paddingBottom={4}>功能开关</Typography>
            <Flex direction="column" gap={4}>
              <Flex justifyContent="space-between">
                <Typography>积分模块总开关</Typography>
                <Switch
                  checked={config.moduleEnabled}
                  onCheckedChange={(v: boolean) => updateField("moduleEnabled", v)}
                />
              </Flex>
              <Flex justifyContent="space-between">
                <Typography>积分获取功能</Typography>
                <Switch
                  checked={config.earnEnabled}
                  onCheckedChange={(v: boolean) => updateField("earnEnabled", v)}
                />
              </Flex>
              <Flex justifyContent="space-between">
                <Typography>积分兑换功能</Typography>
                <Switch
                  checked={config.redeemEnabled}
                  onCheckedChange={(v: boolean) => updateField("redeemEnabled", v)}
                />
              </Flex>
              <Flex justifyContent="space-between">
                <Typography>积分过期功能</Typography>
                <Switch
                  checked={config.expiryEnabled}
                  onCheckedChange={(v: boolean) => updateField("expiryEnabled", v)}
                />
              </Flex>
            </Flex>
          </Box>

          <Box background="neutral100" padding={6} borderRadius={4}>
            <Typography variant="delta" paddingBottom={4}>有效期设置</Typography>
            <Grid.Root gridCols={2} gap={4}>
              <Grid.Item col={1}>
                <Field.Root>
                  <Field.Label>有效期（天）</Field.Label>
                  <TextInput
                    value={String(config.expiryDays || 365)}
                    onChange={(e: any) => updateField("expiryDays", parseInt(e.target.value) || 0)}
                    type="number"
                  />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={1}>
                <Field.Root>
                  <Field.Label>过期提醒（天）</Field.Label>
                  <TextInput
                    value={String(config.expiryReminderDays || 7)}
                    onChange={(e: any) => updateField("expiryReminderDays", parseInt(e.target.value) || 0)}
                    type="number"
                  />
                </Field.Root>
              </Grid.Item>
            </Grid.Root>
          </Box>

          <Box background="neutral100" padding={6} borderRadius={4}>
            <Typography variant="delta" paddingBottom={4}>限制设置</Typography>
            <Grid.Root gridCols={2} gap={4}>
              <Grid.Item col={1}>
                <Field.Root>
                  <Field.Label>最低兑换积分</Field.Label>
                  <TextInput
                    value={String(config.minRedeemPoints || 0)}
                    onChange={(e: any) => updateField("minRedeemPoints", parseInt(e.target.value) || 0)}
                    type="number"
                  />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={1}>
                <Field.Root>
                  <Field.Label>每日获取上限</Field.Label>
                  <TextInput
                    value={String(config.maxDailyEarn || 0)}
                    onChange={(e: any) => updateField("maxDailyEarn", parseInt(e.target.value) || 0)}
                    type="number"
                  />
                </Field.Root>
              </Grid.Item>
              <Grid.Item col={1}>
                <Field.Root>
                  <Field.Label>默认汇率</Field.Label>
                  <TextInput
                    value={String(config.defaultExchangeRate || 1.0)}
                    onChange={(e: any) => updateField("defaultExchangeRate", parseFloat(e.target.value) || 1.0)}
                    type="number"
                  />
                </Field.Root>
              </Grid.Item>
            </Grid.Root>
          </Box>

          <Box>
            <Button onClick={handleSave} loading={saving}>保存配置</Button>
          </Box>
        </Flex>
      </Box>
    </Main>
  );
};

export { ConfigPage };
