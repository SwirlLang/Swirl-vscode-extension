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
    for (const keyword in keywords) {
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
    }
    //show info of functions and keywords on hover
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
    //go to definition for functions and keywords
    vscode.languages.registerDefinitionProvider("lc", {
        provideDefinition(document, position) {
            const word = document.getText(document.getWordRangeAtPosition(position, /\b\w+(?=\(.*\))/));
            if (builtin_funcs[word] || keywords[word] != undefined) {
                return new vscode.Location(vscode.Uri.file(context.asAbsolutePath(`src/data.json`)), new vscode.Position(0, 0));
            }
            else {
                return null;
            }
        },
    });
    //symbols of functions
    vscode.languages.registerDocumentSymbolProvider("lc", {
        provideDocumentSymbols(document) {
            const symbols = [];
            const regex = /\bfunc\s+(\w+)\s*\(\s*\){.*}/gs;
            let match;
            while ((match = regex.exec(document.getText())) != null) {
                symbols.push(new vscode.DocumentSymbol(match[1], "Function", vscode.SymbolKind.Function, new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)), new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length))));
            }
            return symbols;
        },
    });
    //symbols of variables
    vscode.languages.registerDocumentSymbolProvider("lc", {
        provideDocumentSymbols(document) {
            const symbols = [];
            const regex = /\b(\w+)\s(\w+)\s+=\s+.*/g;
            let match;
            while ((match = regex.exec(document.getText())) != null) {
                symbols.push(new vscode.DocumentSymbol(match[2], `${match[1]} variable`, vscode.SymbolKind.Variable, new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length)), new vscode.Range(document.positionAt(match.index), document.positionAt(match.index + match[0].length))));
            }
            return symbols;
        }
    });
    //autocomplete for variables declared in the file
    vscode.languages.registerCompletionItemProvider("lc", {
        provideCompletionItems(document, position) {
            const symbols = [];
            const regex = /\b(\w+)\s(\w+)\s+=\s+.*/g;
            let match;
            while ((match = regex.exec(document.getText())) != null) {
                symbols.push({
                    label: match[2],
                    kind: vscode.CompletionItemKind.Variable,
                    detail: `Variable`,
                    documentation: new vscode.MarkdownString(`\`\`\`lc\n${match[0]}\n\`\`\``),
                    insertText: match[2],
                    sortText: "1"
                });
            }
            return symbols;
        }
    });
    //autocomplete for functions declared in the file
    vscode.languages.registerCompletionItemProvider("lc", {
        provideCompletionItems(document, position) {
            const symbols = [];
            const regex = /\bfunc\s+(\w+)\s*(\(.*\)){.*}/gs;
            let match;
            while ((match = regex.exec(document.getText())) != null) {
                symbols.push({
                    label: match[1],
                    kind: vscode.CompletionItemKind.Function,
                    detail: `Function`,
                    documentation: new vscode.MarkdownString(`\`\`\`lc\nfunc ${match[1]}${match[2]}{\n}\n\`\`\``),
                    insertText: new vscode.SnippetString(`${match[1]}($0)`),
                });
            }
            return symbols;
        }
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