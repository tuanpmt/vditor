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
export const renderMathLivePreview = (
    previewElement: HTMLElement,
    vditor: IVditor,
): void => {
    // Get CDN path
    const cdn = vditor.options.cdn !== undefined ? vditor.options.cdn : Constants.CDN;

    // Get the code element to extract LaTeX
    const codeElement = previewElement.querySelector("code") as HTMLElement;
    if (!codeElement) {
        return;
    }

    const mathContent = codeElement.textContent || "";

    // Load MathLive and render
    loadMathLive(cdn).then(() => {
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

    // Create Monaco editor wrapper (TOP)
    const monacoWrapper = document.createElement("div");
    monacoWrapper.className = "vditor-mathlive-monaco-wrapper";

    // Create MathLive render (BOTTOM - read-only for preview)
    const mathfield = new MathfieldElement();
    mathfield.className = "vditor-mathlive-field";
    mathfield.value = mathContent;

    // Configure mathfield for read-only render (not editing)
    mathfield.readOnly = true;
    mathfield.letterShapeStyle = "tex";
    mathfield.virtualKeyboardMode = "off";
    mathfield.menuItems = [];
    mathfield.setAttribute("tabindex", "-1");

    // Sync function to update MathLive from Monaco
    const syncFromMonaco = (newValue: string) => {
        codeElement.textContent = newValue;
        mathfield.value = newValue;
    };

    // Add Monaco (top) then MathLive (bottom)
    editorWrapper.appendChild(monacoWrapper);
    editorWrapper.appendChild(mathfield);

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
    const monacoWrapper = editorWrapper.querySelector(".vditor-mathlive-monaco-wrapper") as any;
    const codeElement = mathBlockElement.querySelector("pre > code") as HTMLElement;

    let finalContent = "";
    if (monacoWrapper?.__monacoEditor) {
        finalContent = monacoWrapper.__monacoEditor.getValue();
        monacoWrapper.__monacoEditor.dispose();
    } else {
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
};
