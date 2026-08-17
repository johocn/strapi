// zhao-course/admin/src/components/FeatureFlagsInput.tsx
// 课程播放功能开关（featureFlags）友好表单编辑器，替代裸 JSON 编辑器。
// key 结构与前端 strapi-course/utils/player-features.ts 的清费字段保持一致。
import React, { useMemo, useCallback } from "react";
import {
  Box,
  Flex,
  Typography,
  Switch,
  SingleSelect,
  SingleSelectOption,
  Grid,
  Badge,
} from "@strapi/design-system";

export type SeekMode = "locked" | "played_only" | "free";

interface FeatureFlags {
  playbackSpeed?: boolean;
  allowLandscape?: boolean;
  screenLock?: boolean;
  autoNext?: boolean;
  pictureInPicture?: boolean;
  vipSpeedOverride?: boolean;
  seekMode?: SeekMode;
}

// 布尔开关配置（与前端 player-features.ts 的 key 一一对应）
const BOOLEAN_CONFIGS: { key: keyof FeatureFlags; label: string; hint: string }[] = [
  { key: "playbackSpeed", label: "倍速播放", hint: "允许调节播放速度（0.5x - 2x）" },
  { key: "allowLandscape", label: "横竖屏切换", hint: "全屏后允许旋转横竖屏" },
  { key: "screenLock", label: "防误触锁定", hint: "显示锁定按钮，防止误触控制条" },
  { key: "autoNext", label: "自动连播", hint: "课时结束后自动播放下一个课时" },
  { key: "pictureInPicture", label: "画中画小窗", hint: "支持画中画悬浮播放（H5）" },
  { key: "vipSpeedOverride", label: "特权打破倍速限制", hint: "命中特权角色名单时无视倍速开关" },
];

const SEEK_MODE_LABELS: Record<SeekMode, string> = {
  locked: "禁止拖动（锁定进度条）",
  played_only: "仅已播区域",
  free: "自由拖动",
};

export default function FeatureFlagsInput(props: any) {
  const { name, value, onChange, disabled } = props;

  // 入参可能为 null / undefined / 非对象，统一归一化为可编辑对象
  const flags: FeatureFlags = useMemo(() => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as FeatureFlags;
    }
    return {};
  }, [value]);

  const configured = useMemo(
    () => !!value && typeof value === "object" && !Array.isArray(value),
    [value]
  );

  const emit = useCallback(
    (next: FeatureFlags) => {
      if (onChange && typeof onChange === "function") {
        onChange({ target: { name, value: next } });
      }
    },
    [name, onChange]
  );

  const handleToggle = useCallback(
    (key: keyof FeatureFlags, next: boolean) => {
      emit({ ...flags, [key]: next });
    },
    [flags, emit]
  );

  const handleSeekMode = useCallback(
    (next: string | number) => {
      emit({ ...flags, seekMode: next as SeekMode });
    },
    [flags, emit]
  );

  return (
    <Box
      padding={4}
      hasRadius
      borderStyle="dashed"
      borderWidth="1px"
      borderColor="neutral200"
      background="neutral0"
    >
      <Box paddingBottom={4}>
        <Flex alignItems="center" justifyContent="space-between">
          <Typography variant="pi" fontWeight="bold" textColor="neutral800">
            课程播放功能开关（featureFlags）
          </Typography>
          <Badge active={configured} variant={configured ? "success" : "neutral"}>
            {configured ? "已配置" : "未配置"}
          </Badge>
        </Flex>
      </Box>

      <Grid.Root gap={4} gridCols={2}>
        {BOOLEAN_CONFIGS.map((cfg) => (
          <Grid.Item key={cfg.key as string} xs={2} s={1} col={1}>
            <Box
              padding={3}
              hasRadius
              background="neutral100"
              style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}
            >
              <Flex direction="column" gap={1} style={{ flex: 1 }}>
                <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                  {cfg.label}
                </Typography>
                <Typography variant="pi" textColor="neutral600">
                  {cfg.hint}
                </Typography>
              </Flex>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }}>
                <Typography tag="span" variant="pi" textColor="neutral500">
                  {!!flags[cfg.key] ? "开" : "关"}
                </Typography>
                <Switch
                  checked={!!flags[cfg.key]}
                  onCheckedChange={(checked: boolean) => handleToggle(cfg.key, checked)}
                  onLabel="开启"
                  offLabel="关闭"
                  disabled={disabled}
                />
              </label>
            </Box>
          </Grid.Item>
        ))}

        <Grid.Item xs={2} s={2} col={2}>
          <Box padding={1} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Flex direction="column" gap={1}>
              <Typography variant="omega" fontWeight="bold" textColor="neutral800">
                进度条控制（seekMode）
              </Typography>
              <Typography variant="pi" textColor="neutral600">
                控制课程进度条的拖动范围
              </Typography>
            </Flex>
            <SingleSelect
              name={`${name}.seekMode`}
              placeholder="选择进度条模式"
              value={flags.seekMode ?? undefined}
              onChange={handleSeekMode}
              disabled={disabled}
            >
              {(Object.keys(SEEK_MODE_LABELS) as SeekMode[]).map((m) => (
                <SingleSelectOption key={m} value={m}>
                  {SEEK_MODE_LABELS[m]}
                </SingleSelectOption>
              ))}
            </SingleSelect>
          </Box>
        </Grid.Item>
      </Grid.Root>

      <Box paddingTop={4}>
        <Typography variant="pi" textColor="neutral600">
          提示：仅当保存了本表单（至少一项）时，课程才视为启用了播放功能控制；未配置 seekMode 时默认「仅已播区域」。
        </Typography>
      </Box>
    </Box>
  );
}