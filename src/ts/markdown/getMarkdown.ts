import {code160to32} from "../util/code160to32";

/**
 * Get markdown content from editor.
 * If user hasn't made any changes, returns the original markdown to preserve formatting.
 * Otherwise, converts the current DOM state back to markdown.
 */
export const getMarkdown = (vditor: IVditor) => {
    // Return original markdown if no changes were made by user
    // This preserves the exact formatting of the input
    if (!vditor.markdownChanged && vditor.originalMarkdown) {
        return vditor.originalMarkdown;
    }

    if (vditor.currentMode === "sv") {
        // Use Monaco SV getValue if available
        if (vditor.sv?.isMonacoMode?.() && vditor.sv?.getValue) {
            const content = vditor.sv.getValue();
            return code160to32(`${content}\n`.replace(/\n\n$/, "\n"));
        }
        return code160to32(`${vditor.sv.element.textContent}\n`.replace(/\n\n$/, "\n"));
    } else if (vditor.currentMode === "wysiwyg") {
        return vditor.lute.VditorDOM2Md(vditor.wysiwyg.element.innerHTML);
    } else if (vditor.currentMode === "ir") {
        return vditor.lute.VditorIRDOM2Md(vditor.ir.element.innerHTML);
    }
    return "";
};
