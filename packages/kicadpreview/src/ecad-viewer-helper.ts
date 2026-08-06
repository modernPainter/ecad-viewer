import { BaseEcadViewer, type LoadOptions } from "./shared/base-viewer";
import type { EcadBlob } from "./shared/types";
import { KICAD_EXTENSIONS } from "./shared/types";

const THREE_EXTENSIONS = [".glb", ".step", ".stp"];

export class ECadViewerHelper extends BaseEcadViewer {
    private objectUrl: string | undefined;

    constructor(container: HTMLElement) {
        super(container);
    }

    protected override async beforeLoad(opts?: LoadOptions): Promise<void> {
        this.revokeObjectUrl();
        if (opts?.glbUrl) {
            this.el.project.ov_3d_url = opts.glbUrl;
        }
    }

    protected override async filterBlobs(files: File[] | FileList): Promise<EcadBlob[]> {
        const blobs: EcadBlob[] = [];
        const glbFiles: File[] = [];

        for (const f of Array.from(files)) {
            const name = f.name.toLowerCase();
            if (THREE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
                glbFiles.push(f);
            } else if (KICAD_EXTENSIONS.some((ext) => name.endsWith(ext))) {
                blobs.push({ filename: f.name, content: await f.text() });
            }
        }

        if (glbFiles.length > 0) {
            this.objectUrl = URL.createObjectURL(glbFiles[0]);
        }

        return blobs;
    }

    private revokeObjectUrl(): void {
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = undefined;
        }
    }

    async loadFromFiles(files: File[] | FileList): Promise<void> {
        const blobs = await this.filterBlobs(files);
        await this.doLoad({ urls: [], blobs });
    }

    async loadFromUrls(urls: string[], opts: LoadOptions = {}): Promise<void> {
        await this.doLoad({ urls, blobs: [] }, opts);
    }

    dispose(): void {
        this.revokeObjectUrl();
        super.dispose();
    }
}
