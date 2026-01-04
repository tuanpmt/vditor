# Vditor Monaco Editor Clipboard Fix for VS Code Webview

## Problem

When Vditor is used inside a VS Code webview, clipboard operations (copy/paste) do not work in Monaco editor (code blocks) because:

1. VS Code webviews have restricted clipboard access for security
2. Monaco editor uses its own clipboard handling via `navigator.clipboard` API which is blocked in webviews
3. Standard `document.execCommand('copy/paste')` doesn't work with Monaco's internal model

## Critical Issue: Monaco Blur Handler

**IMPORTANT**: In `monacoRender.ts` line ~1023, there's a blur handler that destroys Monaco when focus is lost:

```typescript
editor.onDidBlurEditorText(() => {
  setTimeout(() => {
    const activeEl = document.activeElement;
    if (!activeEl || !monacoWrapper.contains(activeEl)) {
      destroyMonacoForCodeBlock(codeBlockElement, vditor);  // This destroys Monaco!
    }
  }, 100);
});
```

This causes Monaco to be destroyed when any focus change happens (including clipboard operations that might briefly shift focus). The clipboard fix must NOT cause focus to leave Monaco.

## Solution Overview

Vditor needs to provide a way to override Monaco's clipboard behavior with custom handlers that can communicate with the host VS Code extension via `postMessage`.

## Implementation Guide

### 1. Add Clipboard Options to Vditor

In `src/ts/types/index.d.ts`, add new clipboard options to `IOptions`:

```typescript
interface IOptions {
  // ... existing options

  /** Custom clipboard handlers for webview environments */
  clipboard?: {
    /** Called when copy is triggered in Monaco editor */
    onCopy?: (text: string) => void;
    /** Called when cut is triggered in Monaco editor */
    onCut?: (text: string) => void;
    /** Called when paste is triggered in Monaco editor, call callback with text to paste */
    onPaste?: (callback: (text: string) => void) => void;
  };
}
```

### 2. Modify MonacoManager.create() Method

In `src/ts/markdown/monacoRender.ts`, in the `MonacoManager` class, add clipboard command overrides in the `create()` method.

**Location**: After line ~454 where editor is stored (`this.instances.set(editorId, editor);`)

```typescript
// In MonacoManager class, add this property:
private pasteCallbacks: Map<string, (text: string) => void> = new Map();

// In create() method, after this.instances.set(editorId, editor):

// Override clipboard commands if custom handlers provided
if (this.vditor.options.clipboard) {
    const clipboard = this.vditor.options.clipboard;

    // Override Cmd/Ctrl+C (Copy)
    editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyC, () => {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
            const text = editor.getModel().getValueInRange(selection);
            if (clipboard.onCopy) {
                clipboard.onCopy(text);
            }
        }
    });

    // Override Cmd/Ctrl+X (Cut)
    editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyX, () => {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
            const text = editor.getModel().getValueInRange(selection);
            if (clipboard.onCut) {
                clipboard.onCut(text);
            }
            // Delete selection
            editor.executeEdits('cut', [{
                range: selection,
                text: ''
            }]);
        }
    });

    // Override Cmd/Ctrl+V (Paste)
    editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyV, () => {
        if (clipboard.onPaste) {
            // Store callback for async paste operation
            this.pasteCallbacks.set(editorId, (text: string) => {
                const selection = editor.getSelection();
                editor.executeEdits('paste', [{
                    range: selection,
                    text: text,
                    forceMoveMarkers: true
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
        }
    });
}
```

### 3. Add Save Command Handler

Monaco also blocks Cmd/Ctrl+S (save). Add this in the same location:

```typescript
// Override Cmd/Ctrl+S (Save) - forward to host
editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyS, () => {
    // Emit a custom event that can be caught by the host
    if (this.vditor.options.clipboard?.onSave) {
        this.vditor.options.clipboard.onSave();
    } else {
        // Dispatch a keyboard event that can bubble up
        const event = new KeyboardEvent('keydown', {
            key: 's',
            code: 'KeyS',
            metaKey: true,
            ctrlKey: true,
            bubbles: true,
            cancelable: true
        });
        document.dispatchEvent(event);
    }
});
```

Update the clipboard options type to include save:

```typescript
interface IOptions {
  clipboard?: {
    onCopy?: (text: string) => void;
    onCut?: (text: string) => void;
    onPaste?: (callback: (text: string) => void) => void;
    onSave?: () => void;  // Add this
  };
}
```

### 4. Add Public Method for External Paste Trigger

Add this method to MonacoManager class for external paste triggering:

```typescript
/**
 * Trigger paste into a specific Monaco editor instance
 */
public triggerPaste(editorId: string, text: string): boolean {
    const editor = this.instances.get(editorId);
    if (editor) {
        const selection = editor.getSelection();
        editor.executeEdits('paste', [{
            range: selection,
            text: text,
            forceMoveMarkers: true
        }]);
        return true;
    }
    return false;
}

/**
 * Get selected text from a specific Monaco editor instance
 */
public getSelectedText(editorId: string): string {
    const editor = this.instances.get(editorId);
    if (editor) {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
            return editor.getModel().getValueInRange(selection);
        }
    }
    return '';
}
```

### 4. Alternative: Add Public Methods to Vditor

Add methods to Vditor class for clipboard operations:

```typescript
// In src/ts/index.ts or method.ts

/** Paste text into the currently focused editor (Monaco or IR) */
public pasteText(text: string) {
  // Check if Monaco is focused
  const activeElement = document.activeElement;
  const monacoWrapper = activeElement?.closest('.vditor-monaco-wrapper');

  if (monacoWrapper && this.vditor.monaco) {
    const editorId = monacoWrapper.getAttribute('data-monaco-id');
    if (editorId) {
      const editor = this.vditor.monaco.get(editorId);
      if (editor) {
        const selection = editor.getSelection();
        editor.executeEdits('paste', [{
          range: selection,
          text: text,
          forceMoveMarkers: true
        }]);
        return;
      }
    }
  }

  // Fallback to IR/WYSIWYG paste
  this.insertValue(text);
}

/** Get selected text from currently focused editor */
public getSelectedText(): string {
  const activeElement = document.activeElement;
  const monacoWrapper = activeElement?.closest('.vditor-monaco-wrapper');

  if (monacoWrapper && this.vditor.monaco) {
    const editorId = monacoWrapper.getAttribute('data-monaco-id');
    if (editorId) {
      const editor = this.vditor.monaco.get(editorId);
      if (editor) {
        const selection = editor.getSelection();
        if (selection && !selection.isEmpty()) {
          return editor.getModel().getValueInRange(selection);
        }
      }
    }
  }

  // Fallback to DOM selection
  return window.getSelection()?.toString() || '';
}
```

## Usage in VS Code Extension

After implementing the above, the VS Code extension can use Vditor like this:

```javascript
// Initialize Vditor with custom clipboard handlers
vditor = new Vditor('vditor', {
  // ... other options
  clipboard: {
    onCopy: (text) => {
      vscode.postMessage({ type: 'copyToClipboard', text });
    },
    onCut: (text) => {
      vscode.postMessage({ type: 'copyToClipboard', text });
    },
    onPaste: (callback) => {
      // Store callback globally for async response
      window.__vditorPasteCallback = callback;
      vscode.postMessage({ type: 'requestPaste' });
    },
    onSave: () => {
      vscode.postMessage({ type: 'save' });
    }
  }
});

// Handle paste response from extension
window.addEventListener('message', (event) => {
  if (event.data.type === 'pasteText' && window.__vditorPasteCallback) {
    window.__vditorPasteCallback(event.data.text);
    window.__vditorPasteCallback = null;
  }
});
```

### Extension Side (TypeScript)

```typescript
// In VditorEditorPanel.ts message handler:

case 'copyToClipboard':
  if (message.text) {
    vscode.env.clipboard.writeText(message.text);
  }
  break;

case 'requestPaste':
  const text = await vscode.env.clipboard.readText();
  this._panel.webview.postMessage({ type: 'pasteText', text });
  break;

case 'save':
  await this._document.save();
  break;
```

## Key Files to Modify in Vditor

| File | Changes |
|------|---------|
| `src/ts/types/index.d.ts` | Add `clipboard` option type with `onCopy`, `onCut`, `onPaste`, `onSave` |
| `src/ts/markdown/monacoRender.ts` | Add `pasteCallbacks` Map to MonacoManager class. In `create()` method, add `editor.addCommand()` for Cmd+C, Cmd+X, Cmd+V, Cmd+S |
| `src/ts/method.ts` (optional) | Add `pasteText()` and `getSelectedText()` public methods |

### Exact Location in monacoRender.ts

In the `MonacoManager` class `create()` method, add the clipboard command handlers after line ~454:

```typescript
// Line ~454: this.instances.set(editorId, editor);

// ADD THIS AFTER:
if (this.vditor.options.clipboard) {
    // ... clipboard command overrides (see section 2 above)
}
```

## Testing

1. Build Vditor: `pnpm build`
2. Copy dist to vs-markdown-vditor: `cp -r dist ../vs-markdown-vditor/node_modules/vditor/`
3. Build extension: `cd ../vs-markdown-vditor && npm run build`
4. Reload VS Code and test copy/paste in code blocks
