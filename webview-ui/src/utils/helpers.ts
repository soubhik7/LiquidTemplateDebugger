export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function highlightSyntax(escapedLine: string): string {
  let result = escapedLine;
  // 1. Handle {{ expr }} -> Full hover
  result = result.replace(
    /(\{\{-?\s*)(.*?)(\s*-?\}\})/g,
    '<span class="tok-output" data-expr="$2" data-type="output">$1$2$3</span>'
  );

  // 2. Handle {% assign var = expr %} -> Hover on var and expr separately
  result = result.replace(
    /(\{%-?\s*assign\s+)([a-zA-Z0-9_]+)(\s*=\s*)(.*?)(\s*-?%\})/g,
    (match, p1, p2, p3, p4, p5) => {
      return `${p1}<span class="tok-output" data-expr="${p2}" data-type="var">${p2}</span>${p3}<span class="tok-output" data-expr="${p4}" data-type="expr">${p4}</span>${p5}`;
    }
  );

  // 3. Handle other tags
  result = result.replace(
    /(\{%-?\s*)(.*?)(\s*-?%\})/g,
    (match, p1, p2, p3) => {
      if (match.includes('<span')) return match; // Already processed
      return `<span class="tok-tag">${p1}${p2}${p3}</span>`;
    }
  );

  return result;
}

export function truncate(s: string | undefined | null, n: number): string {
  if (!s) return '';
  return s.length > n ? s.substring(0, n - 3) + '…' : s;
}

export function formatRawValue(val: unknown, depth = 0): string {
  if (val === null || val === undefined) return 'nil';
  if (typeof val === 'string') return escapeHtml(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  const indent = '  '.repeat(depth);
  const indent2 = '  '.repeat(depth + 1);
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    return '[\n' + val.map((v) => indent2 + formatRawValue(v, depth + 1)).join(',\n') + '\n' + indent + ']';
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as object);
    if (keys.length === 0) return '{}';
    return (
      '{\n' +
      keys
        .map((k) => indent2 + escapeHtml(k) + ': ' + formatRawValue((val as Record<string, unknown>)[k], depth + 1))
        .join(',\n') +
      '\n' +
      indent +
      '}'
    );
  }
  return escapeHtml(String(val));
}

export function detectFormat(s: string): 'json' | 'xml' | 'csv' | 'text' {
  const t = s.trim();
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      JSON.parse(t);
      return 'json';
    } catch {
      // not JSON
    }
  }
  if (t.startsWith('<') && t.includes('>')) return 'xml';
  if (t.includes(',') && t.split('\n').length > 1) return 'csv';
  return 'text';
}

export function beautifyJson(content: string): string {
  const cleaned = content
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/:\s*,/g, ': null,')
    .replace(/:\s*}/g, ': null}');
  return JSON.stringify(JSON.parse(cleaned), null, 2);
}

function formatXmlNode(node: ChildNode, level: number): string {
  if (node.nodeType === 3 /* TEXT_NODE */) {
    return node.textContent?.trim() ?? '';
  }
  if (node.nodeType !== 1 /* ELEMENT_NODE */) return '';
  const element = node as Element;
  const pad = '  '.repeat(level);
  let r = pad + '<' + element.nodeName;
  for (let i = 0; i < element.attributes.length; i++) {
    const a = element.attributes[i];
    r += ' ' + a.name + '="' + a.value + '"';
  }
  const children = Array.from(element.childNodes).filter(
    (c) => c.nodeType === 1 || (c.nodeType === 3 && c.textContent?.trim())
  );
  if (!children.length) return r + ' />';
  r += '>';
  if (children.length === 1 && children[0].nodeType === 3) {
    return r + (children[0].textContent?.trim() ?? '') + '</' + element.nodeName + '>';
  }
  r += '\n';
  for (const c of element.childNodes) {
    const f = formatXmlNode(c, level + 1);
    if (f) r += f + '\n';
  }
  return r + pad + '</' + element.nodeName + '>';
}

export function beautifyXml(content: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
  return formatXmlNode(doc.documentElement as unknown as ChildNode, 0);
}

export function beautifyContent(content: string, format: string): string {
  if (format === 'json') return beautifyJson(content);
  if (format === 'xml') return beautifyXml(content);
  return content;
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^=!:{}()|[\]\\]/g, '\\$&');
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getScopeColor(scope: string | undefined): string {
  const map: Record<string, string> = {
    input: 'var(--green)',
    global: 'var(--green)',
    assign: 'var(--yellow)',
    for: 'var(--purple)',
    capture: 'var(--orange)',
    increment: 'var(--cyan)',
    decrement: 'var(--cyan)',
  };
  return scope ? (map[scope] ?? 'var(--text-muted)') : 'var(--text-muted)';
}
