import { Liquid } from 'liquidjs';
import { ParsedTemplate, TemplateElement } from './types';
import * as fs from 'fs';

export class TemplateParser {
    private liquid: Liquid;

    constructor() {
        this.liquid = new Liquid({
            strictFilters: false,
            strictVariables: false,
            lenientIf: true
        });

        this.registerDotLiquidAliases();
    }

    private registerDotLiquidAliases() {
        const aliases: Record<string, string> = {
            'DividedBy': 'divided_by',
            'dividedby': 'divided_by',
            'ReplaceFirst': 'replace_first',
            'replacefirst': 'replace_first',
            'RemoveFirst': 'remove_first',
            'removefirst': 'remove_first',
            'StripHtml': 'strip_html',
            'striphtml': 'strip_html',
            'StripNewlines': 'strip_newlines',
            'stripnewlines': 'strip_newlines',
            'NewlineToBr': 'newline_to_br',
            'newlinetobr': 'newline_to_br',
            'UrlEncode': 'url_encode',
            'urlencode': 'url_encode',
            'UrlDecode': 'url_decode',
            'urldecode': 'url_decode',
            'Upcase': 'upcase',
            'Downcase': 'downcase',
            'Capitalize': 'capitalize',
            'Strip': 'strip',
            'Lstrip': 'lstrip',
            'Rstrip': 'rstrip',
            'Escape': 'escape',
            'Size': 'size',
            'Reverse': 'reverse',
            'First': 'first',
            'Last': 'last',
            'Sort': 'sort',
            'Uniq': 'uniq',
            'Join': 'join',
            'Split': 'split',
            'Slice': 'slice',
            'Replace': 'replace',
            'Remove': 'remove',
            'Append': 'append',
            'Prepend': 'prepend',
            'Truncate': 'truncate',
            'TruncateWords': 'truncatewords',
            'Default': 'default',
            'Plus': 'plus',
            'Minus': 'minus',
            'Times': 'times',
            'Modulo': 'modulo',
            'Abs': 'abs',
            'Ceil': 'ceil',
            'Floor': 'floor',
            'Round': 'round',
            'Map': 'map',
            'Where': 'where',
            'Compact': 'compact',
            'Concat': 'concat',
            'Date': 'date'
        };

        const registry = (this.liquid as any).filters;
        const impls = registry?.impls || registry || {};

        // Setup custom wrappers for format translation (.NET to POSIX)
        const originalDateImpl = impls['date'];
        const dateWrapper = function(this: any, v: any, format: any, timezone: any) {
            let val = v;
            // Native JS Date doesn't cleanly support "UTC+01:00", strip "UTC" for ISO-8601 parsing
            if (typeof val === 'string' && val.includes('UTC')) {
                val = val.replace('UTC', ''); 
            }
            let fmt = format;
            if (typeof fmt === 'string' && !fmt.includes('%')) {
                // Convert basic .NET date format string to POSIX strftime
                fmt = fmt.replace(/yyyy/g, '%Y')
                         .replace(/yy/g, '%y')
                         .replace(/MM/g, '%m')
                         .replace(/dd/g, '%d')
                         .replace(/HH/g, '%H')
                         .replace(/mm/g, '%M')
                         .replace(/ss/g, '%S');
            }
            return originalDateImpl.call(this, val, fmt, timezone);
        };

        // Override native date and aliases with the wrapper
        if (originalDateImpl) {
            this.liquid.registerFilter('date', dateWrapper);
        }

        for (const [alias, original] of Object.entries(aliases)) {
            const impl = impls[original];
            if (impl) {
                if (original === 'date') {
                    this.liquid.registerFilter(alias, dateWrapper);
                } else {
                    this.liquid.registerFilter(alias, impl);
                }
            }
        }
    }

    private parseLinesToElements(lines: string[]): TemplateElement[] {
        const elements: TemplateElement[] = [];
        const tokenRegex = /(\{\{.*?\}\}|\{%-?[\s\S]*?-?%\}|[^{]+|\{(?!\{|%))/g;

        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const lineContent = lines[i];

            if (!lineContent && lineContent !== '') {
                continue;
            }

            tokenRegex.lastIndex = 0;
            let match;
            let tokensFound = 0;

            while ((match = tokenRegex.exec(lineContent)) !== null) {
                const token = match[0];
                if (!token) continue;
                tokensFound++;
                const trimmedToken = token.trim();

                if (trimmedToken.startsWith('{%')) {
                    const tagMatch = trimmedToken.match(/^\{%-?\s*(\w+)/);
                    elements.push({
                        type: 'tag',
                        line: lineNum,
                        content: tagMatch ? tagMatch[1].toLowerCase() : '',
                        raw: token
                    });
                } else if (trimmedToken.startsWith('{{')) {
                    elements.push({
                        type: 'output',
                        line: lineNum,
                        content: trimmedToken.replace(/^\{\{|\}\}$/g, '').trim(),
                        raw: token
                    });
                } else {
                    elements.push({
                        type: 'literal',
                        line: lineNum,
                        content: token,
                        raw: token
                    });
                }
            }

            if (elements.length > 0 && elements[elements.length - 1].line === lineNum) {
                const lastEl = elements[elements.length - 1];
                lastEl.raw += '\n';
                if (lastEl.type === 'literal') {
                    lastEl.content += '\n';
                }
            } else if (tokensFound === 0) {
                elements.push({ type: 'literal', line: lineNum, content: lineContent + '\n', raw: lineContent + '\n' });
            }
        }
        return elements;
    }

    parseTemplate(templatePath: string): ParsedTemplate {
        const content = fs.readFileSync(templatePath, 'utf-8');
        const lines = content.split('\n');
        const elements = this.parseLinesToElements(lines);
        return { elements, lines, totalLines: lines.length };
    }

    parseTemplateFromContent(content: string): ParsedTemplate {
        const lines = content.split('\n');
        const elements = this.parseLinesToElements(lines);
        return { elements, lines, totalLines: lines.length };
    }

    async renderFull(templatePath: string, data: any): Promise<string> {
        const content = fs.readFileSync(templatePath, 'utf-8');
        return await this.liquid.parseAndRender(content, data);
    }

    async evaluateExpression(expression: string, context: any): Promise<any> {
        try {
            if (expression.includes('{%') || expression.includes('{{')) {
                // Try rendering the block directly first
                try {
                    const cleanExpr = expression
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .replace(/&#039;/g, "'");
                    const result = await this.liquid.parseAndRender(cleanExpr, context);
                    return this.coerce(result);
                } catch {
                    // Fallback: extract key expression from the first tag
                    const match = expression.match(/\{%-?\s*(case|if|unless|elsif)\s+(.*?)\s*-?%\}/);
                    if (match) {
                        let innerExpr = match[2].trim();
                        innerExpr = innerExpr
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&#39;/g, "'")
                            .replace(/&#039;/g, "'");
                        return await this.liquid.evalValue(innerExpr, context);
                    }
                }
            }
            return await this.liquid.evalValue(expression, context);
        } catch {
            try {
                // Fallback for complex evaluations or filters if evalValue fails
                const result = await this.liquid.parseAndRender(`{{ ${expression} }}`, context);
                return this.coerce(result);
            } catch {
                return undefined;
            }
        }
    }

    getLiquid(): Liquid {
        return this.liquid;
    }

    private coerce(value: string): any {
        const t = value.trim();
        if (t === 'true') { return true; }
        if (t === 'false') { return false; }
        if (t === '' || t === 'null') { return null; }
        const n = Number(t);
        if (!isNaN(n)) { return n; }
        return t;
    }
}
