# PhotoCull App Store 上架指南

## 前置条件

- [x] Apple Developer 账号（$99/年）
- [x] 已完成所有开发任务
- [x] Xcode 已安装（最新版本）

---

## 第一阶段：Xcode 配置（已完成）

### 1.1 项目基础配置
| 配置项 | 当前值 | 状态 |
|--------|--------|------|
| Bundle Identifier | `com.photocull.app` | ✅ |
| 版本号 | 1.0 | ✅ |
| 应用名称 | PhotoCull | ✅ |
| 隐私权限 | NSPhotoLibraryUsageDescription | ✅ |
| 启动屏幕 | 深色主题 (#0f172a) | ✅ |

### 1.2 需要在 Xcode 中手动完成的配置

打开 `ios/App/App.xcodeproj` 后：

1. **选择 Target** → App → Signing & Capabilities
2. **配置 Team**：选择你的 Apple Developer Team
3. **修改 Bundle Identifier**（可选）：如果使用个人账号，建议改为 `com.yourname.photocull`

---

## 第二阶段：App Store Connect 配置

### 2.1 创建应用记录

1. 访问 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择 "我的 App" → 点击 "+" 创建新应用
3. 填写基本信息：

| 字段 | 建议值 |
|------|--------|
| 平台 | iOS |
| 应用名称 | PhotoCull - 照片筛选助手 |
| 主要语言 | 简体中文 |
| Bundle ID | com.photocull.app（与 Xcode 一致）|
| SKU | photocull-001 |
| 用户访问权限 | 完整访问权限 |

### 2.2 准备应用元数据

**应用描述（中文）：**
```
PhotoCull 是一款专为高效照片管理设计的工具，帮助您从大量照片中快速筛选出最满意的作品。

核心功能：
• 滑动筛选：左右滑动快速决定照片去留，像使用交友软件一样简单直观
• 即时对比：双指同步缩放对比相似照片，精准选择最佳画质
• SNS 预览中心：九宫格预览已选照片，支持拖拽排序，打造完美社交发布组合
• 一键导出：将筛选结果快速保存到相册

适用于：
- 摄影师筛选拍摄作品
- 整理旅行照片
- 挑选社交媒体发布内容
- 释放手机存储空间

隐私保护：
所有照片处理均在本地完成，无需网络连接，保护您的隐私安全。
```

**关键词：**
```
照片筛选,照片管理,相册整理,照片对比,九宫格预览,照片选择,相册清理,照片助手
```

**支持网址：** 可以填写个人博客或 GitHub 仓库

**营销网址：** 可选

---

## 第三阶段：截图与预览视频

### 3.1 所需截图规格

| 设备 | 尺寸 | 数量 |
|------|------|------|
| 6.7" iPhone（14 Pro Max）| 1290 x 2796 | 最多10张 |
| 6.5" iPhone（11 Pro Max）| 1242 x 2688 | 最多10张 |
| 5.5" iPhone（8 Plus）| 1242 x 2208 | 最多10张 |

### 3.2 建议截图内容

1. **首图**：应用主界面，展示滑动筛选功能
2. **次图**：对比模式界面，突出 Sync-Zoom 功能
3. **第三张**：SNS 预览中心九宫格
4. **第四张**：照片导入界面
5. **第五张**：导出成功提示

### 3.3 使用模拟器截图

```bash
# 启动 iOS 模拟器（在 Xcode 中）
# 选择 Device → iPhone 15 Pro Max

# 在模拟器中运行应用（Cmd + R）
# 使用 Cmd + S 保存截图到桌面
```

---

## 第四阶段：构建与上传

### 4.1 构建生产版本

1. 在 Xcode 中：
   - 选择 Scheme: App
   - 选择 Device: Any iOS Device (arm64)

2. 菜单栏：Product → Archive
   - 等待构建完成
   - 会自动打开 Organizer 窗口

3. 在 Organizer 中：
   - 选择最新构建
   - 点击 "Distribute App"
   - 选择 "App Store Connect"
   - 选择 "Upload"
   - 保持默认选项，点击 "Upload"

### 4.2 使用命令行构建（可选）

```bash
cd /Users/xiaoyude/Documents/AiProject/260525/PhotoCull

# 1. 确保代码已同步
npx cap sync ios

# 2. 打开 Xcode
open ios/App/App.xcodeproj

# 3. 后续步骤在 Xcode 中完成
```

---

## 第五阶段：提交审核

### 5.1 在 App Store Connect 中完成

1. 进入应用 → App Store
2. 选择版本号（1.0）
3. 上传的构建会自动出现，选择它
4. 填写以下信息：

**App 审核信息：**
- 登录信息：无需登录（选择"否"）
- 联系信息：填写你的联系方式
- 备注：可留空，或注明"这是一款照片管理工具，所有处理均在本地完成"

**版本发布：**
- 选择"手动发布此版本"（推荐）

### 5.2 提交审核

点击 "提交以供审核"

---

## 第六阶段：审核通过后的操作

### 6.1 发布应用

审核通过后（通常 1-3 天）：
1. 在 App Store Connect 中点击 "发布此版本"
2. 或在设置中选择"自动发布"

---

## 常见问题排查

### Q: 构建失败，显示签名错误
```
解决方案：
1. Xcode → Signing & Capabilities
2. 确保 Team 已选择
3. 勾选 "Automatically manage signing"
```

### Q: 上传时提示 "Invalid Bundle"
```
解决方案：
1. 确保所有隐私权限描述已在 Info.plist 中添加
2. 检查版本号格式（应为 X.Y.Z，如 1.0.0）
```

### Q: 应用被拒绝 - 功能不完整
```
解决方案：
确保应用有实际功能，不能只是一个网页壳。
PhotoCull 已有完整功能，通常不会遇到此问题。
```

### Q: 应用被拒绝 - 权限描述不清晰
```
解决方案：
已在 Info.plist 中添加清晰的权限描述：
- NSPhotoLibraryUsageDescription: "PhotoCull 需要访问您的相册来导入和管理照片..."
```

---

## 检查清单

提交前请确认：

- [ ] Xcode 中 Team 已配置
- [ ] 在真机上测试过（如果可能）
- [ ] 所有隐私权限都有描述
- [ ] 应用图标已设置（1024x1024）
- [ ] 启动屏幕正常显示
- [ ] 截图已准备（至少 3 张）
- [ ] 应用描述已撰写
- [ ] 关键词已填写
- [ ] 支持网址有效
- [ ] 构建成功并上传
- [ ] App Store Connect 中已选择构建版本
- [ ] 审核信息已填写

---

## 联系方式

如有问题，可以参考：
- [Capacitor iOS 文档](https://capacitorjs.com/docs/ios)
- [App Store 审核指南](https://developer.apple.com/app-store/review/guidelines/)
