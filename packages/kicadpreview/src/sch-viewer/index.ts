import { BaseEcadViewer } from "../shared/base-viewer";

export class SchematicViewer extends BaseEcadViewer {
    constructor(container: HTMLElement) {
        super(container);
    }

    async loadFromFiles(files: File[] | FileList): Promise<void> {
        const blobs = await this.filterBlobs(files);
        await this.doLoad({ urls: [], blobs });
    }

    async loadFromUrls(urls: string[]): Promise<void> {
        await this.doLoad({ urls, blobs: [] });
    }
}
