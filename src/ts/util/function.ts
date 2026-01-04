export const genUUID = () => ([1e7].toString() + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
    (parseInt(c, 10) ^ (window.crypto.getRandomValues(new Uint32Array(1))[0] & (15 >> (parseInt(c, 10) / 4)))).toString(16)
);

export const getSearch = (key: string, link = window.location.search) => {
    const params = link.substring(link.indexOf("?"));
    const hashIndex = params.indexOf("#");
    // REF https://developer.mozilla.org/zh-CN/docs/Web/API/URLSearchParams
    const urlSearchParams = new URLSearchParams(params.substring(0, hashIndex >= 0 ? hashIndex : undefined));
    return urlSearchParams.get(key);
};

export const looseJsonParse = (text: string) => {
    return Function(`"use strict";return (${text})`)();
};

/**
 * Transform image paths in HTML for rendering.
 * Only transforms relative paths, leaves absolute URLs unchanged.
 * Used for environments like VS Code webview where local images need special URIs.
 */
export const transformImagePaths = (html: string, vditor: IVditor): string => {
    if (!vditor.options.imagePathTransformer) {
        return html;
    }

    const transformer = vditor.options.imagePathTransformer;

    // Transform image src attributes using regex
    return html.replace(
        /<img([^>]*)src="([^"]+)"([^>]*)>/gi,
        (match, before, src, after) => {
            // Skip absolute URLs and data URIs
            if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) {
                return match;
            }
            const newSrc = transformer(src);
            return `<img${before}src="${newSrc}"${after}>`;
        }
    );
};
