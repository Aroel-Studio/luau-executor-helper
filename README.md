# Luau Executor Helper

A complete, publish-ready VSCode extension that provides IntelliSense, autocomplete snippets, hover documentation, diagnostics, and syntax support for Luau executor scripting.

## Supported Executors

- **Potassium**
- **Volt**
- **Wave**
- **other sUNC Executor**

## Features

- **Hover Documentation:** Hover over any supported executor function (e.g., `hookfunction`, `request`, `crypt.encrypt`) to see its signature, description, parameters, return types, and code examples.
- **Auto-Completion:** Intelligent completions for global functions and library namespaces (like `debug.`, `crypt.`, `Drawing.`).
- **Signature Help:** See parameter hints as you type function arguments.
- **Diagnostics (Linting):** Warns you about common mistakes, such as invalid `setthreadidentity` levels (must be 1-8).
- **Snippets:** Boilerplate for standard executor hooks (like `hookmetamethod`, `raknet.add_send_hook`).
- **Syntax Highlighting:** Full TextMate grammar injection for `.lua` and `.luau` files to highlight executor globals correctly.

## Function Coverage

Provides definitions for over 180+ functions across 25 categories including:
- Closures
- Debugging
- Metatables
- Instances
- Reflection
- FileSystem
- Cryptography
- Networking (RakNet, HTTP, WebSocket)
- Actors
- Drawing

## Installation

1. Download the `.vsix` from the releases.
2. Go to Extensions in VSCode -> `...` -> Install from VSIX.

## Configuration

This extension runs automatically when editing `.lua` and `.luau` files. 

## Support

Contributions are welcome! Please submit a PR or open an issue on the repository.
