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

  // 1. Handle "key": "{{ expr }}" or "key": {{ expr }} -> Hover on key (virtual)
  result = result.replace(
    /((?:&quot;|&#039;|["'])?([a-zA-Z0-9_.]+)(?:&quot;|&#039;|["'])?)(\s*:\s*(?:&quot;|&#039;|["'])?\s*)(\{\{-?\s*(.*?)\s*-?\}\})/g,
    (match, keyPart, keyName, colonPart, exprWrapper, exprContent) => {
      // Use the full expression (post-operation) for the key hover
      return `<span class="tok-output" data-expr="${exprContent.trim()}" data-type="virtual">${keyPart}</span>${colonPart}${exprWrapper}`;
    }
  );

  // 2. Handle {{ expr }} -> Full hover with split pre/post filter zones
  result = result.replace(
    /(\{\{-?\s*)(.*?)(\s*-?\}\})/g,
    (match, p1, p2, p3) => {
      // If this was already processed as a virtual hover by Rule 1, we still want to enhance the expression part
      let fullExpr = p2;
      let parts = fullExpr.split('|');
      let base = parts[0];
      let filters = parts.slice(1).join('|');
      
      let baseHighlighted = base.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|'.*?'|".*?")/g, '<span class="tok-string">$1</span>');
      let filtersHighlighted = filters ? filters.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|'.*?'|".*?")/g, '<span class="tok-string">$1</span>') : '';
      
      // Wrap base (pre-filter) as 'var' and filters (post-filter) as 'output'
      let res = `<span class="tok-output" data-expr="${base.trim()}" data-type="var">${p1}${baseHighlighted}${filters ? '' : p3}</span>`;
      if (filters) {
        res += `<span class="tok-output" data-expr="${fullExpr.trim()}" data-type="output">|${filtersHighlighted}${p3}</span>`;
      }
      return res;
    }
  );

  // 3. Handle {% assign var = expr %} -> Hover on var and expr separately
  result = result.replace(
    /(\{%-?\s*assign\s+)([a-zA-Z0-9_]+)(\s*=\s*)(.*?)(\s*-?%\})/g,
    (match, p1, p2, p3, p4, p5) => {
      let val = p4;
      val = val.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|'.*?'|".*?")/g, '<span class="tok-string">$1</span>');
      return `${p1}<span class="tok-output" data-expr="${p2}" data-type="var">${p2}</span>${p3}<span class="tok-output" data-expr="${p4}" data-type="expr">${val}</span>${p5}`;
    }
  );

  // 4. Handle other tags with keyword highlighting and hover mappings for loop/condition
  result = result.replace(
    /(\{%-?\s*)(.*?)(\s*-?%\})/g,
    (match, p1, p2, p3) => {
      if (match.includes('<span')) return match; // Already processed
      let inner = p2;

      // 4a. Check for 'for' loop: {% for rec in content.records %}
      const forMatch = inner.match(/^\s*for\s+([a-zA-Z_]\w*)\s+in\s+([a-zA-Z0-9_.]+)(.*)$/);
      if (forMatch) {
        const loopVar = forMatch[1];
        const collection = forMatch[2];
        const rest = forMatch[3];

        const strings: string[] = [];
        let cleanRest = rest.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|&#39;.*?&#39;|'.*?'|".*?")/g, (sMatch: string) => {
          const placeholder = `___STR_PLACEHOLDER_${strings.length}___`;
          strings.push(sMatch);
          return placeholder;
        });

        let restHighlighted = cleanRest.replace(/\b(limit|offset|reversed)\b/g, '<span class="tok-keyword">$1</span>');

        strings.forEach((str, idx) => {
          const placeholder = `___STR_PLACEHOLDER_${idx}___`;
          restHighlighted = restHighlighted.replace(placeholder, `<span class="tok-string">${str}</span>`);
        });

        return `<span class="tok-tag">${p1}<span class="tok-keyword">for</span> <span class="tok-output" data-expr="${loopVar}" data-type="var">${loopVar}</span> <span class="tok-keyword">in</span> <span class="tok-output" data-expr="${collection}" data-type="expr">${collection}</span>${restHighlighted}${p3}</span>`;
      }

      // 4b. Check for condition tags: {% if / elsif / unless condition %}
      const ifMatch = inner.match(/^\s*(if|elsif|unless)\s+(.*)$/);
      if (ifMatch) {
        const tag = ifMatch[1];
        const condition = ifMatch[2];

        const strings: string[] = [];
        let cleanCondition = condition.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|&#39;.*?&#39;|'.*?'|".*?")/g, (sMatch: string) => {
          const placeholder = `___STR_PLACEHOLDER_${strings.length}___`;
          strings.push(sMatch);
          return placeholder;
        });

        const keywords = new Set(['if', 'elsif', 'unless', 'true', 'false', 'nil', 'and', 'or', 'contains', 'limit', 'offset', 'empty']);
        let conditionHighlighted = cleanCondition.replace(/\b([a-zA-Z_][a-zA-Z0-9_.]*)\b/g, (wMatch: string, path: string) => {
          if (path.startsWith('___STR_PLACEHOLDER_')) return wMatch;
          if (keywords.has(path.toLowerCase())) return `<span class="tok-keyword">${wMatch}</span>`;
          if (/^\d+$/.test(path)) return wMatch; // Ignore numbers
          return `<span class="tok-output" data-expr="${path}" data-type="var">${path}</span>`;
        });

        strings.forEach((str, idx) => {
          const placeholder = `___STR_PLACEHOLDER_${idx}___`;
          conditionHighlighted = conditionHighlighted.replace(placeholder, `<span class="tok-string">${str}</span>`);
        });

        return `<span class="tok-tag">${p1}<span class="tok-keyword">${tag}</span> ${conditionHighlighted}${p3}</span>`;
      }

      // 4c. General Tag highlighting
      inner = inner.replace(/(&quot;.*?&quot;|&#039;.*?&#039;|&#39;.*?&#39;)/g, '<span class="tok-string">$1</span>');
      inner = inner.replace(/\b(if|else|elsif|endif|unless|endunless|case|when|endcase|for|endfor|capture|endcapture|increment|decrement|in|with|reversed|limit|offset)\b/g, '<span class="tok-keyword">$1</span>');
      return `<span class="tok-tag">${p1}${inner}${p3}</span>`;
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
  if (!t) return 'text';

  // Try JSON
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      JSON.parse(t);
      return 'json';
    } catch {
      // Might be partial or invalid JSON, but likely intended as JSON
      return 'json';
    }
  }

  // Try XML
  if (t.startsWith('<') && (t.endsWith('>') || t.includes('/>'))) {
    return 'xml';
  }

  // Try CSV (comma-separated with multiple lines and consistent column counts)
  const lines = t.split('\n').filter((l) => l.trim());
  if (lines.length >= 2) {
    const firstLineCols = lines[0].split(',').length;
    if (firstLineCols > 1) {
      const secondLineCols = lines[1].split(',').length;
      if (firstLineCols === secondLineCols) {
        return 'csv';
      }
    }
  }

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

export function xmlToJson(xml: string): any {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) return { error: 'Invalid XML' };

  function parse(node: Element): any {
    const obj: any = {};
    if (node.attributes.length > 0) {
      obj['@attributes'] = {};
      for (let i = 0; i < node.attributes.length; i++) {
        const attr = node.attributes[i];
        obj['@attributes'][attr.name] = attr.value;
      }
    }

    const children = Array.from(node.childNodes);
    if (children.length === 1 && children[0].nodeType === 3) {
      const text = children[0].textContent?.trim();
      if (Object.keys(obj).length === 0) return text;
      obj['#text'] = text;
      return obj;
    }

    for (const child of children) {
      if (child.nodeType === 1) {
        const childNode = child as Element;
        const name = childNode.nodeName;
        const value = parse(childNode);
        if (obj[name]) {
          if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
          obj[name].push(value);
        } else {
          obj[name] = value;
        }
      }
    }
    return obj;
  }

  return { [doc.documentElement.nodeName]: parse(doc.documentElement) };
}

export function tryParseJson(content: string): any {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    try {
      // Try cleaning trailing commas
      const cleaned = content
        .replace(/,\s*([\]}])/g, '$1')
        .replace(/:\s*,/g, ': null,')
        .replace(/:\s*}/g, ': null}');
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^=!:{}()|[\]\\]/g, '\\$&');
}

export function highlightSearchInHtml(html: string, search: string): string {
  if (!search) return html;
  const escaped = escapeHtml(search);
  const pattern = new RegExp('(' + escapeRegex(escaped) + ')', 'gi');
  // Only replace in text nodes — never inside HTML tag attributes or tag names
  return html.replace(/(<[^>]*>)|([^<]+)/g, (_, tag, text) => {
    if (tag) return tag;
    return text ? text.replace(pattern, '<span class="search-highlight">$1</span>') : '';
  });
}

export function nanoid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getScopeColor(scope: string | undefined): string {
  const map: Record<string, string> = {
    input: 'var(--green)',
    global: 'var(--green)',
    assign: 'var(--yellow)',
    local: 'var(--yellow)',
    for: 'var(--blue)',
    capture: 'var(--purple)',
    increment: 'var(--cyan)',
    decrement: 'var(--cyan)',
  };
  return scope ? (map[scope] ?? 'var(--text-muted)') : 'var(--text-muted)';
}
