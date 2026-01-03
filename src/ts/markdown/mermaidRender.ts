import {Constants} from "../constants";
import {mermaidRenderAdapter} from "./adapterRender";
import {genUUID} from "../util/function";

let mermaidModule: any = null;
let mermaidLoading: Promise<any> | null = null;

const loadMermaid = async (cdn: string) => {
    if (mermaidModule) {
        return mermaidModule;
    }
    if (mermaidLoading) {
        return mermaidLoading;
    }
    mermaidLoading = (async () => {
        const mermaidPath = `${cdn}/dist/js/mermaid/mermaid.esm.min.mjs`;
        const mermaid = await import(/* webpackIgnore: true */ mermaidPath);

        // Register ELK layout
        try {
            const elkLayoutPath = `${cdn}/dist/js/mermaid/layout-elk/mermaid-layout-elk.esm.min.mjs`;
            const elkLayouts = await import(/* webpackIgnore: true */ elkLayoutPath);
            mermaid.default.registerLayoutLoaders(elkLayouts.default);
        } catch (e) {
            console.warn("Failed to load ELK layout:", e);
        }

        // Register Tidy Tree layout
        try {
            const tidyTreePath = `${cdn}/dist/js/mermaid/layout-tidy-tree/mermaid-layout-tidy-tree.esm.min.mjs`;
            const tidyTreeLayouts = await import(/* webpackIgnore: true */ tidyTreePath);
            mermaid.default.registerLayoutLoaders(tidyTreeLayouts.default);
        } catch (e) {
            console.warn("Failed to load Tidy Tree layout:", e);
        }

        mermaidModule = mermaid.default;
        return mermaidModule;
    })();
    return mermaidLoading;
};

// Global mermaid config storage
let globalMermaidConfig: {layout?: string, theme?: string, look?: string} = {};

/**
 * Set global mermaid config that applies to all diagrams
 * Individual diagram frontmatter config will override these settings
 */
export const setGlobalMermaidConfig = (config: {layout?: string, theme?: string, look?: string}) => {
    globalMermaidConfig = {...config};
};

/**
 * Get current global mermaid config
 */
export const getGlobalMermaidConfig = () => {
    return {...globalMermaidConfig};
};

export const mermaidRender = (element: (HTMLElement | Document) = document, cdn = Constants.CDN, theme: string, mermaidOptions?: {layout?: string, theme?: string, look?: string}) => {
    const mermaidElements = mermaidRenderAdapter.getElements(element);
    if (mermaidElements.length === 0) {
        return;
    }

    // Merge options: mermaidOptions > globalMermaidConfig
    const mergedOptions = {...globalMermaidConfig, ...mermaidOptions};

    loadMermaid(cdn).then((mermaid) => {
        const config: any = {
            securityLevel: "loose", // 升级后无 https://github.com/siyuan-note/siyuan/issues/3587，可使用该选项
            altFontFamily: "sans-serif",
            fontFamily: "sans-serif",
            startOnLoad: false,
            flowchart: {
                htmlLabels: true,
                useMaxWidth: !0
            },
            sequence: {
                useMaxWidth: true,
                diagramMarginX: 8,
                diagramMarginY: 8,
                boxMargin: 8,
                showSequenceNumbers: true // Mermaid 时序图增加序号 https://github.com/siyuan-note/siyuan/pull/6992 https://mermaid.js.org/syntax/sequenceDiagram.html#sequencenumbers
            },
            gantt: {
                leftPadding: 75,
                rightPadding: 20
            },
            themeVariables: {
                background: "transparent"
            }
        };

        // Apply global layout config
        if (mergedOptions.layout) {
            config.layout = mergedOptions.layout;
        }

        // Apply global theme config
        if (mergedOptions.theme) {
            config.theme = mergedOptions.theme;
        } else if (theme === "dark") {
            config.theme = "dark";
        }

        // Apply global look config
        if (mergedOptions.look) {
            config.look = mergedOptions.look;
        }

        if (theme === "dark" || mergedOptions.theme === "dark") {
            config.themeVariables = {
                ...config.themeVariables,
                background: "transparent"
            };
        }
        mermaid.initialize(config);
        mermaidElements.forEach(async (item) => {
            // Skip elements in IR/WYSIWYG marker areas (source code blocks)
            if (item.parentElement.classList.contains("vditor-wysiwyg__pre") ||
                item.parentElement.classList.contains("vditor-ir__marker--pre")) {
                return;
            }
            // Check if already processed with the same theme
            const processedTheme = item.getAttribute("data-theme");
            if (item.getAttribute("data-processed") === "true" && processedTheme === theme) {
                return;
            }
            // Get source code - either from saved attribute or from current content
            let code = item.getAttribute("data-mermaid-source");
            if (!code) {
                code = mermaidRenderAdapter.getCode(item);
                if (code.trim() === "") {
                    return;
                }
                // Save original source for re-rendering
                item.setAttribute("data-mermaid-source", code);
            }
            const id = "mermaid" + genUUID()
            try {
                const mermaidData = await mermaid.render(id, code);
                item.innerHTML = mermaidData.svg;
                // Remove background from SVG to ensure transparency
                const svg = item.querySelector("svg");
                if (svg) {
                    svg.style.removeProperty("background-color");
                    svg.style.removeProperty("background");
                    // Also remove background rect that mermaid adds
                    const bgRect = svg.querySelector("rect.er.relationshipLabelBox, rect:first-child, .clusters rect");
                    if (bgRect && bgRect.getAttribute("fill") && bgRect.getAttribute("width") === "100%") {
                        bgRect.setAttribute("fill", "transparent");
                    }
                    // Remove style attribute with background
                    const styleAttr = svg.getAttribute("style");
                    if (styleAttr && styleAttr.includes("background")) {
                        svg.setAttribute("style", styleAttr.replace(/background[^;]*;?/g, ""));
                    }
                }
            } catch (e) {
                const errorElement = document.querySelector("#" + id);
                item.innerHTML = `${errorElement.outerHTML}<br>
<div style="text-align: left"><small>${e.message.replace(/\n/, "<br>")}</small></div>`;
                errorElement.parentElement.remove();
            }
            item.setAttribute("data-processed", "true");
            item.setAttribute("data-theme", theme);
        });
    });
};
