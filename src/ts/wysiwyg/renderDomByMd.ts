import {fixTableCellSpaces} from "../util/fixBrowserBehavior";
import {transformImagePaths} from "../util/function";
import {processCodeRender} from "../util/processCode";
import {afterRenderEvent} from "./afterRenderEvent";

export const renderDomByMd = (vditor: IVditor, md: string, options = {
    enableAddUndoStack: true,
    enableHint: false,
    enableInput: true,
}) => {
    const editorElement = vditor.wysiwyg.element;
    let html = fixTableCellSpaces(vditor.lute.Md2VditorDOM(md));
    html = transformImagePaths(html, vditor);
    editorElement.innerHTML = html;

    editorElement.querySelectorAll(".vditor-wysiwyg__preview[data-render='2']").forEach((item: HTMLElement) => {
        processCodeRender(item, vditor);
        item.previousElementSibling.setAttribute("style", "display:none");
    });

    afterRenderEvent(vditor, options);
};
