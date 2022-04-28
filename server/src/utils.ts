import {
    Position,
    Range,
    TextDocument,
} from "vscode-languageserver-textdocument";

export function getWordRangeAtPosition(
    document: TextDocument,
    position: Position,
    Regex: RegExp
): Range {
    let wordStart = position.character;
    let wordEnd = position.character;
    const text = document.getText().split("\n")[position.line];
    while (
        wordStart > 0 &&
        Regex.test(text[wordStart - 1]) &&
        text[wordStart - 1] !== " "
    ) {
        wordStart--;
    }
    while (
        wordEnd < text.length &&
        Regex.test(text[wordEnd]) &&
        text[wordEnd] !== " "
    ) {
        wordEnd++;
    }
    return {
        start: { line: position.line, character: wordStart },
        end: { line: position.line, character: wordEnd },
    };
}
