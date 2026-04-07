#!/bin/bash

# PhotoCull App Icon 生成脚本
# 需要安装 ImageMagick: brew install imagemagick

ICON_SOURCE="${1:-./icon-source.png}"
OUTPUT_DIR="${2:-./ios/App/App/Assets.xcassets/AppIcon.appiconset}"

if [ ! -f "$ICON_SOURCE" ]; then
    echo "错误: 找不到源图标文件 $ICON_SOURCE"
    echo "使用方法: ./generate-icons.sh [源图标路径] [输出目录]"
    echo "源图标需要是 1024x1024 像素的 PNG 文件"
    exit 1
fi

# 检查 ImageMagick
if ! command -v convert &> /dev/null; then
    echo "错误: 未安装 ImageMagick"
    echo "请运行: brew install imagemagick"
    exit 1
fi

echo "生成 App Icons..."

# iOS App Icon 尺寸
# 注意：从 Xcode 14 开始，只需要提供 1024x1024 的图标
# Xcode 会自动生成其他尺寸
# 但为了兼容性，我们还是生成完整的图标集

sizes=(
    "20:20:1x"
    "20:40:2x"
    "20:60:3x"
    "29:29:1x"
    "29:58:2x"
    "29:87:3x"
    "40:40:1x"
    "40:80:2x"
    "40:120:3x"
    "60:60:2x"
    "60:120:3x"
    "76:76:1x"
    "76:152:2x"
    "83.5:167:2x"
    "1024:1024:1x"
)

for size in "${sizes[@]}"; do
    IFS=':' read -r base pixel scale <<< "$size"
    output_name="Icon-${base}@${scale}.png"
    echo "生成 $output_name (${pixel}x${pixel})"
    convert "$ICON_SOURCE" -resize ${pixel}x${pixel} "${OUTPUT_DIR}/${output_name}"
done

echo "完成！图标已保存到 $OUTPUT_DIR"
echo ""
echo "注意：你需要手动更新 Contents.json 文件来引用新生成的图标"
