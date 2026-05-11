export interface FoldRange {
  startLine: number;
  endLine: number;
  label: string;
}

export function findFoldRanges(source: string): FoldRange[] {
  const lines = source.split('\n');
  const ranges: FoldRange[] = [];
  const tagStack: { line: number; type: string }[] = [];
  const braceStack: number[] = [];

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

    // 2. Braces (for embedded JSON/XML etc)
    const braceMatches = line.matchAll(/\{|\}/g);
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
  });

  return ranges;
}
