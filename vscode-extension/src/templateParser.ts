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
    }

    parseTemplate(templatePath: string): ParsedTemplate {
        const content = fs.readFileSync(templatePath, 'utf-8');
        const lines = content.split('\n');
        const elements: TemplateElement[] = [];

        // Split template into line-level elements using regex
        // This avoids using internal LiquidJS token APIs that can break
        const lineRegex = /(\{\{.*?\}\}|\{%-?\s*.*?-?%\}|[^{]+|\{(?!\{|%))/gs;

        let pos = 0;
        for (const line of lines) {
            const lineNum = lines.indexOf(line) + 1; // re-calc below
            pos += line.length + 1; // account for \n
        }

        // Better approach: walk line by line and identify what each line contains
        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const lineContent = lines[i];
            const trimmed = lineContent.trim();

            if (!trimmed) {
                // Blank line - still emit as literal so stepping feels natural
                elements.push({
                    type: 'literal',
                    line: lineNum,
                    content: lineContent + '\n',
                    raw: lineContent + '\n'
                });
                continue;
            }

            // Check if the line contains a tag {% ... %}
            const tagMatch = trimmed.match(/^\{%-?\s*(\w+)(.*?)-?%\}/);
            if (tagMatch) {
                elements.push({
                    type: 'tag',
                    line: lineNum,
                    content: tagMatch[1], // tag name e.g. "if", "for", "assign"
                    raw: lineContent + '\n'
                });
                continue;
            }

            // Check if the line contains an output {{ ... }}
            const outputMatch = trimmed.match(/\{\{(.*?)\}\}/);
            if (outputMatch) {
                elements.push({
                    type: 'output',
                    line: lineNum,
                    content: outputMatch[1].trim(),
                    raw: lineContent + '\n'
                });
                continue;
            }

            // Pure literal content
            elements.push({
                type: 'literal',
                line: lineNum,
                content: lineContent + '\n',
                raw: lineContent + '\n'
            });
        }

        return { elements, lines, totalLines: lines.length };
    }

    parseTemplateFromContent(content: string): ParsedTemplate {
        const lines = content.split('\n');
        const elements: TemplateElement[] = [];

        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            const lineContent = lines[i];
            const trimmed = lineContent.trim();

            if (!trimmed) {
                elements.push({ type: 'literal', line: lineNum, content: lineContent + '\n', raw: lineContent + '\n' });
                continue;
            }

            const tagMatch = trimmed.match(/^\{%-?\s*(\w+)(.*?)-?%\}/);
            if (tagMatch) {
                elements.push({ type: 'tag', line: lineNum, content: tagMatch[1], raw: lineContent + '\n' });
                continue;
            }

            const outputMatch = trimmed.match(/\{\{(.*?)\}\}/);
            if (outputMatch) {
                elements.push({ type: 'output', line: lineNum, content: outputMatch[1].trim(), raw: lineContent + '\n' });
                continue;
            }

            elements.push({ type: 'literal', line: lineNum, content: lineContent + '\n', raw: lineContent + '\n' });
        }

        return { elements, lines, totalLines: lines.length };
    }

    async renderFull(templatePath: string, data: any): Promise<string> {
        const content = fs.readFileSync(templatePath, 'utf-8');
        return await this.liquid.parseAndRender(content, data);
    }

    async evaluateExpression(expression: string, context: any): Promise<any> {
        try {
            const result = await this.liquid.parseAndRender(`{{ ${expression} }}`, context);
            return this.coerce(result);
        } catch {
            return undefined;
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
