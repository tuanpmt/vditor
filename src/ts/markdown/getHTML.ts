import {getMarkdown} from "./getMarkdown";
import {highlightRender} from "./highlightRender";
import {codeRender} from "./codeRender";
import {mermaidRender} from "./mermaidRender";
import {wavedromRender} from "./wavedromRender";
import {chartRender} from "./chartRender";
import {abcRender} from "./abcRender";
import {graphvizRender} from "./graphvizRender";
import {flowchartRender} from "./flowchartRender";
import {mindmapRender} from "./mindmapRender";
import {plantumlRender} from "./plantumlRender";
import {markmapRender} from "./markmapRender";
import {SMILESRender} from "./SMILESRender";
import {loadMathLive} from "./mathliveRender";

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
 * Render math elements using MathLive's convertLatexToMarkup for static HTML output
 * This produces self-contained HTML that doesn't require JavaScript
 */
const renderMathStatic = async (element: HTMLElement, cdn: string): Promise<void> => {
    // Load MathLive
    await loadMathLive(cdn);

    // Get convertLatexToMarkup from MathLive
    const convertLatexToMarkup = (window as any).MathLive?.convertLatexToMarkup;
    if (!convertLatexToMarkup) {
        console.warn("MathLive convertLatexToMarkup not available");
        return;
    }

    // Find all math elements (both block and inline)
    const mathElements = element.querySelectorAll(".language-math, .vditor-math");
    mathElements.forEach((mathEl) => {
        const latex = mathEl.textContent?.trim();
        if (!latex) return;

        try {
            const isBlock = mathEl.tagName === "DIV" || mathEl.closest("div.language-math") !== null;
            const markup = convertLatexToMarkup(latex, {
                mathstyle: isBlock ? "displaystyle" : "textstyle",
            });
            mathEl.innerHTML = markup;
            mathEl.setAttribute("data-math", latex);
            mathEl.classList.add("vditor-math--rendered");
        } catch (e) {
            console.warn("Failed to render math:", latex, e);
            mathEl.classList.add("vditor-math--error");
        }
    });
};

/**
 * Apply all renderers to an element (similar to preview.render)
 * This applies syntax highlighting, mermaid, wavedrom, math, etc.
 */
const applyRenderers = async (element: HTMLElement, vditor: IVditor): Promise<void> => {
    const cdn = vditor.options.cdn;
    const theme = vditor.options.theme;
    const hljs = vditor.options.preview?.hljs || {};

    // Apply renderers (these are async - they load scripts dynamically)
    highlightRender(hljs, element, cdn);
    codeRender(element, hljs);

    // Use MathLive for static math rendering (self-contained HTML output)
    await renderMathStatic(element, cdn);

    mermaidRender(element, cdn, theme);
    wavedromRender(element, cdn, theme);
    chartRender(element, cdn, theme);
    abcRender(element, cdn);
    graphvizRender(element, cdn);
    flowchartRender(element, cdn);
    mindmapRender(element, cdn, theme);
    plantumlRender(element, cdn);
    markmapRender(element, cdn);
    SMILESRender(element, cdn, theme);

    // Wait for async renderers to complete (they load external scripts)
    // Poll until code blocks are highlighted or timeout
    const maxWait = 3000;
    const startTime = Date.now();

    await new Promise<void>((resolve) => {
        const checkRendered = () => {
            const codeBlocks = element.querySelectorAll("pre > code");
            const allHighlighted = Array.from(codeBlocks).every(
                (block) => block.classList.contains("hljs") ||
                           block.classList.contains("language-mermaid") ||
                           block.classList.contains("language-math")
            );

            if (allHighlighted || Date.now() - startTime > maxWait) {
                resolve();
            } else {
                setTimeout(checkRendered, 100);
            }
        };
        checkRendered();
    });
};

/**
 * Extract rendered HTML from IR mode with SVGs embedded
 * Converts IR DOM structure to clean HTML with rendered diagrams
 */
const getRenderedHTMLFromIR = (vditor: IVditor): string => {
    if (!vditor.ir?.element) {
        return "";
    }

    // Get base HTML from lute (proper conversion with headings, paragraphs, etc.)
    return vditor.lute.VditorIRDOM2HTML(vditor.ir.element.innerHTML);
};

/**
 * Fetch CSS content from URL
 */
const fetchCSS = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        if (response.ok) {
            return await response.text();
        }
    } catch (e) {
        console.warn(`Failed to fetch CSS: ${url}`, e);
    }
    return "";
};

/**
 * Get rendered HTML with all renderers applied (async)
 * This properly renders mermaid, wavedrom, code highlighting, math, etc.
 * Includes all embedded CSS (vditor styles, syntax highlighting)
 * Returns self-contained HTML that can be rendered anywhere
 */
export const getFullyRenderedHTML = async (vditor: IVditor): Promise<string> => {
    const cdn = vditor.options.cdn;
    const hljsStyle = vditor.options.preview?.hljs?.style || "github";

    // Get base HTML
    let html = "";
    if (vditor.currentMode === "ir") {
        html = vditor.lute.VditorIRDOM2HTML(vditor.ir.element.innerHTML);
    } else if (vditor.currentMode === "wysiwyg") {
        html = vditor.lute.VditorDOM2HTML(vditor.wysiwyg.element.innerHTML);
    } else {
        html = vditor.lute.Md2HTML(getMarkdown(vditor));
    }

    // Create hidden container for rendering
    const container = document.createElement("div");
    container.className = "vditor-reset";
    container.style.position = "absolute";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.innerHTML = html;
    document.body.appendChild(container);

    try {
        // Apply all renderers
        await applyRenderers(container, vditor);

        // Fetch all CSS to embed (including MathLive static CSS for math rendering)
        const [vditorCSS, hljsCSS, mathliveCSS] = await Promise.all([
            fetchCSS(`${cdn}/dist/index.css`),
            fetchCSS(`${cdn}/dist/js/highlight.js/styles/${hljsStyle}.min.css`),
            fetchCSS(`${cdn}/dist/js/mathlive/mathlive-static.css`),
        ]);

        // Build output with embedded styles
        let styles = "";
        if (vditorCSS) {
            styles += `/* vditor styles */\n${vditorCSS}\n`;
        }
        if (hljsCSS) {
            styles += `/* highlight.js - ${hljsStyle} */\n${hljsCSS}\n`;
        }
        if (mathliveCSS) {
            styles += `/* mathlive static styles */\n${mathliveCSS}\n`;
        }

        // Return self-contained HTML with embedded styles
        return `<style>\n${styles}</style>\n<div class="vditor-reset">${container.innerHTML}</div>`;
    } finally {
        // Clean up
        document.body.removeChild(container);
    }
};

/**
 * Simple HTML formatter - adds line breaks and indentation
 */
const formatHTML = (html: string): string => {
    let formatted = "";
    let indent = 0;
    const tab = "  ";

    // Split by tags
    const tokens = html.split(/(<\/?[^>]+>)/g).filter(t => t.trim());

    for (const token of tokens) {
        if (token.startsWith("</")) {
            // Closing tag - decrease indent first
            indent = Math.max(0, indent - 1);
            formatted += tab.repeat(indent) + token + "\n";
        } else if (token.startsWith("<") && !token.startsWith("<!") && !token.endsWith("/>")) {
            // Opening tag
            formatted += tab.repeat(indent) + token + "\n";
            // Don't indent for void elements
            if (!/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i.test(token)) {
                indent++;
            }
        } else if (token.startsWith("<")) {
            // Self-closing or void tag
            formatted += tab.repeat(indent) + token + "\n";
        } else {
            // Text content
            const text = token.trim();
            if (text) {
                formatted += tab.repeat(indent) + text + "\n";
            }
        }
    }

    return formatted.trim();
};

/**
 * Get rendered HTML from preview panel (includes rendered mermaid, math, etc.)
 * This is useful for PDF export where diagrams need to be already rendered as SVG
 * SVGs are embedded inline in the HTML output
 * @param format - if true, returns formatted HTML with indentation
 */
export const getRenderedHTML = (vditor: IVditor, format = false): string => {
    let html = "";

    // For IR mode, extract from IR element with rendered previews
    if (vditor.currentMode === "ir") {
        html = getRenderedHTMLFromIR(vditor);
    } else if (vditor.preview?.previewElement?.innerHTML) {
        // Try to get from preview panel (has rendered diagrams)
        html = vditor.preview.previewElement.innerHTML;
    } else if (vditor.currentMode === "sv" && vditor.sv?.element) {
        // For SV mode with preview panel visible
        const previewEl = vditor.sv.element.querySelector(".vditor-reset");
        if (previewEl) {
            html = previewEl.innerHTML;
        }
    }

    // Fallback to regular getHTML (raw, no rendered diagrams)
    if (!html) {
        html = getHTML(vditor) || "";
    }

    return format ? formatHTML(html) : html;
};

/**
 * Get fully rendered HTML with embedded fonts (async)
 * Returns complete HTML with @font-face rules and base64 encoded fonts
 * Uses getFullyRenderedHTML for proper rendering of diagrams and code
 * Useful for PDF export where fonts need to be self-contained
 */
export const getRenderedHTMLWithFonts = async (vditor: IVditor): Promise<string> => {
    const html = await getFullyRenderedHTML(vditor);
    const fontCSS = await generateEmbeddedFontCSS(vditor.options.cdn);

    // Return HTML with embedded font styles
    return `<style>\n${fontCSS}\n</style>\n${html}`;
};
