import type { EcadBlob, EcadSources, EcadViewerElement } from "../shared/types";
import { KICAD_EXTENSIONS } from "../shared/types";

export interface LoadOptions {
    glbUrl?: string;
}

export abstract class BaseEcadViewer {
    protected el: EcadViewerElement;
    protected container: HTMLElement;
    protected savedEl: EcadViewerElement | null = null;
    protected protectedTypes: readonly string[] = KICAD_EXTENSIONS;

    constructor(container: HTMLElement) {
        this.container = container;
        this.el = this.createViewer();
    }

    protected createViewer(): EcadViewerElement {
        const el = document.createElement("ecad-viewer") as EcadViewerElement;
        el.style.width = "100%";
        el.style.height = "100%";
        window.hide_header = true;
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

    private cleanupObserver: MutationObserver | null = null;

    private injectChromeCSS(root: ShadowRoot | HTMLElement): void {
        const style = document.createElement("style");
        style.textContent = `
            tab-header { display: none !important; }
            .bottom-left-icon { display: none !important; }
        `;
        root.appendChild(style);
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
        }
        this.startChromeCleanup();
    }

    protected async doLoad(sources: EcadSources, opts?: LoadOptions): Promise<void> {
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

    get element(): HTMLElement {
        return this.el;
    }

    dispose(): void {
        this.stopChromeCleanup();
        this.el.remove();
        this.savedEl = null;
    }
}
