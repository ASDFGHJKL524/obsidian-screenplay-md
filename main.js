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
  'modal.dest': 'Export to',
  'modal.destTitle': 'Choose where to save',
  'modal.destHint': 'You can edit the path directly. Pick the format below; the extension is filled in for you.',
  'modal.browse': 'Browse…',
  'modal.noDialog': 'System save dialog is unavailable here — edit the path by hand.',
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
  'settings.typewriter': 'Typewriter scrolling',
  'settings.typewriterDesc': 'While typing, keep the caret near the middle of the screen so you never write into the bottom edge.',
  'settings.refDoc': 'Script style template (.docx)',
  'settings.refDocDesc': 'Used when exporting Word. Leave empty to use the bundled template, which maps scene / shot / action / character / paren / dialogue to screenplay layout.',
  'settings.refDocPh': 'bundled template',
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
  'modal.dest': '导出到',
  'modal.destTitle': '选择保存位置',
  'modal.destHint': '路径可以直接改。选下面的格式，扩展名会自动换成对应的。',
  'modal.browse': '浏览…',
  'modal.noDialog': '这里调不出系统的另存为窗口，请直接改上面的路径。',
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
  'settings.typewriter': '打字机滚动',
  'settings.typewriterDesc': '打字时把光标留在屏幕中上部，不会写到屏幕底部才发现看不见自己写的字。',
  'settings.refDoc': '剧本样式模板（.docx）',
  'settings.refDocDesc': '导出 Word 时使用。留空就用插件自带的那份，它把场景 / 镜头 / 动作 / 角色 / 说明 / 台词映射成剧本排版。',
  'settings.refDocPh': '自带模板',
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
  // 剥掉 applyType() 在空行上补的零宽空格，别让它混进正文或导出文件
  body = body.replace(/\u200B/g, '');
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

    // 角标只有一个元素、一个锚点，任何时刻至多一个可见：
    //   'mouse' = 跟着鼠标（悬停某行时提示那行是什么类型）
    //   'caret' = 跟着插入点（Tab 切完类型后提示切成了什么）
    this.badge = document.createElement('div');
    this.badge.className = 'script-zh-badge is-hidden';
    document.body.appendChild(this.badge);

    this.badgeAnchor = null;
    this.hideTimer = null;
    this.mouseMs = 1700;          // 悬停：跟着鼠标显示多久（原 1200，全体 +0.5s）
    this.caretMs = 2500;          // Tab 切完类型：跟着插入点显示多久（原 2000）
    this.clickMs = 1000;          // 点击 / 回车换行：跟着插入点显示多久。
                                  // 修掉"鼠标路过空白处就提前收掉"之后，这个数字才等于实际观感，所以取 1 秒。
    this.lastPointerDown = 0;     // 最近一次按下指针的时间：用来区分"点击"和"打字/程序改选"
    this.lastDownX = -1;
    this.lastDownY = -1;
    this.onMouseMove = (e) => this.hoverUpdate(e);
    this.onKeyDown = (e) => this.onAnyKeyDown(e);
    this.onResize = () => this.hideBadge();
    this.onPointerDown = (e) => {
      this.lastPointerDown = Date.now();
      this.lastDownX = e.clientX;
      this.lastDownY = e.clientY;
    };
    document.addEventListener('mousemove', this.onMouseMove, { passive: true });
    document.addEventListener('keydown', this.onKeyDown, true);
    document.addEventListener('pointerdown', this.onPointerDown, true);
    window.addEventListener('resize', this.onResize);

    // Tab / Shift+Tab 换类型
    let hooked = false;
    try {
      const { keymap } = require('@codemirror/view');
      const { Prec } = require('@codemirror/state');
      const self = this;
      this.registerEditorExtension(Prec.highest(keymap.of([
        { key: 'Tab', run: () => { self.cycle(1); return true; } },
        { key: 'Shift-Tab', run: () => { self.cycle(-1); return true; } },
        // 退格撞到隐藏标记时，一次删掉整个标记。
        // 原因：整行只剩井号（健如 "##"、"#"）时，Obsidian 把它当「空标题」渲染，
        // 那个位置的光标 Chromium 不画——实测四种 CSS（width 0 / auto / 0.35em /
        // 去掉 height）全部无效，只能绕开这个状态，不要停在里面。
        // 退格撞到隐藏标记时的规则（用户定的）：
        //   ① 整行只剩标记（可带空格/占位符）→ 一次把标记删干净，这一行变普通空行
        //   ② 行里还有正文 → **什么都不做**，格式符号受保护，不会被退格吃掉
        //      （以前是"一次删掉整个标记"，会把这一行的类型弄没，正文跟着掉格式）
        { key: 'Backspace', run: (view) => {
          const sel = view.state.selection.main;
          if (!sel.empty) return false;
          const line = view.state.doc.lineAt(sel.head);
          const t = line.text;
          const bare = t.replace(/\u200B/g, '');
          // ① 整行只剩标记
          if (bare.length > 0 && /^(#{1,6}\s*|>\s*)$/.test(bare) && sel.head === line.to) {
            view.dispatch({ changes: { from: line.from, to: line.to, insert: '' }, selection: { anchor: line.from }, scrollIntoView: false });
            return true;
          }
          // ② 光标在标记内部或紧贴标记末尾（正文还在）：吞掉这次退格，符号不动
          const m = t.match(/^(#{2,6}\s+|>\s?)/);
          if (m && sel.head <= line.from + m[1].length) return true;
          return false;
        } },
        // 回车换行：**不延续格式**，新行就是普通文字。类型由你自己按 Tab 切。
        // （中途试过"延续当前类型"，实测不需要；这里以用户的判断为准。）
        //
        // 唯一要处理的是收尾符号：切到台词时占位是 `> “|”`（光标在引号中间），
        // 切到说明是 `##### （|）`。这时按回车，收尾的 `”` / `）` 会被推到下一行开头——
        // 用户看到的就是「引号/括号跟着走」。所以光标后面只剩一个收尾符号时，
        // 把换行插在它**后面**。
        { key: 'Enter', run: (view) => {
          const sel = view.state.selection.main;
          const from = sel.from;
          const to = sel.to;
          const line = view.state.doc.lineAt(from);
          const after = line.text.slice(from - line.from);
          const mClose = after.match(/^([”’"）)]\s*)$/);
          const at = (!sel.empty) ? from : (mClose ? from + 1 : from);
          const delTo = (!sel.empty) ? to : at;
          view.dispatch({
            changes: { from: at, to: delTo, insert: '\n' },
            selection: { anchor: at + 1 },
            scrollIntoView: true      // 必须让视图跟着走，否则到底部后"不翻页"
          });
          return true;
        } },
      ])));
      hooked = true;
    } catch (e) { console.warn('[script-zh] CM6 不可用', e); }
    if (!hooked) {
      const self = this;
      this.app.scope.register([], 'Tab', () => { if (!self.getEditor()) return false; self.cycle(1); return true; });
      this.app.scope.register([], 'Shift-Tab', () => { if (!self.getEditor()) return false; self.cycle(-1); return true; });
    }

    // 两种触发下，跟着插入点把「这行是什么类型」报出来：
    //   ① 鼠标点击把光标放到某一行
    //   ② 按回车换行到下一行
    // 其余情况（普通打字、切文件、程序改选）都不弹，免得一直闪。
    try {
      const { EditorView } = require('@codemirror/view');
      const self = this;
      this.registerEditorExtension(EditorView.updateListener.of((u) => {
        if (!u.selectionSet && !u.docChanged) return;

        // ---------- ⓪ 先把触发条件算出来（下面两段都要用）----------
        // 触发条件：鼠标点击，或者这次事务动了换行符——
        //   插入换行（回车 / Shift+回车 / 粘贴多行）
        //   删除换行（退格把两行并成一行）← 原先漏了，表现为「退格退到上一行没有气泡」
        let insertedNewline = false;
        if (u.docChanged) {
          try {
            u.transactions.forEach((tr) => {
              if (insertedNewline) return;
              tr.changes.iterChanges((fromA, toA, fromB, toB, ins) => {
                if (!insertedNewline && ins.toString().indexOf('\n') >= 0) insertedNewline = true;
              });
            });
          } catch (e) { /* iterChanges 不可用就退化为只认点击 */ }
        }
        const mergedLines = u.docChanged && u.state.doc.lines < u.startState.doc.lines;
        const touchedBreak = insertedNewline || mergedLines;
        const clicked = Date.now() - self.lastPointerDown <= 500;

        // ---------- ① 光标归一化（任何改动 / 光标移动都做，与气泡无关） ----------
        // 标记是零宽的，点击或退格之后光标很容易停在标记内部或标记后的边界上，
        // 那里接着打字会插到 "#### " 前面，把这一行的类型弄坏；
        // 行里只剩标记时那个位置连行高都没有，caret 根本画不出来。
        //
        // 输入法合成期间一律不碰文档：那时 dispatch 会让 CodeMirror 从 DOM 反同步，
        // 表现就是「打一个首字母，它被重复写一遍留在那儿」。等合成结束再说。
        const view = u.view;
        if (view.composing) return;
        const selNow = u.state.selection.main;
        if (selNow.empty) {
          const lineNo = u.state.doc.lineAt(selNow.head).number;
          setTimeout(() => {
            try {
              const st = view.state;
              const sel = st.selection.main;
              if (!sel.empty) return;                       // 有选区就别动
              const cur = st.doc.lineAt(sel.head);
              if (cur.number !== lineNo) return;            // 光标已经走开，别追着改
              const m = cur.text.match(/^(#{2,6}\s+|>\s?)/);
              if (!m) return;                               // 不是带标记的行
              const prefixEnd = cur.from + m[1].length;
              const rest = cur.text.slice(m[1].length);
              const body = rest.replace(/\u200B/g, '');
              const hasZwsp = rest.indexOf('\u200B') >= 0;
              // 整行只剩标记：补一个占位字符，并把光标归到行尾。
              // 两件事都必须做：
              //  · 不补占位符 → 这种行重绘之后光标不画（实测行尾 5/5 位置拍不到）
              //  · 不归位 → 点击会落在标记内部（实测第 3 列），接着打字插进 "###" 和 "#" 之间
              if (!body) {
                if (!hasZwsp) {
                  view.dispatch({
                    changes: { from: cur.to, insert: '\u200B' },
                    selection: { anchor: cur.to + 1 },
                    scrollIntoView: false
                  });
                } else if (sel.head !== cur.to) {
                  view.dispatch({ selection: { anchor: cur.to }, scrollIntoView: false });
                }
                return;
              }
              // 有正文之后，占位符要清掉。它只在「整行空着」时有用，留着会变成
              // 「标记 + 隐形字符 + 正文」，光标画不出来。
              //
              // 但**不能当场清**：打字时立刻 dispatch 会打断输入法合成，实测表现是
              // 「打一个首字母，它被重复写一遍留在那儿」。所以延后到你停顿下来再清，
              // 而且清之前再确认一次（停顿时可能已经在别的行、或者这行又变空了）。
              if (hasZwsp) {
                if (self.zwspTimer) clearTimeout(self.zwspTimer);
                self.zwspTimer = setTimeout(() => {
                  self.zwspTimer = null;
                  try {
                    if (view.composing) return;                    // 还在合成，别动
                    const st2 = view.state;
                    const cur2 = st2.doc.lineAt(st2.selection.main.head);
                    if (cur2.number !== cur.number) return;        // 光标已经走开
                    const m2 = cur2.text.match(/^(#{2,6}\s+|>\s?)/);
                    if (!m2) return;
                    if (!cur2.text.slice(m2[1].length).replace(/\u200B/g, '')) return; // 又空了，留着占位
                    const zIdx = cur2.text.indexOf('\u200B');
                    if (zIdx < 0) return;
                    const from = cur2.from + zIdx;
                    view.dispatch({ changes: { from, to: from + 1, insert: '' }, scrollIntoView: false });
                  } catch (e) { /* 清理失败不影响编辑 */ }
                }, 300);
                return;
              }
              // 有正文时，把光标从标记内部挪到正文开头
              if (sel.head <= prefixEnd) {
                view.dispatch({ selection: { anchor: prefixEnd }, scrollIntoView: false });
              }
            } catch (e) { /* 归一化失败不影响其它功能 */ }
          }, 0);
        }

        // ---------- ③ 打字机滚动：把光标拉回视觉舒适区 ----------
        // 打字时如果光标掉到屏幕中线下太多，就把视图往下带，让正在写的那一行
        // 始终停在屏幕中上部——不用写到底部才发现看不见自己在写什么。
        // 只在**内容变化**时触发：光标纯移动（点选、翻页）不抢滚动条。
        if (u.docChanged && self.settings.typewriter !== false && !u.view.composing) {
          const v2 = u.view;
          const go = () => self.centerCaret(v2);
          requestAnimationFrame(go);
          setTimeout(go, 60);          // 排版晚一帧时兜底（跟角标同款处理）
        }

        // ---------- ② 该不该弹气泡 ----------
        if (!clicked && !touchedBreak) return;
        if (!u.selectionSet) return;

        const head = u.state.selection.main.head;
        const line = u.state.doc.lineAt(head);
        const body = line.text.replace(/\u200B/g, '').trim();
        const label = !body ? t('type.blank') : typeLabel(detectType(line.text));
        self.showCaretBadgeLabel(label, self.clickMs);
      }));
    } catch (e) { console.warn('[script-zh] updateListener 不可用', e); }



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

    // 换文件 / 换叶子时旧角标立刻撤掉；正文变动不再参与，
    // 否则 Tab 刚画到插入点的角标会被 content change 擦掉。
    this.registerEvent(this.app.workspace.on('active-leaf-change', () => this.hideBadge()));
    this.registerEvent(this.app.workspace.on('file-open', () => this.hideBadge()));
  }

  onunload() {
    if (this.onMouseMove) document.removeEventListener('mousemove', this.onMouseMove);
    if (this.onKeyDown) document.removeEventListener('keydown', this.onKeyDown, true);
    if (this.onPointerDown) document.removeEventListener('pointerdown', this.onPointerDown, true);
    if (this.onResize) window.removeEventListener('resize', this.onResize);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.badge) this.badge.remove();
  }

  async loadSettings() {
    this.settings = Object.assign({ pandocPath: DEFAULT_PANDOC, refDocPath: '', typewriter: true, lang: 'auto' }, await this.loadData());
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
    // 先剥行首标记，再剥掉可能已经存在的包装符（引号 / 括号），
    // 否则来回切几次会越包越多：““台词””
    let body = stripMark(text).trim();
    body = body.replace(/^[“”"'‘’]+/, '').replace(/[“”"'‘’]+$/, '').trim();
    body = body.replace(/^[（(]+/, '').replace(/[）)]+$/, '').trim();
    // 离开场景类型时，把场次编号一并去掉（否则会残留成 "2. B"）
    if (type !== 'scene') body = body.replace(/^\d+\s*[.、．]\s*/, '');

    let prefix = '###### ';
    let pre = '';
    let suf = '';

    if (type === 'shot') {
      prefix = '### ';
    } else if (type === 'scene') {
      prefix = '## ' + this.sceneNumberAt(editor, line) + '. ';
      body = body.replace(/^\s*\d+\s*[.、．]\s*/, '');
    } else if (type === 'character') {
      prefix = '#### ';
    } else if (type === 'dialogue') {
      prefix = '> ';
      pre = '“'; suf = '”';        // 台词用中文引号包起来
    } else if (type === 'paren') {
      prefix = '##### ';
      pre = '（'; suf = '）';      // 说明（情绪/动作提示）用全角括号包起来
    }

    // 不插零宽空格占位：隐藏标记改成绝对定位之后，整行只剩标记时这一行照样
    // 能画光标（实测 #### / ## / > 三种空标记行的行尾都拍到了光标闪动）。
    // 反过来，插了占位符会带来两个坑：① 退格退不掉它；② 一旦开始打字，
    // 清理这个隐形字符的那次 dispatch 会让光标失去绘制（实测角色行打一个字光标就没了）。
    // 老文件里已经有的残留由归一化那段的清理逻辑负责删掉。
    const newLine = prefix + pre + body + suf;
    const caret = newLine.length - suf.length;

    const oldLen = text.length;
    editor.replaceRange(newLine, { line, ch: 0 }, { line, ch: oldLen });
    editor.setCursor({ line, ch: caret });
    // 切完类型：在插入点右上角报出“现在是什么类型”，不再借用鼠标坐标
    this.showCaretBadge(type);
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

  // ---------- 角标（鼠标 / 插入点，二选一） ----------
  // 同一时间只可能显示一个：鼠标在正文行上就跟着鼠标，
  // Tab / 命令切完类型就跟着插入点；切换锚点前旧锚点先撤掉。

  getCM() {
    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    return view && view.editor ? view.editor.cm : null;
  }

  editorFocused() {
    const a = document.activeElement;
    return !!(a && a.closest && a.closest('.cm-editor'));
  }

  // 插入点所在文本行在屏幕上的行框；拿不到时返回 null
  // 注意：CM 在“光标右边没字”（行尾/空行）时只返回一个点（h=0），
  // 直接拿它当行顶会把角标压到光标身上，所以这里要补出一行的高度。
  caretRect(cm) {
    if (!cm) return null;
    try {
      const head = cm.state.selection.main.head;
      const c = cm.coordsAtPos(head);
      if (!c) return null;
      const lh = cm.defaultLineHeight || 22;
      const tall = c.bottom - c.top > 2;
      return {
        left: c.left,
        right: c.right || c.left,
        top: tall ? c.top : c.top - lh,
        bottom: tall ? c.bottom : c.top,
      };
    } catch (e) { /* 正在重排，交给下一帧 */ }
    return null;
  }

  // 贴锚点右上角；右边放不下翻到左边，顶部放不下翻到下方
  placeBadge(rect, gapX, gapY) {
    if (!this.badge) return;
    const w = this.badge.offsetWidth || 44;
    const h = this.badge.offsetHeight || 20;
    let left = rect.right + gapX;
    let top = rect.top - gapY - h;
    if (left + w > window.innerWidth - 8) left = rect.left - gapX - w;
    if (left < 8) left = 8;
    if (top < 8) top = rect.bottom + gapY;
    this.badge.style.left = Math.round(left) + 'px';
    this.badge.style.top = Math.round(top) + 'px';
  }

  // anchor: 'mouse' | 'caret'；rect 是锚点的包围盒
  showBadge(text, anchor, rect, msOverride) {
    if (!this.badge) return;
    this.badge.textContent = text;
    this.badge.classList.toggle('is-caret', anchor === 'caret');
    this.badge.classList.remove('is-hidden');
    this.badgeAnchor = anchor;
    if (anchor === 'caret') this.placeBadge(rect, 12, 6);
    else this.placeBadge(rect, 18, 18);
    if (this.hideTimer) clearTimeout(this.hideTimer);
    const ms = msOverride || (anchor === 'caret' ? this.caretMs : this.mouseMs);
    this.hideTimer = setTimeout(() => this.hideBadge(), ms);
  }

  hideBadge() {
    if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
    if (!this.badge) return;
    this.badge.classList.add('is-hidden');
    this.badgeAnchor = null;
  }

  // 键盘没经过鼠标就切了类型：把“切成了什么”写在插入点右上角
  showCaretBadge(type, attempt) {
    this.showCaretBadgeLabel(typeLabel(type), this.caretMs, attempt);
  }

  // 通用版：直接给文案和显示时长（点击定位用 1 秒，Tab 切类型用 2 秒）
  showCaretBadgeLabel(label, ms, attempt) {
    const cm = this.getCM();
    const rect = this.caretRect(cm);
    if (rect) {
      this.showBadge(label, 'caret', rect, ms);
      // 行内容刚换过，排版会晚一两帧；而且整行只剩标记时还会再补一个占位字符，
      // 光标要再挪一次（实测角色行从 x=431 跳到 492，气泡留在 443 就成了
      // 「飞到行首/左上角」）。所以这里**追几帧**，直到插入点不再移动为止。
      const self = this;
      let last = null;
      let tries = 0;
      const follow = () => {
        if (self.badgeAnchor !== 'caret') return;   // 已经被别的锚点接管
        const r2 = self.caretRect(cm);
        if (r2) {
          const key = Math.round(r2.left) + ':' + Math.round(r2.top);
          if (key !== last) { last = key; self.placeBadge(r2, 12, 6); }
        }
      };
      // 两条路一起跟：rAF 跟排版，定时器兜底。
      // 窗口在后台时 Chromium 会限制 rAF（实测一帧都不执行），只靠 rAF 会停在旧位置。
      const tick = () => { follow(); if (++tries < 10) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
      [40, 100, 200, 360].forEach((ms) => setTimeout(follow, ms));
      return;
    }
    // 偶尔第一帧还量不到插入点：最多再等 4 帧，仍拿不到就别乱放
    const n = attempt || 0;
    if (n >= 4) { this.hideBadge(); return; }
    const self = this;
    requestAnimationFrame(() => self.showCaretBadgeLabel(label, ms, n + 1));
  }

  // Tab / Shift+Tab 交给 CM 的 keymap 处理（处理完会自己画角标）；其它按键撤掉角标
  onAnyKeyDown(e) {
    if (e && e.key === 'Tab' && this.editorFocused()) return;
    this.hideBadge();
  }

  // 悬停在正文某一行上时，实时显示那一行的类型（贴着鼠标右上角）
  hoverUpdate(e) {
    if (!e || e.clientX === undefined) return;
    // 点击时浏览器会顺带补一个同坐标的 mousemove；别让它把刚放到插入点的气泡顶掉。
    // 只有"真的移到了新位置"才让悬停接管。
    if (Date.now() - this.lastPointerDown < 150 &&
        Math.abs(e.clientX - this.lastDownX) < 3 &&
        Math.abs(e.clientY - this.lastDownY) < 3) {
      return;
    }

    // 插入点气泡（点击 / 回车 / Tab 切类型）有自己的时长，不该被"鼠标路过空白处"提前打断。
    // 只有真正悬停到某一行上，才把气泡所有权接过去。
    const miss = () => {
      if (this.badgeAnchor !== 'caret') this.hideBadge();
    };

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (!view) return miss();
    const at = { left: e.clientX, right: e.clientX, top: e.clientY, bottom: e.clientY };

    const el = document.elementFromPoint(e.clientX, e.clientY);

    // 悬停在文件名标题（内联标题）上
    if (el && el.closest && el.closest('.inline-title')) {
      return this.showBadge(t('type.title'), 'mouse', at);
    }

    const cmDom = view.containerEl.querySelector('.cm-editor');
    if (!cmDom) return miss();
    if (!el || !cmDom.contains(el)) return miss();

    // 必须真的落在某一行的行框里（行间空隙、右边空白、空白区域都不算）
    const lineEl = el.closest('.cm-line');
    if (!lineEl) return miss();
    const lrect = lineEl.getBoundingClientRect();
    if (e.clientY < lrect.top - 1 || e.clientY > lrect.bottom + 1) return miss();

    const cm = view.editor && view.editor.cm;
    if (!cm || typeof cm.posAtCoords !== 'function') return miss();

    const pos = cm.posAtCoords({ x: e.clientX, y: e.clientY });
    if (pos == null) return miss();

    const line = cm.state.doc.lineAt(pos);
    const raw = line.text.trim();
    const label = !raw ? t('type.blank') : typeLabel(detectType(line.text));
    this.showBadge(label, 'mouse', at);
  }

  // ---------- 打字机滚动 ----------
  // 光标在滚动容器里的纵向位置超过「舒适区中心 + 容差」就把视图带过去，
  // 让它回到舒适区中心。舒适区默认取容器高度的 45%，上下各留 12% 不动，
  // 这样小幅移动不会抖。
  centerCaret(view) {
    try {
      if (!view || !view.scrollDOM) return;
      const sc = view.scrollDOM;
      const head = view.state.selection.main.head;
      const c = view.coordsAtPos(head);
      if (!c) return;
      const r = sc.getBoundingClientRect();
      if (r.height < 40) return;
      const y = c.top - r.top;                       // 光标相对滚动容器顶部的距离
      // 标准打字机模式：把正在写的那一行钉在屏幕偏上三分之一处，
      // 下方留出约 2/3 的预览空间，写的时候能一直看到后面几行。
      const anchor = r.height * 0.35;                // 停靠线：从上往下 35%
      const band = r.height * 0.08;                  // 容差：这条线上下各 8% 内不动，免得抖
      if (y > anchor + band) sc.scrollTop += Math.round(y - anchor);
      else if (y < anchor - band) sc.scrollTop += Math.round(y - anchor);
    } catch (e) { /* 量不到就算了，不影响打字 */ }
  }

  // ---------- 导出 ----------
  openExport() { new ExportModal(this).open(); }

  // 导出的 Markdown 必须先「一行一块」：剧本是一行一个元素，但 Markdown 里
  // 相邻的行属于**同一个段落**，直接喂给 pandoc 会把 #### 角色 当成正文里的一段文字。
  // 所以导出前去掉空行、每块之间补一个空行。
  normalizeForExport(raw) {
    const lines = String(raw).split(/\r?\n/).map((s) => s.replace(/\s+$/, '')).filter((s) => s.trim().length > 0);
    // 不像剧本（没有两行以上带标记的）就别动，按原样导出
    const marked = lines.filter((s) => /^\s*(#{2,6}\s|>\s?)/.test(s)).length;
    if (marked < 2) return String(raw);
    return lines.map((s) => s.trim()).join('\n\n') + '\n';
  }

  // 剧本样式模板：让 pandoc 把各级标题 / 引用块映射成剧本排版
  refDocPath() {
    const p = (this.settings.refDocPath || '').trim();
    if (p && fs.existsSync(p)) return p;
    const builtin = path.join(this.manifest.dir || '', 'screenplay-ref.docx');
    return fs.existsSync(builtin) ? builtin : '';
  }

  async doExport(ext, chosenPath) {
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

    // 导出前清掉空行占位用的零宽空格，避免漏进 Word / HTML / 纯文本
    const text = this.normalizeForExport((await this.app.vault.read(file)).replace(/\u200B/g, ''));
    const tmp = this.tmpFile('.md');
    const dir = path.join(this.vaultBase(), path.dirname(file.path));
    const base = path.basename(file.path, path.extname(file.path));
    // 用户在导出弹窗里指定了位置就用它，否则跟在笔记旁边
    const target = (chosenPath && chosenPath.trim()) ? chosenPath.trim() : path.join(dir, base + ext);

    fs.writeFileSync(tmp, text, 'utf8');
    const head = [tmp, '--from', 'markdown'];
    if (ext === '.docx') {
      head.push('--to', 'docx');
      // 有剧本样式模板就带上，场景/角色/台词才会是剧本的样子而不是默认公文
      const ref = this.refDocPath();
      if (ref) head.push('--reference-doc=' + ref);
    } else if (ext === '.html') head.push('--to', 'html5', '--standalone', '--metadata', 'charset=utf-8');
    else head.push('--to', 'plain');

    const firstErr = (err, se) => {
      const d = String(se || (err && err.stderr) || '').trim().split('\n').map((s) => s.trim()).filter(Boolean)[0];
      return d || String((err && err.message) || '').split('\n')[0];
    };

    // 先直接写目标文件；不行再退一步：让 pandoc 写到系统临时目录，
    // 由 Obsidian 自己把字节搬进库里。
    // 需要这一步的原因：实测有些环境下 pandoc 被拦在库目录之外（报
    // "withBinaryFile: permission denied"），只有 Obsidian 自己的进程能写库。
    const run = (out, cb) => execFile(pandoc, head.concat(['-o', out]), { timeout: 60000 }, (err, so, se) => cb(err, se));

    run(target, (err, se) => {
      if (!err) {
        try { fs.unlinkSync(tmp); } catch (e) {}
        new Notice(t('notice.exported', target), 6000);
        return;
      }
      const alt = path.join(require('os').tmpdir(), 'script-zh-' + Date.now() + ext);
      run(alt, (err2, se2) => {
        try { fs.unlinkSync(tmp); } catch (e) {}
        if (err2) {
          new Notice(t('notice.exportFailed', firstErr(err2, se2) || firstErr(err, se)), 12000);
          return;
        }
        try {
          fs.copyFileSync(alt, target);
          fs.unlinkSync(alt);
          new Notice(t('notice.exported', target), 6000);
        } catch (e) {
          new Notice(t('notice.exportFailed', String(e.message || e)), 12000);
        }
      });
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

  // 试着叫系统「另存为」窗口；拿不到就只靠下面那个路径框手填
  async pickPath(input, ext) {
    try {
      let remote = null;
      try { remote = require('electron').remote; } catch (e) {}
      if (!remote) { try { remote = require('@electron/remote'); } catch (e) {} }
      if (!remote || !remote.dialog) { new Notice(t('modal.noDialog')); return; }
      const filters = ext === '.html'
        ? [{ name: 'HTML', extensions: ['html'] }]
        : ext === '.txt'
          ? [{ name: 'Text', extensions: ['txt'] }]
          : [{ name: 'Word', extensions: ['docx'] }];
      const res = await remote.dialog.showSaveDialog({
        title: t('modal.destTitle'),
        defaultPath: input.value,
        filters,
        properties: ['createDirectory', 'showOverwriteConfirmation']
      });
      if (res && !res.canceled && res.filePath) input.value = res.filePath;
    } catch (e) {
      new Notice(t('modal.noDialog'));
    }
  }

  onOpen() {
    const { contentEl } = this;
    const file = this.plugin.app.workspace.getActiveFile();
    contentEl.createEl('h3', { text: t('modal.exportTitle') });
    contentEl.createEl('p', { text: file ? t('modal.source', file.path) : t('modal.noNote') });

    // 默认位置：笔记旁边、同名 .docx
    const base = this.plugin.vaultBase();
    const dirPath = file ? path.join(base, path.dirname(file.path)) : base;
    const stem = file ? path.basename(file.path, path.extname(file.path)) : t('default.importName');
    const defaultPath = path.join(dirPath, stem + '.docx');

    contentEl.createEl('div', { text: t('modal.dest'), cls: 'setting-item-name' });
    const row = contentEl.createDiv();
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin:4px 0 14px;';
    const input = row.createEl('input', { type: 'text' });
    input.value = defaultPath;
    input.style.cssText = 'flex:1;min-width:0;padding:6px 8px;';
    const browse = row.createEl('button', { text: t('modal.browse') });
    browse.onclick = () => this.pickPath(input, '.docx');
    const hint = contentEl.createEl('div', { text: t('modal.destHint'), cls: 'setting-item-description' });
    hint.style.marginTop = '-8px';

    const withExt = (p, ext) => {
      const s = String(p || '').trim();
      if (!s) return '';
      const cur = path.extname(s);
      return cur ? s.slice(0, -cur.length) + ext : s + ext;
    };

    const mk = (label, desc, ext) => {
      const b = contentEl.createEl('button', { text: label });
      b.style.cssText = 'display:block;width:100%;text-align:left;margin:4px 0;padding:10px 12px;cursor:pointer;';
      b.onclick = () => {
        const chosen = ext === 'pdf' ? null : withExt(input.value, ext);
        this.close();
        this.plugin.doExport(ext, chosen);
      };
      const d = contentEl.createEl('div', { text: desc });
      d.style.cssText = 'font-size:12px;opacity:0.65;margin:-2px 0 8px 2px;';
    };

    mk(t('fmt.docx'), t('fmt.docxDesc'), '.docx');
    mk(t('fmt.pdf'), t('fmt.pdfDesc'), 'pdf');
    mk(t('fmt.html'), t('fmt.htmlDesc'), '.html');
    mk(t('fmt.txt'), t('fmt.txtDesc'), '.txt');
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

    new Setting(containerEl)
      .setName(t('settings.typewriter'))
      .setDesc(t('settings.typewriterDesc'))
      .addToggle((tg) => tg
        .setValue(this.plugin.settings.typewriter !== false)
        .onChange(async (v) => { this.plugin.settings.typewriter = v; await this.plugin.saveSettings(); }));

    new Setting(containerEl)
      .setName(t('settings.refDoc'))
      .setDesc(t('settings.refDocDesc'))
      .addText((x) => x
        .setPlaceholder(t('settings.refDocPh'))
        .setValue(this.plugin.settings.refDocPath || '')
        .onChange(async (v) => { this.plugin.settings.refDocPath = v.trim(); await this.plugin.saveSettings(); }));
  }
}
