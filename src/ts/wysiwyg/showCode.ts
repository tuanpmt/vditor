import {scrollCenter} from "../util/editorCommonEvent";
import {setSelectionFocus} from "../util/selection";
import {initMonacoForCodeBlock} from "../markdown/monacoRender";

export const showCode = (previewElement: HTMLElement, vditor: IVditor, first = true) => {
    const previousElement = previewElement.previousElementSibling as HTMLElement;
    const range = previousElement.ownerDocument.createRange();
    const blockElement = previewElement.parentElement;

    // Check if this is a code block and Monaco is enabled
    const isCodeBlock = blockElement?.getAttribute("data-type") === "code-block";

    if (previousElement.tagName === "CODE") {
        previousElement.style.display = "inline-block";
        if (first) {
            range.setStart(previousElement.firstChild, 1);
        } else {
            range.selectNodeContents(previousElement);
        }
    } else {
        previousElement.style.display = "block";

        if (!previousElement.firstChild.firstChild) {
            previousElement.firstChild.appendChild(document.createTextNode(""));
        }
        range.selectNodeContents(previousElement.firstChild);
    }
    if (first) {
        range.collapse(true);
    } else {
        range.collapse(false);
    }
    setSelectionFocus(range);
    if (previewElement.firstElementChild.classList.contains("language-mindmap")) {
        return;
    }
    scrollCenter(vditor);

    // Initialize Monaco for code blocks (only if not already initialized)
    if (isCodeBlock && vditor.monaco?.isEnabled()) {
        if (!blockElement.querySelector(".vditor-monaco-wrapper")) {
            initMonacoForCodeBlock(blockElement, vditor);
        }
    }
};
