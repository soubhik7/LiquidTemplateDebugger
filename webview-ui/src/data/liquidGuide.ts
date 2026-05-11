export interface LiquidFilter {
  name: string;
  category: 'String' | 'Array' | 'Math' | 'Date' | 'Logic' | 'Other';
  syntax: string;
  description: string;
  input: string;
  output: string;
  advantages: string;
}

export interface LiquidGuide {
  filters: LiquidFilter[];
  tags: { name: string; description: string; syntax: string; example: string }[];
  references: { title: string; url: string }[];
}

export const LIQUID_GUIDE: LiquidGuide = {
  filters: [
    {
      name: 'Upcase',
      category: 'String',
      syntax: '{{ value | Upcase }}',
      description: 'Converts a string into uppercase characters.',
      input: '"hello world"',
      output: '"HELLO WORLD"',
      advantages: 'Ensures data consistency for headers or IDs that must be uppercase.'
    },
    {
      name: 'Downcase',
      category: 'String',
      syntax: '{{ value | Downcase }}',
      description: 'Converts a string into lowercase characters.',
      input: '"HELLO World"',
      output: '"hello world"',
      advantages: 'Useful for normalizing email addresses or keys for comparison.'
    },
    {
      name: 'Capitalize',
      category: 'String',
      syntax: '{{ value | Capitalize }}',
      description: 'Capitalizes the first word in a string.',
      input: '"my title"',
      output: '"My title"',
      advantages: 'Quickly formats titles or names for UI display.'
    },
    {
      name: 'Replace',
      category: 'String',
      syntax: '{{ value | Replace: "old", "new" }}',
      description: 'Replaces all occurrences of a substring with a new string.',
      input: '"I like apple", "apple", "orange"',
      output: '"I like orange"',
      advantages: 'Flexible string manipulation for dynamic pathing or content correction.'
    },
    {
      name: 'Split',
      category: 'String',
      syntax: '{{ value | Split: "," }}',
      description: 'Splits a string into an array using a separator.',
      input: '"a,b,c", ","',
      output: '["a", "b", "c"]',
      advantages: 'Converts delimited text (like CSV) into iterable Liquid arrays.'
    },
    {
      name: 'Size',
      category: 'Other',
      syntax: '{{ value | Size }}',
      description: 'Returns the number of characters in a string or the number of items in an array.',
      input: '["a", "b", "c"]',
      output: '3',
      advantages: 'Essential for loop conditions or displaying counts.'
    },
    {
      name: 'Round',
      category: 'Math',
      syntax: '{{ value | Round: 2 }}',
      description: 'Rounds a number to a specified number of decimal places.',
      input: '3.14159, 2',
      output: '3.14',
      advantages: 'Critical for financial data and currency display.'
    },
    {
      name: 'Plus',
      category: 'Math',
      syntax: '{{ value | Plus: 5 }}',
      description: 'Adds a number to another number.',
      input: '10, 5',
      output: '15',
      advantages: 'Handles basic arithmetic within templates.'
    },
    {
      name: 'Times',
      category: 'Math',
      syntax: '{{ value | Times: 2 }}',
      description: 'Multiplies a number by another number.',
      input: '5, 2',
      output: '10',
      advantages: 'Calculating subtotals or percentages.'
    },
    {
      name: 'Date',
      category: 'Date',
      syntax: '{{ value | Date: "yyyy-MM-dd" }}',
      description: 'Converts a timestamp or date string into a specific format.',
      input: '"2026-05-12T10:00:00", "MMM dd, yyyy"',
      output: '"May 12, 2026"',
      advantages: 'Powerful formatting for international dates and human-readable logs.'
    },
    {
      name: 'Join',
      category: 'Array',
      syntax: '{{ array | Join: ", " }}',
      description: 'Joins items in an array into a single string with a separator.',
      input: '["Red", "Blue"], " & "',
      output: '"Red & Blue"',
      advantages: 'Formats list data back into human-readable text.'
    },
    {
      name: 'First',
      category: 'Array',
      syntax: '{{ array | First }}',
      description: 'Returns the first item in an array.',
      input: '["a", "b", "c"]',
      output: '"a"',
      advantages: 'Quick access to primary records in a dataset.'
    },
    {
      name: 'Last',
      category: 'Array',
      syntax: '{{ array | Last }}',
      description: 'Returns the last item in an array.',
      input: '["a", "b", "c"]',
      output: '"c"',
      advantages: 'Useful for retrieving the most recent entry or tail markers.'
    },
    {
      name: 'Default',
      category: 'Other',
      syntax: '{{ value | Default: "N/A" }}',
      description: 'Provides a fallback value if the input is null, empty, or false.',
      input: 'null, "Unknown"',
      output: '"Unknown"',
      advantages: 'Prevents empty fields or broken UI in generated documents.'
    }
  ],
  tags: [
    {
      name: 'assign',
      description: 'Creates a new variable in the template scope.',
      syntax: '{% assign my_var = "hello" %}',
      example: '{% assign subtotal = item.price | Times: item.qty %}'
    },
    {
      name: 'capture',
      description: 'Captures the rendered block between tags and stores it in a variable.',
      syntax: '{% capture my_var %}...{% endcapture %}',
      example: '{% capture full_name %}{{ user.first }} {{ user.last }}{% endcapture %}'
    },
    {
      name: 'for',
      description: 'Iterates over an array or collection.',
      syntax: '{% for item in collection %}...{% endfor %}',
      example: '{% for user in content.users %}{{ user.name }}{% endfor %}'
    },
    {
      name: 'if / else / elsif',
      description: 'Conditional logic execution.',
      syntax: '{% if condition %}...{% endif %}',
      example: '{% if user.role == "admin" %}Welcome Boss{% endif %}'
    },
    {
      name: 'case / when',
      description: 'Switch-like conditional logic.',
      syntax: '{% case value %}{% when x %}...{% endcase %}',
      example: '{% case user.status %}{% when "active" %}Online{% when "idle" %}Away{% endcase %}'
    }
  ],
  references: [
    { title: 'DotLiquid Documentation', url: 'https://github.com/dotliquid/dotliquid/wiki/DotLiquid-for-Designers' },
    { title: 'Shopify Liquid Reference', url: 'https://shopify.github.io/liquid/' },
    { title: 'Azure Logic Apps Liquid Guide', url: 'https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-enterprise-integration-liquid-transform' }
  ]
};
