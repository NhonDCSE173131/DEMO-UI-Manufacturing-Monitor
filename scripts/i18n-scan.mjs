import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcDir = path.join(root, 'src');

const exts = new Set(['.tsx', '.ts']);
const ignored = [/\.d\.ts$/, /locales[\\/]/, /node_modules/, /\.next/];

const findings = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (ignored.some((rule) => rule.test(fullPath))) continue;
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const ext = path.extname(entry.name);
    if (!exts.has(ext)) continue;
    scanFile(fullPath);
  }
}

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    const hasJsxLiteral = /<[A-Za-z][^>]*>\s*[A-Za-z\u00C0-\u1EF9][^<{]*<\/?[A-Za-z]/.test(line);
    const hasAttrLiteral = /(title|placeholder|aria-label)="[^"{}]+"/.test(line);

    const isLikelyUnitOnly = />\s*(kW|kWh|rpm|mm\/min|m\/min|cm³\/min|s|OEE|RM|RMSys)\s*</.test(line);
    const isLikelyBrandToken = />\s*[A-Z0-9-]{2,}\s*</.test(line);

    if ((hasJsxLiteral || hasAttrLiteral) && !isLikelyUnitOnly && !isLikelyBrandToken) {
      findings.push({
        filePath,
        line: idx + 1,
        snippet: trimmed.slice(0, 140),
      });
    }
  });
}

if (!fs.existsSync(srcDir)) {
  console.error('Khong tim thay thu muc src');
  process.exit(1);
}

walk(srcDir);

if (findings.length === 0) {
  console.log('Khong phat hien chuoi hardcode trong TS/TSX.');
  process.exit(0);
}

console.log(`Phat hien ${findings.length} chuoi co kha nang hardcode:`);
findings.slice(0, 300).forEach((item) => {
  const rel = path.relative(root, item.filePath).replace(/\\/g, '/');
  console.log(`${rel}:${item.line}  ${item.snippet}`);
});

if (findings.length > 300) {
  console.log(`... va ${findings.length - 300} ket qua khac`);
}

process.exit(1);

