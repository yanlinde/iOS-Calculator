# PhotoCull App - 产品需求文档 (PRD)

> **版本**: v1.0
> **设计图**: `photocull.pen` (由 AI 设计工具维护)
> **目标平台**: iOS (Capacitor + React + TypeScript + TailwindCSS)

---

## 1. 产品概述

### 1.1 产品定位
PhotoCull 是一款 iOS 照片筛选工具，帮助用户从大量照片中快速筛选出满意的图片。采用"左滑淘汰、右滑保留"的交互模式，类似 Tinder 的卡片式筛选体验。

### 1.2 核心流程
1. **导入照片** → 2. **筛选照片** → 3. **导出精选**

---

## 2. 技术架构

### 2.1 技术栈
- **框架**: React 18 + TypeScript
- **构建**: Vite
- **样式**: TailwindCSS
- **动画**: Framer Motion
- **手势**: @use-gesture/react
- **虚拟滚动**: @tanstack/react-virtual (仅双列视图)
- **状态管理**: Zustand
- **移动端**: Capacitor

### 2.2 Capacitor 插件清单
```typescript
// 必需插件
@capacitor/camera          // 照片选择 (权限检查)
@capawesome/capacitor-file-picker  // iOS 15+ PHPickerViewController (主要选择器)
@capacitor/filesystem       // 文件读写 (导出用)
@capacitor-community/media  // 相册导出
@capacitor/core             // 核心

// 注意: FilePicker 使用 PHPickerViewController，不需要相册权限
```

### 2.3 图片处理策略
- **导入时**: 只获取照片元数据 (assetId, dimensions, webPath via `Capacitor.convertFileSrc`)
- **显示时**: 直接使用 `webPath` (格式: `capacitor://localhost/_capacitor_file/...`)
- **导出时**: 按需加载 `blobData` (通过 Filesystem.readFile 读取原图)

---

## 3. 数据模型

### 3.1 UserPhoto 接口
```typescript
interface UserPhoto {
  id: string;                    // UUID，React key 用
  assetId: string;               // iOS 系统相册资产标识符
  localUrl: string | null;       // Capacitor 文件 URL (webPath)
  status: 'normal' | 'passed';   // 照片状态
  dimensions: { width: number; height: number; };
  creationTime: number | null;   // EXIF 时间戳，用于排序
  blobData?: Blob;               // 原始文件数据 (导出时按需加载)
  originalFileName?: string;     // 原始文件名
}
```

### 3.2 状态管理 (Zustand Store)
```typescript
interface PhotoStore {
  photos: UserPhoto[];
  importProgress: ImportProgress;
  showProcessed: boolean;        // 是否显示已淘汰的照片

  // Actions
  addPhotos: (photos) => void;
  updatePhotoStatus: (id, status) => void;
  undoLastAction: () => void;    // 撤销栈最多 10 步
  passAllPhotos: () => void;     // 批量淘汰
  removePassedPhotos: () => void; // 删除所有 passed 照片
  getFilteredPhotos: () => UserPhoto[]; // 根据 showProcessed 过滤
}
```

---

## 4. 页面/组件详细说明

### 4.1 首页 (EmptyState)
**触发条件**: 无照片时显示 (`photos.length === 0`)

**功能**:
- 随机显示 Slogan (2 套文案随机)
- "添加照片"按钮 → 调用 `PhotoPickerService.pickPhotoReferences()`

**设计要点**:
- 白色背景 (#FFFFFF)
- Slogan 字体: 40px, Inter, #D4D4D8
- 按钮: 56px 高, 24px 圆角, #18181B 背景
- SafeArea: 顶部 47px, 底部根据设备调整

---

### 4.2 照片筛选主界面 (SwipeView)

#### 4.2.1 顶部导航栏
- **高度**: 44px (不含 SafeArea)
- **背景**: #050505
- **内容**:
  - 左侧: 视图切换按钮 (双列/单列图标)
  - 中间: "左划淘汰，右划撤销" 提示文字
  - 右侧: 菜单按钮 (汉堡图标)

#### 4.2.2 视图切换
```typescript
type ViewMode = 'single' | 'double';
```
- **双列视图**: 使用 `@tanstack/react-virtual`，每行 2 张照片，虚拟滚动
- **单列视图**: 全宽卡片，无虚拟滚动，map 渲染所有照片
- **切换按钮**: 圆角胶囊样式，选中态 #444444 背景

#### 4.2.3 内容区域 - 双列视图 (DoubleColumnGrid)
**技术**: `@tanstack/react-virtual` + `useVirtualizer`

**功能**:
- 照片按时间降序排列 (最新的在前)
- 每行高度固定 (通过 dimensions 计算)
- 左右两列独立渲染

**交互**:
- **左滑**: 淘汰照片 (状态变为 'passed')
- **右滑**: 恢复照片 (状态变为 'normal')
- **点击**: 打开大图弹窗

**视觉**:
- 左滑背景: 红色 + "淘汰" 文字
- 右滑背景: 蓝色 + "恢复" 文字
- 已淘汰照片: 灰色遮罩 + "已淘汰" 标签

#### 4.2.4 内容区域 - 单列视图 (SwipeList)
**功能**: 与双列视图相同的手势逻辑，但全宽显示

**照片高度计算**:
```typescript
MAX_HEIGHT = 480
MIN_HEIGHT = 280
height = clamp(windowWidth * aspectRatio, MIN_HEIGHT, MAX_HEIGHT)
```

**注意**: 单列视图没有虚拟滚动，照片多时会卡，需优化或限制使用场景

#### 4.2.5 Tab 切换 (normal / passed)
- **normal Tab**: 显示所有未淘汰的照片
- **passed Tab**: 显示已淘汰的照片 (网格展示，可点击查看)
- 切换时通过 `showProcessed` 状态控制过滤

#### 4.2.6 底部操作栏
- **左侧按钮**: "已淘汰 X 清除" (禁用态当 X=0)
- **右侧按钮**: "剩余 X 导出" (禁用态当 X=0)
- **背景**: #050505
- **按钮样式**: 圆角胶囊，左侧 #18181B 背景，右侧蓝色高亮 (#132a58)

#### 4.2.7 菜单弹窗
**触发**: 点击右上角汉堡按钮

**内容**:
- 添加照片
- 全部清空 (带确认弹窗)

**样式**: 白色卡片，圆角 20px，居中显示，黑色遮罩

#### 4.2.8 确认弹窗
**通用样式**: 白色卡片，标题 + 消息 + 取消/确定按钮

**使用场景**:
- 清除已淘汰照片
- 导出确认
- 全部清空确认

---

### 4.3 大图弹窗 (PhotoDetailModal)

#### 4.3.1 打开方式
- React Portal 渲染到 `document.body`
- 点击列表照片时打开

#### 4.3.2 图片加载策略
```typescript
// 优先级: localUrl > blobData
// 预加载完成后再显示，避免黑底
preloadImage(url).then(() => setUrl(url));
```

#### 4.3.3 手势交互
- **单击**: 关闭弹窗
- **双击**: 放大/缩小 (最大 3 倍或原始尺寸)
- **双指缩放**: 自由缩放，有边界限制
- **单指拖动**: 仅在放大状态下可拖动，有边界限制

#### 4.3.4 缩放逻辑
```typescript
MIN_SCALE = 1
DOUBLE_TAP_MAX_SCALE = 3

// 动态计算最大缩放 (基于原始尺寸 vs 显示尺寸)
maxScale = max(原始宽度/显示宽度, 原始高度/显示高度)
```

#### 4.3.5 视觉
- 背景: #2a2a2e (不透明，防止穿透)
- 加载中: 灰色脉冲圆点
- 图片: object-fit: contain, 淡入动画

---

### 4.4 完成页面 (CompletionView)
**触发条件**: normal 照片全部筛选完成 (`remainingPhotos.length === 0`)

**内容**:
- 标题: "筛选完成"
- 按钮 1: "查看已保留 X" (深色背景)
- 按钮 2: "查看已淘汰 X" (浅灰背景)
- 按钮 3: "继续添加照片" (白色边框)

---

## 5. 核心功能详细说明

### 5.1 照片导入流程
```
1. 点击"添加照片"
2. 调用 FilePicker.pickImages({ limit: 500, skipTranscoding: true })
3. 获取照片引用 (包含 path, webPath, dimensions, modifiedAt)
4. 立即添加到 Store (使用 webPath 显示，无需等待)
5. 按 creationTime 降序排序
6. UI 立即显示列表
```

**关键优化**:
- 不等待完整数据加载，瞬间显示列表
- 使用 `skipTranscoding: true` 避免 iOS 转码延迟

### 5.2 照片筛选逻辑
```
左滑 (Swipe Left):
  - normal → passed (淘汰)
  - passed → 无变化 (有视觉反馈但状态不变)

右滑 (Swipe Right):
  - passed → normal (恢复)
  - normal → 无变化 (有视觉反馈但状态不变)
```

**手势细节**:
- 阈值: 屏幕宽度的 15% (双列) / 25% (单列)
- 回弹动画: spring 动画，stiffness: 300, damping: 25

### 5.3 Undo 撤销功能
- **撤销栈**: 最多保存 10 步状态 (深拷贝 photos 数组)
- **触发**: 每次状态变更前自动 push 到栈
- **快捷键**: Backspace 键 (Web 端)

### 5.4 导出功能
**流程**:
1. 获取所有 normal 照片的 `blobData` (如未加载则通过 Filesystem.readFile 读取)
2. 创建「层层选片_精选」相册 (如不存在)
3. 逐张保存到相册 (通过 Media.savePhoto)
4. 清理临时文件

**进度反馈**: 实时显示 "已导出 X/Y"

---

## 6. 图片 URL 管理

### 6.1 URL 类型
1. **localUrl**: `capacitor://localhost/_capacitor_file/...`
   - 优点: 原生性能，无需内存占用
   - 使用场景: 列表显示、大图预览

2. **blobUrl**: `blob:capacitor://localhost/...`
   - 通过 `URL.createObjectURL(blob)` 创建
   - 需要手动 `revokeObjectURL`
   - 使用场景: 备用方案，当 localUrl 不可用时

### 6.2 URL 生命周期管理
```typescript
// 组件内使用 useMemo + useEffect 管理
const url = useMemo(() => {
  if (photo.localUrl) return photo.localUrl;
  if (photo.blobData) return URL.createObjectURL(photo.blobData);
  return null;
}, [photo]);

useEffect(() => {
  return () => {
    if (url && !photo.localUrl) URL.revokeObjectURL(url);
  };
}, [url, photo.localUrl]);
```

---

## 7. 性能优化要求

### 7.1 虚拟滚动 (双列视图)
- 必须实现，否则照片 > 100 张时卡顿
- 每行高度需提前计算 (通过 dimensions)
- overscan 设置: 上下各预留 5 行

### 7.2 图片预加载
- 列表显示后，后台预加载大图
- 使用 `requestIdleCallback` 避免阻塞 UI
- 间隔 50ms 加载一张，平滑进行

### 7.3 手势性能
- 使用 `transform` 而非 `left/top` (GPU 加速)
- Touch Move 时直接操作 DOM，避免 React render
- 使用 `requestAnimationFrame` 节流 state 更新

### 7.4 内存管理
- blob URL 必须及时 revoke
- 大图 Modal 关闭时重置所有 state
- 导出完成后清理临时文件

---

## 8. 设计规范

### 8.1 颜色系统
```
主背景: #050505 (深色) / #FFFFFF (浅色页面)
卡片背景: #18181B
文字主色: #FFFFFF (深色背景) / #18181B (浅色背景)
文字副色: #A1A1AA / #71717A
强调色: #132a58 (导出按钮)
淘汰色: #EF4444 (红色)
恢复色: #3B82F6 (蓝色)
遮罩层: rgba(0, 0, 0, 0.7)
```

### 8.2 字体
```
主字体: Inter, -apple-system, BlinkMacSystemFont, sans-serif
标题字体: Plus Jakarta Sans (部分标题)
```

### 8.3 圆角规范
```
小按钮: 14px-16px
大按钮/卡片: 20px-24px
```

### 8.4 SafeArea 处理
```css
/* 顶部 */
padding-top: env(safe-area-inset-top, 47px);

/* 底部 */
padding-bottom: max(24px, env(safe-area-inset-bottom));

/* 左右 */
padding-left: max(12px, env(safe-area-inset-left));
padding-right: max(12px, env(safe-area-inset-right));
```

---

## 9. 已知问题 & 优化建议

### 9.1 当前已知问题
1. **单列视图无虚拟滚动**: 照片 > 50 张时会卡顿
2. **大图加载延迟**: 点击后到图片显示有短暂黑底/loading
3. **共享元素动画缺失**: 列表到大图的过渡不够流畅

### 9.2 推荐优化方向
1. 给单列视图添加虚拟滚动
2. 实现共享元素过渡 (Shared Element Transition)
3. 预加载优化：列表显示时即开始预加载大图
4. 考虑使用缩略图过渡：先显示低清图，再切换高清

---

## 10. 开发检查清单

### 10.1 必需实现
- [ ] 照片导入 (FilePicker)
- [ ] 双列虚拟滚动列表
- [ ] 单列列表 (可选虚拟滚动)
- [ ] 左滑/右滑手势
- [ ] 大图弹窗 (缩放、拖动)
- [ ] Undo 撤销
- [ ] 导出到相册
- [ ] SafeArea 适配
- [ ] 深色/浅色模式 (按设计图)

### 10.2 性能检查
- [ ] 100 张照片流畅滚动
- [ ] 手势跟手无延迟
- [ ] 内存无泄漏 (blob URL 清理)
- [ ] 导出大文件不闪退

---

## 11. 文件结构参考

```
src/
├── App.tsx                      # 主入口，空状态判断
├── main.tsx                     # React 挂载
├── types/
│   └── photo.ts                 # UserPhoto, ImportProgress 类型
├── stores/
│   └── photoStore.ts            # Zustand 状态管理
├── hooks/
│   ├── usePhotoImport.ts        # 照片导入逻辑
│   └── usePhotoProcessing.ts    # 筛选处理逻辑
├── services/
│   ├── photoPicker.ts           # iOS 照片选择
│   └── exportService.ts         # 相册导出
├── components/
│   ├── EmptyState.tsx           # 空状态首页
│   ├── ImportProgress.tsx       # 导入进度条
│   ├── ProcessedView.tsx        # 已淘汰页面
│   ├── Swipe/
│   │   ├── SwipeView.tsx        # 主筛选界面
│   │   ├── SwipeList.tsx        # 单列视图
│   │   ├── DoubleColumnGrid.tsx # 双列视图
│   │   ├── CompletionView.tsx   # 完成页面
│   │   └── ActionMenu.tsx       # 菜单弹窗
│   └── PhotoDetail/
│       └── PhotoDetailModal.tsx # 大图弹窗
```

---

**备注**: 本 PRD 配合 `photocull.pen` 设计图使用。开发时应优先参考设计图的精确尺寸、颜色、间距参数。如 PRD 与设计图冲突，以设计图为准。
