"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const fs = require("fs");
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    const data = JSON.parse(fs.readFileSync(context.asAbsolutePath("src/data.json"), "utf8"));
    const keywords = data.keywords;
    const builtin_funcs = data.builtin_funcs;
    for (const func in builtin_funcs) {
        vscode.languages.registerCompletionItemProvider("lc", {
            provideCompletionItems(document, position) {
                return [
                    {
                        label: func,
                        kind: vscode.CompletionItemKind.Function,
                        insertText: new vscode.SnippetString(`${func}($0)`),
                        documentation: new vscode.MarkdownString(`${builtin_funcs[func]}`),
                        detail: "Builtin function",
                    },
                ];
            },
        });
    }
    keywords.forEach((keyword) => {
        vscode.languages.registerCompletionItemProvider("lc", {
            provideCompletionItems(document, position) {
                return [
                    {
                        label: keyword,
                        kind: vscode.CompletionItemKind.Keyword,
                        detail: "Keyword",
                        insertText: keyword,
                    },
                ];
            },
        });
    });
    vscode.languages.registerHoverProvider("lc", {
        provideHover(document, position) {
            const word = document.getText(document.getWordRangeAtPosition(position, /\b\w+(?=\(.*\))/));
            if (builtin_funcs[word] != undefined) {
                return new vscode.Hover(new vscode.MarkdownString(`${builtin_funcs[word]}`));
            }
            else {
                return null;
            }
        },
    });
}
// this method is called when your extension is deactivated
function deactivate() { }
// eslint-disable-next-line no-undef
module.exports = {
    activate,
    deactivate,
};
//# sourceMappingURL=extension.js.map