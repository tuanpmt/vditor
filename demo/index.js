import Vditor from "../src/index"
import "../src/assets/less/index.less"

// new VConsole()

let toolbar
if (window.innerWidth < 768) {
    toolbar = [
        "emoji",
        "headings",
        "bold",
        "italic",
        "strike",
        "link",
        "image",
        "|",
        "list",
        "ordered-list",
        "check",
        "outdent",
        "indent",
        "|",
        "quote",
        "line",
        "code",
        "inline-code",
        "insert-before",
        "insert-after",
        "|",
        "upload",
        "record",
        "table",
        "|",
        "undo",
        "redo",
        "|",
        "edit-mode",
        "content-theme",
        "code-theme",
        "export",
        {
            name: "more",
            toolbar: [
                "fullscreen",
                "fullwidth",
                "both",
                "preview",
                "info",
                "help",
            ],
        }]
}
const initVditor = (language) => {
    window.vditor = new Vditor("vditor", {
        // _lutePath: `http://192.168.31.194:9090/lute.min.js?${new Date().getTime()}`,
        _lutePath: "src/js/lute/lute.min.js",
        cdn: "",
        toolbar,
        lang: language,
        mode: "ir",
        height: window.innerHeight + 100,
        outline: {
            enable: true,
            position: "right",
        },
        debugger: true,
        typewriterMode: true,
        placeholder: "Hello, Vditor!",
        preview: {
            markdown: {
                toc: true,
                mark: true,
                footnotes: true,
                autoSpace: true,
            },
            math: {
                engine: "KaTeX",
                inlineDigit: true,
            },
        },
        toolbarConfig: {
            pin: true,
        },
        counter: {
            enable: true,
            type: "text",
        },
        hint: {
            emojiPath: "https://cdn.jsdelivr.net/npm/vditor@1.8.3/dist/images/emoji",
            emojiTail: "<a href=\"https://ld246.com/settings/function\" target=\"_blank\">设置常用表情</a>",
            emoji: {
                "sd": "💔",
                "j": "https://cdn.jsdelivr.net/npm/vditor@1.3.1/dist/images/emoji/j.png",
            },
            parse: false,
            extend: [
                {
                    key: "@",
                    hint: (key) => {
                        console.log(key)
                        if ("vanessa".indexOf(key.toLocaleLowerCase()) > -1) {
                            return [
                                {
                                    value: "@Vanessa",
                                    html: "<img src=\"https://avatars0.githubusercontent.com/u/970828?s=60&v=4\"/> Vanessa",
                                }]
                        }
                        return []
                    },
                },
                {
                    key: "#",
                    hint: (key) => {
                        console.log(key)
                        if ("vditor".indexOf(key.toLocaleLowerCase()) > -1) {
                            return [
                                {
                                    value: "#Vditor",
                                    html: "<span style=\"color: #999;\">#Vditor</span> ♏ 一款浏览器端的 Markdown 编辑器，支持所见即所得（富文本）、即时渲染（类似 Typora）和分屏预览模式。",
                                }]
                        }
                        return []
                    },
                }],
        },
        tab: "\t",
        upload: {
            accept: "image/*,.mp3, .wav, .rar",
            token: "test",
            url: "/api/upload/editor",
            linkToImgUrl: "/api/upload/fetch",
            filename(name) {
                return name.replace(/[^(a-zA-Z0-9\u4e00-\u9fa5\.)]/g, "").replace(/[\?\\/:|<>\*\[\]\(\)\$%\{\}@~]/g, "").replace("/\\s/g", "")
            },
        },
    })
}
initVditor("en_US")
window.setLang = (language) => {
    window.vditor.destroy()
    initVditor(language)
}

// Test getFullyRenderedHTML - opens in new window (async, with all renderers)
window.testRenderedHTML = async () => {
    const btn = event.target
    btn.disabled = true
    btn.textContent = "Rendering..."

    try {
        const html = await window.vditor.getFullyRenderedHTML()
        const newWindow = window.open("", "_blank")
        // Note: html already contains embedded CSS (vditor + hljs styles)
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Fully Rendered HTML Test</title>
                <style>
                    body { padding: 20px; font-family: system-ui, sans-serif; }
                    .info { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="info">
                    <strong>getFullyRenderedHTML() Output</strong> - Self-contained with embedded CSS<br>
                    Size: ${html.length} characters
                </div>
                ${html}
            </body>
            </html>
        `)
        newWindow.document.close()
    } catch (e) {
        alert("Error: " + e.message)
    } finally {
        btn.disabled = false
        btn.textContent = "Test HTML"
    }
}

// Test getRenderedHTMLWithFonts - opens in new window (async)
window.testRenderedHTMLWithFonts = async () => {
    const btn = event.target
    btn.disabled = true
    btn.textContent = "Loading..."

    try {
        const html = await window.vditor.getRenderedHTMLWithFonts()
        const newWindow = window.open("", "_blank")
        // Note: html already contains embedded CSS + fonts (fully self-contained)
        newWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Rendered HTML with Fonts Test</title>
                <style>
                    body { padding: 20px; font-family: system-ui, sans-serif; }
                    .info { background: #f0f0f0; padding: 10px; margin-bottom: 20px; border-radius: 4px; font-size: 14px; }
                </style>
            </head>
            <body>
                <div class="info">
                    <strong>getRenderedHTMLWithFonts() Output</strong> - Self-contained with CSS + base64 fonts<br>
                    Size: ${(html.length / 1024).toFixed(1)} KB
                </div>
                ${html}
            </body>
            </html>
        `)
        newWindow.document.close()
    } catch (e) {
        alert("Error: " + e.message)
    } finally {
        btn.disabled = false
        btn.textContent = "Test HTML+Fonts"
    }
}
