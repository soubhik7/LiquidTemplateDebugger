/**
 * Validates Liquid template syntax for common DotLiquid/PascalCase issues.
 */

export interface ValidationError {
  line: number;
  message: string;
  severity: 'error' | 'warning';
}

const DOTLIQUID_FILTERS = [
  'Plus', 'Minus', 'Times', 'DividedBy', 'Modulo',
  'Round', 'Floor', 'Ceil', 'Abs',
  'Upcase', 'Downcase', 'Capitalize',
  'Strip', 'Lstrip', 'Rstrip', 'StripHtml', 'StripNewlines',
  'Escape', 'UrlEncode', 'UrlDecode',
  'Size', 'First', 'Last', 'Reverse', 'Sort', 'Uniq', 'Join', 'Split', 'Slice',
  'Replace', 'ReplaceFirst', 'Remove', 'RemoveFirst',
  'Append', 'Prepend', 'Truncate', 'TruncateWords',
  'Map', 'Where', 'Compact', 'Concat', 'Date', 'Default'
];

export function validateTemplate(source: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const lines = source.split('\n');

  // Root-level content check
  const rootVariables = findRootVariables(source);
  rootVariables.forEach(v => {
    if (!v.isLocal && !v.name.startsWith('content.') && !isBuiltIn(v.name)) {
      errors.push({
        line: v.line,
        message: `Access to root-level variable '${v.name}' must be prefixed with 'content.'. Example: 'content.${v.name}'`,
        severity: 'error'
      });
    }
  });

  // Regex for capturing filter names in {{ ... }} and {% ... %}
  const filterRegex = /\|\s*([a-zA-Z0-9_]+)/g;
  
  // Regex for unclosed tags
  const openOutputRegex = /\{\{[^}]*$/;
  const openTagRegex = /\{%[^%]*$/;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for unclosed outputs
    if (openOutputRegex.test(line) && !line.includes('}}')) {
      errors.push({
        line: lineNum,
        message: `Unclosed output tag '{{' found on line ${lineNum}.`,
        severity: 'error'
      });
    }
    
    // Check for unclosed tags
    if (openTagRegex.test(line) && !line.includes('%}')) {
      errors.push({
        line: lineNum,
        message: `Unclosed logic tag '{%' found on line ${lineNum}.`,
        severity: 'error'
      });
    }

    let match;
    filterRegex.lastIndex = 0;
    while ((match = filterRegex.exec(line)) !== null) {
      const filterName = match[1];
      
      // Check if it's a known filter
      const canonical = DOTLIQUID_FILTERS.find(f => f.toLowerCase() === filterName.toLowerCase());
      
      if (canonical) {
        if (filterName !== canonical) {
          errors.push({
            line: lineNum,
            message: `Filter '${filterName}' is not in PascalCase. Use '${canonical}' for DotLiquid compatibility.`,
            severity: 'error'
          });
        }
      } else {
        // Unknown filter - suggest closest match
        const closest = findClosestFilter(filterName);
        if (closest) {
          errors.push({
            line: lineNum,
            message: `Unknown filter '${filterName}'. Did you mean '${closest}'?`,
            severity: 'error'
          });
        } else {
          errors.push({
            line: lineNum,
            message: `Unknown filter '${filterName}'. This may not be supported by DotLiquid.`,
            severity: 'warning'
          });
        }
      }
    }
  });

  return errors;
}

function findClosestFilter(name: string): string | null {
  let bestMatch: string | null = null;
  let minDistance = 3; // Max threshold for similarity

  for (const filter of DOTLIQUID_FILTERS) {
    const dist = levenshteinDistance(name.toLowerCase(), filter.toLowerCase());
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = filter;
    }
  }

  return bestMatch;
}

function levenshteinDistance(a: string, b: string): number {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) tmp[i] = [i];
  for (let j = 0; j <= b.length; j++) tmp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
}

const BUILT_INS = ['forloop', 'tablerowloop', 'empty', 'blank', 'true', 'false', 'nil', 'null'];

function isBuiltIn(name: string): boolean {
  const root = name.split('.')[0];
  return BUILT_INS.includes(root.toLowerCase());
}

interface VarAccess {
  name: string;
  line: number;
  isLocal: boolean;
}

function findRootVariables(source: string): VarAccess[] {
  const accesses: VarAccess[] = [];
  const lines = source.split('\n');
  const localVars: Set<string> = new Set();
  const scopeStack: Set<string>[] = [];
  
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Add local vars from assign/capture (persist)
    const assignMatch = line.match(/\{%?-?\s*assign\s+([a-zA-Z0-9_]+)\s*=/);
    if (assignMatch) localVars.add(assignMatch[1]);
    
    const captureMatch = line.match(/\{%?-?\s*capture\s+([a-zA-Z0-9_]+)\s*-?%}/);
    if (captureMatch) localVars.add(captureMatch[1]);

    // Handle for loops (scoped)
    if (line.includes('for ')) {
      const forMatch = line.match(/\{%?-?\s*for\s+([a-zA-Z0-9_]+)\s+in/);
      if (forMatch) {
        scopeStack.push(new Set(localVars));
        localVars.add(forMatch[1]);
        localVars.add('forloop');
      }
    }
    
    if (line.includes('endfor')) {
      if (scopeStack.length > 0) {
        const previous = scopeStack.pop()!;
        localVars.clear();
        previous.forEach(v => localVars.add(v));
      }
    }

    // Find all potential variable accesses in this line
    const outputMatch = line.match(/\{\{-?\s*(.*?)\s*-?\}\}/g);
    if (outputMatch) {
      outputMatch.forEach(out => {
        const expr = out.replace(/\{\{-?\s*|\s*-?\}\}/g, '');
        extractVars(expr).forEach(v => {
          accesses.push({ name: v, line: lineNum, isLocal: localVars.has(v.split('.')[0]) });
        });
      });
    }

    const tagExprMatch = line.match(/\{%?-?\s*(?:if|elsif|unless|case|when|assign|for)\s+(.*?)\s*-?%}/);
    if (tagExprMatch) {
      let expr = tagExprMatch[1];
      if (line.includes('assign ')) expr = expr.split('=')[1] || '';
      if (line.includes('for ')) expr = expr.split(' in ')[1] || '';
      
      extractVars(expr).forEach(v => {
        accesses.push({ name: v, line: lineNum, isLocal: localVars.has(v.split('.')[0]) });
      });
    }
  });

  return accesses;
}

function extractVars(expr: string): string[] {
  // Sanitize: remove quoted strings to avoid false positives inside them
  const sanitizedExpr = expr.replace(/'[^']*'|"[^"]*"/g, ' ');
  
  // Split by pipes first to handle filters
  const parts = sanitizedExpr.split('|');
  const vars: string[] = [];
  const idRegex = /\b[a-zA-Z_][a-zA-Z0-9_.]*\b/g;
  
  parts.forEach((p, i) => {
    let idsInPart = 0;
    let m;
    while ((m = idRegex.exec(p)) !== null) {
      const id = m[0];
      if (isLiteral(id) || isKeyword(id)) continue;
      
      idsInPart++;
      // If this is a filter part (i > 0), the first identifier is the filter name.
      if (i > 0 && idsInPart === 1) continue;
      
      vars.push(id);
    }
  });
  return vars;
}

const KEYWORDS = ['and', 'or', 'not', 'contains', 'in', 'with', 'if', 'else', 'elsif', 'endif', 
  'unless', 'endunless', 'case', 'when', 'endcase', 'for', 'endfor', 'assign', 'capture', 'endcapture'];

function isKeyword(id: string): boolean {
  return KEYWORDS.includes(id.toLowerCase());
}

function isLiteral(id: string): boolean {
  if (/^\d/.test(id)) return true;
  if (id === 'true' || id === 'false' || id === 'nil' || id === 'null') return true;
  return false;
}

function isLocal(name: string, scopeStack: Set<string>[]): boolean {
  const root = name.split('.')[0];
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    if (scopeStack[i].has(root)) return true;
  }
  return false;
}
