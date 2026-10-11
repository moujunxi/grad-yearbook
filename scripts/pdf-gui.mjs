/**
 * 同学录 PDF · 本地图形界面（单文件，零依赖）
 *
 * 启动:  node scripts/pdf-gui.mjs [--port 7788]
 * 打开:  http://127.0.0.1:7788 （启动后自动打开浏览器）
 *
 * 页面上填数据文件路径（entries.json 或 data.db）→ 点“生成 PDF” → 下载。
 * 仅监听 127.0.0.1；下载只放行本次会话生成过的文件。
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { exec } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = (() => {
  const i = process.argv.indexOf('--port');
  return i > -1 ? Number(process.argv[i + 1]) : Number(process.env.PORT || 7788);
})();

// 本次会话生成过的文件才允许下载（防止本机服务被当成任意文件读取口）
const generated = new Map();

const PAGE = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>同学录 · 本地 PDF 工具</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
    font-family:"Noto Serif CJK SC","STSong","KaiTi","SimSun","Songti SC",serif;
    background:#FAF6ED; color:#2D2A24;
  }
  .card {
    width:100%; max-width:560px; background:#fff;
    border:1px solid rgba(45,42,36,.35); box-shadow:0 10px 40px rgba(45,42,36,.12);
    position:relative; padding:44px 44px 36px;
  }
  .card::before { content:''; position:absolute; inset:8px; border:1px solid rgba(45,42,36,.2); pointer-events:none; }
  .kicker { text-align:center; font-size:11px; letter-spacing:6px; color:#A08F73; margin-bottom:10px; }
  h1 { text-align:center; font-size:30px; letter-spacing:10px; text-indent:10px; font-weight:700; margin-bottom:6px; }
  .rule { width:90px; height:1.5px; margin:14px auto 26px; background:linear-gradient(to right, transparent, rgba(45,42,36,.55), transparent); }
  label { display:block; font-size:12.5px; letter-spacing:2px; color:#7A6A4F; margin:16px 0 6px; }
  label .opt { color:#B9A88C; font-size:11px; letter-spacing:0; }
  input[type=text] {
    width:100%; padding:10px 12px; font-size:13.5px; color:#2D2A24;
    border:1px solid rgba(45,42,36,.4); border-radius:2px; background:#FDFBF6;
    font-family:inherit; outline:none;
  }
  input[type=text]:focus { border-color:#B03A2E; box-shadow:0 0 0 2px rgba(176,58,46,.12); }
  .check { display:flex; align-items:center; gap:8px; margin-top:18px; font-size:13px; color:#4A4335; }
  .check input { width:15px; height:15px; accent-color:#B03A2E; }
  button {
    width:100%; margin-top:26px; padding:13px; cursor:pointer;
    font-size:15px; letter-spacing:6px; text-indent:6px; font-family:inherit;
    color:#FFF6E5; background:#1B2C4A; border:1px solid #C29B34; border-radius:2px;
  }
  button:hover { background:#24395C; }
  button:disabled { opacity:.55; cursor:wait; }
  .status { margin-top:18px; font-size:13px; line-height:1.7; display:none; }
  .status.err { color:#B03A2E; }
  .status.ok { color:#2E6B4F; }
  .log {
    display:none; margin-top:12px; padding:12px; max-height:200px; overflow:auto;
    background:#1E1B16; color:#C9C2B2; font-family:Consolas,monospace; font-size:11.5px;
    line-height:1.6; white-space:pre-wrap; border-radius:2px;
  }
  .download {
    display:none; margin-top:14px; text-align:center; padding:11px;
    background:#B03A2E; color:#FFF6E5; text-decoration:none;
    font-size:14px; letter-spacing:3px; border-radius:2px;
  }
  .download:hover { background:#C6483B; }
  .hint { margin-top:16px; font-size:11.5px; color:#A08F73; line-height:1.8; text-align:center; }
</style></head>
<body>
<div class="card">
  <div class="kicker">GRADUATION YEARBOOK</div>
  <h1>同学录 PDF</h1>
  <div class="rule"></div>
  <form id="f">
    <label>数据文件 <span class="opt">（后台导出的 entries.json 或服务器上的 data.db）</span></label>
    <input type="text" id="data" placeholder="例如: D:\\下载\\entries.json" required>
    <label>头像目录 <span class="opt">（可选，默认取数据文件旁边的 uploads/）</span></label>
    <input type="text" id="uploads" placeholder="例如: D:\\下载\\uploads">
    <label>输出路径 <span class="opt">（可选，默认生成到本工具目录）</span></label>
    <input type="text" id="out" placeholder="例如: D:\\下载\\同学录.pdf">
    <div class="check"><input type="checkbox" id="all"><span>包含已隐藏的条目</span></div>
    <button type="submit" id="btn">生 成 P D F</button>
  </form>
  <div class="status" id="status"></div>
  <a class="download" id="dl" href="#">⬇ 下载 PDF</a>
  <pre class="log" id="log"></pre>
  <div class="hint">数据完全在本机处理，不会上传到任何服务器<br>按数据量不同，一般几秒到十几秒完成</div>
</div>
<script>
  const $ = (id) => document.getElementById(id);
  $('f').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('btn').disabled = true;
    $('status').style.display = 'none';
    $('dl').style.display = 'none';
    $('log').style.display = 'none';
    const st = $('status');
    st.className = 'status'; st.style.display = 'block';
    st.textContent = '⏳ 生成中，请稍候…';
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataPath: $('data').value.trim(),
          uploadsDir: $('uploads').value.trim(),
          outputPath: $('out').value.trim(),
          all: $('all').checked,
        }),
      });
      const r = await res.json();
      if (r.log) { $('log').textContent = r.log; $('log').style.display = 'block'; }
      if (r.ok) {
        st.className = 'status ok';
        st.textContent = '✅ 生成成功：' + r.output;
        $('dl').href = '/api/download?id=' + encodeURIComponent(r.id);
        $('dl').style.display = 'block';
        $('dl').textContent = '⬇ 下载 ' + (r.name || 'PDF');
      } else {
        st.className = 'status err';
        st.textContent = '❌ ' + (r.error || '生成失败');
      }
    } catch (err) {
      st.className = 'status err';
      st.textContent = '❌ 网络错误：' + err.message;
    } finally {
      $('btn').disabled = false;
    }
  });
</script>
</body></html>`;

function json(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function runGenerate({ dataPath, uploadsDir, outputPath, all }, cb) {
  const out = outputPath ? resolve(outputPath) : join(ROOT, '同学录.pdf');
  const args = [join(ROOT, 'scripts', 'generate-pdf.js')];
  args.push(resolve(dataPath));
  args.push(uploadsDir ? resolve(uploadsDir) : '');
  args.push(out);
  if (all) args.push('--all');

  const child = spawn(process.execPath, args, { cwd: ROOT, windowsHide: true });
  let log = '';
  const collect = (d) => { log += d.toString(); };
  child.stdout.on('data', collect);
  child.stderr.on('data', collect);
  const timer = setTimeout(() => {
    try { child.kill(); } catch { /* ignore */ }
    cb({ ok: false, error: '超时（5 分钟）已终止', log });
  }, 5 * 60 * 1000);
  child.on('error', (e) => {
    clearTimeout(timer);
    cb({ ok: false, error: '无法启动生成进程: ' + e.message, log });
  });
  child.on('close', (code) => {
    clearTimeout(timer);
    if (code === 0 && existsSync(out)) cb({ ok: true, out, log });
    else cb({ ok: false, error: '生成失败（退出码 ' + code + '）', log });
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(PAGE);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/generate') {
    let body = '';
    req.on('data', (d) => { body += d; if (body.length > 1e5) req.destroy(); });
    req.on('end', () => {
      let input;
      try { input = JSON.parse(body); } catch { return json(res, 400, { ok: false, error: '请求格式错误' }); }
      const dataPath = String(input.dataPath || '').trim();
      if (!dataPath) return json(res, 400, { ok: false, error: '请填写数据文件路径' });
      if (!existsSync(dataPath)) return json(res, 400, { ok: false, error: '数据文件不存在: ' + dataPath });
      if (statSync(dataPath).isDirectory()) return json(res, 400, { ok: false, error: '这是目录，请指向具体文件' });

      runGenerate(input, (r) => {
        if (!r.ok) return json(res, 500, r);
        const id = randomUUID();
        generated.set(id, r.out);
        json(res, 200, { ok: true, id, output: r.out, name: basename(r.out), log: r.log });
      });
    });
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/download') {
    const id = url.searchParams.get('id') || '';
    const file = generated.get(id);
    if (!file || !existsSync(file) || !file.toLowerCase().endsWith('.pdf')) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(basename(file))}`,
    });
    createReadStream(file).pipe(res);
    return;
  }

  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`✅ 同学录 PDF 图形界面: ${url}`);
  // 自动打开浏览器（Windows）
  if (process.platform === 'win32') {
    try { exec(`start "" "${url}"`); } catch { /* 忽略 */ }
  }
});
