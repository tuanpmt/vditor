import {getMarkdown} from "./getMarkdown";

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
 * Get rendered HTML from preview panel (includes rendered mermaid, math, etc.)
 * This is useful for PDF export where diagrams need to be already rendered as SVG
 */
export const getRenderedHTML = (vditor: IVditor): string => {
    // Try to get from preview panel first (has rendered diagrams)
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
