export interface FoldRange {
  startLine: number;
  endLine: number;
  label: string;
}

export function findFoldRanges(source: string): FoldRange[] {
  if (!source) return [];
  const lines = source.split('\n');
  const ranges: FoldRange[] = [];
  const tagStack: { line: number; type: string }[] = [];
  const braceStack: number[] = [];
  const bracketStack: number[] = [];
  const xmlStack: { line: number; name: string }[] = [];

  const START_TAGS = ['if', 'for', 'unless', 'case', 'capture', 'tablerow'];
  const END_TAGS = ['endif', 'endfor', 'endunless', 'endcase', 'endcapture', 'endtablerow'];

  lines.forEach((line, i) => {
    const ln = i + 1;
    
    // 1. Liquid tags
    const tagMatches = line.matchAll(/\{%-?\s*(\w+)/g);
    for (const match of tagMatches) {
      const tag = match[1];
      if (START_TAGS.includes(tag)) {
        tagStack.push({ line: ln, type: tag });
      } else if (END_TAGS.includes(tag)) {
        const expectedType = tag.replace('end', '');
        for (let j = tagStack.length - 1; j >= 0; j--) {
          if (tagStack[j].type === expectedType) {
            const start = tagStack.splice(j, 1)[0];
            if (ln > start.line) {
              ranges.push({ startLine: start.line, endLine: ln, label: start.type });
            }
            break;
          }
        }
      }
    }

    // Clean Liquid tags to avoid brace matching mismatch in braces parsing
    const cleanLine = line
      .replace(/\{\{/g, '  ')
      .replace(/\}\}/g, '  ')
      .replace(/\{%/g, '  ')
      .replace(/%\}/g, '  ');

    // 2. Braces (for JSON, object literals)
    const braceMatches = cleanLine.matchAll(/\{|\}/g);
    for (const match of braceMatches) {
      if (match[0] === '{') {
        braceStack.push(ln);
      } else if (match[0] === '}') {
        const startLine = braceStack.pop();
        if (startLine && ln > startLine) {
          ranges.push({ startLine, endLine: ln, label: '{...}' });
        }
      }
    }

    // 3. Brackets (for JSON arrays)
    const bracketMatches = cleanLine.matchAll(/\[|\]/g);
    for (const match of bracketMatches) {
      if (match[0] === '[') {
        bracketStack.push(ln);
      } else if (match[0] === ']') {
        const startLine = bracketStack.pop();
        if (startLine && ln > startLine) {
          ranges.push({ startLine, endLine: ln, label: '[...]' });
        }
      }
    }

    // 4. XML/HTML tags
    // Matches start tags <tag> and end tags </tag> but ignores self-closing <tag />
    const xmlMatches = line.matchAll(/<(\/?)([a-zA-Z_][\w\-.]*)(?:\s+[^>]*?)?(\/?)>/g);
    for (const match of xmlMatches) {
      const isClose = match[1] === '/';
      const tagName = match[2];
      const isSelfClose = match[3] === '/';
      
      if (isSelfClose) continue;
      
      if (isClose) {
        for (let j = xmlStack.length - 1; j >= 0; j--) {
          if (xmlStack[j].name === tagName) {
            const start = xmlStack.splice(j, 1)[0];
            if (ln > start.line) {
              ranges.push({ startLine: start.line, endLine: ln, label: `<${tagName}>` });
            }
            break;
          }
        }
      } else {
        xmlStack.push({ line: ln, name: tagName });
      }
    }
  });

  return ranges;
}
