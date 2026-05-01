import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

// Data interfaces
interface Function_Param {
    name: string;
    type: string;
    description: string;
}

interface Function_Return {
    type: string;
    description: string;
}

interface Function_Definition {
    name: string;
    library: string;
    executors: string[];
    signature: string;
    description: string;
    parameters: Function_Param[];
    returns: Function_Return[];
    example: string;
    notes: string;
    seeAlso: string[];
}

interface File_Schema {
    functions: Function_Definition[];
}

let function_map = new Map<string, Function_Definition>();

//@ Load JSON data files
function load_data(context: vscode.ExtensionContext) {
    const data_dir = path.join(context.extensionPath, 'data');
    const files = ['potassium.json', 'volt.json', 'sunc.json', 'wave.json'];

    for (const file of files) {
        const file_path = path.join(data_dir, file);
        if (fs.existsSync(file_path)) {
            try {
                const content = fs.readFileSync(file_path, 'utf8');
                const parsed: File_Schema = JSON.parse(content);
                
                for (const func of parsed.functions) {
                    // Merge if exists
                    if (function_map.has(func.name)) {
                        const existing = function_map.get(func.name)!;
                        
                        // Merge executors
                        for (const exec of func.executors) {
                            if (!existing.executors.includes(exec)) {
                                existing.executors.push(exec);
                            }
                        }
                        
                        // Use the longest description
                        if (func.description.length > existing.description.length) {
                            existing.description = func.description;
                        }
                    } else {
                        function_map.set(func.name, func);
                    }
                }
            } catch (error) {
                console.error(`Failed to parse ${file}:`, error);
            }
        }
    }
}

//@ Generate hover markdown
function create_hover_markdown(func: Function_Definition): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.isTrusted = true;
    md.supportHtml = true;

    // Title and signature
    md.appendCodeblock(func.signature, 'luau');
    
    // Description
    md.appendMarkdown(`\n\n${func.description}\n\n`);

    // Executors
    const executors = func.executors.map(e => e.charAt(0).toUpperCase() + e.slice(1)).join(', ');
    md.appendMarkdown(`**Supported Executors:** ${executors}\n\n`);

    // Parameters
    if (func.parameters && func.parameters.length > 0) {
        md.appendMarkdown(`**Parameters:**\n`);
        for (const p of func.parameters) {
            md.appendMarkdown(`- \`${p.name}: ${p.type}\` - ${p.description}\n`);
        }
        md.appendMarkdown(`\n`);
    }

    // Returns
    if (func.returns && func.returns.length > 0) {
        md.appendMarkdown(`**Returns:**\n`);
        for (const r of func.returns) {
            md.appendMarkdown(`- \`${r.type}\` - ${r.description}\n`);
        }
        md.appendMarkdown(`\n`);
    }

    // Example
    if (func.example) {
        md.appendMarkdown(`**Example:**\n`);
        md.appendCodeblock(func.example, 'luau');
    }

    // Notes
    if (func.notes) {
        md.appendMarkdown(`\n> **Note:** ${func.notes}\n`);
    }

    return md;
}

//@ Hover Provider
class Executor_Hover_Provider implements vscode.HoverProvider {
    provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Hover> {
        const range = document.getWordRangeAtPosition(position);
        if (!range) { return null; }

        const word = document.getText(range);
        
        // Check for library prefix e.g. "debug.getconstant"
        let full_word = word;
        const line = document.lineAt(position.line).text;
        const before = line.substring(0, range.start.character);
        
        // Simple heuristic for "namespace.func"
        const dot_match = before.match(/(\w+)\.$/);
        if (dot_match) {
            full_word = `${dot_match[1]}.${word}`;
        }

        const func = function_map.get(full_word) || function_map.get(word);

        if (func) {
            return new vscode.Hover(create_hover_markdown(func));
        }

        return null;
    }
}

//@ Completion Provider
class Executor_Completion_Provider implements vscode.CompletionItemProvider {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
        const items: vscode.CompletionItem[] = [];
        
        // Determine if we're after a dot
        const line_prefix = document.lineAt(position).text.substring(0, position.character);
        const ends_with_dot = line_prefix.endsWith('.');
        
        let target_namespace = "";
        if (ends_with_dot) {
            const match = line_prefix.match(/(\w+)\.$/);
            if (match) {
                target_namespace = match[1];
            }
        }

        for (const [name, func] of function_map.entries()) {
            if (ends_with_dot) {
                // If typed "debug.", only show items starting with "debug."
                if (name.startsWith(target_namespace + ".")) {
                    const func_name = name.substring(target_namespace.length + 1);
                    const item = new vscode.CompletionItem(func_name, vscode.CompletionItemKind.Function);
                    item.detail = func.signature;
                    item.documentation = create_hover_markdown(func);
                    items.push(item);
                }
            } else {
                // Not ending with dot, show globals
                if (!name.includes(".")) {
                    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Function);
                    item.detail = func.signature;
                    item.documentation = create_hover_markdown(func);
                    items.push(item);
                }
            }
        }

        return items;
    }
}

//@ Signature Help Provider
class Executor_Signature_Provider implements vscode.SignatureHelpProvider {
    provideSignatureHelp(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.SignatureHelpContext): vscode.ProviderResult<vscode.SignatureHelp> {
        // Basic backward search to find the function name
        const text = document.lineAt(position).text.substring(0, position.character);
        let brackets = 0;
        let func_name_start = -1;
        let active_parameter = 0;
        
        for (let i = text.length - 1; i >= 0; i--) {
            const char = text[i];
            if (char === ')') { brackets++; }
            if (char === '(') {
                if (brackets === 0) {
                    func_name_start = i;
                    break;
                }
                brackets--;
            }
            if (char === ',' && brackets === 0) {
                active_parameter++;
            }
        }

        if (func_name_start === -1) { return null; }

        // Try to extract the function name before the '('
        const before_paren = text.substring(0, func_name_start);
        const match = before_paren.match(/([a-zA-Z0-9_\.]+)$/);
        
        if (!match) { return null; }
        
        const func_name = match[1];
        const func = function_map.get(func_name);
        
        if (!func) { return null; }

        const signature = new vscode.SignatureInformation(func.signature, func.description);
        
        if (func.parameters) {
            for (const param of func.parameters) {
                signature.parameters.push(new vscode.ParameterInformation(`${param.name}: ${param.type}`, param.description));
            }
        }

        const help = new vscode.SignatureHelp();
        help.signatures = [signature];
        help.activeSignature = 0;
        help.activeParameter = active_parameter;

        return help;
    }
}

//@ Diagnostic Provider
function update_diagnostics(document: vscode.TextDocument, collection: vscode.DiagnosticCollection) {
    if (document.languageId !== 'lua' && document.languageId !== 'luau') { return; }

    const diagnostics: vscode.Diagnostic[] = [];
    const text = document.getText();
    
    // Example Diagnostic: setthreadidentity > 8
    const regex_identity = /setthreadidentity\s*\(\s*(\d+)\s*\)/g;
    let match;
    while ((match = regex_identity.exec(text)) !== null) {
        const value = parseInt(match[1]);
        if (value > 8 || value < 1) {
            const startPos = document.positionAt(match.index);
            const endPos = document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            const diagnostic = new vscode.Diagnostic(
                range,
                "Thread identity must be between 1 and 8.",
                vscode.DiagnosticSeverity.Warning
            );
            diagnostic.code = "INVALID_IDENTITY";
            diagnostics.push(diagnostic);
        }
    }

    collection.set(document.uri, diagnostics);
}

//@ Extension Activation
export function activate(context: vscode.ExtensionContext) {
    console.log('Luau Executor Helper is now active!');

    load_data(context);

    // Register Hover
    context.subscriptions.push(
        vscode.languages.registerHoverProvider(
            [{ scheme: 'file', language: 'lua' }, { scheme: 'file', language: 'luau' }],
            new Executor_Hover_Provider()
        )
    );

    // Register Completion
    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            [{ scheme: 'file', language: 'lua' }, { scheme: 'file', language: 'luau' }],
            new Executor_Completion_Provider(),
            '.' // Trigger on dot
        )
    );

    // Register Signature Help
    context.subscriptions.push(
        vscode.languages.registerSignatureHelpProvider(
            [{ scheme: 'file', language: 'lua' }, { scheme: 'file', language: 'luau' }],
            new Executor_Signature_Provider(),
            '(', ','
        )
    );

    // Register Diagnostics
    const diagnostic_collection = vscode.languages.createDiagnosticCollection('executor');
    context.subscriptions.push(diagnostic_collection);

    if (vscode.window.activeTextEditor) {
        update_diagnostics(vscode.window.activeTextEditor.document, diagnostic_collection);
    }

    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(e => {
        update_diagnostics(e.document, diagnostic_collection);
    }));

    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(doc => {
        update_diagnostics(doc, diagnostic_collection);
    }));
}

export function deactivate() {}
