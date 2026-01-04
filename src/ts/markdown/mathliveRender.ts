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
 */
export const renderMathLivePreview = async (
    previewElement: HTMLElement,
    vditor: IVditor,
): Promise<void> => {
    // Get CDN path
    const cdn = vditor.options.cdn !== undefined ? vditor.options.cdn : Constants.CDN;

    // Load MathLive
    await loadMathLive(cdn);

    // Get the code element to extract LaTeX
    const codeElement = previewElement.querySelector("code") as HTMLElement;
    if (!codeElement) {
        return;
    }

    const mathContent = codeElement.textContent || "";

    // Clear preview and create MathLive element
    previewElement.innerHTML = "";

    // Create read-only MathfieldElement
    const mathfield = new MathfieldElement();
    mathfield.className = "vditor-mathlive-preview";
    mathfield.value = mathContent;

    // Configure for read-only display
    mathfield.readOnly = true;
    mathfield.letterShapeStyle = "tex";
    mathfield.virtualKeyboardMode = "off";
    mathfield.menuItems = [];

    // Make it non-focusable
    mathfield.setAttribute("tabindex", "-1");

    previewElement.appendChild(mathfield);
};

/**
 * Initialize MathLive editor for a math block element in IR mode (edit mode)
 * Creates editable MathLive + Monaco editor for source code
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

    // Create MathLive editor (editable)
    const mathfield = new MathfieldElement();
    mathfield.className = "vditor-mathlive-field";
    mathfield.value = mathContent;

    // Configure mathfield options for editing
    mathfield.letterShapeStyle = "tex";
    mathfield.smartMode = true;
    mathfield.virtualKeyboardMode = "manual";

    // Create Monaco editor wrapper
    const monacoWrapper = document.createElement("div");
    monacoWrapper.className = "vditor-mathlive-monaco-wrapper";

    // Sync function to update both editors
    let isUpdating = false;

    const syncFromMathLive = () => {
        if (isUpdating) return;
        isUpdating = true;
        const newValue = mathfield.value;
        codeElement.textContent = newValue;
        // Update Monaco if exists
        const monacoInstance = (monacoWrapper as any).__monacoEditor;
        if (monacoInstance && monacoInstance.getValue() !== newValue) {
            monacoInstance.setValue(newValue);
        }
        isUpdating = false;
    };

    const syncFromMonaco = (newValue: string) => {
        if (isUpdating) return;
        isUpdating = true;
        codeElement.textContent = newValue;
        if (mathfield.value !== newValue) {
            mathfield.value = newValue;
        }
        isUpdating = false;
    };

    // Handle MathLive input changes
    mathfield.addEventListener("input", syncFromMathLive);

    editorWrapper.appendChild(mathfield);
    editorWrapper.appendChild(monacoWrapper);

    // Insert wrapper after the preview element or pre element
    if (previewElement) {
        previewElement.parentElement?.insertBefore(editorWrapper, previewElement.nextSibling);
    } else if (preElement) {
        preElement.parentElement?.insertBefore(editorWrapper, preElement.nextSibling);
    }

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
        });
    }

    // Focus the mathfield
    setTimeout(() => {
        mathfield.focus();
    }, 50);

    return mathfield;
};

/**
 * Destroy MathLive editor for a math block
 */
export const destroyMathLiveForMathBlock = (
    mathBlockElement: HTMLElement,
    vditor: IVditor,
): void => {
    const editorWrapper = mathBlockElement.querySelector(".vditor-mathlive-editor-wrapper") as HTMLElement;
    if (!editorWrapper) {
        return;
    }

    // Sync final content from MathLive
    const mathfield = editorWrapper.querySelector(".vditor-mathlive-field") as any;
    const codeElement = mathBlockElement.querySelector("pre > code") as HTMLElement;

    if (mathfield && codeElement) {
        codeElement.textContent = mathfield.value;
    }

    // Destroy Monaco editor if exists
    const monacoWrapper = editorWrapper.querySelector(".vditor-mathlive-monaco-wrapper") as any;
    if (monacoWrapper?.__monacoEditor) {
        monacoWrapper.__monacoEditor.dispose();
    }

    // Show the pre element again
    const preElement = codeElement?.parentElement;
    if (preElement) {
        preElement.style.display = "";
    }

    // Show and update the preview element
    const previewElement = mathBlockElement.querySelector(".vditor-ir__preview") as HTMLElement;
    if (previewElement) {
        previewElement.style.display = "";
        // Re-render with MathLive
        if (preElement) {
            previewElement.innerHTML = preElement.innerHTML;
            renderMathLivePreview(previewElement, vditor);
        }
    }

    // Remove editor wrapper
    editorWrapper.remove();
};
