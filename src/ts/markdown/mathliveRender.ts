import {addScript} from "../util/addScript";
import {addStyle} from "../util/addStyle";
import {Constants} from "../constants";

// MathfieldElement is loaded dynamically from MathLive
// MathLive 0.108+ exports to window.MathLive.MathfieldElement
declare global {
    interface Window {
        MathfieldElement: any;
        MathLive: {
            MathfieldElement: any;
        };
    }
}

/**
 * Get MathfieldElement constructor from window
 * MathLive 0.108+ exports to window.MathLive.MathfieldElement
 * Older versions export to window.MathfieldElement
 */
const getMathfieldElement = (): any => {
    return window.MathLive?.MathfieldElement || window.MathfieldElement;
};

// ============================================================================
// Simple LaTeX Math Prettier
// Inspired by unified-latex-prettier but simplified for math expressions
// ============================================================================

interface Token {
    type: "command" | "text" | "open" | "close" | "operator" | "subscript" | "superscript" | "whitespace" | "newline";
    value: string;
    depth?: number;
}

/**
 * Tokenize LaTeX math expression
 */
const tokenize = (latex: string): Token[] => {
    const tokens: Token[] = [];
    let i = 0;

    while (i < latex.length) {
        const char = latex[i];

        // Command: \commandname
        if (char === "\\") {
            let cmd = "\\";
            i++;
            // Check for special single char commands
            if (i < latex.length && /[\\{}\[\]$%&_#]/.test(latex[i])) {
                cmd += latex[i];
                i++;
            } else {
                // Read command name
                while (i < latex.length && /[a-zA-Z]/.test(latex[i])) {
                    cmd += latex[i];
                    i++;
                }
            }
            tokens.push({type: "command", value: cmd});
            continue;
        }

        // Open brace
        if (char === "{") {
            tokens.push({type: "open", value: "{"});
            i++;
            continue;
        }

        // Close brace
        if (char === "}") {
            tokens.push({type: "close", value: "}"});
            i++;
            continue;
        }

        // Subscript/Superscript
        if (char === "^") {
            tokens.push({type: "superscript", value: "^"});
            i++;
            continue;
        }
        if (char === "_") {
            tokens.push({type: "subscript", value: "_"});
            i++;
            continue;
        }

        // Binary operators (for line breaking)
        if (char === "=" || char === "+" || char === "-") {
            tokens.push({type: "operator", value: char});
            i++;
            continue;
        }

        // Whitespace
        if (char === " " || char === "\t") {
            let ws = "";
            while (i < latex.length && (latex[i] === " " || latex[i] === "\t")) {
                ws += latex[i];
                i++;
            }
            tokens.push({type: "whitespace", value: " "});
            continue;
        }

        // Newline
        if (char === "\n") {
            tokens.push({type: "newline", value: "\n"});
            i++;
            continue;
        }

        // Other text (numbers, letters, etc.)
        let text = "";
        while (i < latex.length && !/[\\{}\^_=+\-\s\n]/.test(latex[i])) {
            text += latex[i];
            i++;
        }
        if (text) {
            tokens.push({type: "text", value: text});
        }
    }

    return tokens;
};

/**
 * Commands that create block structures (may need line breaks)
 */
const BLOCK_COMMANDS = new Set([
    "\\frac", "\\dfrac", "\\tfrac", "\\cfrac",
    "\\sum", "\\prod", "\\int", "\\oint",
    "\\lim", "\\max", "\\min",
]);

/**
 * Environment commands
 */
const ENV_COMMANDS = new Set(["\\begin", "\\end"]);

/**
 * Format LaTeX math expression
 */
const formatLaTeXMath = (latex: string, printWidth: number = 80): string => {
    if (!latex || latex.trim().length === 0) {
        return latex;
    }

    // First, clean up the input
    let cleaned = latex
        .replace(/\s+\}/g, "}")
        .replace(/\{\s+/g, "{")
        .replace(/\s+\^/g, "^")
        .replace(/\s+_/g, "_")
        .replace(/\^\s+/g, "^")
        .replace(/_\s+/g, "_")
        .replace(/(\\[a-zA-Z]+)\s+\{/g, "$1{")
        .replace(/  +/g, " ")
        .replace(/\n\s*/g, " ")
        .trim();

    // If short enough, return as single line
    if (cleaned.length <= printWidth) {
        return cleaned;
    }

    // Tokenize
    const tokens = tokenize(cleaned);

    // Format with proper line breaks
    let output = "";
    let depth = 0;
    let lineLength = 0;
    let lastCommandWasBlock = false;
    let fracDepth = 0; // Track nested frac depth

    const indent = (d: number) => "  ".repeat(Math.max(0, d));
    const addNewline = (extraIndent: number = 0) => {
        output += "\n" + indent(depth + extraIndent);
        lineLength = (depth + extraIndent) * 2;
    };

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const prevToken = i > 0 ? tokens[i - 1] : null;
        const nextToken = i < tokens.length - 1 ? tokens[i + 1] : null;

        switch (token.type) {
            case "command":
                // Handle \begin and \end
                if (token.value === "\\begin") {
                    if (lineLength > 0 && !output.endsWith("\n")) {
                        addNewline();
                    }
                    output += token.value;
                    lineLength += token.value.length;
                    depth++;
                } else if (token.value === "\\end") {
                    depth = Math.max(0, depth - 1);
                    if (!output.endsWith("\n")) {
                        addNewline();
                    }
                    output += token.value;
                    lineLength += token.value.length;
                } else if (BLOCK_COMMANDS.has(token.value)) {
                    // Block commands like \frac
                    const isFrac = token.value.includes("frac");
                    if (isFrac) {
                        fracDepth++;
                    }

                    // Add line break before if we're nested and line is long
                    if (fracDepth > 1 && lineLength > printWidth * 0.5) {
                        addNewline();
                    }

                    output += token.value;
                    lineLength += token.value.length;
                    lastCommandWasBlock = true;
                } else {
                    output += token.value;
                    lineLength += token.value.length;
                    lastCommandWasBlock = false;
                }
                break;

            case "open":
                output += "{";
                lineLength++;
                depth++;

                // If inside frac and line is getting long, add newline after {
                if (lastCommandWasBlock && fracDepth > 0 && lineLength > printWidth * 0.6) {
                    addNewline();
                }
                break;

            case "close":
                depth = Math.max(0, depth - 1);
                output += "}";
                lineLength++;

                // Track frac arguments
                if (fracDepth > 0) {
                    // Check if this closes a frac argument
                    const lookBack = output.slice(-20);
                    if (/\\[dt]?c?frac\{[^{}]*\}$/.test(lookBack)) {
                        // Just closed numerator, denominator next
                    } else if (fracDepth > 0) {
                        // Might be closing denominator
                        let braceCount = 0;
                        let foundFrac = false;
                        for (let j = output.length - 1; j >= 0 && !foundFrac; j--) {
                            if (output[j] === "}") braceCount++;
                            else if (output[j] === "{") braceCount--;
                            if (braceCount === 0 && j > 5) {
                                const checkStr = output.slice(Math.max(0, j - 6), j);
                                if (/\\[dt]?c?frac$/.test(checkStr)) {
                                    foundFrac = true;
                                    fracDepth--;
                                }
                            }
                        }
                    }
                }
                lastCommandWasBlock = false;
                break;

            case "operator":
                // Add line break before operator at depth 0 if line is long
                if (token.value === "=" && depth <= 1 && lineLength > printWidth * 0.4) {
                    output += " " + token.value;
                    addNewline(1);
                } else if ((token.value === "+" || token.value === "-") && depth <= 1 && lineLength > printWidth * 0.7) {
                    addNewline();
                    output += token.value + " ";
                    lineLength += 2;
                } else {
                    // Add spaces around operators at top level
                    if (depth <= 1 && prevToken?.type !== "whitespace") {
                        output += " ";
                        lineLength++;
                    }
                    output += token.value;
                    lineLength += token.value.length;
                    if (depth <= 1 && nextToken?.type !== "whitespace") {
                        output += " ";
                        lineLength++;
                    }
                }
                break;

            case "superscript":
            case "subscript":
                output += token.value;
                lineLength++;
                break;

            case "whitespace":
                // Skip whitespace after newline
                if (!output.endsWith("\n") && !output.endsWith("  ")) {
                    output += " ";
                    lineLength++;
                }
                break;

            case "newline":
                // Preserve intentional newlines
                if (!output.endsWith("\n")) {
                    addNewline();
                }
                break;

            case "text":
            default:
                output += token.value;
                lineLength += token.value.length;
                lastCommandWasBlock = false;
                break;
        }
    }

    return output.trim();
};

/**
 * Clean and format LaTeX output from MathLive
 */
const cleanLaTeX = (latex: string): string => {
    return formatLaTeXMath(latex, 80);
};

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
        const MathfieldElementClass = getMathfieldElement();
        // Check if MathfieldElement is available
        if (typeof MathfieldElementClass === "undefined") {
            console.warn("MathfieldElement not available");
            return;
        }

        // Clear preview and create MathLive element
        previewElement.innerHTML = "";

        // Create read-only MathfieldElement
        const mathfield = new MathfieldElementClass({
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

    // Get MathfieldElement class
    const MathfieldElementClass = getMathfieldElement();

    // Check if MathfieldElement is available
    if (typeof MathfieldElementClass === "undefined") {
        console.warn("MathfieldElement not available after loading MathLive");
        return null;
    }

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
    const mathfield = new MathfieldElementClass({
        readOnly: false,
        letterShapeStyle: "tex",
        smartMode: true,
        virtualKeyboardMode: "manual",
    });
    mathfield.className = "vditor-mathlive-field";

    // Sync flag to prevent infinite loops
    let isSyncing = false;
    let formatTimeout: number | null = null;

    // Sync function to update MathLive from Monaco
    const syncFromMonaco = (newValue: string) => {
        if (isSyncing) return;
        isSyncing = true;
        if (codeElement) {
            codeElement.textContent = newValue;
        }
        if (mathfield && mathfield.value !== newValue) {
            mathfield.value = newValue;
        }
        isSyncing = false;
    };

    // Sync function to update Monaco from MathLive (with debounced formatting)
    const syncFromMathLive = () => {
        if (isSyncing) return;

        // Clear previous timeout
        if (formatTimeout) {
            clearTimeout(formatTimeout);
        }

        // Debounce formatting to reduce jitter
        formatTimeout = window.setTimeout(() => {
            if (isSyncing || !mathfield) return;
            isSyncing = true;

            // Get raw value and format
            const rawValue = mathfield.value;
            const formattedValue = cleanLaTeX(rawValue);

            // Update code element and Monaco
            if (codeElement) {
                codeElement.textContent = formattedValue;
            }
            const monacoEditor = (monacoWrapper as any)?.__monacoEditor;
            if (monacoEditor && monacoEditor.getValue() !== formattedValue) {
                monacoEditor.setValue(formattedValue);
            }

            isSyncing = false;
        }, 300); // 300ms debounce
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
