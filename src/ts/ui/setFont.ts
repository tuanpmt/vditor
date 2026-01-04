import {Constants} from "../constants";

/**
 * Load fonts from URL (external Google Fonts or custom URL)
 */
export const loadFonts = (fontUrl: string): Promise<void> => {
    return new Promise((resolve) => {
        const existingLink = document.getElementById("vditorFontStylesheet") as HTMLLinkElement;
        if (existingLink) {
            if (existingLink.href === fontUrl) {
                resolve();
                return;
            }
            existingLink.remove();
        }

        if (!fontUrl) {
            resolve();
            return;
        }

        const link = document.createElement("link");
        link.id = "vditorFontStylesheet";
        link.rel = "stylesheet";
        link.href = fontUrl;
        link.onload = () => resolve();
        link.onerror = () => {
            console.warn("Failed to load font stylesheet:", fontUrl);
            resolve();
        };
        document.head.appendChild(link);
    });
};

/**
 * Load bundled fonts (Noto Sans + Fira Code)
 */
export const loadBundledFonts = (cdn: string): Promise<void> => {
    return new Promise((resolve) => {
        const existingLink = document.getElementById("vditorBundledFonts") as HTMLLinkElement;
        if (existingLink) {
            resolve();
            return;
        }

        const fontCssUrl = cdn ? `${cdn}/dist/css/fonts.css` : "/dist/css/fonts.css";

        const link = document.createElement("link");
        link.id = "vditorBundledFonts";
        link.rel = "stylesheet";
        link.href = fontCssUrl;
        link.onload = () => resolve();
        link.onerror = () => {
            console.warn("Failed to load bundled fonts:", fontCssUrl);
            resolve();
        };
        document.head.appendChild(link);
    });
};

export const setFont = (element: HTMLElement, fontConfig?: IFontConfig) => {
    const config = fontConfig || Constants.FONT_OPTIONS;

    // Build font-family strings with fallbacks
    const contentFontFallback = '"Helvetica Neue", "Luxi Sans", "DejaVu Sans", "Hiragino Sans GB", "Microsoft Yahei", sans-serif';
    const codeFontFallback = 'mononoki, Consolas, "Liberation Mono", Menlo, Courier, monospace';

    const contentFont = config.content
        ? `"${config.content}", ${contentFontFallback}`
        : contentFontFallback;

    const codeFont = config.code
        ? `"${config.code}", ${codeFontFallback}`
        : codeFontFallback;

    element.style.setProperty("--font-family-content", contentFont);
    element.style.setProperty("--font-family-code", codeFont);
};
