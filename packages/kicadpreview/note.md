packages/kicadpreview 是预览的 npm 包（包名：kicadpreview）

已完成调整内容：
1. ✅ 对预览功能进行拆分，暴露原理图预览功能的接口（SchematicViewer）
2. ✅ 预览切换 tab 的头部已移除
3. ✅ 预览中 `<a class="bottom-left-icon">` 底部图标已移除
4. ✅ 代码只限在 packages/kicadpreview 内，其它外部代码仅作参考引用
5. 🔲 后续陆续暴露其他功能接口（pcb-viewer、3d-viewer 等）
6. ✅ 当前工作重点为优化原理图预览功能
7. ✅ 目录已从 sch-viewer 更名为 kicadpreview，内部按功能划分子目录

目录结构：
src/
├── sch-viewer/          # 原理图预览功能（已实现）
├── pcb-viewer/          # PCB 预览功能（规划中）
├── 3d-viewer/           # 3D 模型预览功能（规划中）
├── shared/              # 共享模块
├── ecad-viewer-helper.ts # 完整功能预览器
└── index.ts             # 统一导出
