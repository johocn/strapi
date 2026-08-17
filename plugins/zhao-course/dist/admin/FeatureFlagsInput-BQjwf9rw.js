"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const jsxRuntime = require("react/jsx-runtime");
const react = require("react");
const designSystem = require("@strapi/design-system");
const BOOLEAN_CONFIGS = [
  { key: "playbackSpeed", label: "倍速播放", hint: "允许调节播放速度（0.5x - 2x）" },
  { key: "allowLandscape", label: "横竖屏切换", hint: "全屏后允许旋转横竖屏" },
  { key: "screenLock", label: "防误触锁定", hint: "显示锁定按钮，防止误触控制条" },
  { key: "autoNext", label: "自动连播", hint: "课时结束后自动播放下一个课时" },
  { key: "pictureInPicture", label: "画中画小窗", hint: "支持画中画悬浮播放（H5）" },
  { key: "vipSpeedOverride", label: "特权打破倍速限制", hint: "命中特权角色名单时无视倍速开关" }
];
const SEEK_MODE_LABELS = {
  locked: "禁止拖动（锁定进度条）",
  played_only: "仅已播区域",
  free: "自由拖动"
};
function FeatureFlagsInput(props) {
  const { name, value, onChange, disabled } = props;
  const flags = react.useMemo(() => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value;
    }
    return {};
  }, [value]);
  const configured = react.useMemo(
    () => !!value && typeof value === "object" && !Array.isArray(value),
    [value]
  );
  const emit = react.useCallback(
    (next) => {
      if (onChange && typeof onChange === "function") {
        onChange({ target: { name, value: next } });
      }
    },
    [name, onChange]
  );
  const handleToggle = react.useCallback(
    (key, next) => {
      emit({ ...flags, [key]: next });
    },
    [flags, emit]
  );
  const handleSeekMode = react.useCallback(
    (next) => {
      emit({ ...flags, seekMode: next });
    },
    [flags, emit]
  );
  return /* @__PURE__ */ jsxRuntime.jsxs(
    designSystem.Box,
    {
      padding: 4,
      hasRadius: true,
      borderStyle: "dashed",
      borderWidth: "1px",
      borderColor: "neutral200",
      background: "neutral0",
      children: [
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingBottom: 4, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { alignItems: "center", justifyContent: "space-between", children: [
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", fontWeight: "bold", textColor: "neutral800", children: "课程播放功能开关（featureFlags）" }),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Badge, { active: configured, variant: configured ? "success" : "neutral", children: configured ? "已配置" : "未配置" })
        ] }) }),
        /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Grid.Root, { gap: 4, gridCols: 2, children: [
          BOOLEAN_CONFIGS.map((cfg) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { xs: 2, s: 1, col: 1, children: /* @__PURE__ */ jsxRuntime.jsxs(
            designSystem.Box,
            {
              padding: 3,
              hasRadius: true,
              background: "neutral100",
              style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 },
              children: [
                /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 1, style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", fontWeight: "bold", textColor: "neutral800", children: cfg.label }),
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: cfg.hint })
                ] }),
                /* @__PURE__ */ jsxRuntime.jsxs("label", { style: { display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", flexShrink: 0 }, children: [
                  /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { tag: "span", variant: "pi", textColor: "neutral500", children: !!flags[cfg.key] ? "开" : "关" }),
                  /* @__PURE__ */ jsxRuntime.jsx(
                    designSystem.Switch,
                    {
                      checked: !!flags[cfg.key],
                      onCheckedChange: (checked) => handleToggle(cfg.key, checked),
                      onLabel: "开启",
                      offLabel: "关闭",
                      disabled
                    }
                  )
                ] })
              ]
            }
          ) }, cfg.key)),
          /* @__PURE__ */ jsxRuntime.jsx(designSystem.Grid.Item, { xs: 2, s: 2, col: 2, children: /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Box, { padding: 1, style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
            /* @__PURE__ */ jsxRuntime.jsxs(designSystem.Flex, { direction: "column", gap: 1, children: [
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "omega", fontWeight: "bold", textColor: "neutral800", children: "进度条控制（seekMode）" }),
              /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "控制课程进度条的拖动范围" })
            ] }),
            /* @__PURE__ */ jsxRuntime.jsx(
              designSystem.SingleSelect,
              {
                name: `${name}.seekMode`,
                placeholder: "选择进度条模式",
                value: flags.seekMode ?? void 0,
                onChange: handleSeekMode,
                disabled,
                children: Object.keys(SEEK_MODE_LABELS).map((m) => /* @__PURE__ */ jsxRuntime.jsx(designSystem.SingleSelectOption, { value: m, children: SEEK_MODE_LABELS[m] }, m))
              }
            )
          ] }) })
        ] }),
        /* @__PURE__ */ jsxRuntime.jsx(designSystem.Box, { paddingTop: 4, children: /* @__PURE__ */ jsxRuntime.jsx(designSystem.Typography, { variant: "pi", textColor: "neutral600", children: "提示：仅当保存了本表单（至少一项）时，课程才视为启用了播放功能控制；未配置 seekMode 时默认「仅已播区域」。" }) })
      ]
    }
  );
}
exports.default = FeatureFlagsInput;
