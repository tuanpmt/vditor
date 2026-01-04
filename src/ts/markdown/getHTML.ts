import {getMarkdown} from "./getMarkdown";

// Font definitions for embedding
const FONT_DEFINITIONS = [
    // Noto Sans
    {family: "Noto Sans", weight: 400, file: "noto-sans-latin-ext-400-normal.woff2"},
    {family: "Noto Sans", weight: 500, file: "noto-sans-latin-ext-500-normal.woff2"},
    {family: "Noto Sans", weight: 600, file: "noto-sans-latin-ext-600-normal.woff2"},
    {family: "Noto Sans", weight: 700, file: "noto-sans-latin-ext-700-normal.woff2"},
    // Nunito Sans - Vietnamese
    {family: "Nunito Sans", weight: 400, file: "nunito-sans-vietnamese-400-normal.woff2", unicodeRange: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303, U+0309, U+0323, U+1EA0-1EF9, U+20AB"},
    {family: "Nunito Sans", weight: 500, file: "nunito-sans-vietnamese-500-normal.woff2", unicodeRange: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303, U+0309, U+0323, U+1EA0-1EF9, U+20AB"},
    {family: "Nunito Sans", weight: 600, file: "nunito-sans-vietnamese-600-normal.woff2", unicodeRange: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303, U+0309, U+0323, U+1EA0-1EF9, U+20AB"},
    {family: "Nunito Sans", weight: 700, file: "nunito-sans-vietnamese-700-normal.woff2", unicodeRange: "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303, U+0309, U+0323, U+1EA0-1EF9, U+20AB"},
    // Nunito Sans - Latin
    {family: "Nunito Sans", weight: 400, file: "nunito-sans-latin-400-normal.woff2"},
    {family: "Nunito Sans", weight: 500, file: "nunito-sans-latin-500-normal.woff2"},
    {family: "Nunito Sans", weight: 600, file: "nunito-sans-latin-600-normal.woff2"},
    {family: "Nunito Sans", weight: 700, file: "nunito-sans-latin-700-normal.woff2"},
    // Fira Code
    {family: "Fira Code", weight: 400, file: "fira-code-latin-400-normal.woff2"},
    {family: "Fira Code", weight: 500, file: "fira-code-latin-500-normal.woff2"},
];

// Cache for loaded fonts
const fontCache: Map<string, string> = new Map();

/**
 * Fetch font file and convert to base64
 */
const fetchFontAsBase64 = async (cdn: string, filename: string): Promise<string> => {
    const cacheKey = `${cdn}/${filename}`;
    if (fontCache.has(cacheKey)) {
        return fontCache.get(cacheKey)!;
    }

    try {
        const response = await fetch(`${cdn}/dist/fonts/${filename}`);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                fontCache.set(cacheKey, base64);
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        console.warn(`Failed to load font: ${filename}`, e);
        return "";
    }
};

/**
 * Generate @font-face CSS with embedded base64 fonts
 */
export const generateEmbeddedFontCSS = async (cdn: string): Promise<string> => {
    const fontFaces: string[] = [];

    for (const font of FONT_DEFINITIONS) {
        const base64 = await fetchFontAsBase64(cdn, font.file);
        if (base64) {
            let css = `@font-face {
  font-family: '${font.family}';
  font-style: normal;
  font-display: swap;
  font-weight: ${font.weight};
  src: url('${base64}') format('woff2');`;
            if (font.unicodeRange) {
                css += `\n  unicode-range: ${font.unicodeRange};`;
            }
            css += "\n}";
            fontFaces.push(css);
        }
    }

    return fontFaces.join("\n\n");
};

export const getHTML = (vditor: IVditor) => {
    if (vditor.currentMode === "sv") {
        return vditor.lute.Md2HTML(getMarkdown(vditor));
    } else if (vditor.currentMode === "wysiwyg") {
        return vditor.lute.VditorDOM2HTML(vditor.wysiwyg.element.innerHTML);
    } else if (vditor.currentMode === "ir") {
        return vditor.lute.VditorIRDOM2HTML(vditor.ir.element.innerHTML);
    }
};

/**
 * Extract rendered HTML from IR mode with SVGs embedded
 * Converts IR DOM structure to clean HTML with rendered diagrams
 */
const getRenderedHTMLFromIR = (vditor: IVditor): string => {
    if (!vditor.ir?.element) {
        return "";
    }

    // Clone IR element to avoid modifying original
    const clone = vditor.ir.element.cloneNode(true) as HTMLElement;

    // Process code blocks: replace marker content with preview content
    clone.querySelectorAll(".vditor-ir__node[data-type='code-block'], .vditor-ir__node[data-type='math-block']").forEach((block) => {
        const preview = block.querySelector(".vditor-ir__preview") as HTMLElement;
        const markerPre = block.querySelector(".vditor-ir__marker--pre") as HTMLElement;

        if (preview && preview.innerHTML.trim()) {
            // Get language from code element
            const codeEl = markerPre?.querySelector("code");
            const language = codeEl?.className?.replace("language-", "") || "";

            // For graphic languages (mermaid, wavedrom, etc.), use preview content directly
            const graphicLanguages = ["mermaid", "wavedrom", "graphviz", "plantuml", "flowchart", "mindmap", "echarts", "abc", "markmap", "smiles"];
            if (graphicLanguages.includes(language)) {
                // Create a div with just the rendered SVG
                const wrapper = document.createElement("div");
                wrapper.className = `vditor-${language}`;
                wrapper.innerHTML = preview.innerHTML;
                block.parentNode?.replaceChild(wrapper, block);
            } else if (language === "math" || block.getAttribute("data-type") === "math-block") {
                // For math, use preview content
                const wrapper = document.createElement("div");
                wrapper.className = "vditor-math";
                wrapper.innerHTML = preview.innerHTML;
                block.parentNode?.replaceChild(wrapper, block);
            }
            // For regular code blocks, let lute handle the conversion
        }
    });

    // Remove all IR-specific marker elements
    clone.querySelectorAll(".vditor-ir__marker, .vditor-ir__marker--pre, .vditor-ir__marker--link, .vditor-ir__marker--hide").forEach((el) => {
        el.remove();
    });

    // Remove Monaco editor wrappers
    clone.querySelectorAll(".vditor-monaco-wrapper").forEach((el) => {
        el.remove();
    });

    // Remove popover
    clone.querySelectorAll(".vditor-panel").forEach((el) => {
        el.remove();
    });

    // Convert remaining IR DOM to HTML
    return vditor.lute.VditorIRDOM2HTML(clone.innerHTML);
};

/**
 * Get rendered HTML from preview panel (includes rendered mermaid, math, etc.)
 * This is useful for PDF export where diagrams need to be already rendered as SVG
 * SVGs are embedded inline in the HTML output
 */
export const getRenderedHTML = (vditor: IVditor): string => {
    // For IR mode, extract from IR element with rendered previews
    if (vditor.currentMode === "ir") {
        return getRenderedHTMLFromIR(vditor);
    }

    // Try to get from preview panel (has rendered diagrams)
    if (vditor.preview?.previewElement?.innerHTML) {
        return vditor.preview.previewElement.innerHTML;
    }

    // For SV mode with preview panel visible
    if (vditor.currentMode === "sv" && vditor.sv?.element) {
        const previewEl = vditor.sv.element.querySelector(".vditor-reset");
        if (previewEl) {
            return previewEl.innerHTML;
        }
    }

    // Fallback to regular getHTML (raw, no rendered diagrams)
    return getHTML(vditor) || "";
};

/**
 * Get rendered HTML with embedded fonts (async)
 * Returns complete HTML with @font-face rules and base64 encoded fonts
 * Useful for PDF export where fonts need to be self-contained
 */
export const getRenderedHTMLWithFonts = async (vditor: IVditor): Promise<string> => {
    const html = getRenderedHTML(vditor);
    const fontCSS = await generateEmbeddedFontCSS(vditor.options.cdn);

    // Return HTML with embedded font styles
    return `<style>\n${fontCSS}\n</style>\n${html}`;
};
