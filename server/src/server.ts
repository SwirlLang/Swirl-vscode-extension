import {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
    MarkupKind,
    MarkupContent,
    DocumentSymbol,
    SymbolKind,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

import * as fs from "fs";
import * as path from "path";
import { getWordRangeAtPosition } from "./utils";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

interface keywords {
    [key: string]: string;
}
interface builtin_funcs {
    [key: string]: string;
}
let keywords: keywords;
let builtin_funcs: builtin_funcs;

connection.onInitialize((params: InitializeParams) => {
    const capabilities = params.capabilities;

    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result: InitializeResult = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
            // Tell the client that this server supports code completion.
            completionProvider: {
                resolveProvider: true,
            },
            hoverProvider: true,
            documentSymbolProvider: true,
            definitionProvider: true,
        },
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true,
            },
        };
    }
    const data = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "../../server/src/data.json"),
            "utf8"
        )
    );
    keywords = data.keywords;
    builtin_funcs = data.builtin_funcs;
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register(
            DidChangeConfigurationNotification.type,
            undefined
        );
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders((_event) => {
            connection.console.log("Workspace folder change event received.");
        });
    }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
    // The validator creates diagnostics for all import statements with a unknown package name
    const text = textDocument.getText();
    const diagnostics: Diagnostic[] = [];

    const import_pattern = /\bimport(?! \w)/g;
    let m1: RegExpExecArray | null;
    while ((m1 = import_pattern.exec(text))) {
        const diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: {
                start: textDocument.positionAt(m1.index),
                end: textDocument.positionAt(m1.index + m1[0].length),
            },
            message: `Unknown package`,
            source: "Swirl",
        };
        diagnostics.push(diagnostic);
    }

    // Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onDidChangeWatchedFiles((_change) => {
    // Monitored files have change in VSCode
    connection.console.log("We received an file change event");
});

// This handler provides hover content
connection.onHover((params) => {
    // show info of builtin functions on hover
    const word = documents
        .get(params.textDocument.uri)!
        .getText(
            getWordRangeAtPosition(
                documents.get(params.textDocument.uri)!,
                params.position,
                /\b\w+\b/
            )
        );

    const content: MarkupContent = {
        kind: MarkupKind.Markdown,
        value: `${builtin_funcs[word]}`,
    };

    if (builtin_funcs[word] != undefined) {
        return {
            contents: content,
        };
    }
    return null;
});

// This handler provides the list of the completion items.
connection.onCompletion(
    (params: TextDocumentPositionParams): CompletionItem[] => {
        // The pass parameter contains the position of the text document in
        // which code complete got requested. For the example we ignore this
        // info and always provide the same completion items.

        const document = documents.get(params.textDocument.uri)!;
        const items_list: CompletionItem[] = [];
        // autocomplete functions declared in the file
        const func_regex = /\bfn\s+(\w+)\s*(\(.*\))\s*{.*}/gs;
        let funcs_match: RegExpExecArray | null;
        while ((funcs_match = func_regex.exec(document.getText()!)) != null) {
            items_list.push({
                label: funcs_match[1],
                kind: CompletionItemKind.Function,
                detail: `Function`,
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `\`\`\`swirl\nfn ${funcs_match[1]}${funcs_match[2]}{\n}\n\`\`\``,
                },
                insertTextFormat: 2,
                insertText: `${funcs_match[1]}($0)`,
            });
        }
        // autocomplete variables declared in the file
        const variable_regex = /\b(?<!\/.*)(\w+)\s(\w+)\s=\s.*/g;
        let match: RegExpExecArray | null;
        while ((match = variable_regex.exec(document.getText()!)) != null) {
            items_list.push({
                label: match[2],
                kind: CompletionItemKind.Variable,
                detail: `Variable`,
                documentation: {
                    kind: MarkupKind.Markdown,
                    value: `\`\`\`swirl\n${match[0]}\n\`\`\``,
                },
                insertText: match[2],
                sortText: "1",
            });
        }
        for (const func in builtin_funcs) {
            items_list.push({
                label: func,
                kind: CompletionItemKind.Function,
                detail: "Function",
                insertTextFormat: 2,
                insertText: `${func}($0)`,
            });
        }
        const datatypes = ["i8","i16","i32","i64","i128","u8","u16","u32","u64","u128","bool","f32","f64"];
        for (const keyword in keywords) {
            if (keyword in datatypes) {
                items_list.push({
                    label: keyword,
                    kind: CompletionItemKind.Keyword,
                    detail: "Keyword",
                    insertText: keyword,
                });
            } else {
                items_list.push({
                    label: keyword,
                    kind: CompletionItemKind.Keyword,
                    detail: "Keyword",
                    insertText: keyword,
                });
            }
        }

        // don't autocomplete in comments and after func, class, import keywords
        const line = document.getText({
            start: { line: params.position.line, character: 0 },
            end: { line: params.position.line, character: params.position.character },
        });
        if (line.match(/\/\/.*/g) || line.match(/(?<=\/\/\/).*(?=\/\/\/)/gs)) {
            return [];
        }
        if (line.match(/\bfn(?!\s\w+.*\).*{)/g) || line.match(/\bclass(?!\s\w+.*\).*{)/g) || line.match(/\bimport\b/g)) {
            return [];
        }

        return items_list;
    }
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
    // provide detail in the completion list for builtin functions and keywords
    if (item.kind === CompletionItemKind.Keyword) {
        item.documentation = {
            kind: MarkupKind.Markdown,
            value: `${keywords[item.label]}`,
        };
    }
    if (item.kind === CompletionItemKind.Function) {
        if (builtin_funcs[item.label]) {
            item.documentation = {
                kind: MarkupKind.Markdown,
                value: `${builtin_funcs[item.label]}`,
            };
        }
    }
    return item;
});

// This handler provides document symbols.
connection.onDocumentSymbol((params) => {
    // document symbols for variables
    const document = documents.get(params.textDocument.uri)!;
    const symbols: DocumentSymbol[] = [];
    const var_regex = /\b(?<!\/.*)(\w+)\s(\w+)\s=\s.*/g;
    let var_match: RegExpExecArray | null;

    while ((var_match = var_regex.exec(document.getText())) != null) {
        symbols.push({
            name: var_match[2],
            detail: `${var_match[1]}`,
            kind: SymbolKind.Variable,
            range: {
                start: document.positionAt(var_match.index),
                end: document.positionAt(var_match.index + var_match[0].length),
            },
            selectionRange: {
                start: document.positionAt(var_match.index),
                end: document.positionAt(var_match.index + var_match[0].length),
            },
        });
    }
    // document symbols for functions
    const func_regex = /\bfunc\s+(\w+)\s*\(.*\)\s*{.*}/gs;
    let func_match: RegExpExecArray | null;
    while ((func_match = func_regex.exec(document.getText())) != null) {
        symbols.push({
            name: func_match[1],
            detail: "Function",
            kind: SymbolKind.Function,
            range: {
                start: document.positionAt(func_match.index),
                end: document.positionAt(
                    func_match.index + func_match[0].length
                ),
            },
            selectionRange: {
                start: document.positionAt(func_match.index),
                end: document.positionAt(
                    func_match.index + func_match[0].length
                ),
            },
        });
    }
    return symbols;
});

// This handler provides definition
connection.onDefinition((params) => {
    // go to definition for functions and keywords
    const document = documents.get(params.textDocument.uri)!;
    const word = document.getText(
        getWordRangeAtPosition(document, params.position, /\b\w+\b/)
    );
    if (builtin_funcs[word] || keywords[word] != undefined) {
        return [
            {
                uri: "file://" + __dirname + "/../../server/src/data.json",
                range: {
                    start: { line: 0, character: 0 },
                    end: { line: 0, character: 0 },
                },
            },
        ];
    }
    return null;
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
