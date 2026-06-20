#!/bin/bash

# 构建所有 zhao-* 插件的脚本（节省内存方案）
# 依赖已收集到项目根目录 package.json，不再每个插件单独安装
# 用法: ./scripts/build-plugins.sh

set -e

echo "开始构建所有插件..."

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGINS_DIR="$PROJECT_ROOT/plugins"

if [ ! -d "$PLUGINS_DIR" ]; then
    echo "错误: plugins 目录不存在"
    exit 1
fi

TOTAL=0
SUCCESS=0
FAILED=0

for plugin_dir in "$PLUGINS_DIR"/zhao-*; do
    if [ -d "$plugin_dir" ]; then
        plugin_name=$(basename "$plugin_dir")
        TOTAL=$((TOTAL + 1))
        
        echo ""
        echo "========================================"
        echo "构建插件: $plugin_name"
        echo "========================================"
        
        cd "$plugin_dir"
        
        if [ -f "package.json" ]; then
            if grep -q '"build"' package.json; then
                npx -y @strapi/sdk-plugin build
                if [ $? -eq 0 ]; then
                    SUCCESS=$((SUCCESS + 1))
                    echo "✅ $plugin_name 构建成功"
                else
                    FAILED=$((FAILED + 1))
                    echo "❌ $plugin_name 构建失败"
                fi
            else
                echo "⚠️ $plugin_name 没有 build 脚本，跳过"
            fi
        else
            echo "⚠️ $plugin_name 没有 package.json，跳过"
        fi
        
        cd "$PROJECT_ROOT"
    fi
done

echo ""
echo "========================================"
echo "构建完成"
echo "========================================"
echo "总计: $TOTAL 个插件"
echo "成功: $SUCCESS"
echo "失败: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    exit 1
fi