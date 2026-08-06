export const KICAD_EXTENSIONS = [".kicad_sch", ".kicad_pcb", ".kicad_pro", ".kicad_wks"] as const;

export interface EcadBlob {
    filename: string;
    content: string;
}

export interface EcadSources {
    urls: string[];
    blobs: EcadBlob[];
}

export interface EcadViewerElement extends HTMLElement {
    loaded: boolean;
    project: {
        ov_3d_url?: string;
        load(sources: EcadSources): Promise<void>;
        on_loaded(): void;
    };
    update(): Promise<void>;
}
