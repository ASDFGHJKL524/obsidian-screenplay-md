# Screenplay MD

A screenplay writing workflow for [Obsidian](https://obsidian.md).
Press <kbd>Tab</kbd> to cycle line types; every element is stored as plain Markdown,
so the file stays readable, portable and exportable.

给 Obsidian 用的剧本写作工作流。按 <kbd>Tab</kbd> 轮换段落类型，每种元素都写成普通 Markdown，
文件本身可读、可迁移、能导出。界面支持中文与英文，跟随 Obsidian 语言或手动切换。

---

## Why plain Markdown

Most screenplay plugins render their own format (Fountain and friends), and the document
turns into a pile of symbols outside the plugin. This one goes the other way: **the document
is ordinary Markdown**. Screenplay elements are expressed with native structures — headings,
blockquotes, background bands — so Obsidian itself renders them, editing and reading views
stay consistent, and the structure survives export to Word / PDF / HTML.

| Element | Written as | Rendered |
|---|---|---|
| Scene | `## 1. INT. STUDIO - MORNING` | bold, tinted band, auto scene number |
| Shot | `### description` | bold |
| Action | `###### description` | body text |
| Character | `#### NAME` | bold, pushed right |
| Parenthetical | `##### （beat）` | italic, pushed right, wrapped in full-width parentheses |
| Dialogue | `> “line of dialogue”` | blockquote, indented, wrapped in quotation marks |

## Usage

- <kbd>Tab</kbd>: next type (Scene → Shot → Action → Character → Dialogue → Parenthetical → Scene)
- <kbd>Shift</kbd>+<kbd>Tab</kbd>: previous type
- Command palette: "Set as …" for each type, "Cycle line type", "Renumber scenes"
- After a <kbd>Tab</kbd> switch, a badge appears at the top-right of the caret saying what the line
  became (Scene / Shot / Action / Character / Dialogue / Parenthetical) and fades after two seconds
  (or as soon as you type)
- Hover any line: the same badge follows the pointer and shows that line's type
- Click anywhere, or press <kbd>Enter</kbd> to move to a new line: the badge appears at the caret
  and fades after 1.2 s. Only a mouse click or an inserted line break raise it — ordinary typing,
  switching notes or programmatic selection never do
- Hover uses 1.7 s, and the <kbd>Tab</kbd> badge uses 2.5 s
- Only one badge is ever visible: the most recent action (Tab, hover, click or Enter) owns it

## Language

The interface follows the Obsidian interface language by default. Settings → Screenplay MD →
Language lets you pin 中文 or English explicitly.

## Import / export

Two ribbon icons (also in the command palette):

- **Export**: Word `.docx` / PDF / `.html` / plain `.txt`. Everything except PDF uses
  [pandoc](https://pandoc.org) — set its path in the plugin settings. PDF uses Obsidian's
  built-in exporter.
- **Import**: `.io`, Word `.docx`, `.md` / `.txt`.

Importing `.docx` does not need pandoc: the plugin unzips the file and reads the text itself.
If the docx is really an altChunk exported from a web page (body parked in `word/afchunk.mht`),
it decodes the quoted-printable payload and reads the HTML structure.

## Install

### Manual

1. Download `main.js`, `manifest.json`, `styles.css` from the latest release
2. Put them in `<your vault>/.obsidian/plugins/screenplay-md/`
3. Settings → Community plugins → enable **Screenplay MD**

The stylesheet is loaded automatically with the plugin — no CSS snippet needed.

### BRAT

Add this repository through BRAT while the plugin is not in the community catalog yet.

## Known limits

- In the editor, line styling must not use `margin`, `text-align` or `text-indent`:
  CodeMirror computes click positions from line height and character offsets, and those
  properties shift text visually without moving the caret target, so clicks land on the
  wrong character. Only font size, font weight, horizontal padding and background are used.
- True centering happens in reading view only; the editor approximates it with left padding.

## Status

UI ships in English and Chinese, auto-following the Obsidian interface language. Both
dictionaries are checked for key parity, placeholder parity and stray CJK in the English
strings. The English UI has not been eyeballed in-app yet — reports welcome.

## Changelog

Per-version notes live in [RELEASE_NOTES.md](RELEASE_NOTES.md); earlier versions are on the
releases page.

## License

GPL-3.0. See [LICENSE](LICENSE).
