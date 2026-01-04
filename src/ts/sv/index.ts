import {isCtrl, isFirefox} from "../util/compatibility";
import {
    blurEvent,
    copyEvent, cutEvent,
    dropEvent,
    focusEvent,
    hotkeyEvent,
    scrollCenter,
    selectEvent,
} from "../util/editorCommonEvent";
import {paste} from "../util/fixBrowserBehavior";
import {getSelectText} from "../util/getSelectText";
import {inputEvent} from "./inputEvent";
import {processAfterRender} from "./process";
import {MonacoSVEditor, isMonacoSVEnabled} from "./monacoEditor";
import {Constants} from "../constants";

class Editor {
    public range: Range;
    public element: HTMLPreElement | HTMLElement;
    public composingLock: boolean = false;
    public processTimeoutId: number;
    public hlToolbarTimeoutId: number;
    public preventInput: boolean;
    public monacoSV: MonacoSVEditor | null = null;
    private useMonaco: boolean = false;
    private vditor: IVditor;

    constructor(vditor: IVditor) {
        this.vditor = vditor;
        this.useMonaco = isMonacoSVEnabled(vditor);

        if (this.useMonaco) {
            this.initMonacoEditor(vditor);
        } else {
            this.initContentEditableEditor(vditor);
        }
    }

    /**
     * Initialize Monaco-based editor
     */
    private initMonacoEditor(vditor: IVditor) {
        this.monacoSV = new MonacoSVEditor(vditor);
        this.element = this.monacoSV.element as HTMLElement;

        // Initialize Monaco async
        this.monacoSV.init().then(() => {
            // Monaco is ready
        }).catch((error) => {
            console.error("Failed to init Monaco SV, falling back to contenteditable:", error);
            this.fallbackToContentEditable(vditor);
        });
    }

    /**
     * Fallback to contenteditable if Monaco fails
     */
    private fallbackToContentEditable(vditor: IVditor) {
        this.useMonaco = false;
        if (this.monacoSV) {
            this.monacoSV.dispose();
            this.monacoSV = null;
        }
        this.initContentEditableEditor(vditor);
        // Re-append the element if already in DOM
        if (this.element.parentElement) {
            const parent = this.element.parentElement;
            parent.appendChild(this.element);
        }
    }

    /**
     * Initialize original contenteditable editor
     */
    private initContentEditableEditor(vditor: IVditor) {
        const preElement = document.createElement("pre");
        preElement.className = "vditor-sv vditor-reset";
        preElement.setAttribute("placeholder", vditor.options.placeholder);
        preElement.setAttribute("contenteditable", "true");
        preElement.setAttribute("spellcheck", "false");
        this.element = preElement;

        this.bindEvent(vditor);

        focusEvent(vditor, this.element);
        blurEvent(vditor, this.element);
        hotkeyEvent(vditor, this.element);
        selectEvent(vditor, this.element);
        dropEvent(vditor, this.element);
        copyEvent(vditor, this.element, this.copy);
        cutEvent(vditor, this.element, this.copy);
    }

    private copy(event: ClipboardEvent, vditor: IVditor) {
        event.stopPropagation();
        event.preventDefault();
        event.clipboardData.setData("text/plain", getSelectText(vditor[vditor.currentMode].element));
    }

    private bindEvent(vditor: IVditor) {
        this.element.addEventListener("paste", (event: ClipboardEvent & { target: HTMLElement }) => {
            paste(vditor, event, {
                pasteCode: (code: string) => {
                    document.execCommand("insertHTML", false, code);
                },
            });
        });

        this.element.addEventListener("scroll", () => {
            if (vditor.preview.element.style.display !== "block") {
                return;
            }
            const textScrollTop = this.element.scrollTop;
            const textHeight = this.element.clientHeight;
            const textScrollHeight = this.element.scrollHeight - parseFloat(getComputedStyle(this.element).paddingBottom || "0");
            const preview = vditor.preview.element;
            if ((textScrollTop / textHeight > 0.5)) {
                preview.scrollTop = (textScrollTop + textHeight) *
                    preview.scrollHeight / textScrollHeight - textHeight;
            } else {
                preview.scrollTop = textScrollTop *
                    preview.scrollHeight / textScrollHeight;
            }
        });

        this.element.addEventListener("compositionstart", (event: InputEvent) => {
            this.composingLock = true;
        });

        this.element.addEventListener("compositionend", (event: InputEvent) => {
            if (!isFirefox()) {
                inputEvent(vditor, event);
            }
            this.composingLock = false;
        });

        this.element.addEventListener("input", (event: InputEvent) => {
            if (event.inputType === "deleteByDrag" || event.inputType === "insertFromDrop") {
                // https://github.com/Vanessa219/vditor/issues/801 编辑器内容拖拽问题
                return;
            }
            if (this.composingLock || event.data === "'" || event.data === "\u201C" || event.data === "\u300A") {
                return;
            }
            if (this.preventInput) {
                this.preventInput = false;
                processAfterRender(vditor, {
                  enableAddUndoStack: true,
                  enableHint: true,
                  enableInput: true,
                });
                return;
            }
            inputEvent(vditor, event);
        });

        this.element.addEventListener("keyup", (event: KeyboardEvent) => {
            if (event.isComposing || isCtrl(event)) {
                return;
            }
            if ((event.key === "Backspace" || event.key === "Delete") &&
                vditor.sv.element.innerHTML !== "" && vditor.sv.element.childNodes.length === 1 &&
                vditor.sv.element.firstElementChild && vditor.sv.element.firstElementChild.tagName === "DIV"
                && vditor.sv.element.firstElementChild.childElementCount === 2
                && (vditor.sv.element.firstElementChild.textContent === "" || vditor.sv.element.textContent === "\n")) {
                // 为空时显示 placeholder
                vditor.sv.element.innerHTML = "";
                return;
            }
            if (event.key === "Enter") {
                scrollCenter(vditor);
            }
        });
    }

    /**
     * Check if using Monaco mode
     */
    isMonacoMode(): boolean {
        return this.useMonaco && this.monacoSV !== null;
    }

    /**
     * Get raw markdown content
     */
    getValue(): string {
        if (this.isMonacoMode()) {
            return this.monacoSV!.getValue();
        }
        // For contenteditable mode, extract text content
        return this.element.textContent || "";
    }

    /**
     * Set markdown content
     */
    setValue(markdown: string): void {
        if (this.isMonacoMode()) {
            this.monacoSV!.setValue(markdown);
        } else {
            // For contenteditable mode, use Lute to render
            if (this.vditor.lute) {
                this.element.innerHTML = `<div data-block='0'>${this.vditor.lute.SpinVditorSVDOM(markdown)}</div>`;
            } else {
                this.element.textContent = markdown;
            }
        }
    }

    /**
     * Focus the editor
     */
    focus(): void {
        if (this.isMonacoMode()) {
            this.monacoSV!.focus();
        } else {
            this.element.focus();
        }
    }

    /**
     * Blur the editor
     */
    blur(): void {
        if (this.isMonacoMode()) {
            this.monacoSV!.blur();
        } else {
            (this.element as HTMLElement).blur();
        }
    }

    /**
     * Get selected text
     */
    getSelection(): string {
        if (this.isMonacoMode()) {
            return this.monacoSV!.getSelection();
        }
        return getSelectText(this.element);
    }

    /**
     * Insert text at cursor
     */
    insertText(text: string): void {
        if (this.isMonacoMode()) {
            this.monacoSV!.insertText(text);
        } else {
            document.execCommand("insertText", false, text);
        }
    }

    /**
     * Wrap selection with prefix and suffix
     */
    wrapSelection(prefix: string, suffix: string): void {
        if (this.isMonacoMode()) {
            this.monacoSV!.wrapSelection(prefix, suffix);
        } else {
            const selection = getSelectText(this.element);
            document.execCommand("insertText", false, prefix + selection + suffix);
        }
    }

    /**
     * Enable/disable editor
     */
    setEnabled(enabled: boolean): void {
        if (this.isMonacoMode()) {
            this.monacoSV!.setReadOnly(!enabled);
        } else {
            this.element.setAttribute("contenteditable", enabled ? "true" : "false");
        }
    }

    /**
     * Update theme when vditor theme changes
     */
    updateTheme(): void {
        if (this.isMonacoMode()) {
            this.monacoSV!.updateTheme();
        }
    }

    /**
     * Dispose the editor
     */
    dispose(): void {
        if (this.monacoSV) {
            this.monacoSV.dispose();
            this.monacoSV = null;
        }
    }
}

export {Editor};
