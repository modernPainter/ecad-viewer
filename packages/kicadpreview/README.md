# kicadpreview

KiCad ECAD Viewer — 在浏览器中预览 KiCad 原理图（SCH）、PCB、3D 模型和 BOM。

## 安装

```bash
npm install kicadpreview
```

> 中文字体已直接打包，无需额外加载。
> 使用 `SchematicViewer` 时无需安装 `three`。仅在使用 `ECadViewerHelper` 的 3D 模型功能时才需要安装：
> ```bash
> npm install three
> ```

## 快速开始

### 原理图预览（推荐）

`SchematicViewer` 是专注于原理图预览的轻量接口，自动移除 Tab 切换栏和底部图标，仅显示原理图视图。

```html
<div id="viewer" style="width: 800px; height: 600px;"></div>

<script type="module">
    import { SchematicViewer } from "kicadpreview";

    const viewer = new SchematicViewer(document.getElementById("viewer"));

    // 从 URL 加载 KiCad 原理图
    await viewer.loadFromUrls(["/path/to/schematic.kicad_sch"]);

    // 或从文件加载
    await viewer.loadFromFiles(fileList);
</script>
```

### PCB 预览（新增）

`PCBViewer` 是专注于 PCB 布局预览的轻量接口，仅显示 PCB 视图。

```html
<div id="viewer" style="width: 800px; height: 600px;"></div>

<script type="module">
    import { PCBViewer } from "kicadpreview";

    const viewer = new PCBViewer(document.getElementById("viewer"));

    await viewer.loadFromUrls(["/path/to/board.kicad_pcb"]);
    // 或从文件加载
    await viewer.loadFromFiles(fileList);
</script>
```

### 完整功能预览（ECadViewerHelper）

`ECadViewerHelper` 保留了完整的 Tab 切换、3D 模型、BOM 等功能，适用于需要多视图切换的场景。

```javascript
import { ECadViewerHelper } from "kicadpreview";

const viewer = new ECadViewerHelper(containerEl);

// 加载原理图
await viewer.loadFromUrls(["/path/to/schematic.kicad_sch"]);

// 加载 PCB + 3D 模型
await viewer.loadFromUrls(["/path/to/board.kicad_pcb"], {
    glbUrl: "/path/to/model.glb"
});
```

## API

### `SchematicViewer`

专注于原理图预览，自动剥离 Tab 切换栏和底部图标。

#### 构造函数

```typescript
new SchematicViewer(container: HTMLElement)
```

在 `container` 中创建一个 `ecad-viewer` Web Component，自动移除 Tab 头部和底部图标，并激活原理图视图。

#### 方法

| 方法 | 说明 |
|------|------|
| `loadFromUrls(urls: string[])` | 从 URL 加载 KiCad 文件（`.kicad_sch`、`.kicad_pcb`、`.kicad_pro`、`.kicad_wks`） |
| `loadFromFiles(files: File[] \| FileList)` | 从文件列表加载，自动识别 KiCad 文件 |
| `dispose()` | 销毁实例，释放 DOM 资源 |

#### 属性

| 属性 | 说明 |
|------|------|
| `element` | 获取底层 `ecad-viewer` DOM 元素 |

---

### `PCBViewer`

专注于 PCB 布局预览，自动剥离 Tab 切换栏和底部图标，激活 PCB 视图。

#### 构造函数

```typescript
new PCBViewer(container: HTMLElement)
```

#### 方法

| 方法 | 说明 |
|------|------|
| `loadFromUrls(urls: string[])` | 从 URL 加载 KiCad 文件（`.kicad_sch`、`.kicad_pcb`、`.kicad_pro`、`.kicad_wks`） |
| `loadFromFiles(files: File[] \| FileList)` | 从文件列表加载，自动识别 KiCad 文件 |
| `dispose()` | 销毁实例，释放 DOM 资源 |

#### 属性

| 属性 | 说明 |
|------|------|
| `element` | 获取底层 `ecad-viewer` DOM 元素 |

---

### `ECadViewerHelper`

完整功能预览器，包含 Tab 切换、3D 模型、BOM 等所有视图。

#### 构造函数

```typescript
new ECadViewerHelper(container: HTMLElement)
```

#### 方法

| 方法 | 说明 |
|------|------|
| `loadFromUrls(urls: string[], opts?: { glbUrl?: string })` | 从 URL 加载 KiCad 文件，可选加载 3D 模型 |
| `loadFromFiles(files: File[] \| FileList)` | 从文件列表加载，自动识别 `.kicad_sch`、`.kicad_pcb`、`.kicad_pro`、`.kicad_wks`、`.glb`、`.step`、`.stp` |
| `dispose()` | 销毁实例，释放 DOM 和内存资源 |

#### 属性

| 属性 | 说明 |
|------|------|
| `element` | 获取底层 `ecad-viewer` DOM 元素 |

## 使用示例

### SchematicViewer

#### 单文件 URL 加载

```javascript
import { SchematicViewer } from "kicadpreview";

const container = document.getElementById("viewer");
const viewer = new SchematicViewer(container);

await viewer.loadFromUrls(["/schematic.kicad_sch"]);
```

#### 多文件 URL 加载

```javascript
await viewer.loadFromUrls([
    "/project.kicad_pro",
    "/sheet.kicad_wks",
    "/schematic_page1.kicad_sch",
    "/schematic_page2.kicad_sch",
]);
```

#### 文件选择器上传

```html
<input type="file" id="file-input"
       accept=".kicad_sch,.kicad_pcb,.kicad_pro,.kicad_wks"
       multiple />
<div id="viewer" style="width: 800px; height: 600px;"></div>

<script type="module">
    import { SchematicViewer } from "kicadpreview";

    const viewer = new SchematicViewer(document.getElementById("viewer"));
    const input = document.getElementById("file-input");

    input.addEventListener("change", async (e) => {
        const files = e.target.files;
        if (!files || !files.length) return;
        await viewer.loadFromFiles(files);
    });
</script>
```

#### 动态加载/切换文件

```javascript
const viewer = new SchematicViewer(container);

// 加载第一个设计
await viewer.loadFromUrls(["/project-a.kicad_sch"]);

// 切换到另一个设计（会自动销毁旧 viewer 并重建）
await viewer.loadFromUrls(["/project-b.kicad_sch"]);
```

#### 销毁

```javascript
const viewer = new SchematicViewer(container);
await viewer.loadFromUrls([...]);

// 页面卸载时释放资源
viewer.dispose();
```

---

### ECadViewerHelper

#### 加载原理图

```javascript
import { ECadViewerHelper } from "kicadpreview";

const viewer = new ECadViewerHelper(container);
await viewer.loadFromUrls(["/schematic.kicad_sch"]);
```

#### 加载 PCB + 3D 模型

```javascript
const viewer = new ECadViewerHelper(container);

// 从 URL 加载
await viewer.loadFromUrls(
    ["/board.kicad_pcb"],
    { glbUrl: "/model.glb" }
);

// 从文件加载
await viewer.loadFromFiles([boardFile, glbFile]);
```

---

### 在 Vue 3 中使用

```vue
<template>
    <div ref="viewerRef" style="width: 100%; height: 100%;"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { SchematicViewer } from "kicadpreview";

const viewerRef = ref(null);
let viewer = null;

onMounted(async () => {
    viewer = new SchematicViewer(viewerRef.value);
    await viewer.loadFromUrls(["/schematic.kicad_sch"]);
});

onUnmounted(() => {
    viewer?.dispose();
});
</script>
```

---

### 在 React 中使用

```jsx
import { useRef, useEffect } from "react";
import { SchematicViewer } from "kicadpreview";

function SchematicPreview({ url }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const viewer = new SchematicViewer(containerRef.current);
        viewer.loadFromUrls([url]);
        return () => viewer.dispose();
    }, [url]);

    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
```

---

### 错误处理

```javascript
try {
    await viewer.loadFromUrls(["/schematic.kicad_sch"]);
} catch (err) {
    console.error("加载失败:", err.message);
    // viewer 实例仍可复用，再次调用 loadFromUrls 即可重试
}
```

## 支持的文件格式

### SchematicViewer

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| KiCad 原理图 | `.kicad_sch` | 原理图预览 |
| KiCad PCB | `.kicad_pcb` | PCB 布局预览 |
| KiCad 工程文件 | `.kicad_pro` | 工程配置 |
| KiCad 图纸 | `.kicad_wks` | 图纸边框 |

### ECadViewerHelper

在 SchematicViewer 支持的格式基础上，额外支持：

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| 3D 模型 | `.glb`、`.step`、`.stp` | 3D 模型预览 |

## 多文件加载

两个加载接口均支持传入多个文件，多个原理图（`.kicad_sch`）可在单个视图中以多页形式展示。

```javascript
// 多 URL 加载
await viewer.loadFromUrls([
    "/design_blocks/1.kicad_sch",
    "/design_blocks/2.kicad_sch",
]);

// 多文件加载
await viewer.loadFromFiles([schFile1, schFile2, schFile3, proFile, wksFile]);
```

## 目录结构

```
src/
├── sch-viewer/          # 原理图预览功能
│   └── index.ts         # SchematicViewer 类
├── pcb-viewer/          # PCB 预览功能
│   └── index.ts         # PCBViewer 类
├── 3d-viewer/           # 3D 模型预览功能（规划中）
├── shared/              # 共享模块
│   └── types.ts         # 共享类型定义
├── ecad-viewer-helper.ts # ECadViewerHelper 类
└── index.ts             # 入口，统一导出
```

## 注意事项

### 1. 构建工具兼容性

| 构建工具 | 兼容性 | 说明 |
|----------|--------|------|
| Vite | ✅ 直接使用 | — |
| Webpack 5 | ✅ 直接使用 | — |
| Rollup | ✅ 直接使用 | — |
| Webpack 4 / Vue CLI 3 | ⚠️ 需配置 | 见下方说明 |

**Webpack 4 / Vue CLI 3 用户**需要在 `vue.config.js` 中添加：

```javascript
module.exports = {
    transpileDependencies: ["kicadpreview"],
};
```

### 2. 容器尺寸

查看器会将内部元素设置为 `width: 100%; height: 100%`，请确保容器元素有明确的宽高，否则查看器不会显示。

### 3. 资源释放

组件卸载时务必调用 `dispose()`，以释放 DOM 和内存资源。

```javascript
// 示例：在 React useEffect 中
useEffect(() => {
    const viewer = new SchematicViewer(containerRef.current);
    viewer.loadFromUrls(["/schematic.kicad_sch"]);
    return () => viewer.dispose();
}, []);
```

### 4. 浏览器兼容性

- 需要支持 **ES2020** 的现代浏览器（Chrome 80+、Firefox 80+、Safari 14+、Edge 80+）
- 需要支持 **Web Components**（Custom Elements、Shadow DOM）
- 需要支持 **Web Worker**

### 5. three.js 依赖

- `SchematicViewer` 不需要 `three`，可独立使用
- `ECadViewerHelper` 的 3D 模型功能需要 `three`，请自行安装：`npm install three`
- 3D 模块采用懒加载，仅在切换到 3D 视图时才会加载 `three` 相关代码

### 6. 跨域限制

使用 `loadFromUrls()` 时，KiCad 文件需要与页面同源，或服务器配置了正确的 CORS 响应头。

## 本地开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 清理产物
npm run clean

# 本地预览（需先构建，然后启动静态服务器）
npx http-server -p 8090 -c-1
# 访问 http://localhost:8090/preview.html
```

## License

MIT
