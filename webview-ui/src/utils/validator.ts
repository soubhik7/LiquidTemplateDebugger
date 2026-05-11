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

  // Regex for capturing filter names in {{ ... }} and {% ... %}
  // Matches "| filter_name" or "|filter_name"
  const filterRegex = /\|\s*([a-zA-Z0-9_]+)/g;

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    let match;

    // Reset regex state for each line
    while ((match = filterRegex.exec(line)) !== null) {
      const filterName = match[1];
      
      // Check if it's a known filter but used in lowercase
      const canonical = DOTLIQUID_FILTERS.find(f => f.toLowerCase() === filterName.toLowerCase());
      
      if (canonical && filterName !== canonical) {
        errors.push({
          line: lineNum,
          message: `Filter '${filterName}' on row ${lineNum} is not in correct PascalCase. Use '${canonical}' instead.`,
          severity: 'error'
        });
      }
    }
  });

  return errors;
}
