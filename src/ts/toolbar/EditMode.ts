import {Constants} from "../constants";
import {processAfterRender} from "../ir/process";
import {getMarkdown} from "../markdown/getMarkdown";
import {mathRender} from "../markdown/mathRender";
import {processAfterRender as processSVAfterRender, processSpinVditorSVDOM} from "../sv/process";
import {setPadding, setTypewriterPosition} from "../ui/initUI";
import {getEventName, updateHotkeyTip} from "../util/compatibility";
import {highlightToolbar} from "../util/highlightToolbar";
import {processCodeRender} from "../util/processCode";
import {renderToc} from "../util/toc";
import {renderDomByMd} from "../wysiwyg/renderDomByMd";
import {
    disableToolbar,
    enableToolbar,
    hidePanel,
    hideToolbar,
    removeCurrentToolbar,
    showToolbar,
} from "./setToolbar";
import {combineFootnote} from "../sv/combineFootnote";

export const setEditMode = (vditor: IVditor, type: string, event: Event | string) => {
    let markdownText;
    if (typeof event !== "string") {
        hidePanel(vditor, ["subToolbar", "hint"]);
        event.preventDefault();
        markdownText = getMarkdown(vditor);
    } else {
        markdownText = event;
    }
    if (vditor.currentMode === type && typeof event !== "string") {
        return;
    }
    if (vditor.devtools) {
        vditor.devtools.renderEchart(vditor);
    }
    if (vditor.options.preview.mode === "both" && type === "sv") {
        vditor.preview.element.style.display = "block";
    } else {
        vditor.preview.element.style.display = "none";
    }

    enableToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);
    removeCurrentToolbar(vditor.toolbar.elements, Constants.EDIT_TOOLBARS);
    disableToolbar(vditor.toolbar.elements, ["outdent", "indent"]);

    if (type === "ir") {
        hideToolbar(vditor.toolbar.elements, ["both"]);
        showToolbar(vditor.toolbar.elements, ["outdent", "indent", "outline", "insert-before", "insert-after"]);
        vditor.sv.element.style.display = "none";
        vditor.wysiwyg.element.parentElement.style.display = "none";
        vditor.ir.element.parentElement.style.display = "block";

        vditor.lute.SetVditorIR(true);
        vditor.lute.SetVditorWYSIWYG(false);
        vditor.lute.SetVditorSV(false);

        vditor.currentMode = "ir";
        vditor.ir.element.innerHTML = vditor.lute.Md2VditorIRDOM(markdownText);
        processAfterRender(vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: false,
        });

        setPadding(vditor);

        vditor.ir.element.querySelectorAll(".vditor-ir__preview[data-render='2']").forEach((item: HTMLElement) => {
            processCodeRender(item, vditor);
        });
        vditor.ir.element.querySelectorAll(".vditor-toc").forEach((item: HTMLElement) => {
            mathRender(item, {
                cdn: vditor.options.cdn,
                math: vditor.options.preview.math,
            });
        });
    } else if (type === "wysiwyg") {
        hideToolbar(vditor.toolbar.elements, ["both"]);
        showToolbar(vditor.toolbar.elements, ["outdent", "indent", "outline", "insert-before", "insert-after"]);
        vditor.sv.element.style.display = "none";
        vditor.wysiwyg.element.parentElement.style.display = "block";
        vditor.ir.element.parentElement.style.display = "none";

        vditor.lute.SetVditorIR(false);
        vditor.lute.SetVditorWYSIWYG(true);
        vditor.lute.SetVditorSV(false);

        vditor.currentMode = "wysiwyg";

        setPadding(vditor);
        renderDomByMd(vditor, markdownText, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: false,
        });
        vditor.wysiwyg.element.querySelectorAll(".vditor-toc").forEach((item: HTMLElement) => {
            mathRender(item, {
                cdn: vditor.options.cdn,
                math: vditor.options.preview.math,
            });
        });
        vditor.wysiwyg.popover.style.display = "none";
    } else if (type === "sv") {
        showToolbar(vditor.toolbar.elements, ["both"]);
        hideToolbar(vditor.toolbar.elements, ["outdent", "indent", "outline", "insert-before", "insert-after"]);
        vditor.wysiwyg.element.parentElement.style.display = "none";
        vditor.ir.element.parentElement.style.display = "none";
        if (vditor.options.preview.mode === "both") {
            vditor.sv.element.style.display = "block";
        } else if (vditor.options.preview.mode === "editor") {
            vditor.sv.element.style.display = "block";
        }

        vditor.lute.SetVditorIR(false);
        vditor.lute.SetVditorWYSIWYG(false);
        vditor.lute.SetVditorSV(true);

        vditor.currentMode = "sv";
        let svHTML = processSpinVditorSVDOM(markdownText, vditor);
        if (svHTML === "<div data-block='0'></div>") {
            // https://github.com/Vanessa219/vditor/issues/654 SV 模式 Placeholder 显示问题
            svHTML = "";
        }
        vditor.sv.element.innerHTML = svHTML;
        combineFootnote(vditor.sv.element)
        processSVAfterRender(vditor, {
            enableAddUndoStack: true,
            enableHint: false,
            enableInput: false,
        });
        setPadding(vditor);
    }
    vditor.undo.resetIcon(vditor);
    if (typeof event !== "string") {
        // 初始化不 focus
        vditor[vditor.currentMode].element.focus();
        highlightToolbar(vditor);
    }
    renderToc(vditor);
    setTypewriterPosition(vditor);

    if (vditor.toolbar.elements["edit-mode"]) {
        vditor.toolbar.elements["edit-mode"].querySelectorAll("button").forEach((item) => {
            item.classList.remove("vditor-menu--current");
            item.classList.remove("vditor-edit-mode__btn--active");
        });
        const activeBtn = vditor.toolbar.elements["edit-mode"].querySelector(`button[data-mode="${vditor.currentMode}"]`);
        if (activeBtn) {
            activeBtn.classList.add("vditor-menu--current");
            activeBtn.classList.add("vditor-edit-mode__btn--active");
        }
    }

    vditor.outline.toggle(vditor, vditor.currentMode !== "sv" && vditor.options.outline.enable, typeof event !== "string");
};

export class EditMode {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        this.element = document.createElement("div");
        this.element.className = "vditor-toolbar__item vditor-toolbar__item--edit-mode";

        // Get i18n labels with fallbacks
        const i18n = window.VditorI18n as any;
        const labelIR = i18n?.instantRendering || "Instant Rendering";
        const labelSV = i18n?.splitView || "Split View";
        const labelWYSIWYG = i18n?.wysiwyg || "WYSIWYG";

        // Create button group with 3 buttons using SVG icons
        const buttonGroup = document.createElement("div");
        buttonGroup.className = "vditor-edit-mode";
        buttonGroup.innerHTML = `<button data-mode="ir" class="vditor-edit-mode__btn vditor-tooltipped vditor-tooltipped__s" aria-label="${labelIR} <${updateHotkeyTip("⌥⌘8")}>"><svg><use xlink:href="#vditor-icon-edit"></use></svg></button><button data-mode="sv" class="vditor-edit-mode__btn vditor-tooltipped vditor-tooltipped__s" aria-label="${labelSV} <${updateHotkeyTip("⌥⌘9")}>"><svg><use xlink:href="#vditor-icon-both"></use></svg></button><button data-mode="wysiwyg" class="vditor-edit-mode__btn vditor-tooltipped vditor-tooltipped__s" aria-label="${labelWYSIWYG} <${updateHotkeyTip("⌥⌘7")}>"><svg><use xlink:href="#vditor-icon-preview"></use></svg></button>`;

        this.element.appendChild(buttonGroup);

        this._bindEvent(vditor, buttonGroup);

        // Set initial active state (use options.mode as fallback since currentMode may not be set yet)
        const initialMode = vditor.currentMode || vditor.options.mode;
        const currentBtn = buttonGroup.querySelector(`button[data-mode="${initialMode}"]`);
        if (currentBtn) {
            currentBtn.classList.add("vditor-edit-mode__btn--active");
        }
    }

    public _bindEvent(vditor: IVditor, buttonGroup: HTMLElement) {
        buttonGroup.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener(getEventName(), (event: Event) => {
                const mode = (event.currentTarget as HTMLElement).getAttribute("data-mode");
                setEditMode(vditor, mode, event);
                event.preventDefault();
                event.stopPropagation();
            });
        });
    }
}
