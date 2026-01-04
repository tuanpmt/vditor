import {Constants} from "../constants";
import {loadMonaco} from "../markdown/monacoRender";
import {getMarkdown} from "../markdown/getMarkdown";

declare const monaco: any;

/**
 * Monaco-based SV Editor for split view mode
 * Replaces contenteditable pre element with Monaco Editor
 */
export class MonacoSVEditor {
    public element: HTMLElement;
    public monacoEditor: any;
    private container: HTMLElement;
    private vditor: IVditor;
    private isLoading: boolean = false;
    private pendingValue: string | null = null;
    private changeListeners: Array<(content: string) => void> = [];

    constructor(vditor: IVditor) {
        this.vditor = vditor;
        this.container = document.createElement("div");
        this.container.className = "vditor-sv vditor-sv--monaco";
        this.element = this.container;
    }

    /**
     * Initialize Monaco Editor
     */
    async init(): Promise<void> {
        if (this.monacoEditor || this.isLoading) {
            return;
        }

        this.isLoading = true;

        const cdn = this.vditor.options.cdn || Constants.CDN;
        const monacoOptions = this.vditor.options.preview?.monaco;

        try {
            const monacoLib = await loadMonaco(cdn);

            // Get initial content
            let initialValue = "";
            if (this.pendingValue !== null) {
                initialValue = this.pendingValue;
                this.pendingValue = null;
            } else if (this.vditor.sv?.element?.textContent) {
                initialValue = getMarkdown(this.vditor);
            }

            // Determine theme
            const theme = this.getMonacoTheme();

            // Create Monaco editor
            this.monacoEditor = monacoLib.editor.create(this.container, {
                value: initialValue,
                language: "markdown",
                theme,
                fontSize: 16,
                lineHeight: 22,
                wordWrap: "on",
                minimap: {enabled: false},
                lineNumbers: "off",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: {top: 10, bottom: 10},
                renderLineHighlight: "none",
                overviewRulerBorder: false,
                hideCursorInOverviewRuler: true,
                scrollbar: {
                    vertical: "auto",
                    horizontal: "hidden",
                    verticalScrollbarSize: 10,
                },
                // Allow user overrides
                ...monacoOptions?.editorOptions,
            });

            // Handle content changes
            this.monacoEditor.onDidChangeModelContent(() => {
                this.handleContentChange();
            });

            // Handle scroll sync with preview
            this.monacoEditor.onDidScrollChange(() => {
                this.handleScrollSync();
            });

            // Handle focus/blur events
            this.monacoEditor.onDidFocusEditorText(() => {
                this.container.classList.add("vditor-sv--focus");
                if (this.vditor.options.focus) {
                    this.vditor.options.focus(this.getValue());
                }
            });

            this.monacoEditor.onDidBlurEditorText(() => {
                this.container.classList.remove("vditor-sv--focus");
                if (this.vditor.options.blur) {
                    this.vditor.options.blur(this.getValue());
                }
            });

            this.isLoading = false;
        } catch (error) {
            console.error("Failed to initialize Monaco SV Editor:", error);
            this.isLoading = false;
        }
    }

    /**
     * Get Monaco theme based on vditor theme
     */
    private getMonacoTheme(): string {
        const theme = this.vditor.options.theme || "classic";
        return theme === "dark" ? "vs-dark" : "vs";
    }

    /**
     * Update Monaco theme when vditor theme changes
     */
    updateTheme(): void {
        if (this.monacoEditor) {
            const theme = this.getMonacoTheme();
            monaco.editor.setTheme(theme);
        }
    }

    /**
     * Handle content changes
     */
    private handleContentChange(): void {
        const content = this.getValue();

        // Notify listeners
        this.changeListeners.forEach((listener) => listener(content));

        // Update preview
        if (this.vditor.preview) {
            this.vditor.preview.render(this.vditor);
        }

        // Call input callback
        if (this.vditor.options.input) {
            this.vditor.options.input(content);
        }

        // Update counter
        if (this.vditor.options.counter?.enable && this.vditor.counter) {
            this.vditor.counter.render(this.vditor, content);
        }

        // Save to cache
        if (this.vditor.options.cache?.enable) {
            try {
                localStorage.setItem(this.vditor.options.cache.id, content);
                if (this.vditor.options.cache.after) {
                    this.vditor.options.cache.after(content);
                }
            } catch (e) {
                // localStorage not available
            }
        }

        // Add to undo stack
        if (this.vditor.undo) {
            clearTimeout((this as any).undoTimeoutId);
            (this as any).undoTimeoutId = window.setTimeout(() => {
                this.vditor.undo.addToUndoStack(this.vditor);
            }, this.vditor.options.undoDelay);
        }
    }

    /**
     * Handle scroll sync with preview panel
     */
    private handleScrollSync(): void {
        if (!this.vditor.preview?.element || this.vditor.preview.element.style.display === "none") {
            return;
        }

        const scrollInfo = this.monacoEditor.getScrollTop();
        const editorHeight = this.monacoEditor.getLayoutInfo().height;
        const scrollHeight = this.monacoEditor.getScrollHeight();
        const preview = this.vditor.preview.element;

        if (scrollHeight <= editorHeight) {
            return;
        }

        const scrollRatio = scrollInfo / (scrollHeight - editorHeight);
        const previewScrollHeight = preview.scrollHeight - preview.clientHeight;

        if ((scrollInfo / editorHeight > 0.5)) {
            preview.scrollTop = (scrollInfo + editorHeight) * preview.scrollHeight / scrollHeight - editorHeight;
        } else {
            preview.scrollTop = scrollRatio * previewScrollHeight;
        }
    }

    /**
     * Get editor content
     */
    getValue(): string {
        if (this.monacoEditor) {
            return this.monacoEditor.getValue();
        }
        return this.pendingValue || "";
    }

    /**
     * Set editor content
     */
    setValue(value: string): void {
        if (this.monacoEditor) {
            // Preserve cursor position if possible
            const position = this.monacoEditor.getPosition();
            this.monacoEditor.setValue(value);
            if (position) {
                this.monacoEditor.setPosition(position);
            }
        } else {
            this.pendingValue = value;
            // Try to init Monaco if not already loading
            if (!this.isLoading) {
                this.init();
            }
        }
    }

    /**
     * Ensure Monaco is initialized (call when element becomes visible)
     */
    async ensureInit(): Promise<void> {
        if (this.monacoEditor) {
            // Force layout update when becoming visible
            this.monacoEditor.layout();
            return;
        }
        if (!this.isLoading) {
            await this.init();
        }
        // Wait for loading to complete
        while (this.isLoading) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }

    /**
     * Focus the editor
     */
    focus(): void {
        if (this.monacoEditor) {
            this.monacoEditor.focus();
        }
    }

    /**
     * Blur the editor
     */
    blur(): void {
        if (this.monacoEditor) {
            // Monaco doesn't have a direct blur method, so we remove focus from DOM
            const textarea = this.container.querySelector("textarea");
            if (textarea) {
                textarea.blur();
            }
        }
    }

    /**
     * Get selected text
     */
    getSelection(): string {
        if (this.monacoEditor) {
            const selection = this.monacoEditor.getSelection();
            return this.monacoEditor.getModel().getValueInRange(selection);
        }
        return "";
    }

    /**
     * Insert text at cursor position
     */
    insertText(text: string): void {
        if (this.monacoEditor) {
            const selection = this.monacoEditor.getSelection();
            this.monacoEditor.executeEdits("", [{
                range: selection,
                text,
                forceMoveMarkers: true,
            }]);
        }
    }

    /**
     * Wrap selected text with prefix and suffix
     */
    wrapSelection(prefix: string, suffix: string): void {
        if (this.monacoEditor) {
            const selection = this.monacoEditor.getSelection();
            const selectedText = this.monacoEditor.getModel().getValueInRange(selection);
            const newText = prefix + selectedText + suffix;
            this.monacoEditor.executeEdits("", [{
                range: selection,
                text: newText,
                forceMoveMarkers: true,
            }]);

            // Position cursor after prefix if no selection
            if (selection.isEmpty()) {
                const newPosition = this.monacoEditor.getModel().getPositionAt(
                    this.monacoEditor.getModel().getOffsetAt(selection.getStartPosition()) + prefix.length,
                );
                this.monacoEditor.setPosition(newPosition);
            }
        }
    }

    /**
     * Add change listener
     */
    onDidChangeContent(listener: (content: string) => void): void {
        this.changeListeners.push(listener);
    }

    /**
     * Enable/disable editor
     */
    setReadOnly(readOnly: boolean): void {
        if (this.monacoEditor) {
            this.monacoEditor.updateOptions({readOnly});
        }
    }

    /**
     * Dispose the editor
     */
    dispose(): void {
        if (this.monacoEditor) {
            this.monacoEditor.dispose();
            this.monacoEditor = null;
        }
        this.changeListeners = [];
    }

    /**
     * Check if Monaco is ready
     */
    isReady(): boolean {
        return !!this.monacoEditor;
    }
}

/**
 * Check if Monaco SV mode is enabled
 */
export const isMonacoSVEnabled = (vditor: IVditor): boolean => {
    return vditor.options.preview?.monaco?.enable !== false &&
           window.innerWidth > Constants.MOBILE_WIDTH;
};
