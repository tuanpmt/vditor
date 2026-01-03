import {getMarkdown} from "../markdown/getMarkdown";
import {updateHotkeyTip} from "./compatibility";
import {
    deleteColumn,
    deleteRow,
    execAfterRender,
    insertColumn,
    insertRow,
    insertRowAbove,
    setTableAlign,
} from "./fixBrowserBehavior";
import {hasClosestByMatchTag} from "./hasClosest";
import {setSelectionFocus} from "./selection";

export interface ITablePopoverOptions {
    popoverElement: HTMLDivElement;
    editorElement: HTMLElement;
    afterRenderCallback?: () => void;
}

export const setTablePopoverPosition = (
    popoverElement: HTMLDivElement,
    editorElement: HTMLElement,
    tableElement: HTMLElement
) => {
    popoverElement.style.left = "0";
    popoverElement.style.display = "block";
    popoverElement.style.top =
        Math.max(-8, tableElement.offsetTop - 21 - editorElement.scrollTop) + "px";
    popoverElement.style.left =
        Math.min(tableElement.offsetLeft, editorElement.clientWidth - popoverElement.clientWidth) + "px";
    popoverElement.setAttribute("data-top", (tableElement.offsetTop - 21).toString());
};

export const genTablePopover = (
    vditor: IVditor,
    tableElement: HTMLTableElement,
    range: Range,
    options: ITablePopoverOptions
) => {
    const {popoverElement, editorElement, afterRenderCallback} = options;

    popoverElement.innerHTML = "";

    const updateTable = () => {
        const oldRow = tableElement.rows.length;
        const oldColumn = tableElement.rows[0].cells.length;
        const row = parseInt(input.value, 10) || oldRow;
        const column = parseInt(input2.value, 10) || oldColumn;

        if (row === oldRow && oldColumn === column) {
            return;
        }

        if (oldColumn !== column) {
            const columnDiff = column - oldColumn;
            for (let i = 0; i < tableElement.rows.length; i++) {
                if (columnDiff > 0) {
                    for (let j = 0; j < columnDiff; j++) {
                        if (i === 0) {
                            tableElement.rows[i].lastElementChild.insertAdjacentHTML("afterend", "<th> </th>");
                        } else {
                            tableElement.rows[i].lastElementChild.insertAdjacentHTML("afterend", "<td> </td>");
                        }
                    }
                } else {
                    for (let k = oldColumn - 1; k >= column; k--) {
                        tableElement.rows[i].cells[k].remove();
                    }
                }
            }
        }

        if (oldRow !== row) {
            const rowDiff = row - oldRow;
            if (rowDiff > 0) {
                let rowHTML = "<tr>";
                for (let m = 0; m < column; m++) {
                    rowHTML += "<td> </td>";
                }
                for (let l = 0; l < rowDiff; l++) {
                    if (tableElement.querySelector("tbody")) {
                        tableElement
                            .querySelector("tbody")
                            .insertAdjacentHTML("beforeend", rowHTML);
                    } else {
                        tableElement
                            .querySelector("thead")
                            .insertAdjacentHTML("afterend", rowHTML + "</tr>");
                    }
                }
            } else {
                for (let m = oldRow - 1; m >= row; m--) {
                    tableElement.rows[m].remove();
                    if (tableElement.rows.length === 1) {
                        tableElement.querySelector("tbody")?.remove();
                    }
                }
            }
        }
        if (typeof vditor.options.input === "function") {
            vditor.options.input(getMarkdown(vditor));
        }
    };

    // Get current cell to determine alignment
    const typeElement = range.startContainer.nodeType === 3
        ? range.startContainer.parentElement
        : range.startContainer as HTMLElement;
    const td = hasClosestByMatchTag(typeElement, "TD");
    const th = hasClosestByMatchTag(typeElement, "TH");
    let alignType = "left";
    if (td) {
        alignType = td.getAttribute("align") || "left";
    } else if (th) {
        alignType = th.getAttribute("align") || "center";
    }

    const setAlign = (type: string) => {
        setTableAlign(tableElement, type);
        if (type === "right") {
            left.classList.remove("vditor-icon--current");
            center.classList.remove("vditor-icon--current");
            right.classList.add("vditor-icon--current");
        } else if (type === "center") {
            left.classList.remove("vditor-icon--current");
            right.classList.remove("vditor-icon--current");
            center.classList.add("vditor-icon--current");
        } else {
            center.classList.remove("vditor-icon--current");
            right.classList.remove("vditor-icon--current");
            left.classList.add("vditor-icon--current");
        }
        setSelectionFocus(range);
        execAfterRender(vditor);
        if (afterRenderCallback) {
            afterRenderCallback();
        }
    };

    // Alignment buttons
    const left = document.createElement("button");
    left.setAttribute("type", "button");
    left.setAttribute("aria-label", window.VditorI18n.alignLeft + "<" + updateHotkeyTip("⇧⌘L") + ">");
    left.setAttribute("data-type", "left");
    left.innerHTML = '<svg><use xlink:href="#vditor-icon-align-left"></use></svg>';
    left.className =
        "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
        (alignType === "left" ? " vditor-icon--current" : "");
    left.onclick = () => {
        setAlign("left");
    };

    const center = document.createElement("button");
    center.setAttribute("type", "button");
    center.setAttribute("aria-label", window.VditorI18n.alignCenter + "<" + updateHotkeyTip("⇧⌘C") + ">");
    center.setAttribute("data-type", "center");
    center.innerHTML = '<svg><use xlink:href="#vditor-icon-align-center"></use></svg>';
    center.className =
        "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
        (alignType === "center" ? " vditor-icon--current" : "");
    center.onclick = () => {
        setAlign("center");
    };

    const right = document.createElement("button");
    right.setAttribute("type", "button");
    right.setAttribute("aria-label", window.VditorI18n.alignRight + "<" + updateHotkeyTip("⇧⌘R") + ">");
    right.setAttribute("data-type", "right");
    right.innerHTML = '<svg><use xlink:href="#vditor-icon-align-right"></use></svg>';
    right.className =
        "vditor-icon vditor-tooltipped vditor-tooltipped__n" +
        (alignType === "right" ? " vditor-icon--current" : "");
    right.onclick = () => {
        setAlign("right");
    };

    // Insert row below button
    const insertRowElement = document.createElement("button");
    insertRowElement.setAttribute("type", "button");
    insertRowElement.setAttribute("aria-label", window.VditorI18n.insertRowBelow + "<" + updateHotkeyTip("⌘=") + ">");
    insertRowElement.setAttribute("data-type", "insertRow");
    insertRowElement.innerHTML = '<svg><use xlink:href="#vditor-icon-insert-row"></use></svg>';
    insertRowElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    insertRowElement.onclick = () => {
        const startContainer = getSelection().getRangeAt(0).startContainer;
        const cellElement =
            hasClosestByMatchTag(startContainer, "TD") ||
            hasClosestByMatchTag(startContainer, "TH");
        if (cellElement) {
            insertRow(vditor, range, cellElement);
        }
    };

    // Insert row above button
    const insertRowBElement = document.createElement("button");
    insertRowBElement.setAttribute("type", "button");
    insertRowBElement.setAttribute("aria-label",
        window.VditorI18n.insertRowAbove + "<" + updateHotkeyTip("⇧⌘F") + ">");
    insertRowBElement.setAttribute("data-type", "insertRow");
    insertRowBElement.innerHTML = '<svg><use xlink:href="#vditor-icon-insert-rowb"></use></svg>';
    insertRowBElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    insertRowBElement.onclick = () => {
        const startContainer = getSelection().getRangeAt(0).startContainer;
        const cellElement =
            hasClosestByMatchTag(startContainer, "TD") ||
            hasClosestByMatchTag(startContainer, "TH");
        if (cellElement) {
            insertRowAbove(vditor, range, cellElement);
        }
    };

    // Insert column right button
    const insertColumnElement = document.createElement("button");
    insertColumnElement.setAttribute("type", "button");
    insertColumnElement.setAttribute("aria-label", window.VditorI18n.insertColumnRight + "<" + updateHotkeyTip("⇧⌘=") + ">");
    insertColumnElement.setAttribute("data-type", "insertColumn");
    insertColumnElement.innerHTML = '<svg><use xlink:href="#vditor-icon-insert-column"></use></svg>';
    insertColumnElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    insertColumnElement.onclick = () => {
        const startContainer = getSelection().getRangeAt(0).startContainer;
        const cellElement =
            hasClosestByMatchTag(startContainer, "TD") ||
            hasClosestByMatchTag(startContainer, "TH");
        if (cellElement) {
            insertColumn(vditor, tableElement, cellElement);
        }
    };

    // Insert column left button
    const insertColumnBElement = document.createElement("button");
    insertColumnBElement.setAttribute("type", "button");
    insertColumnBElement.setAttribute("aria-label", window.VditorI18n.insertColumnLeft + "<" + updateHotkeyTip("⇧⌘G") + ">");
    insertColumnBElement.setAttribute("data-type", "insertColumn");
    insertColumnBElement.innerHTML = '<svg><use xlink:href="#vditor-icon-insert-columnb"></use></svg>';
    insertColumnBElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    insertColumnBElement.onclick = () => {
        const startContainer = getSelection().getRangeAt(0).startContainer;
        const cellElement =
            hasClosestByMatchTag(startContainer, "TD") ||
            hasClosestByMatchTag(startContainer, "TH");
        if (cellElement) {
            insertColumn(vditor, tableElement, cellElement, "beforebegin");
        }
    };

    // Delete row button
    const deleteRowElement = document.createElement("button");
    deleteRowElement.setAttribute("type", "button");
    deleteRowElement.setAttribute("aria-label", window.VditorI18n["delete-row"] + "<" + updateHotkeyTip("⌘-") + ">");
    deleteRowElement.setAttribute("data-type", "deleteRow");
    deleteRowElement.innerHTML = '<svg><use xlink:href="#vditor-icon-delete-row"></use></svg>';
    deleteRowElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    deleteRowElement.onclick = () => {
        const startContainer = getSelection().getRangeAt(0).startContainer;
        const cellElement =
            hasClosestByMatchTag(startContainer, "TD") ||
            hasClosestByMatchTag(startContainer, "TH");
        if (cellElement) {
            deleteRow(vditor, range, cellElement);
        }
    };

    // Delete column button
    const deleteColumnElement = document.createElement("button");
    deleteColumnElement.setAttribute("type", "button");
    deleteColumnElement.setAttribute("aria-label", window.VditorI18n["delete-column"] + "<" + updateHotkeyTip("⇧⌘-") + ">");
    deleteColumnElement.setAttribute("data-type", "deleteColumn");
    deleteColumnElement.innerHTML = '<svg><use xlink:href="#vditor-icon-delete-column"></use></svg>';
    deleteColumnElement.className = "vditor-icon vditor-tooltipped vditor-tooltipped__n";
    deleteColumnElement.onclick = () => {
        const startContainer = getSelection().getRangeAt(0).startContainer;
        const cellElement =
            hasClosestByMatchTag(startContainer, "TD") ||
            hasClosestByMatchTag(startContainer, "TH");
        if (cellElement) {
            deleteColumn(vditor, range, tableElement, cellElement);
        }
    };

    // Row count input
    const inputWrap = document.createElement("span");
    inputWrap.setAttribute("aria-label", window.VditorI18n.row);
    inputWrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const input = document.createElement("input");
    inputWrap.appendChild(input);
    input.type = "number";
    input.min = "1";
    input.className = "vditor-input";
    input.style.width = "42px";
    input.style.textAlign = "center";
    input.setAttribute("placeholder", window.VditorI18n.row);
    input.value = tableElement.rows.length.toString();
    input.oninput = () => {
        updateTable();
    };
    input.onkeydown = (event) => {
        if (event.isComposing) {
            return;
        }
        if (event.key === "Tab") {
            input2.focus();
            input2.select();
            event.preventDefault();
            return;
        }
        if (event.key === "Enter" || event.key === "Escape") {
            setSelectionFocus(range);
            event.preventDefault();
            event.stopPropagation();
            return;
        }
    };

    // Column count input
    const input2Wrap = document.createElement("span");
    input2Wrap.setAttribute("aria-label", window.VditorI18n.column);
    input2Wrap.className = "vditor-tooltipped vditor-tooltipped__n";
    const input2 = document.createElement("input");
    input2Wrap.appendChild(input2);
    input2.type = "number";
    input2.min = "1";
    input2.className = "vditor-input";
    input2.style.width = "42px";
    input2.style.textAlign = "center";
    input2.setAttribute("placeholder", window.VditorI18n.column);
    input2.value = tableElement.rows[0].cells.length.toString();
    input2.oninput = () => {
        updateTable();
    };
    input2.onkeydown = (event) => {
        if (event.isComposing) {
            return;
        }
        if (event.key === "Tab") {
            input.focus();
            input.select();
            event.preventDefault();
            return;
        }
        if (event.key === "Enter" || event.key === "Escape") {
            setSelectionFocus(range);
            event.preventDefault();
            event.stopPropagation();
            return;
        }
    };

    // Append all elements
    popoverElement.insertAdjacentElement("beforeend", left);
    popoverElement.insertAdjacentElement("beforeend", center);
    popoverElement.insertAdjacentElement("beforeend", right);
    popoverElement.insertAdjacentElement("beforeend", insertRowBElement);
    popoverElement.insertAdjacentElement("beforeend", insertRowElement);
    popoverElement.insertAdjacentElement("beforeend", insertColumnBElement);
    popoverElement.insertAdjacentElement("beforeend", insertColumnElement);
    popoverElement.insertAdjacentElement("beforeend", deleteRowElement);
    popoverElement.insertAdjacentElement("beforeend", deleteColumnElement);
    popoverElement.insertAdjacentElement("beforeend", inputWrap);
    popoverElement.insertAdjacentHTML("beforeend", " x ");
    popoverElement.insertAdjacentElement("beforeend", input2Wrap);

    setTablePopoverPosition(popoverElement, editorElement, tableElement);
};

export const hideTablePopover = (popoverElement: HTMLDivElement) => {
    if (popoverElement) {
        popoverElement.style.display = "none";
    }
};
