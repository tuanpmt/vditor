import {Constants} from "../constants";
import {typogramRenderAdapter} from "./adapterRender";

// Store the typograms render function once captured
let typogramsRenderFn: ((text: string, zoom?: number) => SVGElement) | null = null;
let typogramsLoading: Promise<void> | null = null;

/**
 * Load typograms.js and capture its render function
 * Typograms doesn't expose a public API, so we need to patch the script
 * to capture the render function before it runs
 */
const loadTypograms = (): Promise<void> => {
    if (typogramsRenderFn) {
        return Promise.resolve();
    }
    if (typogramsLoading) {
        return typogramsLoading;
    }

    typogramsLoading = new Promise<void>((resolve, reject) => {
        const scriptUrl = "https://google.github.io/typograms/typograms.js";

        // Fetch the script and modify it to expose the render function
        fetch(scriptUrl)
            .then(response => response.text())
            .then(scriptText => {
                // The typograms script has a render function that creates SVG from text
                // We need to expose it before it runs the DOMContentLoaded handler

                // Wrap the script to intercept and expose the render function
                // The script structure is: (function(){...render function t()...DOMContentLoaded handler...})()
                // We'll modify it to expose the render function to window

                // Create a modified version that exposes the render function
                const modifiedScript = scriptText.replace(
                    // Look for the pattern where render function is defined
                    // The function is typically named 't' and does the actual rendering
                    /document\.addEventListener\s*\(\s*["']DOMContentLoaded["']/,
                    'window.__typogramsRender = t; document.addEventListener("DOMContentLoaded"'
                );

                // Execute the modified script
                const scriptFn = new Function(modifiedScript);
                try {
                    scriptFn();
                } catch (e) {
                    console.warn("Typograms script execution error:", e);
                }

                // Get the exposed render function
                typogramsRenderFn = (window as any).__typogramsRender;

                if (!typogramsRenderFn) {
                    // Fallback: try to use any existing processing
                    console.warn("Could not capture typograms render function, using fallback");
                }

                resolve();
            })
            .catch((e) => {
                console.error("Failed to load typograms:", e);
                reject(e);
            });
    });

    return typogramsLoading;
};

/**
 * Render typogram diagrams using Google Typograms library
 * @see https://google.github.io/typograms/#installation
 */
export const typogramRender = (element: (HTMLElement | Document) = document, cdn = Constants.CDN) => {
    const typogramElements = typogramRenderAdapter.getElements(element);
    if (typogramElements.length === 0) {
        return;
    }

    loadTypograms().then(() => {
        typogramElements.forEach((item: HTMLElement) => {
            // Skip elements in IR/WYSIWYG marker areas (source code blocks)
            if (item.parentElement.classList.contains("vditor-wysiwyg__pre") ||
                item.parentElement.classList.contains("vditor-ir__marker--pre")) {
                return;
            }
            if (item.getAttribute("data-processed") === "true") {
                return;
            }

            const code = typogramRenderAdapter.getCode(item).trim();
            if (!code) {
                return;
            }

            // Save original source for re-rendering
            item.setAttribute("data-typogram-source", code);

            try {
                if (typogramsRenderFn) {
                    // Use the captured render function directly
                    const svg = typogramsRenderFn(code);
                    item.innerHTML = "";
                    item.appendChild(svg);
                } else {
                    // Fallback: Create script element and let browser handle it
                    // This approach works when typograms.js is included in page
                    const scriptEl = document.createElement("script");
                    scriptEl.type = "text/typogram";
                    scriptEl.textContent = code;
                    item.innerHTML = "";
                    item.appendChild(scriptEl);

                    // Try to manually trigger typograms processing
                    // by re-running the init logic
                    processTypogramScript(item, scriptEl);
                }
            } catch (e) {
                console.error("Typogram render error:", e);
                item.innerHTML = `<pre style="color: red;">Typogram error: ${e.message}</pre>`;
            }

            item.style.overflowX = "auto";
            item.setAttribute("data-processed", "true");
        });
    });
};

/**
 * Fallback: manually process a typogram script element
 * This mimics what typograms.js does on DOMContentLoaded
 */
const processTypogramScript = (container: HTMLElement, scriptEl: HTMLScriptElement) => {
    // If we have the render function, use it
    if (typogramsRenderFn) {
        const text = scriptEl.textContent || "";
        try {
            const svg = typogramsRenderFn(text);
            container.innerHTML = "";
            container.appendChild(svg);
        } catch (e) {
            console.warn("Typogram processing failed:", e);
        }
    }
};
