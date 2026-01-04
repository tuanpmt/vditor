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
 * Initialize MathLive for a math block element in IR mode
 */
export const initMathLiveForMathBlock = async (
    mathBlockElement: HTMLElement,
    vditor: IVditor,
    onChange?: (content: string) => void,
): Promise<any> => {
    // Get code element containing math content
    const codeElement = mathBlockElement.querySelector("pre > code") as HTMLElement;
    if (!codeElement) {
        return null;
    }

    // Check if MathLive is already initialized
    if (mathBlockElement.querySelector(".vditor-mathlive-wrapper")) {
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

    // Create MathLive wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "vditor-mathlive-wrapper";
    wrapper.setAttribute("contenteditable", "false");

    // Stop events from bubbling to vditor
    wrapper.addEventListener("input", (e) => e.stopPropagation());
    wrapper.addEventListener("keydown", (e) => e.stopPropagation());
    wrapper.addEventListener("keyup", (e) => e.stopPropagation());
    wrapper.addEventListener("keypress", (e) => e.stopPropagation());

    // Create MathfieldElement
    const mathfield = new MathfieldElement();
    mathfield.className = "vditor-mathlive-field";
    mathfield.value = mathContent;

    // Configure mathfield options
    mathfield.letterShapeStyle = "tex";
    mathfield.smartMode = true;
    mathfield.virtualKeyboardMode = "manual";

    // Handle input changes
    mathfield.addEventListener("input", () => {
        const newValue = mathfield.value;
        codeElement.textContent = newValue;
        if (onChange) {
            onChange(newValue);
        }
        // Update preview
        updateMathPreview(mathBlockElement, vditor);
    });

    wrapper.appendChild(mathfield);

    // Insert wrapper after the code element's parent
    if (preElement) {
        preElement.parentElement?.insertBefore(wrapper, preElement.nextSibling);
    }

    // Focus the mathfield
    setTimeout(() => {
        mathfield.focus();
    }, 50);

    return mathfield;
};

/**
 * Update math preview after content change
 */
const updateMathPreview = (mathBlockElement: HTMLElement, vditor: IVditor) => {
    const previewElement = mathBlockElement.querySelector(".vditor-ir__preview") as HTMLElement;
    if (!previewElement) {
        return;
    }

    const codeElement = mathBlockElement.querySelector("pre > code") as HTMLElement;
    if (!codeElement) {
        return;
    }

    const preElement = codeElement.parentElement;
    if (preElement) {
        previewElement.innerHTML = preElement.innerHTML;
        // Re-render math
        import("./mathRender").then(({mathRender}) => {
            mathRender(previewElement, {
                cdn: vditor.options.cdn,
                math: vditor.options.preview?.math,
            });
        });
    }
};

/**
 * Destroy MathLive for a math block
 */
export const destroyMathLiveForMathBlock = (
    mathBlockElement: HTMLElement,
    vditor: IVditor,
): void => {
    const wrapper = mathBlockElement.querySelector(".vditor-mathlive-wrapper") as HTMLElement;
    if (!wrapper) {
        return;
    }

    // Sync final content
    const mathfield = wrapper.querySelector(".vditor-mathlive-field") as any;
    const codeElement = mathBlockElement.querySelector("pre > code") as HTMLElement;

    if (mathfield && codeElement) {
        codeElement.textContent = mathfield.value;
    }

    // Show the pre element again
    const preElement = codeElement?.parentElement;
    if (preElement) {
        preElement.style.display = "";
    }

    // Update preview with final content
    const previewElement = mathBlockElement.querySelector(".vditor-ir__preview") as HTMLElement;
    if (previewElement && preElement) {
        previewElement.innerHTML = preElement.innerHTML;
        import("./mathRender").then(({mathRender}) => {
            mathRender(previewElement, {
                cdn: vditor.options.cdn,
                math: vditor.options.preview?.math,
            });
        });
    }

    // Remove wrapper
    wrapper.remove();
};
