const { Plugin, MarkdownView, Modal, Notice, Setting, PluginSettingTab } = require('obsidian');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execFile } = require('child_process');

// 用原生 Markdown 结构表达剧本元素，编辑/阅读视图都由 Obsidian 自己渲染
// ---------- 多语言 ----------
const I18N = {
  en: {
    'type.scene': 'Scene',
    'type.shot': 'Shot',
    'type.action': 'Action',
    'type.character': 'Character',
    'type.dialogue': 'Dialogue',
    'type.paren': 'Parenthetical',
    'type.title': 'Title',
    'type.blank': 'Blank line',
    'cmd.set': 'Set as {0}',
    'cmd.cycle': 'Cycle line type',
    'cmd.renumber': 'Renumber scenes',
    'ribbon.export': 'Export current screenplay',
    'ribbon.import': 'Import screenplay file',
    'cmd.exportPick': 'Export note (choose format)',
    'cmd.importFile': 'Import screenplay file',
    'notice.renumbered': 'Renumbered {0} scene(s)',
    'err.notZip': 'Not a zip container',
    'err.noBody': 'No text found in this docx (scanned or image-only?)',
    'notice.openFirst': 'Open a note first',
    'notice.pdfCalled': "Using Obsidian's built-in PDF export",
    'notice.pdfFailed': 'PDF export failed: {0}',
    'notice.noPandoc': 'pandoc not found: {0}',
    'notice.exportFailed': 'Export failed: {0}',
    'notice.exported': 'Exported: {0}',
    'default.importName': 'Imported screenplay',
    'notice.imported': 'Imported: {0}',
    'modal.exportTitle': 'Export current screenplay',
    'modal.source': 'Source: {0}',
    'modal.noNote': '(no note open)',
    'fmt.docx': 'Word document (.docx)',
    'fmt.docxDesc': 'For handing in or sharing',
    'fmt.pdf': 'PDF',
    'fmt.pdfDesc': "Obsidian's built-in export, layout as on screen",
    'fmt.html': 'Web page (.html)',
    'fmt.htmlDesc': 'One standalone file, opens in a browser',
    'fmt.txt': 'Plain text (.txt)',
    'fmt.txtDesc': 'Text only, no formatting',
    'modal.sameFolder': 'The file is written next to the note, with the same name.',
    'modal.importTitle': 'Import screenplay file',
    'modal.importHint': 'Supports .io, Word .docx, .md / .txt',
    'modal.choose': 'Choose a file…',
    'modal.processing': 'Processing {0} …',
    'modal.failed': 'Failed: {0}',
    'notice.importFailed': 'Import failed: {0}',
    'settings.title': 'Script Zh',
    'settings.desc': 'Tab cycles line types. Scenes, characters and dialogue are written as plain Markdown, so Obsidian renders them natively in both editing and reading views.',
    'settings.language': 'Language',
    'settings.languageDesc': 'Auto follows the Obsidian interface language.',
    'settings.pandoc': 'pandoc path',
    'settings.pandocDesc': 'Only used to export Word / HTML / plain text. Not needed for importing .docx.',
    'settings.testPandoc': 'Test pandoc',
    'settings.test': 'Test',
    'settings.pathMissing': 'Path does not exist: {0}',
    'settings.testFailed': 'Failed: {0}',
    'lang.auto': 'Auto',
  },
  zh: {
    'type.scene': '场景',
    'type.shot': '镜头',
    'type.action': '动作',
    'type.character': '角色',
    'type.dialogue': '台词',
    'type.paren': '说明',
    'type.title': '标题',
    'type.blank': '空行',
    'cmd.set': '设为{0}',
    'cmd.cycle': '循环切换段落类型',
    'cmd.renumber': '重排全部场次编号',
    'ribbon.export': '导出当前剧本',
    'ribbon.import': '导入剧本文件',
    'cmd.exportPick': '导出当前笔记（选格式）',
    'cmd.importFile': '导入剧本文件',
    'notice.renumbered': '已重排 {0} 场',
    'err.notZip': '不是 zip 容器',
    'err.noBody': '这个 docx 里没读到正文（可能是扫描件，或纯图片）',
    'notice.openFirst': '先打开一个笔记',
    'notice.pdfCalled': '已调用 Obsidian 自带的导出 PDF',
    'notice.pdfFailed': 'PDF 导出失败：{0}',
    'notice.noPandoc': '找不到 pandoc：{0}',
    'notice.exportFailed': '导出失败：{0}',
    'notice.exported': '已导出：{0}',
    'default.importName': '导入的剧本',
    'notice.imported': '已导入：{0}',
    'modal.exportTitle': '导出当前剧本',
    'modal.source': '来源：{0}',
    'modal.noNote': '（没有打开笔记）',
    'fmt.docx': 'Word 文档（.docx）',
    'fmt.docxDesc': '交作业、给老师看用这个',
    'fmt.pdf': 'PDF',
    'fmt.pdfDesc': '用 Obsidian 自带的导出，排版跟屏幕上一致',
    'fmt.html': '网页（.html）',
    'fmt.htmlDesc': '单独一个文件，浏览器能打开',
    'fmt.txt': '纯文本（.txt）',
    'fmt.txtDesc': '只要文字，不要任何格式',
    'modal.sameFolder': '文件会和笔记放在同一个文件夹里，文件名相同。',
    'modal.importTitle': '导入剧本文件',
    'modal.importHint': '支持：.io、Word .docx、纯文本 .md / .txt',
    'modal.choose': '选一个文件…',
    'modal.processing': '正在处理 {0} …',
    'modal.failed': '失败：{0}',
    'notice.importFailed': '导入失败：{0}',
    'settings.title': '剧本助手',
    'settings.desc': 'Tab 换段落类型；场景/角色/台词都写成原生 Markdown，编辑和阅读视图都由 Obsidian 自己渲染。',
    'settings.language': '语言',
    'settings.languageDesc': '自动 = 跟随 Obsidian 界面语言。',
    'settings.pandoc': 'pandoc 路径',
    'settings.pandocDesc': '只用于导出 Word / HTML / 纯文本。导入 docx 不需要它。',
    'settings.testPandoc': '测试 pandoc',
    'settings.test': '测试',
    'settings.pathMissing': '路径不存在：{0}',
    'settings.testFailed': '跑不通：{0}',
    'lang.auto': '自动',
  },
};

let LANG = 'en';
function resolveLang(pref) {
  if (pref === 'zh' || pref === 'en') return pref;
  try {
    const l = (window.localStorage.getItem('language') || 'en').toLowerCase();
    return l.startsWith('zh') ? 'zh' : 'en';
  } catch (e) { return 'en'; }
}
function t(key, ...args) {
  const dict = I18N[LANG] || I18N.en;
  let str = dict[key] || I18N.en[key] || key;
  if (args.length) str = str.replace(/\{(\d+)\}/g, (m, i) => (args[i] === undefined ? m : args[i]));
  return str;
}

const TYPES = {
  scene:     { key: 'scene' },
  shot:      { key: 'shot' },
  action:    { key: 'action' },
  character: { key: 'character' },
  dialogue:  { key: 'dialogue' },
  paren:     { key: 'paren' },
};
const typeLabel = (id) => (id && TYPES[id] ? t('type.' + TYPES[id].key) : t('type.action'));
const ORDER = ['scene', 'shot', 'action', 'character', 'dialogue', 'paren'];
// Set this in the plugin settings; paths differ per system, so nothing is preset.
const DEFAULT_PANDOC = '';

// 去掉行首已有的剧本标记
function stripMark(text) {
  let body = text;
  body = body.replace(/^\s*######\s+/, '');
  body = body.replace(/^\s*#####\s+/, '');
  body = body.replace(/^\s*####\s+/, '');
  body = body.replace(/^\s*###\s+/, '');
  body = body.replace(/^\s*##\s+/, '');
  body = body.replace(/^\s*>\s?/, '');
  body = body.replace(/^[\u3000\s]+/, '');
  const m = body.match(/^\*\((.*)\)\*$/);
  if (m) body = m[1];
  return body;
}

function detectType(text) {
  if (/^\s*######\s/.test(text)) return 'action';
  if (/^\s*###\s/.test(text)) return 'shot';
  if (/^\s*#####\s/.test(text)) return 'paren';
  if (/^\s*####\s/.test(text)) return 'character';
  if (/^\s*##\s/.test(text)) return 'scene';
  if (/^\s*>\s?/.test(text)) return 'dialogue';
  if (/^\s*\*\(.*\)\*\s*$/.test(text)) return 'paren';
  return 'action';
}

// ---------- 最小 ZIP 读取 + docx 抽文字（不依赖 pandoc） ----------
function parseZip(buf) {
  const out = new Map();
  let eocd = -1;
  const floor = Math.max(0, buf.length - 66000);
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error(t('err.notZip'));
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) break;
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const nameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + nameLen);
    try {
      const lNameLen = buf.readUInt16LE(localOff + 26);
      const lExtraLen = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lNameLen + lExtraLen;
      const rawData = buf.subarray(start, start + compSize);
      let data = null;
      if (method === 0) data = rawData;
      else if (method === 8) data = zlib.inflateRawSync(rawData);
      if (data) out.set(name, data);
    } catch (e) { /* 跳过坏条目 */ }
    off += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

function qpDecode(str) {
  return str.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
}

function docxToText(buf) {
  const files = parseZip(buf);
  const xmlBuf = files.get('word/document.xml');
  if (xmlBuf) {
    const s = xmlBuf.toString('utf8');
    const paras = s.split(/<w:p[ >]/).slice(1).map((p) => {
      const parts = [];
      const re = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
      let m;
      while ((m = re.exec(p)) !== null) parts.push(m[1]);
      return parts.join('')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim();
    }).filter((x) => x.length > 0);
    if (paras.length) return paras.join('\n\n');
  }
  for (const name of files.keys()) {
    if (/\.(mht|mhtml|htm|html)$/i.test(name)) {
      const raw = files.get(name).toString('utf8');
      const html = raw.includes('Content-Transfer-Encoding') ? qpDecode(raw) : raw;
      const out = htmlToScript(html);
      if (out.trim()) return out;
    }
  }
  throw new Error(t('err.noBody'));
}

// .io 里的 HTML -> 本插件的剧本记号
function htmlToScript(html) {
  const paras = [];
  const re = /<p[^>]*class="([^"]+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const text = m[2].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
    if (text) paras.push({ cls: m[1], text });
  }
  const out = [];
  let sceneNo = 0;
  for (const p of paras) {
    if (p.cls === 'sceneheading') {
      sceneNo++;
      out.push('## ' + sceneNo + '. ' + p.text.replace(/^\s*\d+\s*[.、．]\s*/, ''), '');
    } else if (p.cls === 'character') {
      out.push('#### ' + p.text, '');
    } else if (p.cls === 'parenthetical') {
      out.push('##### ' + p.text.replace(/^[（(]|[）)]$/g, ''), '');
    } else if (p.cls === 'dialog') {
      out.push('> ' + p.text, '');
    } else if (p.cls === 'shot') {
      out.push('### ' + p.text, '');
    } else {
      out.push('###### ' + p.text, '');
    }
  }
  return out.join('\n');
}

function ioToScript(json) {
  return htmlToScript(json.content || '');
}

module.exports = class ScriptZhPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    LANG = resolveLang(this.settings.lang);

    this.badge = document.createElement('div');
    this.badge.className = 'script-zh-badge is-hidden';
    document.body.appendChild(this.badge);

    this.idleMs = 1000;
    this.onMouseMove = (e) => this.hoverUpdate(e);
    this.onKeyDown = () => this.hideBadge();
    document.addEventListener('mousemove', this.onMouseMove, { passive: true });
    document.addEventListener('keydown', this.onKeyDown, true);

    // Tab / Shift+Tab 换类型
    let hooked = false;
    try {
      const { keymap } = require('@codemirror/view');
      const { Prec } = require('@codemirror/state');
      const self = this;
      this.registerEditorExtension(Prec.highest(keymap.of([
        { key: 'Tab', run: () => { self.cycle(1); return true; } },
        { key: 'Shift-Tab', run: () => { self.cycle(-1); return true; } },
      ])));
      hooked = true;
    } catch (e) { console.warn('[script-zh] CM6 不可用', e); }
    if (!hooked) {
      const self = this;
      this.app.scope.register([], 'Tab', () => { if (!self.getEditor()) return false; self.cycle(1); return true; });
      this.app.scope.register([], 'Shift-Tab', () => { if (!self.getEditor()) return false; self.cycle(-1); return true; });
    }



    // 光标移动时刷新状态栏（editor-change 只在内容变化时触发）
    try {
      const { EditorView } = require('@codemirror/view');
      const self = this;
      this.registerEditorExtension(EditorView.updateListener.of((u) => {
        if (u.selectionSet || u.docChanged || u.focusChanged) {
          window.setTimeout(() => self.refresh(), 0);
        }
        if (u.focusChanged) {
          window.setTimeout(() => self.refresh(), 60);
        }
      }));
    } catch (e) { console.warn('[script-zh] 光标监听不可用', e); }

    for (const k of ORDER) {
      this.addCommand({ id: 'set-' + k, name: t('cmd.set', typeLabel(k)), editorCallback: (e) => this.applyType(e, k) });
    }
    this.addCommand({ id: 'cycle-type', name: t('cmd.cycle'), editorCallback: () => this.cycle(1) });
    this.addCommand({ id: 'renumber', name: t('cmd.renumber'), editorCallback: (e) => this.renumber(e) });

    this.addRibbonIcon('file-down', t('ribbon.export'), () => this.openExport());
    this.addRibbonIcon('file-up', t('ribbon.import'), () => this.openImport());
    this.addCommand({ id: 'export-note', name: t('cmd.exportPick'), callback: () => this.openExport() });
    this.addCommand({ id: 'import-file', name: t('cmd.importFile'), callback: () => this.openImport() });

    this.addSettingTab(new ScriptZhSettingTab(this.app, this));

    this.registerEvent(this.app.workspace.on('editor-change', () => this.refresh()));
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.refresh()));
    this.registerEvent(this.app.workspace.on('file-open', () => this.refresh()));
    this.app.workspace.onLayoutReady(() => this.refresh());
  }

  onunload() {
    if (this.onMouseMove) document.removeEventListener('mousemove', this.onMouseMove);
    if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown, true);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.badge) this.badge.remove();
  }

  async loadSettings() {
    this.settings = Object.assign({ pandocPath: DEFAULT_PANDOC, lang: 'auto' }, await this.loadData());
  }
  async saveSettings() { await this.saveData(this.settings); }

  vaultBase() {
    const a = this.app.vault.adapter;
    return a.basePath || (a.getBasePath ? a.getBasePath() : '');
  }

  tmpFile(ext) {
    const dir = path.join(this.vaultBase(), '.script-zh-tmp');
    try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {}
    return path.join(dir, 'zh-' + Date.now() + '-' + Math.floor(Math.random() * 9999) + ext);
  }

  getEditor() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view ? view.editor : null;
  }

  applyType(editor, type) {
    const cur = editor.getCursor();
    const line = cur.line;
    const text = editor.getLine(line);
    let body = stripMark(text).trim();

    let newLine = '###### ' + body;
    // 离开场景类型时，把场次编号一并去掉（否则会残留成 "2. B"）
    if (type !== 'scene') body = body.replace(/^\d+\s*[.、．]\s*/, '');

    if (type === 'shot') {
      newLine = '### ' + body;
    } else if (type === 'scene') {
      const n = this.sceneNumberAt(editor, line);
      newLine = '## ' + n + '. ' + body.replace(/^\s*\d+\s*[.、．]\s*/, '');
    } else if (type === 'character') {
      newLine = '#### ' + body;
    } else if (type === 'dialogue') {
      newLine = '> ' + body;
    } else if (type === 'paren') {
      newLine = '##### ' + body.replace(/^[（(]|[）)]$/g, '');
    }

    const oldLen = text.length;
    editor.replaceRange(newLine, { line, ch: 0 }, { line, ch: oldLen });
    editor.setCursor({ line, ch: newLine.length });
    // 切换后立刻把标签更新出来：优先鼠标位置，否则用光标位置
    const m = this.lastMouse;
    if (m) { this.hoverUpdate(m); }
    else {
      const v = this.app.workspace.getActiveViewOfType(MarkdownView);
      const cm = v && v.editor && v.editor.cm;
      if (cm && typeof cm.coordsAtPos === 'function') {
        const head = cm.state.selection.main.head;
        const c = cm.coordsAtPos(head);
        if (c) this.hoverUpdate({ clientX: c.right, clientY: c.bottom });
      } else {
        this.showBadge(typeLabel(type));
      }
    }
  }

  sceneNumberAt(editor, line) {
    let n = 0;
    for (let i = 0; i < line; i++) {
      if (/^\s*##\s/.test(editor.getLine(i))) n++;
    }
    return n + 1;
  }

  cycle(dir) {
    const editor = this.getEditor();
    if (!editor) return;
    const cur = editor.getCursor();
    const base = detectType(editor.getLine(cur.line));
    const idx = Math.max(0, ORDER.indexOf(base));
    const next = ORDER[(idx + (dir > 0 ? 1 : ORDER.length - 1)) % ORDER.length];
    this.applyType(editor, next);
  }

  renumber(editor) {
    let n = 0;
    for (let i = 0; i < editor.lineCount(); i++) {
      const t = editor.getLine(i);
      if (/^\s*##\s/.test(t)) {
        n++;
        const body = t.replace(/^\s*##\s+/, '').replace(/^\s*\d+\s*[.、．]\s*/, '');
        editor.setLine(i, '## ' + n + '. ' + body);
      }
    }
    new Notice(t('notice.renumbered', n));
  }

  showBadge(text) {
    if (!this.badge) return;
    this.badge.textContent = text;
    this.badge.classList.remove('is-hidden');
  }

  hideBadge() {
    if (!this.badge) return;
    this.badge.classList.add('is-hidden');
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
  }

  // 出现在指针右上方，贴边时自动翻边
  moveBadge(e) {
    if (!this.badge) return;
    const pad = 18;
    const w = this.badge.offsetWidth || 40;
    const h = this.badge.offsetHeight || 18;
    let left = e.clientX + pad;
    let top = e.clientY - pad - h;
    if (left + w > window.innerWidth - 8) left = e.clientX - pad - w;
    if (top < 8) top = e.clientY + pad;
    this.badge.style.left = Math.round(left) + 'px';
    this.badge.style.top = Math.round(top) + 'px';
  }

  // 悬停在正文某一行上时，实时显示那一行的类型
  hoverUpdate(e) {
    if (e && e.clientX !== undefined) this.lastMouse = { clientX: e.clientX, clientY: e.clientY };
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return this.hideBadge();

    const el = document.elementFromPoint(e.clientX, e.clientY);

    // 悬停在文件名标题（内联标题）上
    if (el && el.closest && el.closest('.inline-title')) {
      this.showBadge(t('type.title'));
      this.moveBadge(e);
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.hideBadge(), this.idleMs);
      return;
    }

    const cmDom = view.containerEl.querySelector('.cm-editor');
    if (!cmDom) return this.hideBadge();
    if (!el || !cmDom.contains(el)) return this.hideBadge();

    // 必须真的落在某一行的行框里（行间空隙、右边空白、空白区域都不算）
    const lineEl = el.closest('.cm-line');
    if (!lineEl) return this.hideBadge();
    const rect = lineEl.getBoundingClientRect();
    if (e.clientY < rect.top - 1 || e.clientY > rect.bottom + 1) return this.hideBadge();

    const cm = view.editor && view.editor.cm;
    if (!cm || typeof cm.posAtCoords !== 'function') return this.hideBadge();

    const pos = cm.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos == null) return this.hideBadge();

    const line = cm.state.doc.lineAt(pos);
    const raw = line.text.trim();
    let label;
    if (!raw) label = t('type.blank');
    else {
      const type = detectType(line.text);
      label = typeLabel(type);
    }

    this.showBadge(label);
    this.moveBadge(e);

    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => this.hideBadge(), this.idleMs);
  }

  refresh() {
    // 徽标由鼠标悬停驱动；这里只在没有鼠标位置时兜底隐藏
    if (!this.lastMouse) this.hideBadge();
  }

  // ---------- 导出 ----------
  openExport() { new ExportModal(this).open(); }

  async doExport(ext) {
    const file = this.app.workspace.getActiveFile();
    if (!file) { new Notice(t('notice.openFirst')); return; }
    if (ext === 'pdf') {
      try {
        await this.app.commands.executeCommandById('workspace:export-pdf');
        new Notice(t('notice.pdfCalled'));
      } catch (e) { new Notice(t('notice.pdfFailed', e.message)); }
      return;
    }
    const pandoc = this.settings.pandocPath;
    if (!pandoc || !fs.existsSync(pandoc)) { new Notice(t('notice.noPandoc', pandoc)); return; }

    const text = await this.app.vault.read(file);
    const tmp = this.tmpFile('.md');
    const dir = path.join(this.vaultBase(), path.dirname(file.path));
    const base = path.basename(file.path, path.extname(file.path));
    const target = path.join(dir, base + ext);

    fs.writeFileSync(tmp, text, 'utf8');
    const args = [tmp, '--from', 'markdown'];
    if (ext === '.docx') args.push('--to', 'docx');
    else if (ext === '.html') args.push('--to', 'html5', '--standalone', '--metadata', 'charset=utf-8');
    else args.push('--to', 'plain');
    args.push('-o', target);

    execFile(pandoc, args, { timeout: 60000 }, (err) => {
      try { fs.unlinkSync(tmp); } catch (e) {}
      if (err) { new Notice(t('notice.exportFailed', err.message.split('\n')[0])); return; }
      new Notice(t('notice.exported', target), 6000);
    });
  }

  // ---------- 导入 ----------
  openImport() { new ImportModal(this).open(); }

  async importText(name, text) {
    const base = (name || '').replace(/\.[^.]+$/, '').trim() || t('default.importName');
    let target = base + '.md';
    let n = 1;
    while (this.app.vault.getAbstractFileByPath(target)) { target = base + '-' + n + '.md'; n++; }
    const f = await this.app.vault.create(target, text);
    await this.app.workspace.getLeaf(true).openFile(f);
    new Notice(t('notice.imported', target));
  }
};

class ExportModal extends Modal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; }

  onOpen() {
    const { contentEl } = this;
    const file = this.plugin.app.workspace.getActiveFile();
    contentEl.createEl('h3', { text: t('modal.exportTitle') });
    contentEl.createEl('p', { text: file ? t('modal.source', file.path) : t('modal.noNote') });

    const mk = (label, desc, fn) => {
      const b = contentEl.createEl('button', { text: label });
      b.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0;padding:10px 12px;cursor:pointer;';
      b.onclick = () => { this.close(); fn(); };
      const d = contentEl.createEl('div', { text: desc });
      d.style.cssText = 'font-size:12px;opacity:0.65;margin:-2px 0 8px 2px;';
    };

    mk(t('fmt.docx'), t('fmt.docxDesc'), () => this.plugin.doExport('.docx'));
    mk(t('fmt.pdf'), t('fmt.pdfDesc'), () => this.plugin.doExport('pdf'));
    mk(t('fmt.html'), t('fmt.htmlDesc'), () => this.plugin.doExport('.html'));
    mk(t('fmt.txt'), t('fmt.txtDesc'), () => this.plugin.doExport('.txt'));

    contentEl.createEl('p', { text: t('modal.sameFolder'), cls: 'setting-item-description' });
  }

  onClose() { this.contentEl.empty(); }
}

class ImportModal extends Modal {
  constructor(plugin) { super(plugin.app); this.plugin = plugin; }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h3', { text: t('modal.importTitle') });
    contentEl.createEl('p', { text: t('modal.importHint') });

    const input = contentEl.createEl('input', { type: 'file' });
    input.accept = '.io,.md,.txt,.docx';
    input.style.cssText = 'margin:12px 0;display:block;';

    const status = contentEl.createEl('p', { text: t('modal.choose') });
    status.style.cssText = 'font-size:12px;opacity:0.7;';

    input.onchange = async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      const lower = f.name.toLowerCase();
      try {
        status.setText(t('modal.processing', f.name));
        if (lower.endsWith('.io')) {
          const raw = await f.text();
          const json = JSON.parse(raw);
          await this.plugin.importText(json.title || f.name, ioToScript(json));
          this.close();
        } else if (lower.endsWith('.docx')) {
          const buf = Buffer.from(await f.arrayBuffer());
          await this.plugin.importText(f.name, docxToText(buf));
          this.close();
        } else {
          const txt = await f.text();
          await this.plugin.importText(f.name, txt);
          this.close();
        }
      } catch (e) {
        status.setText(t('modal.failed', e.message));
        new Notice(t('notice.importFailed', e.message));
      }
    };
  }

  onClose() { this.contentEl.empty(); }
}

class ScriptZhSettingTab extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl('h3', { text: t('settings.title') });
    containerEl.createEl('p', { text: t('settings.desc') });

    new Setting(containerEl)
      .setName(t('settings.language'))
      .setDesc(t('settings.languageDesc'))
      .addDropdown((d) => d
        .addOption('auto', t('lang.auto'))
        .addOption('zh', '中文')
        .addOption('en', 'English')
        .setValue(this.plugin.settings.lang || 'auto')
        .onChange(async (v) => {
          this.plugin.settings.lang = v;
          await this.plugin.saveSettings();
          setLang(resolveLang(v));
          this.display();
        }));

    new Setting(containerEl)
      .setName(t('settings.pandoc'))
      .setDesc(t('settings.pandocDesc'))
      .addText((t) => t
        .setValue(this.plugin.settings.pandocPath)
        .onChange(async (v) => { this.plugin.settings.pandocPath = v.trim(); await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(t('settings.testPandoc'))
      .addButton((b) => b.setButtonText(t('settings.test')).onClick(() => {
        const p = this.plugin.settings.pandocPath;
        if (!fs.existsSync(p)) { new Notice(t('settings.pathMissing', p)); return; }
        execFile(p, ['--version'], (err, stdout) => {
          if (err) new Notice(t('settings.testFailed', err.message.split('\n')[0]));
          else new Notice('OK：' + String(stdout).split('\n')[0]);
        });
      }));
  }
}
