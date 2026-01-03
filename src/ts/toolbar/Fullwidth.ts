import {setPadding} from "../ui/initUI";
import {getEventName} from "../util/compatibility";
import {MenuItem} from "./MenuItem";

export class Fullwidth extends MenuItem {
    constructor(vditor: IVditor, menuItem: IMenuItem) {
        super(vditor, menuItem);
        this._bindEvent(vditor, menuItem);
    }

    public _bindEvent(vditor: IVditor, menuItem: IMenuItem) {
        this.element.children[0].addEventListener(getEventName(), function (event) {
            event.preventDefault();
            if (vditor.element.classList.contains("vditor--fullwidth")) {
                // Exit fullwidth mode
                if (!menuItem.level) {
                    this.innerHTML = menuItem.icon;
                }
                vditor.element.classList.remove("vditor--fullwidth");
            } else {
                // Enter fullwidth mode
                if (!menuItem.level) {
                    this.innerHTML = '<svg><use xlink:href="#vditor-icon-fullwidth-exit"></use></svg>';
                }
                vditor.element.classList.add("vditor--fullwidth");
            }

            // Update padding
            setPadding(vditor);

            if (menuItem.click) {
                menuItem.click(event, vditor);
            }
        });
    }
}
