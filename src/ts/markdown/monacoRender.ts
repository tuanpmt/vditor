import {addScript} from "../util/addScript";
import {Constants} from "../constants";
import {processCodeRender} from "../util/processCode";

declare const monaco: any;

// Monaco will be loaded from local CDN (dist/js/monaco)

// Monaco module cache
let monacoModule: any = null;
let monacoLoading: Promise<any> | null = null;
let mermaidLanguageRegistered = false;
let latexLanguageRegistered = false;

/**
 * Register Mermaid language with Monaco Editor
 */
const registerMermaidLanguage = (monacoLib: any) => {
    if (mermaidLanguageRegistered) {
        return;
    }

    // Register the language
    monacoLib.languages.register({id: "mermaid"});

    // Set language configuration (brackets, comments, etc.)
    monacoLib.languages.setLanguageConfiguration("mermaid", {
        comments: {
            lineComment: "%%",
        },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
        ],
        autoClosingPairs: [
            {open: "{", close: "}"},
            {open: "[", close: "]"},
            {open: "(", close: ")"},
            {open: '"', close: '"'},
            {open: "'", close: "'"},
        ],
        surroundingPairs: [
            {open: "{", close: "}"},
            {open: "[", close: "]"},
            {open: "(", close: ")"},
            {open: '"', close: '"'},
            {open: "'", close: "'"},
        ],
    });

    // Set tokenizer for syntax highlighting
    monacoLib.languages.setMonarchTokensProvider("mermaid", {
        defaultToken: "",
        tokenPostfix: ".mermaid",

        // Diagram types
        diagramTypes: [
            "graph", "flowchart", "sequenceDiagram", "classDiagram", "stateDiagram",
            "stateDiagram-v2", "erDiagram", "journey", "gantt", "pie", "quadrantChart",
            "requirementDiagram", "gitGraph", "mindmap", "timeline", "zenuml",
            "sankey-beta", "xychart-beta", "block-beta",
        ],

        // Keywords
        keywords: [
            // General
            "subgraph", "end", "direction", "click", "callback", "link", "class",
            "classDef", "style", "linkStyle", "title", "accTitle", "accDescr",
            // Sequence diagram
            "participant", "actor", "note", "activate", "deactivate", "loop",
            "alt", "else", "opt", "par", "and", "critical", "option", "break",
            "rect", "autonumber", "over", "of", "left", "right",
            // State diagram
            "state", "as", "fork", "join", "choice",
            // Gantt
            "dateFormat", "axisFormat", "tickInterval", "excludes", "includes",
            "section", "done", "active", "crit", "milestone", "after", "until",
            // ER diagram
            "PK", "FK", "UK",
            // Git graph
            "commit", "branch", "checkout", "merge", "cherry-pick", "tag", "id", "type", "msg",
            // Class diagram
            "namespace",
            // Pie
            "showData",
            // Mindmap
            "root",
        ],

        // Direction keywords
        directions: ["TB", "TD", "BT", "RL", "LR"],

        // Operators
        operators: [
            "-->", "---", "-.-", "-.->", "==>", "===", "-..-", "-..->",
            "-->|", "---|", "-.-|", "-.->|", "==>|", "--x", "--o",
            "o--", "x--", "<-->", "<-.->", "<==>",
        ],

        // Tokenizer rules
        tokenizer: {
            root: [
                // Comments
                [/%%.*$/, "comment"],

                // Diagram type declarations (at start of diagram)
                [/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|quadrantChart|requirementDiagram|gitGraph|mindmap|timeline|zenuml|sankey-beta|xychart-beta|block-beta)\b/, "keyword.diagram"],

                // Direction after graph/flowchart
                [/\b(TB|TD|BT|RL|LR)\b/, "keyword.direction"],

                // Keywords
                [/\b(subgraph|end|direction|click|callback|link|class|classDef|style|linkStyle|title|accTitle|accDescr|participant|actor|note|activate|deactivate|loop|alt|else|opt|par|and|critical|option|break|rect|autonumber|over|left|right|of|state|as|fork|join|choice|dateFormat|axisFormat|tickInterval|excludes|includes|section|done|active|crit|milestone|after|until|PK|FK|UK|commit|branch|checkout|merge|tag|namespace|showData|root)\b/, "keyword"],

                // State diagram special markers <<fork>>, <<join>>, <<choice>>
                [/<<(fork|join|choice)>>/, "keyword.special"],

                // ER diagram relationship operators
                [/\|o|o\||o\{|\}o|\|\||\{\||\|\{|\}\|/, "operator.er"],
                [/\.\./, "operator.er"],

                // Strings
                [/"[^"]*"/, "string"],
                [/'[^']*'/, "string"],

                // Node shapes with text - match the brackets
                [/\[\[/, "delimiter.bracket"], // Stadium shape start
                [/\]\]/, "delimiter.bracket"], // Stadium shape end
                [/\[\(/, "delimiter.bracket"], // Cylindrical start
                [/\)\]/, "delimiter.bracket"], // Cylindrical end
                [/\[\{/, "delimiter.bracket"], // Hexagon start
                [/\}\]/, "delimiter.bracket"], // Hexagon end
                [/\(\(/, "delimiter.bracket"], // Circle start
                [/\)\)/, "delimiter.bracket"], // Circle end
                [/\{\{/, "delimiter.bracket"], // Rhombus start
                [/\}\}/, "delimiter.bracket"], // Rhombus end
                [/\[\//, "delimiter.bracket"], // Parallelogram start
                [/\/\]/, "delimiter.bracket"], // Parallelogram end
                [/\[\\/, "delimiter.bracket"], // Parallelogram alt start
                [/\\\]/, "delimiter.bracket"], // Parallelogram alt end
                [/>\]/, "delimiter.bracket"], // Asymmetric end

                // Regular brackets
                [/[\[\]{}()]/, "delimiter.bracket"],

                // Arrows and connections (order matters - longer first)
                [/<-->|<-.->|<==>/, "operator.arrow"],
                [/-->>|--x|--o|o--|x--/, "operator.arrow"],
                [/-->|---|-\.->|-\.-|==>|===/, "operator.arrow"],
                [/\|[^|]*\|/, "string.link"], // Link text |text|

                // Node IDs (alphanumeric starting with letter)
                [/[a-zA-Z_]\w*/, "identifier"],

                // Numbers
                [/\d+/, "number"],

                // Whitespace
                [/\s+/, "white"],

                // Pipe for labels
                [/\|/, "delimiter"],

                // Other punctuation
                [/[;,:]/, "delimiter"],
            ],
        },
    });

    mermaidLanguageRegistered = true;
};

/**
 * Register LaTeX language with Monaco Editor
 */
const registerLaTeXLanguage = (monacoLib: any) => {
    if (latexLanguageRegistered) {
        return;
    }

    // Register the language
    monacoLib.languages.register({id: "latex"});

    // Set language configuration
    monacoLib.languages.setLanguageConfiguration("latex", {
        comments: {
            lineComment: "%",
        },
        brackets: [
            ["{", "}"],
            ["[", "]"],
            ["(", ")"],
        ],
        autoClosingPairs: [
            {open: "{", close: "}"},
            {open: "[", close: "]"},
            {open: "(", close: ")"},
            {open: "$", close: "$"},
        ],
        surroundingPairs: [
            {open: "{", close: "}"},
            {open: "[", close: "]"},
            {open: "(", close: ")"},
            {open: "$", close: "$"},
        ],
    });

    // Set tokenizer for syntax highlighting
    monacoLib.languages.setMonarchTokensProvider("latex", {
        defaultToken: "",
        tokenPostfix: ".latex",

        // Common LaTeX commands
        commands: [
            "frac", "dfrac", "tfrac", "cfrac",
            "sqrt", "root", "sum", "prod", "int", "oint", "iint", "iiint",
            "lim", "max", "min", "sup", "inf", "log", "ln", "exp", "sin", "cos", "tan",
            "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
            "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta",
            "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "rho", "sigma", "tau",
            "upsilon", "phi", "chi", "psi", "omega",
            "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
            "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Pi", "Rho", "Sigma", "Tau",
            "Upsilon", "Phi", "Chi", "Psi", "Omega",
            "infty", "partial", "nabla", "forall", "exists", "nexists",
            "in", "notin", "subset", "supset", "subseteq", "supseteq",
            "cup", "cap", "setminus", "emptyset", "varnothing",
            "pm", "mp", "times", "div", "cdot", "ast", "star", "circ", "bullet",
            "oplus", "ominus", "otimes", "oslash", "odot",
            "leq", "geq", "neq", "approx", "equiv", "sim", "simeq", "cong",
            "prec", "succ", "preceq", "succeceq",
            "ll", "gg", "lll", "ggg",
            "leftarrow", "rightarrow", "leftrightarrow", "Leftarrow", "Rightarrow", "Leftrightarrow",
            "uparrow", "downarrow", "updownarrow", "Uparrow", "Downarrow", "Updownarrow",
            "mapsto", "longmapsto", "hookrightarrow", "hookleftarrow",
            "left", "right", "bigl", "bigr", "Bigl", "Bigr", "biggl", "biggr", "Biggl", "Biggr",
            "big", "Big", "bigg", "Bigg",
            "text", "textbf", "textit", "textrm", "textsf", "texttt", "mathrm", "mathbf", "mathit", "mathsf", "mathtt", "mathcal", "mathbb", "mathfrak",
            "overline", "underline", "hat", "bar", "vec", "dot", "ddot", "tilde", "widehat", "widetilde",
            "binom", "tbinom", "dbinom",
            "matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix",
            "cdots", "ldots", "vdots", "ddots",
            "quad", "qquad", "hspace", "vspace",
            "newline", "\\\\",
            "begin", "end",
        ],

        // Environment names
        environments: [
            "equation", "equation*", "align", "align*", "aligned",
            "gather", "gather*", "gathered",
            "multline", "multline*",
            "split", "cases", "dcases",
            "matrix", "pmatrix", "bmatrix", "Bmatrix", "vmatrix", "Vmatrix",
            "array", "eqnarray", "eqnarray*",
            "subequations",
        ],

        tokenizer: {
            root: [
                // Comments
                [/%.*$/, "comment"],

                // Math delimiters
                [/\$\$/, "delimiter.math"],
                [/\$/, "delimiter.math"],
                [/\\\[/, "delimiter.math"],
                [/\\\]/, "delimiter.math"],
                [/\\\(/, "delimiter.math"],
                [/\\\)/, "delimiter.math"],

                // Commands with arguments - special highlighting
                [/\\(begin|end)/, {token: "keyword", next: "@environment"}],

                // Greek letters and special symbols
                [/\\(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega|infty|partial|nabla)\b/, "constant.language"],

                // Math operators
                [/\\(frac|dfrac|tfrac|cfrac|sqrt|sum|prod|int|oint|iint|iiint|lim|max|min|sup|inf|log|ln|exp|sin|cos|tan|arcsin|arccos|arctan|sinh|cosh|tanh|binom|tbinom|dbinom)\b/, "keyword.function"],

                // Sizing and delimiters
                [/\\(left|right|bigl|bigr|Bigl|Bigr|biggl|biggr|Biggl|Biggr|big|Big|bigg|Bigg)\b/, "keyword.delimiter"],

                // Text formatting
                [/\\(text|textbf|textit|textrm|textsf|texttt|mathrm|mathbf|mathit|mathsf|mathtt|mathcal|mathbb|mathfrak)\b/, "keyword.text"],

                // Accents
                [/\\(overline|underline|hat|bar|vec|dot|ddot|tilde|widehat|widetilde)\b/, "keyword.accent"],

                // Relations and operators
                [/\\(leq|geq|neq|approx|equiv|sim|simeq|cong|prec|succ|preceq|succeq|ll|gg|in|notin|subset|supset|subseteq|supseteq|cup|cap|setminus|emptyset|varnothing|pm|mp|times|div|cdot|ast|star|circ|bullet|oplus|ominus|otimes|oslash|odot|forall|exists|nexists)\b/, "operator"],

                // Arrows
                [/\\(leftarrow|rightarrow|leftrightarrow|Leftarrow|Rightarrow|Leftrightarrow|uparrow|downarrow|updownarrow|Uparrow|Downarrow|Updownarrow|mapsto|longmapsto|hookrightarrow|hookleftarrow|to)\b/, "operator.arrow"],

                // Dots
                [/\\(cdots|ldots|vdots|ddots)\b/, "constant"],

                // Any other command
                [/\\[a-zA-Z@]+/, "keyword"],

                // Escaped characters
                [/\\[\\{}$&#%_^~]/, "string.escape"],

                // Superscript and subscript
                [/[\^_]/, "operator.script"],

                // Braces
                [/[{}]/, "delimiter.brace"],
                [/[\[\]]/, "delimiter.bracket"],
                [/[()]/, "delimiter.parenthesis"],

                // Numbers
                [/-?\d+\.?\d*/, "number"],

                // Operators
                [/[=+\-*/<>]/, "operator"],

                // Whitespace
                [/\s+/, "white"],
            ],

            environment: [
                [/\{/, "delimiter.brace", "@environmentName"],
                [/./, "", "@pop"],
            ],

            environmentName: [
                [/(equation\*?|align\*?|aligned|gather\*?|gathered|multline\*?|split|cases|dcases|matrix|pmatrix|bmatrix|Bmatrix|vmatrix|Vmatrix|array|eqnarray\*?|subequations)/, "string.environment"],
                [/[a-zA-Z*]+/, "string.environment"],
                [/\}/, "delimiter.brace", "@pop"],
            ],
        },
    });

    latexLanguageRegistered = true;
};

/**
 * Lazy load Monaco Editor from CDN
 */
export const loadMonaco = async (cdn: string): Promise<any> => {
    if (monacoModule) {
        return monacoModule;
    }
    if (monacoLoading) {
        return monacoLoading;
    }

    const monacoPath = `${cdn}/dist/js/monaco`;

    monacoLoading = (async () => {
        // Load AMD loader from local Monaco files
        await addScript(`${monacoPath}/vs/loader.js`, "vditorMonacoLoaderScript");

        // Get AMD require from window (loaded by Monaco's loader.min.js)
        // Using window access to avoid webpack trying to bundle it
        const amdRequire = (window as any).require;

        // Configure AMD loader paths
        amdRequire.config({
            paths: {vs: `${monacoPath}/vs`},
        });

        // Load Monaco editor
        return new Promise<any>((resolve, reject) => {
            amdRequire(["vs/editor/editor.main"], () => {
                monacoModule = monaco;
                // Register custom languages
                registerMermaidLanguage(monacoModule);
                registerLaTeXLanguage(monacoModule);
                resolve(monacoModule);
            }, (error: any) => {
                monacoLoading = null;
                reject(error);
            });
        });
    })();

    return monacoLoading;
};

/**
 * Map vditor theme to Monaco theme
 */
const getMonacoTheme = (vditorTheme: string): string => {
    if (vditorTheme === "dark") {
        return "vs-dark";
    }
    return "vs";
};

/**
 * Monaco Instance Manager - manages Monaco editor instances for code blocks
 */
export class MonacoManager {
    private instances: Map<string, any> = new Map();
    private pasteCallbacks: Map<string, (text: string) => void> = new Map();
    private vditor: IVditor;

    constructor(vditor: IVditor) {
        this.vditor = vditor;
    }

    /**
     * Create Monaco editor instance for a code block
     */
    async create(
        container: HTMLElement,
        language: string,
        code: string,
        onChange?: (content: string) => void,
    ): Promise<any> {
        const cdn = this.vditor.options.cdn !== undefined ? this.vditor.options.cdn : Constants.CDN;
        const monacoOptions = this.vditor.options.preview?.monaco;

        // Skip on mobile
        if (window.innerWidth <= Constants.MOBILE_WIDTH) {
            return null;
        }

        // Load Monaco if not loaded
        const monacoLib = await loadMonaco(cdn);

        // Generate unique ID for container
        const editorId = container.getAttribute("data-monaco-id") || `monaco-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        container.setAttribute("data-monaco-id", editorId);

        // Destroy existing instance if any
        if (this.instances.has(editorId)) {
            this.instances.get(editorId).dispose();
            this.instances.delete(editorId);
        }

        // Set container dimensions
        container.style.width = "100%";
        container.style.minHeight = "50px";

        // Determine theme
        const theme = getMonacoTheme(this.vditor.options.theme || "classic");

        // Merge editor options
        const editorOptions = {
            value: code,
            language: this.mapLanguage(language),
            theme,
            ...monacoOptions?.editorOptions,
        };

        // Create editor
        const editor = monacoLib.editor.create(container, editorOptions);

        // Store instance
        this.instances.set(editorId, editor);

        // Override clipboard commands if custom handlers provided (for VS Code webview)
        this.setupClipboardOverrides(editor, editorId, monacoLib);

        // Setup change handler
        if (onChange) {
            editor.onDidChangeModelContent(() => {
                onChange(editor.getValue());
            });
        }

        // Update editor height based on content
        this.updateEditorHeight(editor, container);
        editor.onDidChangeModelContent(() => {
            this.updateEditorHeight(editor, container);
        });

        return editor;
    }

    /**
     * Update editor height based on content lines
     */
    private updateEditorHeight(editor: any, container: HTMLElement) {
        const lineHeight = editor.getOption(monaco.editor.EditorOption.lineHeight);
        const lineCount = editor.getModel()?.getLineCount() || 1;
        const minHeight = 50;
        const maxHeight = 600;
        const height = Math.min(Math.max(lineCount * lineHeight + 20, minHeight), maxHeight);
        container.style.height = `${height}px`;
        editor.layout();
    }

    /**
     * Setup clipboard command overrides for VS Code webview compatibility
     */
    private setupClipboardOverrides(editor: any, editorId: string, monacoLib: any) {
        const clipboard = this.vditor.options.clipboard;
        if (!clipboard) {
            return;
        }

        // Override Cmd/Ctrl+C (Copy)
        if (clipboard.onCopy) {
            editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyC, () => {
                const selection = editor.getSelection();
                if (selection && !selection.isEmpty()) {
                    const text = editor.getModel().getValueInRange(selection);
                    clipboard.onCopy(text);
                }
            });
        }

        // Override Cmd/Ctrl+X (Cut)
        if (clipboard.onCut) {
            editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyX, () => {
                const selection = editor.getSelection();
                if (selection && !selection.isEmpty()) {
                    const text = editor.getModel().getValueInRange(selection);
                    clipboard.onCut(text);
                    // Delete selection
                    editor.executeEdits("cut", [{
                        range: selection,
                        text: "",
                    }]);
                }
            });
        }

        // Override Cmd/Ctrl+V (Paste)
        if (clipboard.onPaste) {
            editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyV, () => {
                // Store callback for async paste operation
                this.pasteCallbacks.set(editorId, (text: string) => {
                    const selection = editor.getSelection();
                    editor.executeEdits("paste", [{
                        range: selection,
                        text,
                        forceMoveMarkers: true,
                    }]);
                });
                // Request paste from host - callback will be called with text
                clipboard.onPaste((text: string) => {
                    const callback = this.pasteCallbacks.get(editorId);
                    if (callback) {
                        callback(text);
                        this.pasteCallbacks.delete(editorId);
                    }
                });
            });
        }

        // Override Cmd/Ctrl+S (Save)
        if (clipboard.onSave) {
            editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyS, () => {
                clipboard.onSave();
            });
        }
    }

    /**
     * Map common language aliases to Monaco language IDs
     */
    private mapLanguage(lang: string): string {
        const langMap: Record<string, string> = {
            js: "javascript",
            ts: "typescript",
            py: "python",
            rb: "ruby",
            sh: "shell",
            bash: "shell",
            zsh: "shell",
            yml: "yaml",
            md: "markdown",
            "c++": "cpp",
            "c#": "csharp",
            golang: "go",
            // LaTeX
            tex: "latex",
            latex: "latex",
            math: "latex",
            // Special blocks - use plaintext
            mermaid: "mermaid",
            flowchart: "plaintext",
            mindmap: "plaintext",
            echarts: "json",
            plantuml: "plaintext",
            graphviz: "plaintext",
            abc: "plaintext",
            markmap: "markdown",
        };
        return langMap[lang?.toLowerCase()] || lang || "plaintext";
    }

    /**
     * Get editor instance by element ID
     */
    get(elementId: string): any {
        return this.instances.get(elementId);
    }

    /**
     * Get content from editor by element ID
     */
    getContent(elementId: string): string | null {
        const editor = this.instances.get(elementId);
        return editor ? editor.getValue() : null;
    }

    /**
     * Update content for an editor by element ID
     */
    setContent(elementId: string, content: string): void {
        const editor = this.instances.get(elementId);
        if (editor) {
            editor.setValue(content);
        }
    }

    /**
     * Destroy specific editor instance or all instances
     */
    destroy(elementId?: string): void {
        if (elementId) {
            const editor = this.instances.get(elementId);
            if (editor) {
                editor.dispose();
                this.instances.delete(elementId);
            }
        } else {
            // Destroy all
            this.instances.forEach((editor) => {
                editor.dispose();
            });
            this.instances.clear();
        }
    }

    /**
     * Update theme for all editors
     */
    updateTheme(vditorTheme: string): void {
        if (!monacoModule) {
            return;
        }
        const monacoTheme = getMonacoTheme(vditorTheme);
        monacoModule.editor.setTheme(monacoTheme);
    }

    /**
     * Check if Monaco is enabled
     */
    isEnabled(): boolean {
        return this.vditor.options.preview?.monaco?.enable !== false;
    }

    /**
     * Get currently focused Monaco editor instance
     */
    getFocusedEditor(): any {
        // Check all instances for focus
        const entries = Array.from(this.instances.entries());
        for (let i = 0; i < entries.length; i++) {
            const editor = entries[i][1];
            if (editor.hasTextFocus()) {
                return editor;
            }
        }
        return null;
    }

    /**
     * Paste text into the currently focused editor
     */
    pasteText(text: string): boolean {
        const editor = this.getFocusedEditor();
        if (!editor) {
            return false;
        }
        const selection = editor.getSelection();
        editor.executeEdits("paste", [{
            range: selection,
            text,
            forceMoveMarkers: true,
        }]);
        return true;
    }

    /**
     * Get selected text from the currently focused editor
     */
    getSelectedText(): string {
        const editor = this.getFocusedEditor();
        if (!editor) {
            return "";
        }
        const selection = editor.getSelection();
        if (!selection || selection.isEmpty()) {
            return "";
        }
        return editor.getModel().getValueInRange(selection);
    }
}

// Languages that need live preview (graphics/diagrams)
const GRAPHIC_LANGUAGES = ["mermaid", "flowchart", "mindmap", "echarts", "plantuml", "graphviz", "abc", "markmap", "math", "wavedrom"];

// Map code block languages to Monaco language IDs
const LANGUAGE_MAP: Record<string, string> = {
    wavedrom: "json",
    echarts: "json",
};

/**
 * Get Monaco language ID for a code block language
 */
const getMonacoLanguage = (language: string): string => {
    const lang = language?.toLowerCase() || "";
    return LANGUAGE_MAP[lang] || lang;
};

// Mermaid config options
const MERMAID_LAYOUTS = [
    {value: "", label: "Default"},
    {value: "dagre", label: "Dagre (classic)"},
    {value: "elk", label: "ELK"},
    {value: "elk.layered", label: "ELK Layered"},
    {value: "elk.stress", label: "ELK Stress"},
    {value: "elk.force", label: "ELK Force"},
    {value: "elk.mrtree", label: "ELK MrTree"},
    {value: "elk.sporeOverlap", label: "ELK Spore"},
    {value: "tidy-tree", label: "Tidy Tree"},
];

const MERMAID_THEMES = [
    {value: "", label: "Default"},
    {value: "default", label: "Mermaid Default"},
    {value: "forest", label: "Forest"},
    {value: "dark", label: "Dark"},
    {value: "neutral", label: "Neutral"},
    {value: "base", label: "Base"},
];

const MERMAID_LOOKS = [
    {value: "", label: "Default"},
    {value: "classic", label: "Classic"},
    {value: "handDrawn", label: "Hand Drawn"},
    {value: "neo", label: "Neo"},
];

/**
 * Parse mermaid frontmatter config
 */
const parseMermaidConfig = (code: string): {config: Record<string, string>, content: string, hasConfig: boolean} => {
    const frontmatterMatch = code.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!frontmatterMatch) {
        return {config: {}, content: code, hasConfig: false};
    }

    const config: Record<string, string> = {};
    const configSection = frontmatterMatch[1];

    // Parse config section - look for "config:" block
    const configMatch = configSection.match(/config:\s*\n((?:\s+\w+:.*\n?)*)/);
    if (configMatch) {
        const configLines = configMatch[1].split("\n");
        configLines.forEach((line) => {
            const match = line.match(/^\s+(\w+):\s*(.+?)\s*$/);
            if (match) {
                config[match[1]] = match[2].replace(/['"]/g, "");
            }
        });
    }

    return {
        config,
        content: code.slice(frontmatterMatch[0].length),
        hasConfig: true,
    };
};

/**
 * Generate mermaid frontmatter from config
 */
const generateMermaidFrontmatter = (config: Record<string, string>): string => {
    const entries = Object.entries(config).filter(([_, v]) => v);
    if (entries.length === 0) {
        return "";
    }

    let frontmatter = "---\nconfig:\n";
    entries.forEach(([key, value]) => {
        frontmatter += `  ${key}: ${value}\n`;
    });
    frontmatter += "---\n";
    return frontmatter;
};

/**
 * Update mermaid code with new config value
 */
const updateMermaidConfig = (code: string, key: string, value: string): string => {
    const {config, content} = parseMermaidConfig(code);
    if (value) {
        config[key] = value;
    } else {
        delete config[key];
    }
    return generateMermaidFrontmatter(config) + content;
};

/**
 * Create mermaid toolbar for Monaco editor
 */
const createMermaidToolbar = (
    editor: any,
    codeElement: HTMLElement,
    onUpdate: (content: string) => void,
): HTMLElement => {
    const toolbar = document.createElement("div");
    toolbar.className = "vditor-monaco-mermaid-toolbar";
    toolbar.setAttribute("contenteditable", "false");

    // Get current config
    const code = editor.getValue();
    const {config} = parseMermaidConfig(code);

    // Create dropdown button
    const createDropdown = (
        label: string,
        options: Array<{value: string, label: string}>,
        configKey: string,
        currentValue: string,
    ): HTMLElement => {
        const container = document.createElement("div");
        container.className = "vditor-monaco-mermaid-dropdown";

        const button = document.createElement("button");
        button.className = "vditor-monaco-mermaid-btn";
        const selectedOption = options.find((o) => o.value === currentValue);
        button.textContent = `${label}: ${selectedOption?.label || options[0].label}`;
        button.type = "button";

        const menu = document.createElement("div");
        menu.className = "vditor-monaco-mermaid-menu";
        menu.style.display = "none";

        options.forEach((option) => {
            const item = document.createElement("div");
            item.className = "vditor-monaco-mermaid-menu-item";
            if (option.value === currentValue) {
                item.classList.add("vditor-monaco-mermaid-menu-item--active");
            }
            item.textContent = option.label;
            item.addEventListener("click", (e) => {
                e.stopPropagation();
                const currentCode = editor.getValue();
                const newCode = updateMermaidConfig(currentCode, configKey, option.value);
                editor.setValue(newCode);
                codeElement.textContent = newCode;
                onUpdate(newCode);

                // Update button text
                button.textContent = `${label}: ${option.label}`;

                // Update active state
                menu.querySelectorAll(".vditor-monaco-mermaid-menu-item").forEach((el) => {
                    el.classList.remove("vditor-monaco-mermaid-menu-item--active");
                });
                item.classList.add("vditor-monaco-mermaid-menu-item--active");

                // Close menu
                menu.style.display = "none";
            });
            menu.appendChild(item);
        });

        button.addEventListener("click", (e) => {
            e.stopPropagation();
            // Close other menus
            toolbar.querySelectorAll(".vditor-monaco-mermaid-menu").forEach((m) => {
                if (m !== menu) {
                    (m as HTMLElement).style.display = "none";
                }
            });
            menu.style.display = menu.style.display === "none" ? "block" : "none";
        });

        container.appendChild(button);
        container.appendChild(menu);
        return container;
    };

    // Add dropdowns
    toolbar.appendChild(createDropdown("Layout", MERMAID_LAYOUTS, "layout", config.layout || ""));
    toolbar.appendChild(createDropdown("Theme", MERMAID_THEMES, "theme", config.theme || ""));
    toolbar.appendChild(createDropdown("Look", MERMAID_LOOKS, "look", config.look || ""));

    // Close menus when clicking outside
    document.addEventListener("click", () => {
        toolbar.querySelectorAll(".vditor-monaco-mermaid-menu").forEach((m) => {
            (m as HTMLElement).style.display = "none";
        });
    });

    return toolbar;
};

/**
 * Create layout toggle button for graphic languages
 */
const createLayoutToggle = (
    codeBlockElement: HTMLElement,
    monacoWrapper: HTMLElement,
    previewElement: HTMLElement,
    defaultColumnLayout: boolean = true,
): HTMLElement => {
    const button = document.createElement("button");
    button.className = "vditor-monaco-layout-btn";
    button.type = "button";
    button.setAttribute("contenteditable", "false");

    let isColumnLayout = false; // Will be toggled to true if defaultColumnLayout
    let resizer: HTMLElement | null = null;

    const createResizer = () => {
        if (resizer) return resizer;

        resizer = document.createElement("div");
        resizer.className = "vditor-monaco-resizer";
        resizer.setAttribute("contenteditable", "false");

        let startX = 0;
        let startWidth = 0;

        const onMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - startX;
            const containerWidth = codeBlockElement.offsetWidth;
            const newWidth = Math.max(200, Math.min(containerWidth - 200, startWidth + diff));
            const percentage = (newWidth / containerWidth) * 100;
            monacoWrapper.style.width = `${percentage}%`;
            previewElement.style.width = `${100 - percentage}%`;
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            codeBlockElement.classList.remove("vditor-code-block--resizing");
        };

        resizer.addEventListener("mousedown", (e: MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            startX = e.clientX;
            startWidth = monacoWrapper.offsetWidth;
            codeBlockElement.classList.add("vditor-code-block--resizing");
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
        });

        return resizer;
    };

    const setColumnLayout = () => {
        isColumnLayout = true;
        codeBlockElement.classList.add("vditor-code-block--column");
        button.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M4 4h16v6H4V4zm0 8h16v8H4v-8z"/></svg>';
        button.title = "Switch to Row Layout";

        const resizerEl = createResizer();
        monacoWrapper.style.width = "50%";
        previewElement.style.width = "50%";
        previewElement.style.display = "";
        monacoWrapper.parentElement?.insertBefore(resizerEl, previewElement);
    };

    const setRowLayout = () => {
        isColumnLayout = false;
        codeBlockElement.classList.remove("vditor-code-block--column");
        button.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M10 4H4v16h6V4zm2 0v16h8V4h-8z"/></svg>';
        button.title = "Switch to Column Layout";

        if (resizer && resizer.parentElement) {
            resizer.remove();
        }
        monacoWrapper.style.width = "";
        previewElement.style.width = "";
    };

    const toggleLayout = () => {
        if (isColumnLayout) {
            setRowLayout();
        } else {
            setColumnLayout();
        }
    };

    button.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleLayout();
    });

    // Set default layout
    if (defaultColumnLayout) {
        setColumnLayout();
    } else {
        setRowLayout();
    }

    return button;
};

/**
 * Check if language needs graphic preview
 */
const isGraphicLanguage = (lang: string): boolean => {
    return GRAPHIC_LANGUAGES.includes(lang?.toLowerCase() || "");
};

// Debounce helper for live preview
const debounce = (fn: Function, delay: number) => {
    let timeoutId: number;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = window.setTimeout(() => fn(...args), delay);
    };
};

/**
 * Initialize Monaco editor for a code block element
 */
export const initMonacoForCodeBlock = async (
    codeBlockElement: HTMLElement,
    vditor: IVditor,
    onChange?: (content: string) => void,
): Promise<any> => {
    if (!vditor.monaco || !vditor.monaco.isEnabled()) {
        return null;
    }

    // Get code element
    const codeElement = codeBlockElement.querySelector("pre > code") as HTMLElement;
    if (!codeElement) {
        return null;
    }

    // Check if Monaco is already initialized for this element
    const existingId = codeElement.getAttribute("data-monaco-id");
    if (existingId && vditor.monaco.get(existingId)) {
        return vditor.monaco.get(existingId);
    }

    // Get language from class
    const langClass = codeElement.className.match(/language-(\w+)/);
    const language = langClass ? langClass[1] : "";

    // Get code content
    const code = codeElement.textContent || "";

    // Hide preview for non-graphic languages (only show Monaco editor)
    const previewElement = codeBlockElement.querySelector(".vditor-ir__preview, .vditor-wysiwyg__preview") as HTMLElement;
    if (previewElement && !isGraphicLanguage(language)) {
        previewElement.style.display = "none";
    }

    // Create Monaco wrapper container
    let monacoWrapper = codeBlockElement.querySelector(".vditor-monaco-wrapper") as HTMLElement;
    if (!monacoWrapper) {
        monacoWrapper = document.createElement("div");
        monacoWrapper.className = "vditor-monaco-wrapper";
        // Set contenteditable to false to prevent vditor from interfering
        monacoWrapper.setAttribute("contenteditable", "false");
        // Stop events from bubbling to vditor
        monacoWrapper.addEventListener("input", (e) => e.stopPropagation());
        monacoWrapper.addEventListener("keydown", (e) => e.stopPropagation());
        monacoWrapper.addEventListener("keyup", (e) => e.stopPropagation());
        monacoWrapper.addEventListener("keypress", (e) => e.stopPropagation());
        // Insert after the code element's parent (pre)
        const preElement = codeElement.parentElement;
        if (preElement) {
            preElement.style.display = "none";
            preElement.parentElement?.insertBefore(monacoWrapper, preElement.nextSibling);
        }
    }

    // Check if graphic language for live preview
    const isGraphic = isGraphicLanguage(language);

    // Debounced preview update for graphic languages
    const debouncedPreviewUpdate = isGraphic && previewElement ? debounce((content: string) => {
        // Update code element first
        codeElement.textContent = content;
        // Copy to preview and re-render
        const preElement = codeElement.parentElement;
        if (preElement) {
            previewElement.innerHTML = preElement.innerHTML;
            processCodeRender(previewElement, vditor);
        }
    }, 300) : null;

    // Create Monaco editor (map language to Monaco language ID)
    const monacoLanguage = getMonacoLanguage(language);
    const editor = await vditor.monaco.create(monacoWrapper, monacoLanguage, code, (content: string) => {
        // Sync content back to code element
        codeElement.textContent = content;
        if (onChange) {
            onChange(content);
        }
        // Live preview update for graphic languages
        if (debouncedPreviewUpdate) {
            debouncedPreviewUpdate(content);
        }
    });

    // Add toolbar for graphic languages
    if (editor && isGraphic && previewElement) {
        let toolbar: HTMLElement;

        if (language.toLowerCase() === "mermaid") {
            // Mermaid gets its config toolbar
            toolbar = createMermaidToolbar(editor, codeElement, (content: string) => {
                if (onChange) {
                    onChange(content);
                }
                if (debouncedPreviewUpdate) {
                    debouncedPreviewUpdate(content);
                }
            });
        } else {
            // Other graphic languages get a simple toolbar
            toolbar = document.createElement("div");
            toolbar.className = "vditor-monaco-mermaid-toolbar";
            toolbar.setAttribute("contenteditable", "false");
        }

        // Add layout toggle button to toolbar
        const layoutToggle = createLayoutToggle(codeBlockElement, monacoWrapper, previewElement);
        toolbar.appendChild(layoutToggle);

        monacoWrapper.insertBefore(toolbar, monacoWrapper.firstChild);
    }

    // Add blur handler to destroy Monaco and show preview when focus is lost
    if (editor) {
        editor.onDidBlurEditorText(() => {
            // Small delay to allow for refocus (e.g., clicking Monaco scrollbar)
            setTimeout(() => {
                // Check if focus is still outside Monaco
                const activeEl = document.activeElement;
                if (!activeEl || !monacoWrapper.contains(activeEl)) {
                    destroyMonacoForCodeBlock(codeBlockElement, vditor);
                }
            }, 100);
        });
    }

    return editor;
};

/**
 * Sync Monaco content back to code element and destroy editor
 */
export const destroyMonacoForCodeBlock = (
    codeBlockElement: HTMLElement,
    vditor: IVditor,
): void => {
    if (!vditor.monaco) {
        return;
    }

    const monacoWrapper = codeBlockElement.querySelector(".vditor-monaco-wrapper") as HTMLElement;
    if (!monacoWrapper) {
        return;
    }

    // Remove expand class to remove selected background
    codeBlockElement.classList.remove("vditor-ir__node--expand");
    codeBlockElement.classList.remove("vditor-wysiwyg__node--expand");

    const monacoId = monacoWrapper.getAttribute("data-monaco-id");
    if (monacoId) {
        // Get content before destroying
        const content = vditor.monaco.getContent(monacoId);

        // Update code element
        const codeElement = codeBlockElement.querySelector("pre > code") as HTMLElement;
        if (codeElement && content !== null) {
            codeElement.textContent = content;
        }

        const preElement = codeBlockElement.querySelector("pre") as HTMLElement;

        // Show and re-render preview
        const previewElement = codeBlockElement.querySelector(".vditor-ir__preview, .vditor-wysiwyg__preview") as HTMLElement;
        if (previewElement) {
            previewElement.style.display = "";
            // Copy content to preview and re-render
            if (codeElement && preElement) {
                previewElement.innerHTML = preElement.innerHTML;
                processCodeRender(previewElement, vditor);
            }
            // Keep pre element hidden when preview is shown (WYSIWYG/IR collapsed state)
            if (preElement) {
                preElement.style.display = "none";
            }
        } else {
            // No preview element - show pre element (fallback)
            if (preElement) {
                preElement.style.display = "";
            }
        }

        // Destroy Monaco instance
        vditor.monaco.destroy(monacoId);
    }

    // Remove resizer if exists
    const resizer = codeBlockElement.querySelector(".vditor-monaco-resizer");
    if (resizer) {
        resizer.remove();
    }

    // Remove toolbar if exists
    const toolbar = codeBlockElement.querySelector(".vditor-monaco-mermaid-toolbar");
    if (toolbar) {
        toolbar.remove();
    }

    // Remove column layout class
    codeBlockElement.classList.remove("vditor-code-block--column");

    // Remove wrapper
    monacoWrapper.remove();
};
