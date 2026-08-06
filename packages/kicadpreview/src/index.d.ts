import type { EcadBlob, EcadSources, EcadViewerElement } from "./shared/types";

export type { EcadBlob, EcadSources, EcadViewerElement };
export { KICAD_EXTENSIONS } from "./shared/types";

export interface LoadOptions {
    glbUrl?: string;
}

export class SchematicViewer {
    constructor(container: HTMLElement);
    loadFromUrls(urls: string[]): Promise<void>;
    loadFromFiles(files: File[] | FileList): Promise<void>;
    readonly element: HTMLElement;
    dispose(): void;
}

export class ECadViewerHelper {
    constructor(container: HTMLElement);
    loadFromUrls(urls: string[], opts?: LoadOptions): Promise<void>;
    loadFromFiles(files: File[] | FileList): Promise<void>;
    readonly element: HTMLElement;
    dispose(): void;
}
