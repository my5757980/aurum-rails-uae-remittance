/**
 * Renders SUBMISSION.md to a print-ready PDF.
 *
 * The challenge form accepts .pdf / .pptx / .docx / .txt. A PDF reads better
 * than raw markdown and needs no conversion service, so we generate it here
 * from the same source the repository already holds — one document, one truth.
 *
 * Run through the Playwright MCP with `filename` set to this file.
 */

async (page) => {
  const fs = require("fs");
  const path = require("path");
  const { marked } = require("E:/New folder/ignyty-hackathone/node_modules/marked");

  const root = "E:/New folder/ignyty-hackathone";
  const md = fs.readFileSync(path.join(root, "SUBMISSION.md"), "utf8");
  const body = marked.parse(md);

  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font: 10.5pt/1.55 -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    h1 { font-size: 22pt; letter-spacing: -.02em; margin: 0 0 4pt; color: #020617; }
    h2 {
      font-size: 13pt; margin: 20pt 0 7pt; padding-bottom: 4pt;
      border-bottom: 1.5px solid #10b981; color: #020617;
      page-break-after: avoid; break-after: avoid;
    }
    h3 { font-size: 11pt; margin: 13pt 0 5pt; color: #0f172a; page-break-after: avoid; }
    p, li { margin: 5pt 0; }
    ul, ol { padding-left: 16pt; margin: 5pt 0; }
    strong { color: #020617; }
    hr { border: 0; border-top: 1px solid #e2e8f0; margin: 14pt 0; }
    table {
      border-collapse: collapse; width: 100%; margin: 8pt 0; font-size: 9pt;
      page-break-inside: avoid; break-inside: avoid;
    }
    th {
      background: #f1f5f9; text-align: left; padding: 5pt 7pt;
      border: 1px solid #cbd5e1; font-weight: 700; color: #020617;
    }
    td { padding: 5pt 7pt; border: 1px solid #e2e8f0; vertical-align: top; }
    tr:nth-child(even) td { background: #fafbfc; }
    code {
      background: #f1f5f9; padding: 1pt 4pt; border-radius: 3px;
      font: 8.5pt "SF Mono", Consolas, Monaco, monospace; color: #0f766e;
    }
    pre {
      background: #0f172a; color: #e2e8f0; padding: 10pt; border-radius: 5px;
      overflow: hidden; page-break-inside: avoid; break-inside: avoid;
    }
    pre code { background: none; color: #e2e8f0; font-size: 7.4pt; line-height: 1.35; padding: 0; }
    blockquote {
      border-left: 3px solid #10b981; margin: 8pt 0; padding: 2pt 0 2pt 11pt; color: #334155;
    }
    a { color: #0369a1; text-decoration: none; word-break: break-all; }
    h2 + p, h2 + table { page-break-before: avoid; }
  </style></head><body>${body}</body></html>`;

  const ctx = await page.context().browser().newContext();
  const p = await ctx.newPage();
  await p.setContent(html, { waitUntil: "load" });

  const out = path.join(root, "Aurum-Rails-Submission.pdf");
  await p.pdf({
    path: out,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate:
      '<div style="width:100%;font-size:7pt;color:#94a3b8;padding:0 14mm;display:flex;justify-content:space-between">' +
      "<span>Aurum Rails · Ignyte × Circle × Arc · Track 1</span>" +
      '<span class="pageNumber"></span></div>',
    margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
  });

  await ctx.close();
  const kb = Math.round(fs.statSync(out).size / 1024);
  return JSON.stringify({ pdf: out, sizeKB: kb });
}
