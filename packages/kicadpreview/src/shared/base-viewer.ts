import type { EcadBlob, EcadSources, EcadViewerElement } from "../shared/types";
import { KICAD_EXTENSIONS } from "../shared/types";
import { ensureEcadViewer } from "../index";

export interface LoadOptions {
    glbUrl?: string;
}

/* 判断当前是否运行在浏览器环境 */
const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

export abstract class BaseEcadViewer {
    protected el!: EcadViewerElement;
    protected container: HTMLElement;
    protected savedEl: EcadViewerElement | null = null;
    protected protectedTypes: readonly string[] = KICAD_EXTENSIONS;
    protected cleanupObserver: MutationObserver | null = null;
    private loading = false;
    private viewerCreated = false;
    /** 设为 true 隐藏点击器件时弹出的属性面板 */
    hidePropertiesPanel = false;

    constructor(container: HTMLElement) {
        this.container = container;
        // SSR-safe: DOM 创建延迟到首次 doLoad() 时
    }

    /* 懒初始化 <ecad-viewer> 自定义元素 */
    private async ensureViewer(): Promise<void> {
        if (this.viewerCreated) return;
        await ensureEcadViewer();
        this.viewerCreated = true;
        this.el = this.createViewer();
    }

    protected createViewer(): EcadViewerElement {
        this.container.innerHTML = "";
        const el = document.createElement("ecad-viewer") as EcadViewerElement;
        el.style.width = "100%";
        el.style.height = "100%";
        (window as any).hide_header = true;
        this.container.appendChild(el);
        return el;
    }

    protected resetViewer(): void {
        this.stopChromeCleanup();
        this.savedEl = this.el;
        this.el = this.createViewer();
    }

    protected restoreViewer(): void {
        if (this.savedEl) {
            this.el.remove();
            this.el = this.savedEl;
            this.savedEl = null;
        }
    }

    private injectChromeCSS(root: ShadowRoot | HTMLElement): void {
        const style = document.createElement("style");
        style.textContent = `
            tab-header { display: none !important; }
            .bottom-left-icon { display: none !important; }
        `;
        root.appendChild(style);

        if (this.hidePropertiesPanel) {
            const injectSubStyle = (selector: string, rules: string) => {
                let attempts = 0;
                const tryInject = () => {
                    const app = root.querySelector(selector) as HTMLElement | null;
                    const sr = app?.shadowRoot;
                    if (sr) {
                        const s = document.createElement("style");
                        s.textContent = rules;
                        sr.appendChild(s);
                    } else if (attempts < 20) {
                        attempts++;
                        requestAnimationFrame(tryInject);
                    }
                };
                tryInject();
            };
            injectSubStyle(
                "kc-schematic-app",
                "kc-schematic-properties-panel { display: none !important; }",
            );
            injectSubStyle(
                "kc-board-app",
                "kc-board-properties-panel { display: none !important; }",
            );
        }
    }

    protected startChromeCleanup(): void {
        this.stopChromeCleanup();
        const root = this.el.shadowRoot ?? this.el;

        const cleanup = () => {
            const schematic = root.querySelector("kc-schematic-app");
            if (schematic && !schematic.classList.contains("active")) {
                schematic.classList.add("active");
            }
            const bom = root.querySelector("ecad-bom-app");
            if (bom && bom.classList.contains("active")) {
                bom.classList.remove("active");
            }
        };
        cleanup();
        this.cleanupObserver = new MutationObserver(cleanup);
        this.cleanupObserver.observe(root, { childList: true, subtree: true });
    }

    protected stopChromeCleanup(): void {
        if (this.cleanupObserver) {
            this.cleanupObserver.disconnect();
            this.cleanupObserver = null;
        }
    }

    protected stripChrome(): void {
        const root = this.el.shadowRoot;
        if (root) {
            this.injectChromeCSS(root);

            // 单页时隐藏 toggle button，通过 rAF 轮询穿透子 Shadow DOM
            const pages = this.el.project?.pages;
            if (pages && pages.length <= 1) {
                let attempts = 0;
                const tryHide = () => {
                    const schApp = root.querySelector("kc-schematic-app");
                    const btn = schApp?.shadowRoot?.querySelector(".toggle-button") as HTMLElement | null;
                    if (btn) {
                        btn.style.display = "none";
                    } else if (attempts < 20) {
                        attempts++;
                        requestAnimationFrame(tryHide);
                    }
                };
                tryHide();
            }
        }
        this.startChromeCleanup();
    }

    protected async doLoad(sources: EcadSources, opts?: LoadOptions): Promise<void> {
        const hasSources = (sources.urls && sources.urls.length > 0)
                        || (sources.blobs && sources.blobs.length > 0);
        if (!hasSources) {
            throw new Error("没有有效的 KiCad 文件（支持 .kicad_sch / .kicad_pcb / .kicad_pro / .kicad_wks）");
        }
        if (this.loading) {
            throw new Error("当前正在加载中，请稍后再试");
        }
        this.loading = true;

        // 首次加载时创建 viewer DOM
        await this.ensureViewer();

        this.resetViewer();
        try {
            await this.beforeLoad(opts);
            await this.el.project.load(sources);
            this.el.loaded = true;
            await this.el.update();
            this.stripChrome();
            this.el.project.on_loaded();
            this.savedEl?.remove();
            this.savedEl = null;
        } catch (err) {
            this.restoreViewer();
            throw err;
        } finally {
            this.loading = false;
        }
    }

    protected async beforeLoad(_opts?: LoadOptions): Promise<void> {}

    protected async filterBlobs(files: File[] | FileList): Promise<EcadBlob[]> {
        const matched: File[] = [];
        for (const f of Array.from(files)) {
            const name = f.name.toLowerCase();
            if (this.protectedTypes.some((ext) => name.endsWith(ext))) {
                matched.push(f);
            }
        }
        const contents = await Promise.all(matched.map((f) => f.text()));
        return matched.map((f, i) => ({ filename: f.name, content: contents[i] }));
    }

    get element(): HTMLElement | null {
        return this.viewerCreated ? this.el : null;
    }

    /* 适配屏幕：将图纸缩放并居中到当前容器尺寸 */
    fitScreen(): void {
        if (!this.viewerCreated) return;
        const root = this.el.shadowRoot;
        if (!root) return;

        const apps: { viewer?: { zoom_fit_top_item?(): void } }[] = [
            root.querySelector("kc-schematic-app") as any,
            root.querySelector("kc-board-app") as any,
        ];

        for (const app of apps) {
            if (app?.viewer?.zoom_fit_top_item) {
                app.viewer.zoom_fit_top_item();
            }
        }
    }

    dispose(): void {
        this.loading = false;
        this.stopChromeCleanup();
        if (this.viewerCreated) {
            this.el.remove();
        }
        this.savedEl = null;
        this.viewerCreated = false;
    }
}
