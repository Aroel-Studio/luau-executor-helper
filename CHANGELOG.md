# Change Log

All notable changes to the "luau-executor-helper" extension will be documented in this file.

## [1.1.0] - 2026-08-07

### Added
- Full Luau TextMate grammar (`syntaxes/luau.tmLanguage.json`) for complete syntax highlighting ("colorful text") across `.luau` and `.lua` files.
- `DocumentSemanticTokensProvider` for real-time, theme-aware editor token colorization for functions, namespaces, variables, keywords, types, and numbers.
- Expanded `potassium.json` database from 73 to 152 function definitions, integrating complete API coverage from [docs.potassium.pro](https://docs.potassium.pro).
- Expanded `sunc.json` database from 12 to 42 function definitions synced with [docs.sunc.su](https://docs.sunc.su).

### Changed
- Registered `source.luau` root syntax grammar in `package.json` alongside injection grammars.

## [1.0.0] - 2026-05-01

### Added
- Initial release
- Complete data parsing for Potassium, Volt, sUNC, and Wave
- Hover provider with rich Markdown documentation
- Completion provider for globals and library namespaces
- Signature Help provider
- Diagnostics for thread identity bounds checking
- Comprehensive snippet library
- Syntax highlighting injection for `source.lua` and `source.luau`
