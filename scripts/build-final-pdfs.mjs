import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'docs', 'final', 'src');
const outDir = path.join(rootDir, 'docs', 'final');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function parseMarkdown(md) {
  let html = md;

  // Escape HTML entities inside code blocks first
  const codeBlocks = [];
  html = html.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (_, lang, code) => {
    const placeholder = `___CODEBLOCK_${codeBlocks.length}___`;
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`);
    return placeholder;
  });

  // Escape inline code
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const placeholder = `___INLINECODE_${inlineCodes.length}___`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    inlineCodes.push(`<code>${escaped}</code>`);
    return placeholder;
  });

  // Split into lines for block-level parsing
  const lines = html.split(/\r?\n/);
  const outLines = [];
  let inTable = false;
  let tableHeader = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Check table row
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      // Check if delimiter row
      if (cells.every(c => /^:?-+:?$/.test(c))) {
        tableHeader = false;
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeader = true;
        outLines.push('<table class="report-table">');
      }

      if (tableHeader) {
        outLines.push('<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>');
      } else {
        outLines.push('<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>');
      }
      continue;
    } else if (inTable) {
      outLines.push('</tbody></table>');
      inTable = false;
    }

    // Headers
    if (line.startsWith('# ')) {
      outLines.push(`<h1 class="doc-title">${line.slice(2)}</h1>`);
    } else if (line.startsWith('## ')) {
      outLines.push(`<h2>${line.slice(3)}</h2>`);
    } else if (line.startsWith('### ')) {
      outLines.push(`<h3>${line.slice(4)}</h3>`);
    } else if (line.startsWith('#### ')) {
      outLines.push(`<h4>${line.slice(5)}</h4>`);
    } else if (line.startsWith('---')) {
      outLines.push('<hr/>');
    } else if (line.startsWith('> ')) {
      outLines.push(`<blockquote>${line.slice(2)}</blockquote>`);
    } else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      outLines.push(`<li>${line.trim().slice(2)}</li>`);
    } else if (/^\d+\.\s/.test(line.trim())) {
      const text = line.trim().replace(/^\d+\.\s/, '');
      outLines.push(`<li class="numbered">${text}</li>`);
    } else if (line.trim().length === 0) {
      outLines.push('');
    } else {
      outLines.push(`<p>${line}</p>`);
    }
  }

  if (inTable) {
    outLines.push('</tbody></table>');
  }

  let result = outLines.join('\n');

  // Bold & Italic
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Restore Code Blocks
  codeBlocks.forEach((cb, idx) => {
    result = result.replace(`___CODEBLOCK_${idx}___`, cb);
  });
  inlineCodes.forEach((ic, idx) => {
    result = result.replace(`___INLINECODE_${idx}___`, ic);
  });

  return result;
}

const templateCss = `
@page {
  size: A4;
  margin: 16mm 14mm 16mm 14mm;
  @bottom-right {
    content: counter(page);
  }
}
body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  line-height: 1.55;
  color: #1f2937;
  background: #ffffff;
  margin: 0;
  padding: 0;
}
.doc-title {
  font-size: 18pt;
  font-weight: 800;
  color: #111827;
  border-bottom: 2px solid #2563eb;
  padding-bottom: 8px;
  margin-top: 0;
  margin-bottom: 14px;
}
h2 {
  font-size: 13pt;
  font-weight: 700;
  color: #1e3a8a;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 4px;
  margin-top: 20px;
  margin-bottom: 10px;
  page-break-after: avoid;
}
h3 {
  font-size: 11pt;
  font-weight: 600;
  color: #1f2937;
  margin-top: 14px;
  margin-bottom: 6px;
  page-break-after: avoid;
}
h4 {
  font-size: 10.5pt;
  font-weight: 600;
  color: #374151;
  margin-top: 10px;
  margin-bottom: 4px;
}
p {
  margin-top: 0;
  margin-bottom: 8px;
}
hr {
  border: none;
  border-top: 1px solid #d1d5db;
  margin: 14px 0;
}
blockquote {
  border-left: 3px solid #3b82f6;
  margin: 8px 0;
  padding: 4px 12px;
  background-color: #f0f9ff;
  color: #1e40af;
  font-size: 9.5pt;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 9pt;
  background: #f3f4f6;
  padding: 1px 4px;
  border-radius: 3px;
  color: #b91c1c;
}
pre {
  background: #0f172a;
  color: #f8fafc;
  padding: 10px 14px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 8.5pt;
  line-height: 1.4;
  margin: 10px 0;
  page-break-inside: avoid;
}
pre code {
  background: transparent;
  color: inherit;
  padding: 0;
}
.report-table {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 9pt;
  page-break-inside: avoid;
}
.report-table th, .report-table td {
  border: 1px solid #d1d5db;
  padding: 6px 8px;
  text-align: left;
}
.report-table th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #0f172a;
}
.report-table tr:nth-child(even) {
  background-color: #f9fafb;
}
li {
  margin-bottom: 3px;
}
li.numbered {
  list-style-type: decimal;
}
`;

function buildPdf(docName) {
  const mdPath = path.join(srcDir, `${docName}.md`);
  const htmlPath = path.join(outDir, `${docName}.html`);
  const pdfPath = path.join(outDir, `${docName}.pdf`);

  const mdContent = fs.readFileSync(mdPath, 'utf8');
  const bodyHtml = parseMarkdown(mdContent);

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docName}</title>
  <style>${templateCss}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;

  fs.writeFileSync(htmlPath, fullHtml, 'utf8');
  console.log(`[HTML] Generated ${htmlPath}`);

  execFileSync(chromePath, [
    '--headless',
    '--disable-gpu',
    '--run-all-compositor-stages-before-draw',
    `--print-to-pdf=${pdfPath}`,
    '--print-to-pdf-no-header',
    htmlPath
  ]);

  const stat = fs.statSync(pdfPath);
  console.log(`[PDF] Successfully generated ${docName}.pdf (${stat.size} bytes)`);

  // Clean temporary html file
  fs.unlinkSync(htmlPath);
}

const docs = [
  '01_System_Design',
  '02_Encryption_and_Security',
  '03_ML_Model_Report',
  '04_Project_Process_Report',
  '05_University_Project_Review_Defense_Guide'
];

console.log('===> Starting Final Deliverable PDF Generation via Chrome Headless Engine...');
for (const doc of docs) {
  buildPdf(doc);
}
console.log('===> All 5 Final PDFs generated successfully!');
