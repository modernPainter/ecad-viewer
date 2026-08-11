import { extract_bom_list_from_content, extract_bom_list_from_urls } from "../../../ecad-viewer-app/src/utils";
import type { BomItem } from "../../../ecad-viewer-app/src/kicad/bom_item";
import { KICAD_EXTENSIONS, type EcadBlob } from "../shared/types";

/* ---- 工具 ---- */

function csvEscape(val: string): string {
    if (!val) return "";
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
}

function esc(s: string): string {
    if (!s) return "";
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function filterBlobs(files: File[] | FileList): Promise<EcadBlob[]> {
    const arr = Array.from(files);
    const valid = arr.filter((f) =>
        KICAD_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (!valid.length) {
        throw new Error("没有有效的 KiCad 文件（支持 .kicad_sch / .kicad_pcb / .kicad_pro）");
    }
    return Promise.all(
        valid.map((f) => f.text().then((content) => ({ filename: f.name, content })))
    );
}

/* ---- 列定义 ---- */

const BOM_COLUMNS = [
    { key: "index", label: "No", width: "3em" },
    { key: "Reference", label: "Designator", width: "auto" },
    { key: "Name", label: "Value" },
    { key: "Description", label: "Description" },
    { key: "Footprint", label: "Footprint" },
    { key: "Qty", label: "Qty", width: "3em" },
] as const;

/* ========== 模板一：PC 表格 ========== */

function renderTable(items: BomItem[]): string {
    if (!items.length) {
        return '<div class="bom-empty">无 BOM 数据</div>';
    }
    const headerCells = BOM_COLUMNS.map((c) => {
        const style = c.width ? ` style="width:${c.width}"` : "";
        return `<th${style}>${c.label}</th>`;
    }).join("");
    const header = `<thead><tr>${headerCells}</tr></thead>`;

    const rows = items.map((item, i) => {
        const cells = BOM_COLUMNS.map((col) => {
            if (col.key === "index") return `<td>${i + 1}</td>`;
            const val = String(item[col.key as keyof BomItem] ?? "");
            const title = val ? ` title="${val.replace(/"/g, "&quot;")}"` : "";
            return `<td${title}>${val}</td>`;
        }).join("");
        return `<tr>${cells}</tr>`;
    }).join("");

    const total = items.reduce((sum, item) => sum + item.Qty, 0);
    const footer = `<tfoot><tr><td colspan="${BOM_COLUMNS.length}">共 ${items.length} 种元件，合计 ${total} 件</td></tr></tfoot>`;

    return `<table class="bom-table">${header}<tbody>${rows}</tbody>${footer}</table>`;
}

/* ========== 模板二：手机卡片 ========== */

function renderCards(items: BomItem[]): string {
    if (!items.length) {
        return '<div class="bom-empty">无 BOM 数据</div>';
    }

    const total = items.reduce((sum, item) => sum + item.Qty, 0);

    const cards = items.map((item) => `
        <div class="bom-card">
            <div class="bom-card-hd">
                <span class="bom-card-ref">${esc(item.Reference)}</span>
                <span class="bom-card-val">${esc(item.Name || "—")}</span>
                <span class="bom-card-qty">x${item.Qty}</span>
            </div>
            <div class="bom-card-bd">
                ${item.Footprint ? `<span class="bom-card-tag">${esc(item.Footprint)}</span>` : ""}
                ${item.DNP ? '<span class="bom-card-dnp">DNP</span>' : ""}
                ${item.Description ? `<span class="bom-card-desc">${esc(item.Description)}</span>` : ""}
            </div>
        </div>
    `).join("");

    return `
        <div class="bom-cards">${cards}</div>
        <div class="bom-cards-foot">
            <span>共 ${items.length} 种元件</span>
            <span class="bom-cards-pipe"></span>
            <span>合计 ${total} 件</span>
        </div>
    `;
}

/* ========== 导出模板 ========== */

function renderPlainTable(items: BomItem[]): string {
    if (!items.length) return "无 BOM 数据";
    const header = BOM_COLUMNS.filter((c) => c.key !== "index").map((c) => c.label).join("\t");
    const rows = items.map((_item) => {
        return BOM_COLUMNS.filter((c) => c.key !== "index")
            .map((col) => String(_item[col.key as keyof BomItem] ?? ""))
            .join("\t");
    }).join("\n");
    return `${header}\n${rows}`;
}

function renderCsv(items: BomItem[]): string {
    if (!items.length) return "";
    const cols = BOM_COLUMNS.filter((c) => c.key !== "index");
    const header = cols.map((c) => c.label).join(",");
    const rows = items.map((item) =>
        cols.map((col) => csvEscape(String(item[col.key as keyof BomItem] ?? ""))).join(",")
    ).join("\n");
    return `${header}\n${rows}`;
}

/* ========== 样式（仅浏览器端注入一次） ========== */

const MOBILE_BREAKPOINT = 640;
let styleInjected = false;

function injectStyles(): void {
    if (typeof document === "undefined") return; // SSR: no-op
    if (styleInjected) return;
    styleInjected = true;

    const css = /* css */ `
        /* 通用 */
        .bom-viewer { height: 100%; overflow: auto; }
        .bom-viewer::-webkit-scrollbar { width: 6px; height: 6px; }
        .bom-viewer::-webkit-scrollbar-track { background: transparent; }
        .bom-viewer::-webkit-scrollbar-thumb {
            background: #d0d0d0; border-radius: 3px;
        }
        .bom-viewer::-webkit-scrollbar-thumb:hover { background: #b0b0b0; }
        .bom-viewer {
            scrollbar-width: thin;
            scrollbar-color: #d0d0d0 transparent;
        }
        .bom-empty, .bom-loading, .bom-error {
            display: flex; align-items: center; justify-content: center;
            height: 100%; color: #999; font-size: 14px;
        }
        .bom-error { color: #ff4d4f; }

        /* ===== PC 表格 ===== */
        .bom-table {
            width: 100%; border-collapse: collapse; font-size: 13px;
        }
        .bom-table thead { position: sticky; top: 0; z-index: 2; }
        .bom-table th {
            background: #fafafa; color: #555; font-weight: 600;
            padding: 8px 12px; text-align: left; border-bottom: 2px solid #e8e8e8;
            white-space: nowrap;
        }
        .bom-table td {
            padding: 6px 12px; border-bottom: 1px solid #f0f0f0;
            color: #333; max-width: 300px; overflow: hidden;
            text-overflow: ellipsis; white-space: nowrap;
        }
        .bom-table tbody tr:hover td { background: #f6f9ff; }
        .bom-table tfoot td {
            padding: 8px 12px; border-top: 2px solid #e8e8e8;
            background: #fafafa; font-weight: 600; color: #555;
            text-align: center;
        }

        /* ===== 手机卡片 ===== */
        .bom-cards {
            display: flex; flex-direction: column; gap: 8px;
            padding: 8px 12px;
        }
        .bom-card {
            background: #fff; border-radius: 10px;
            padding: 12px 14px; border: 1px solid #e8e8e8;
            box-shadow: 0 1px 2px rgba(0,0,0,.04);
            -webkit-user-select: none; user-select: none;
        }
        .bom-card:active { background: #f9f9f9; }
        .bom-card-hd {
            display: flex; align-items: center; gap: 8px;
        }
        .bom-card-ref {
            font-size: 15px; font-weight: 700; color: #1677ff;
            min-width: 0; overflow: hidden; text-overflow: ellipsis;
        }
        .bom-card-val {
            font-size: 14px; color: #333;
        }
        .bom-card-qty {
            margin-left: auto; font-size: 13px; font-weight: 600;
            color: #888; background: #f5f5f5; padding: 2px 10px;
            border-radius: 10px; white-space: nowrap; flex-shrink: 0;
        }
        .bom-card-bd {
            display: flex; align-items: center; gap: 6px;
            margin-top: 6px; flex-wrap: wrap;
        }
        .bom-card-tag {
            font-size: 11px; color: #888; background: #f5f5f5;
            padding: 1px 8px; border-radius: 4px;
            word-break: break-all; line-height: 1.5;
        }
        .bom-card-dnp {
            font-size: 10px; color: #ff4d4f; background: #fff2f0;
            padding: 1px 6px; border-radius: 4px; font-weight: 600;
        }
        .bom-card-desc {
            font-size: 12px; color: #aaa; width: 100%;
            word-break: break-all; line-height: 1.5;
        }
        .bom-cards-foot {
            display: flex; align-items: center; justify-content: center;
            gap: 10px; padding: 12px 16px 24px;
            font-size: 12px; color: #999;
        }
        .bom-cards-pipe {
            width: 1px; height: 12px; background: #ddd;
        }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
}

/* ========== BomViewer ========== */

export class BomViewer {
    private container: HTMLElement;
    private wrapper: HTMLElement | null = null;
    private items: BomItem[] = [];
    private disposed = false;
    private mq: MediaQueryList | null = null;
    private mqHandler: (() => void) | null = null;

    constructor(container: HTMLElement) {
        this.container = container;

        // 样式注入（SSR 安全：仅在浏览器端执行）
        injectStyles();

        // 监听窗口宽度切换表格/卡片（SSR 安全：仅在浏览器端监听）
        if (typeof window !== "undefined") {
            this.mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
            this.mqHandler = () => this.render();
            this.mq.addEventListener("change", this.mqHandler);
        }
    }

    /* ---- 公开 API ---- */

    get bomItems(): readonly BomItem[] {
        return this.items;
    }

    /* 当前是否为手机模式（SSR 安全） */
    get isMobile(): boolean {
        return this.mq ? this.mq.matches : false;
    }

    async loadFromUrls(urls: string[]): Promise<BomItem[]> {
        this.ensureNotDisposed();
        this.showLoading();
        try {
            this.items = await extract_bom_list_from_urls(urls);
            this.render();
            return this.items;
        } catch (err: any) {
            this.showError(err?.message ?? String(err));
            throw err;
        }
    }

    async loadFromFiles(files: File[] | FileList): Promise<BomItem[]> {
        this.ensureNotDisposed();
        this.showLoading();
        try {
            const blobs = await filterBlobs(files);
            const map: Record<string, string> = {};
            for (const b of blobs) map[b.filename] = b.content;
            this.items = extract_bom_list_from_content(map);
            this.render();
            return this.items;
        } catch (err: any) {
            this.showError(err?.message ?? String(err));
            throw err;
        }
    }

    search(query: string): BomItem[] {
        if (!query.trim()) return this.items;
        const q = query.toLowerCase();
        return this.items.filter((item) =>
            item.Reference?.toLowerCase().includes(q)
            || item.Name?.toLowerCase().includes(q)
            || item.Footprint?.toLowerCase().includes(q)
            || item.Description?.toLowerCase().includes(q)
        );
    }

    toCsv(): string { return renderCsv(this.items); }
    toTsv(): string { return renderPlainTable(this.items); }

    dispose(): void {
        this.disposed = true;
        if (this.mq && this.mqHandler) {
            this.mq.removeEventListener("change", this.mqHandler);
            this.mqHandler = null;
            this.mq = null;
        }
        if (this.wrapper) {
            this.wrapper.remove();
            this.wrapper = null;
        }
    }

    /* ---- 内部 ---- */

    private ensureNotDisposed(): void {
        if (this.disposed) throw new Error("BomViewer 已销毁");
    }

    /* 懒创建 wrapper 并挂载到容器 */
    private ensureWrapper(): HTMLElement {
        if (typeof document === "undefined") {
            // SSR: 返回一个无害的占位对象
            throw new Error("BomViewer 无法在服务端渲染 DOM");
        }
        if (!this.wrapper) {
            this.wrapper = document.createElement("div");
            this.wrapper.className = "bom-viewer";
            this.container.appendChild(this.wrapper);
        }
        return this.wrapper;
    }

    private showLoading(): void {
        const w = this.ensureWrapper();
        w.innerHTML = '<div class="bom-loading">正在提取 BOM 数据…</div>';
    }

    private showError(msg: string): void {
        const w = this.ensureWrapper();
        w.innerHTML = `<div class="bom-error">${msg}</div>`;
    }

    private renderEmpty(): void {
        const w = this.ensureWrapper();
        w.innerHTML = this.isMobile ? renderCards([]) : renderTable([]);
    }

    private render(): void {
        const w = this.ensureWrapper();
        w.innerHTML = this.isMobile ? renderCards(this.items) : renderTable(this.items);
    }
}
