import {Constants} from "../constants";

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
