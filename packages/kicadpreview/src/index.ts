/* 懒加载 ecad-viewer 自定义元素（仅在浏览器端且实际需要时才加载） */
let ecadViewerPromise: Promise<void> | null = null;

export function ensureEcadViewer(): Promise<void> {
    if (typeof window === "undefined") return Promise.resolve();
    if (!ecadViewerPromise) {
        ecadViewerPromise = import("./ecad-viewer-core.js").then(() => {});
    }
    return ecadViewerPromise;
}

export { SchematicViewer } from "./sch-viewer/index";
export { PCBViewer } from "./pcb-viewer/index";
export { BomViewer } from "./bom-viewer/index";
export { ECadViewerHelper } from "./ecad-viewer-helper";
