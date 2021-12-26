// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
    const builtins = [
        'print',
        'input',
        'range',
        'find',
        'count',
        'findall',
        'string',
        'int',
        'float',
        'bool',
        'len',
        'exit'
    ];
    const funcs_desc = {
        'print':'prints to the standard output.',
        'input':'takes input from the standard input',
        'range':'Returns a list of integers from start to end, with step',
        'find':'Returns the index of the first occurrence of the string',
        'count':'Returns the number of non-overlapping occurrences of the string',
        'findall':'Returns a list of all occurrences of the string',
        'string':'typecasts the variable to string',
        'int':'typecasts the variable to int',
        'float':'typecasts the variable to float',
        'bool':'typecasts the variable to bool',
        'len':'returns the length of a list or a string',
        'exit':'exits the program with the exit code'
    }

    builtins.forEach(builtin => {
        vscode.languages.registerCompletionItemProvider('lc', {
            provideCompletionItems(document, position) {
                return [{
                    label: builtin,
                    kind: vscode.CompletionItemKind.Function,
                    insertText: new vscode.SnippetString(`${builtin}($0)`),
                    documentation: new vscode.MarkdownString(`${funcs_desc[builtin]}  \n\nCheck [specification](https://github.com/Lambda-Code-Organization/Lambda-Code/blob/main/specification.md#builtin-functions) for more details`),
                    detail:"Builtin function",
                }];
            }
        });
    });
    vscode.languages.registerHoverProvider('lc', {
        provideHover(document, position) {
            let word = document.getText(document.getWordRangeAtPosition(position));
            if (funcs_desc[word] != undefined) {
            return new vscode.Hover(new vscode.MarkdownString(`${funcs_desc[word]}`));
            }
            else {
                return null;
            }

        }
    });

}

// this method is called when your extension is deactivated
function deactivate() {}

// eslint-disable-next-line no-undef
module.exports = {
	activate,
	deactivate
}