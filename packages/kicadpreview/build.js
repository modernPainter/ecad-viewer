import esbuild from "esbuild";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APP_SRC = resolve(ROOT, "packages/ecad-viewer-app/src");

const ENTRY = resolve(__dirname, "src/index.ts");
const ECAD_VIEWER_ENTRY = resolve(APP_SRC, "ecad-viewer/ecad_viewer.ts");
const OUTDIR = resolve(__dirname, "dist");

console.log("Building kicadpreview...");

const BANNER = `/* ---- Node.js SSR polyfill ---- */
if(typeof HTMLElement==="undefined"){
  globalThis.HTMLElement=class{};
  globalThis.HTMLDivElement=class{};
  globalThis.HTMLSpanElement=class{};
  globalThis.HTMLImageElement=class{};
  globalThis.HTMLCanvasElement=class{};
  globalThis.HTMLTemplateElement=class{};
  globalThis.HTMLUnknownElement=class{};
  globalThis.customElements={define:function(){},get:function(){return null},whenDefined:function(){return Promise.resolve()}};
}
if(!globalThis.document){
  globalThis.document={
    createElement:function(){return{style:{},appendChild:function(){}}},
    createTextNode:function(){return{}},
    createDocumentFragment:function(){return{appendChild:function(){}}},
    head:{appendChild:function(){}},
    body:{appendChild:function(){}},
    querySelector:function(){return null},
    querySelectorAll:function(){return[]},
    importNode:function(n){return n&&n.cloneNode?n.cloneNode(true):n}
  };
}
`;

/* ---- 主入口构建 ---- */
let context = await esbuild.context({
    entryPoints: {
        "ecad-viewer": ENTRY,
        "parser.worker": resolve(APP_SRC, "kicanvas/parser.worker.ts"),
    },
    bundle: true,
    format: "esm",
    splitting: true,
    target: "es2020",
    outdir: OUTDIR,
    keepNames: true,
    sourcemap: true,
    minify: true,
    banner: { js: BANNER },
    drop: ["debugger"],
    resolveExtensions: [".ts", ".tsx", ".js", ".mjs", ".css", ".glsl", ".svg", ".kicad_wks"],
    alias: {
        "kicad-parser": resolve(ROOT, "packages/kicad-parser/src"),
        "3d-viewer": resolve(APP_SRC, "3d-viewer/index.ts"),
        "glyph-full": resolve(APP_SRC, "glyph/index.ts"),
    },
    external: [
        "three",
        "three/addons/*",
        /* ecad_viewer 不在主入口 bundle，运行时按需加载 */
        "./ecad-viewer-core.js",
    ],
    loader: {
        ".js": "ts",
        ".glsl": "text",
        ".css": "text",
        ".svg": "text",
        ".kicad_wks": "text",
    },
    define: { DEBUG: "false" },
    plugins: [{
        name: "inline-glyph",
        setup(build) {
            build.onLoad({ filter: /project\.ts$/ }, async (args) => {
                const fs = await import("node:fs");
                let code = fs.readFileSync(args.path, "utf8");
                code = code.replace(
                    /await import\("glyph-full"\)\.then\(\(mod\) => \{([\s\S]*?)\}\);?/,
                    (match, body) => `{ const mod = __glyph_full__; ${body} }`
                );
                if (code.includes("__glyph_full__")) {
                    code = `import * as __glyph_full__ from "glyph-full";\n` + code;
                }
                return { contents: code, loader: "ts" };
            });
        },
    }, {
        name: "strip-viewer-chrome",
        setup(build) {
            build.onLoad({ filter: /ecad_viewer\.ts$/ }, async (args) => {
                const fs = await import("node:fs");
                let code = fs.readFileSync(args.path, "utf8");

                code = code.replace(
                    /#active_tab:\s*TabKind\s*=\s*TabKind\.pcb/,
                    "#active_tab: TabKind = TabKind.sch"
                );

                code = code.replace(
                    /<a[\s\S]*?class="bottom-left-icon"[\s\S]*?<\/a>/,
                    "null"
                );

                return { contents: code, loader: "ts" };
            });
        },
    }, {
        name: "build-logger",
        setup(build) {
            build.onStart(() => console.log("[ecad-viewer] build started"));
            build.onEnd((result) => {
                console.log(`[ecad-viewer] ${result.warnings.length} warnings, ${result.errors.length} errors`);
                for (const msg of result.warnings.slice(0, 10)) console.log("  WARN:", msg.text);
                for (const msg of result.errors.slice(0, 10)) {
                    console.log("  ERROR:", (msg.location?.file ?? "?") + ":" +
                        (msg.location?.line ?? "?") + " -", msg.text);
                }
            });
        },
    }],
});

let result = await context.rebuild();
context.dispose();
if (result.errors.length > 0) process.exit(1);

/* ---- 单独构建 ecad_viewer 运行时（仅浏览器端按需加载） ---- */
console.log("Building ecad-viewer-core (lazy-loaded viewer runtime)...");
let ctx2 = await esbuild.context({
    entryPoints: {
        "ecad-viewer-core": ECAD_VIEWER_ENTRY,
    },
    bundle: true,
    format: "esm",
    splitting: true,
    target: "es2020",
    outdir: OUTDIR,
    keepNames: true,
    sourcemap: true,
    minify: true,
    drop: ["debugger"],
    resolveExtensions: [".ts", ".tsx", ".js", ".mjs", ".css", ".glsl", ".svg", ".kicad_wks"],
    alias: {
        "kicad-parser": resolve(ROOT, "packages/kicad-parser/src"),
        "3d-viewer": resolve(APP_SRC, "3d-viewer/index.ts"),
        "glyph-full": resolve(APP_SRC, "glyph/index.ts"),
    },
    external: [
        "three",
        "three/addons/*",
    ],
    loader: {
        ".js": "ts",
        ".glsl": "text",
        ".css": "text",
        ".svg": "text",
        ".kicad_wks": "text",
    },
    define: { DEBUG: "false" },
    plugins: [{
        name: "inline-glyph",
        setup(build) {
            build.onLoad({ filter: /project\.ts$/ }, async (args) => {
                const fs = await import("node:fs");
                let code = fs.readFileSync(args.path, "utf8");
                code = code.replace(
                    /await import\("glyph-full"\)\.then\(\(mod\) => \{([\s\S]*?)\}\);?/,
                    (match, body) => `{ const mod = __glyph_full__; ${body} }`
                );
                if (code.includes("__glyph_full__")) {
                    code = `import * as __glyph_full__ from "glyph-full";\n` + code;
                }
                return { contents: code, loader: "ts" };
            });
        },
    }, {
        name: "strip-viewer-chrome",
        setup(build) {
            build.onLoad({ filter: /ecad_viewer\.ts$/ }, async (args) => {
                const fs = await import("node:fs");
                let code = fs.readFileSync(args.path, "utf8");

                code = code.replace(
                    /#active_tab:\s*TabKind\s*=\s*TabKind\.pcb/,
                    "#active_tab: TabKind = TabKind.sch"
                );

                code = code.replace(
                    /<a[\s\S]*?class="bottom-left-icon"[\s\S]*?<\/a>/,
                    "null"
                );

                return { contents: code, loader: "ts" };
            });
        },
    }, {
        name: "build-logger",
        setup(build) {
            build.onStart(() => console.log("[ecad-viewer-core] build started"));
            build.onEnd((result) => {
                console.log(`[ecad-viewer-core] ${result.warnings.length} warnings, ${result.errors.length} errors`);
                for (const msg of result.errors.slice(0, 10)) {
                    console.log("  ERROR:", (msg.location?.file ?? "?") + ":" +
                        (msg.location?.line ?? "?") + " -", msg.text);
                }
            });
        },
    }],
});

let result2 = await ctx2.rebuild();
ctx2.dispose();
if (result2.errors.length > 0) process.exit(1);

/* ---- 复制类型声明 ---- */
const fs = await import("node:fs");
const dtsSrc = resolve(__dirname, "src/index.d.ts");
const dtsDest = resolve(OUTDIR, "index.d.ts");
if (fs.existsSync(dtsSrc)) {
    fs.copyFileSync(dtsSrc, dtsDest);
    console.log("Copied index.d.ts to dist/");
}
const sharedTypesSrc = resolve(__dirname, "src/shared/types.ts");
const sharedTypesDestDir = resolve(OUTDIR, "shared");
if (fs.existsSync(sharedTypesSrc)) {
    fs.mkdirSync(sharedTypesDestDir, { recursive: true });
    fs.copyFileSync(sharedTypesSrc, resolve(sharedTypesDestDir, "types.d.ts"));
    console.log("Copied shared/types.d.ts to dist/");
}

console.log("Done!");
