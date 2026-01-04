import {addScript} from "../util/addScript";
import {addStyle} from "../util/addStyle";
import {Constants} from "../constants";

declare const MathfieldElement: any;

// MathLive module cache
let mathliveLoaded = false;
let mathliveLoading: Promise<void> | null = null;

/**
 * Load MathLive library from CDN
 */
export const loadMathLive = async (cdn: string): Promise<void> => {
    if (mathliveLoaded) {
        return;
    }
    if (mathliveLoading) {
        return mathliveLoading;
    }

    mathliveLoading = (async () => {
        // Load MathLive CSS
        addStyle(`${cdn}/dist/js/mathlive/mathlive-fonts.css`, "vditorMathLiveFontsStyle");
        addStyle(`${cdn}/dist/js/mathlive/mathlive-static.css`, "vditorMathLiveStaticStyle");

        // Load MathLive script
        await addScript(`${cdn}/dist/js/mathlive/mathlive.min.js`, "vditorMathLiveScript");

        mathliveLoaded = true;
    })();

    return mathliveLoading;
};

/**
 * Render math preview using MathLive (read-only mode)
 * This replaces KaTeX/MathJax for math block previews
 * Clicking on preview will enter edit mode
 */
export const renderMathLivePreview = (
    previewElement: HTMLElement,
    vditor: IVditor,
): void => {
    // Get CDN path
    const cdn = vditor.options.cdn !== undefined ? vditor.options.cdn : Constants.CDN;

    // Get the LaTeX content - first try from preview's code element, then from parent's pre > code
    let mathContent = "";
    const codeElement = previewElement.querySelector("code") as HTMLElement;
    if (codeElement) {
        mathContent = codeElement.textContent || "";
    } else {
        // For math-block, get content from sibling pre > code
        const parentBlock = previewElement.parentElement;
        if (parentBlock) {
            const preCode = parentBlock.querySelector("pre > code") as HTMLElement;
            if (preCode) {
                mathContent = preCode.textContent || "";
            }
        }
    }

    if (!mathContent) {
        return;
    }

    // Load MathLive and render
    loadMathLive(cdn).then(() => {
        // Clear preview and create MathLive element
        previewElement.innerHTML = "";

        // Create read-only MathfieldElement
        const mathfield = new MathfieldElement({
            readOnly: true,
            letterShapeStyle: "tex",
            virtualKeyboardMode: "off",
        });
        mathfield.className = "vditor-mathlive-preview";

        // Make it non-focusable
        mathfield.setAttribute("tabindex", "-1");

        // Add click handler to enter edit mode
        const handleClick = () => {
            const mathBlockElement = previewElement.parentElement;
            if (mathBlockElement && mathBlockElement.getAttribute("data-type") === "math-block") {
                // Add expand class and init editor
                mathBlockElement.classList.add("vditor-ir__node--expand");
                mathBlockElement.classList.remove("vditor-ir__node--hidden");
                initMathLiveForMathBlock(mathBlockElement, vditor);
            }
        };
        mathfield.addEventListener("click", handleClick);
        previewElement.addEventListener("click", handleClick);

        // Append first, then set value (some properties need mounted element)
        previewElement.appendChild(mathfield);
        mathfield.value = mathContent;
    });
};

/**
 * Initialize MathLive editor for a math block element in IR mode (edit mode)
 * Creates Monaco editor (top) + MathLive render (bottom)
 */
export const initMathLiveForMathBlock = async (
    mathBlockElement: HTMLElement,
    vditor: IVditor,
): Promise<any> => {
    // Get code element containing math content
    const codeElement = mathBlockElement.querySelector("pre > code") as HTMLElement;
    if (!codeElement) {
        return null;
    }

    // Check if MathLive editor is already initialized
    if (mathBlockElement.querySelector(".vditor-mathlive-editor-wrapper")) {
        return null;
    }

    // Get CDN path
    const cdn = vditor.options.cdn !== undefined ? vditor.options.cdn : Constants.CDN;

    // Load MathLive
    await loadMathLive(cdn);

    // Get math content (LaTeX)
    const mathContent = codeElement.textContent || "";

    // Hide the pre element
    const preElement = codeElement.parentElement;
    if (preElement) {
        preElement.style.display = "none";
    }

    // Hide the preview element
    const previewElement = mathBlockElement.querySelector(".vditor-ir__preview") as HTMLElement;
    if (previewElement) {
        previewElement.style.display = "none";
    }

    // Create editor wrapper
    const editorWrapper = document.createElement("div");
    editorWrapper.className = "vditor-mathlive-editor-wrapper";
    editorWrapper.setAttribute("contenteditable", "false");

    // Stop events from bubbling to vditor
    editorWrapper.addEventListener("input", (e) => e.stopPropagation());
    editorWrapper.addEventListener("keydown", (e) => e.stopPropagation());
    editorWrapper.addEventListener("keyup", (e) => e.stopPropagation());
    editorWrapper.addEventListener("keypress", (e) => e.stopPropagation());

    // Handle click outside to destroy editor
    const handleClickOutside = (e: MouseEvent) => {
        if (!editorWrapper.contains(e.target as Node)) {
            document.removeEventListener("mousedown", handleClickOutside);
            destroyMathLiveForMathBlock(mathBlockElement, vditor);
        }
    };
    // Delay adding listener to avoid immediate trigger
    setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    // Create Monaco editor wrapper (TOP)
    const monacoWrapper = document.createElement("div");
    monacoWrapper.className = "vditor-mathlive-monaco-wrapper";

    // Create MathLive editor (BOTTOM - editable for visual editing)
    const mathfield = new MathfieldElement({
        readOnly: false,
        letterShapeStyle: "tex",
        smartMode: true,
        virtualKeyboardMode: "manual",
    });
    mathfield.className = "vditor-mathlive-field";

    // Sync flag to prevent infinite loops
    let isSyncing = false;

    // Sync function to update MathLive from Monaco
    const syncFromMonaco = (newValue: string) => {
        if (isSyncing) return;
        isSyncing = true;
        codeElement.textContent = newValue;
        if (mathfield.value !== newValue) {
            mathfield.value = newValue;
        }
        isSyncing = false;
    };

    // Sync function to update Monaco from MathLive
    const syncFromMathLive = () => {
        if (isSyncing) return;
        isSyncing = true;
        const newValue = mathfield.value;
        codeElement.textContent = newValue;
        const monacoEditor = (monacoWrapper as any).__monacoEditor;
        if (monacoEditor && monacoEditor.getValue() !== newValue) {
            monacoEditor.setValue(newValue);
        }
        isSyncing = false;
    };

    // Listen for MathLive input changes
    mathfield.addEventListener("input", syncFromMathLive);

    // Add Monaco (top) then MathLive (bottom)
    editorWrapper.appendChild(monacoWrapper);
    editorWrapper.appendChild(mathfield);

    // Insert wrapper after the preview element or pre element
    if (previewElement) {
        previewElement.parentElement?.insertBefore(editorWrapper, previewElement.nextSibling);
    } else if (preElement) {
        preElement.parentElement?.insertBefore(editorWrapper, preElement.nextSibling);
    }

    // Set initial value after mounting
    mathfield.value = mathContent;

    // Initialize Monaco editor if available
    if (vditor.monaco?.isEnabled()) {
        const monacoManager = vditor.monaco;
        const monacoId = `mathlive-monaco-${Date.now()}`;
        monacoWrapper.id = monacoId;

        monacoManager.create(
            monacoWrapper,
            "latex",
            mathContent,
            syncFromMonaco,
        ).then((editor: any) => {
            (monacoWrapper as any).__monacoEditor = editor;
            // Focus Monaco editor
            editor.focus();
        });
    }

    return mathfield;
};

/**
 * Destroy MathLive editor for a math block (when blur/collapse)
 * Shows only the MathLive preview (read-only)
 */
export const destroyMathLiveForMathBlock = (
    mathBlockElement: HTMLElement,
    vditor: IVditor,
): void => {
    const editorWrapper = mathBlockElement.querySelector(".vditor-mathlive-editor-wrapper") as HTMLElement;
    if (!editorWrapper) {
        return;
    }

    // Get final content from Monaco or MathLive
    const monacoWrapper = editorWrapper.querySelector(".vditor-mathlive-monaco-wrapper") as HTMLElement;
    const codeElement = mathBlockElement.querySelector("pre > code") as HTMLElement;

    let finalContent = "";
    if (monacoWrapper) {
        const monacoId = monacoWrapper.getAttribute("data-monaco-id");
        if (monacoId && vditor.monaco) {
            // Get content before destroying
            finalContent = vditor.monaco.getContent(monacoId) || "";
            // Use Monaco manager to properly destroy
            vditor.monaco.destroy(monacoId);
        } else if ((monacoWrapper as any).__monacoEditor) {
            // Fallback if no manager
            finalContent = (monacoWrapper as any).__monacoEditor.getValue();
            (monacoWrapper as any).__monacoEditor.dispose();
        }
    }

    // If no Monaco content, try MathLive
    if (!finalContent) {
        const mathfield = editorWrapper.querySelector(".vditor-mathlive-field") as any;
        if (mathfield) {
            finalContent = mathfield.value;
        }
    }

    // Update code element with final content
    if (codeElement && finalContent) {
        codeElement.textContent = finalContent;
    }

    // Keep pre element hidden (we don't need to show raw code)
    const preElement = codeElement?.parentElement;
    if (preElement) {
        preElement.style.display = "none";
    }

    // Show and update the preview element with MathLive
    const previewElement = mathBlockElement.querySelector(".vditor-ir__preview") as HTMLElement;
    if (previewElement && codeElement) {
        previewElement.style.display = "";
        // Set the code content for MathLive to read
        previewElement.innerHTML = `<code class="language-math">${codeElement.textContent}</code>`;
        renderMathLivePreview(previewElement, vditor);
    }

    // Remove editor wrapper
    editorWrapper.remove();

    // Remove expand class
    mathBlockElement.classList.remove("vditor-ir__node--expand");
};
