# PhotoCull App Store 上架 - 快速检查清单

## 当前状态

✅ **已完成:**
- Capacitor iOS 平台配置
- 隐私权限描述 (Info.plist)
- 启动屏幕深色主题
- Bundle ID: `com.photocull.app`
- Xcode 项目已打开

---

## 立即执行（5分钟内）

### 1. 在 Xcode 中配置签名
```
Xcode 左侧栏 → App → Signing & Capabilities
→ Team: [选择你的 Apple Developer Team]
→ 确保 "Automatically manage signing" 已勾选
```

### 2. 在模拟器中测试
```
Xcode 顶部工具栏 → iPhone 15 Pro Max → 点击运行按钮 (▶)
```

### 3. 截图准备
在模拟器中运行应用，使用 **Cmd + S** 保存截图到桌面，准备：
- 主界面（滑动筛选）
- 对比模式
- SNS 预览中心

---

## App Store Connect（10分钟）

### 4. 创建应用记录
访问 https://appstoreconnect.apple.com
- 我的 App → + → 新建 App
- 填写基本信息（见 APPSTORE_SUBMISSION.md）

### 5. 上传元数据
- 应用描述
- 关键词
- 支持网址
- 截图（5张）

---

## 构建与上传（10分钟）

### 6. 归档构建
```
Xcode → Product → Scheme → App
Xcode → Product → Destination → Any iOS Device (arm64)
Xcode → Product → Archive
```

### 7. 上传到 App Store
```
Organizer 窗口 → Distribute App → App Store Connect → Upload
```

### 8. 提交审核
在 App Store Connect 中选择刚上传的构建版本，填写审核信息后提交。

---

## 常见问题快速解决

### 签名错误
```
Xcode → Preferences → Accounts → 登录 Apple ID
→ 下载手动配置文件
```

### 构建失败
```
终端运行:
cd /Users/xiaoyude/Documents/AiProject/260525/PhotoCull
npm run build
npx cap sync ios
```

### 应用图标
默认图标已配置。如需自定义：
1. 替换 `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`
2. 确保新图标是 1024x1024 像素

---

## 下一步

完成后，预计 1-3 个工作日会收到审核结果邮件。

如有问题，查看完整指南：[APPSTORE_SUBMISSION.md](./APPSTORE_SUBMISSION.md)
