import {Constants} from "../constants";
import {addScript} from "../util/addScript";
import {wavedromRenderAdapter} from "./adapterRender";

declare const WaveDrom: {
    ProcessAll(): void;
    RenderWaveForm(index: number, source: object, outputPrefix: string, notFirstSignal?: boolean): void;
};

let wavedromIndex = 0;

export const wavedromRender = (element: (HTMLElement | Document) = document, cdn = Constants.CDN, theme = "light") => {
    const wavedromElements = wavedromRenderAdapter.getElements(element);
    if (wavedromElements.length === 0) {
        return;
    }
    // Load skin first, then wavedrom
    addScript(`${cdn}/dist/js/wavedrom/default.js`, "vditorWavedromSkinScript").then(() => {
        addScript(`${cdn}/dist/js/wavedrom/wavedrom.min.js`, "vditorWavedromScript").then(() => {
            wavedromElements.forEach((item: HTMLElement) => {
                if (item.parentElement.classList.contains("vditor-wysiwyg__pre") ||
                    item.parentElement.classList.contains("vditor-ir__marker--pre")) {
                    return;
                }
                // Check if already processed with the same theme
                const processedTheme = item.getAttribute("data-theme");
                if (item.getAttribute("data-processed") === "true" && processedTheme === theme) {
                    return;
                }
                // Get source code - either from saved attribute or from current content
                let code = item.getAttribute("data-wavedrom-source");
                if (!code) {
                    code = wavedromRenderAdapter.getCode(item).trim();
                    if (code === "") {
                        return;
                    }
                    // Save original source for re-rendering
                    item.setAttribute("data-wavedrom-source", code);
                }
                try {
                    const source = JSON.parse(code);
                    const idx = wavedromIndex++;
                    const containerPrefix = "vditor_wavedrom_";
                    // WaveDrom expects element with id = prefix + index
                    item.innerHTML = `<div id="${containerPrefix}${idx}"></div>`;
                    // Always pass false for notFirstSignal to include skin definitions in each render
                    // This ensures waveforms render correctly even when re-rendering
                    WaveDrom.RenderWaveForm(idx, source, containerPrefix, false);
                    // Set transparent background
                    const container = document.getElementById(`${containerPrefix}${idx}`);
                    if (container) {
                        container.style.backgroundColor = "transparent";
                        const svg = container.querySelector("svg");
                        if (svg) {
                            svg.style.backgroundColor = "transparent";
                            // WaveDrom adds a background rect with style="stroke:none;fill:white"
                            // Find and make it transparent instead of removing
                            const bgRect = svg.querySelector('rect[style*="fill:white"]') ||
                                           svg.querySelector('rect[style*="fill: white"]');
                            if (bgRect) {
                                bgRect.setAttribute("style", "stroke:none;fill:transparent");
                            }
                        }
                    }
                    item.style.overflowX = "auto";
                    // Remove code block background styling from item and parent pre
                    item.style.background = "none";
                    item.style.backgroundImage = "none";
                    item.style.padding = "0";
                    item.style.borderRadius = "0";
                    if (item.parentElement && item.parentElement.tagName === "PRE") {
                        item.parentElement.style.background = "none";
                        item.parentElement.style.backgroundImage = "none";
                        item.parentElement.style.padding = "0";
                        item.parentElement.style.margin = "0";
                    }
                    // Apply dark mode styling
                    if (container) {
                        if (theme === "dark") {
                            container.classList.add("vditor-wavedrom--dark");
                        } else {
                            container.classList.remove("vditor-wavedrom--dark");
                        }
                    }
                    item.setAttribute("data-processed", "true");
                    item.setAttribute("data-theme", theme);
                } catch (e) {
                    item.innerHTML = `<div style="color: red; text-align: left;"><small>WaveDrom Error: ${e.message}</small></div>`;
                    item.setAttribute("data-processed", "true");
                }
            });
        });
    });
};
