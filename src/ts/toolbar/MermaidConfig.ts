import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";
import {toggleSubMenu} from "./setToolbar";
import {mermaidRender, setGlobalMermaidConfig} from "../markdown/mermaidRender";

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

export class MermaidConfig extends MenuItem {
    public element: HTMLElement;

    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);

        const actionBtn = this.element.children[0] as HTMLElement;

        const panelElement = document.createElement("div");
        panelElement.className = `vditor-hint vditor-panel--arrow vditor-panel--mermaid`;

        // Create panel content with 3 sections
        panelElement.innerHTML = `
            <div class="vditor-mermaid-config">
                <div class="vditor-mermaid-config__section">
                    <div class="vditor-mermaid-config__label">Layout</div>
                    <div class="vditor-mermaid-config__options" data-type="layout">
                        ${MERMAID_LAYOUTS.map((opt) =>
                            `<button data-value="${opt.value}" class="${!opt.value ? 'vditor-mermaid-config__btn--active' : ''}">${opt.label}</button>`
                        ).join("")}
                    </div>
                </div>
                <div class="vditor-mermaid-config__section">
                    <div class="vditor-mermaid-config__label">Theme</div>
                    <div class="vditor-mermaid-config__options" data-type="theme">
                        ${MERMAID_THEMES.map((opt) =>
                            `<button data-value="${opt.value}" class="${!opt.value ? 'vditor-mermaid-config__btn--active' : ''}">${opt.label}</button>`
                        ).join("")}
                    </div>
                </div>
                <div class="vditor-mermaid-config__section">
                    <div class="vditor-mermaid-config__label">Look</div>
                    <div class="vditor-mermaid-config__options" data-type="look">
                        ${MERMAID_LOOKS.map((opt) =>
                            `<button data-value="${opt.value}" class="${!opt.value ? 'vditor-mermaid-config__btn--active' : ''}">${opt.label}</button>`
                        ).join("")}
                    </div>
                </div>
            </div>
        `;

        panelElement.addEventListener(getEventName(), (event: MouseEvent & { target: HTMLElement }) => {
            if (event.target.tagName === "BUTTON") {
                const optionsContainer = event.target.parentElement;
                const configType = optionsContainer.getAttribute("data-type") as "layout" | "theme" | "look";
                const value = event.target.getAttribute("data-value");

                // Update active state
                optionsContainer.querySelectorAll("button").forEach((btn) => {
                    btn.classList.remove("vditor-mermaid-config__btn--active");
                });
                event.target.classList.add("vditor-mermaid-config__btn--active");

                // Initialize mermaid config if not exists
                if (!vditor.options.preview.mermaid) {
                    vditor.options.preview.mermaid = {};
                }

                // Update config
                if (value) {
                    vditor.options.preview.mermaid[configType] = value;
                } else {
                    delete vditor.options.preview.mermaid[configType];
                }

                // Re-render all mermaid diagrams
                this.rerenderMermaid(vditor);

                event.preventDefault();
                event.stopPropagation();
            }
        });

        this.element.appendChild(panelElement);

        toggleSubMenu(vditor, panelElement, actionBtn, menuItem.level);

        // Initialize button states from current config
        this.initButtonStates(vditor, panelElement);
    }

    private initButtonStates(vditor: IVditor, panelElement: HTMLElement) {
        const mermaidConfig = vditor.options.preview?.mermaid || {};

        ["layout", "theme", "look"].forEach((configType) => {
            const optionsContainer = panelElement.querySelector(`[data-type="${configType}"]`);
            if (optionsContainer) {
                const value = mermaidConfig[configType as keyof typeof mermaidConfig] || "";
                optionsContainer.querySelectorAll("button").forEach((btn) => {
                    btn.classList.remove("vditor-mermaid-config__btn--active");
                    if (btn.getAttribute("data-value") === value) {
                        btn.classList.add("vditor-mermaid-config__btn--active");
                    }
                });
            }
        });
    }

    private rerenderMermaid(vditor: IVditor) {
        // Update global config
        const mermaidConfig = vditor.options.preview?.mermaid || {};
        setGlobalMermaidConfig(mermaidConfig);

        // Clear processed state to force re-render
        const clearProcessed = (element: HTMLElement | Document) => {
            element.querySelectorAll("[data-processed='true']").forEach((el) => {
                el.removeAttribute("data-processed");
                el.removeAttribute("data-theme");
            });
        };

        // Re-render in preview
        if (vditor.preview?.previewElement) {
            clearProcessed(vditor.preview.previewElement);
            mermaidRender(vditor.preview.previewElement, vditor.options.cdn, vditor.options.theme, mermaidConfig);
        }

        // Re-render in IR mode
        if (vditor.ir?.element) {
            clearProcessed(vditor.ir.element);
            mermaidRender(vditor.ir.element, vditor.options.cdn, vditor.options.theme, mermaidConfig);
        }

        // Re-render in WYSIWYG mode
        if (vditor.wysiwyg?.element) {
            clearProcessed(vditor.wysiwyg.element);
            mermaidRender(vditor.wysiwyg.element, vditor.options.cdn, vditor.options.theme, mermaidConfig);
        }
    }
}
