import { BaseEcadViewer } from "../shared/base-viewer";

export class PCBViewer extends BaseEcadViewer {
    constructor(container: HTMLElement) {
        super(container);
    }

    protected override startChromeCleanup(): void {
        this.stopChromeCleanup();
        const root = this.el.shadowRoot ?? this.el;

        const cleanup = () => {
            // 激活 PCB 视图
            const pcb = root.querySelector("kc-board-app");
            if (pcb && !pcb.classList.contains("active")) {
                pcb.classList.add("active");
            }
            // 关闭原理图视图
            const sch = root.querySelector("kc-schematic-app");
            if (sch && sch.classList.contains("active")) {
                sch.classList.remove("active");
            }
            // 关闭 BOM 视图
            const bom = root.querySelector("ecad-bom-app");
            if (bom && bom.classList.contains("active")) {
                bom.classList.remove("active");
            }
        };
        cleanup();
        this.cleanupObserver = new MutationObserver(cleanup);
        this.cleanupObserver.observe(root, { childList: true, subtree: true });
    }

    async loadFromFiles(files: File[] | FileList): Promise<void> {
        const blobs = await this.filterBlobs(files);
        await this.doLoad({ urls: [], blobs });
    }

    async loadFromUrls(urls: string[]): Promise<void> {
        await this.doLoad({ urls, blobs: [] });
    }
}
