export interface LiquidTheorySection {
  id: string;
  title: string;
  readTime: string;
  content: string;
  subsections: {
    id: string;
    title: string;
    content: string;
    examples?: {
      data: string;
      template: string;
      output: string;
      description?: string;
    }[];
  }[];
}

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
  theory: LiquidTheorySection[];
  filters: LiquidFilter[];
  tags: { name: string; description: string; syntax: string; example: string }[];
  references: { title: string; url: string }[];
}

export const LIQUID_GUIDE: LiquidGuide = {
  theory: [
    {
      id: '1.0',
      title: 'An introduction to Liquid',
      readTime: '7 min read',
      content: 'Whether you\'re building transactional emails, in-app notifications, or SMS messages, the ability to create dynamic, personalized content is crucial for engaging your users. The Liquid templating language is a popular standard for rendering dynamic content, powering everything from simple variable substitution to complex conditional logic and data transformations.',
      subsections: [
        {
          id: '1.1',
          title: 'What is Liquid?',
          content: 'Liquid is an open-source template language created by Shopify that strikes an optimal balance between power and simplicity. Unlike heavyweight templating engines that require extensive programming knowledge, Liquid provides a clean, readable syntax that both developers and non-technical team members can understand and modify. At its core, Liquid serves as a bridge between your static template content and dynamic user data.',
          examples: [{
            data: '{ "user": { "name": "Sarah" }, "company": { "name": "Acme Corp" } }',
            template: 'Hello {{ user.name }},\n\nWelcome to {{ company.name }}!',
            output: 'Hello Sarah,\n\nWelcome to Acme Corp!',
            description: 'Simple variable substitution example'
          }]
        },
        {
          id: '1.2',
          title: 'The three main components of Liquid',
          content: 'Liquid\'s syntax revolves around three fundamental components: Keys (objects/variables) wrapped in {{ }}, Filters that modify output using the pipe character |, and Tags wrapped in {% %} that create logic and control flow.',
          examples: [{
            data: '{ "user": { "name": "sarah chen" }, "price": 99.99 }',
            template: '{{ user.name | capitalize }}\nPrice: ${{ price | round: 2 }}',
            output: 'Sarah chen\nPrice: $99.99',
            description: 'Keys with filters example'
          }]
        },
        {
          id: '1.3',
          title: 'Real-life examples of Liquid',
          content: 'Liquid becomes most useful when you see how it transforms dynamic data into personalized, context-aware messages. From simple personalization to complex conditional logic, Liquid adapts to your needs.',
          examples: [
            {
              data: '{ "user": { "first_name": "Sarah" } }',
              template: 'Hi {{ user.first_name | default: "there" }},',
              output: 'Hi Sarah,',
              description: 'Fallback values with default filter'
            },
            {
              data: '{ "user": { "is_trial": true, "days_left": 5 } }',
              template: '{% if user.is_trial %}\nYour trial ends in {{ user.days_left }} days.\n{% else %}\nThanks for being a customer!\n{% endif %}',
              output: 'Your trial ends in 5 days.',
              description: 'Conditional content with tags'
            }
          ]
        }
      ]
    },
    {
      id: '2.0',
      title: 'Understanding Liquid keys',
      readTime: '7 min read',
      content: 'Keys are the bridge between your data and your templates. They enable you to access and display dynamic content, from simple values to complex nested structures.',
      subsections: [
        {
          id: '2.1',
          title: 'What are Liquid keys?',
          content: 'Keys are the most fundamental element of Liquid templates, serving as the connection points between your template and the data that populates it. When you wrap a key in double curly braces {{ }}, Liquid replaces it with the actual value during rendering.'
        },
        {
          id: '2.2',
          title: 'Simple (or top-level) keys',
          content: 'Simple keys are the most basic way to access data in Liquid. These are called "top-level" keys because they sit at the main level of your data, not nested inside other structures.',
          examples: [{
            data: '{ "name": "Sarah", "order_number": "12345", "status": "shipped" }',
            template: 'Hello {{ name }}!\nOrder #{{ order_number }}\nStatus: {{ status }}',
            output: 'Hello Sarah!\nOrder #12345\nStatus: shipped',
            description: 'Accessing top-level keys'
          }]
        },
        {
          id: '2.3',
          title: 'Nested keys with dot notation',
          content: 'Real-world data rarely stays flat. Liquid uses dot notation to traverse nested objects, similar to JavaScript property access. Each "dot" accesses a deeper level of the structure.',
          examples: [{
            data: '{ "customer": { "name": "Jamie Chen", "address": { "street": "123 Main St", "city": "Seattle" } } }',
            template: 'Ship to:\n{{ customer.name }}\n{{ customer.address.street }}\n{{ customer.address.city }}',
            output: 'Ship to:\nJamie Chen\n123 Main St\nSeattle',
            description: 'Accessing nested properties'
          }]
        },
        {
          id: '2.4',
          title: 'Working with arrays and lists',
          content: 'Arrays are lists of items. In Liquid, you can select a specific item by its position (index starting from 0), check the size, or use shortcuts like first and last.',
          examples: [
            {
              data: '{ "items": [{ "name": "Laptop" }, { "name": "Mouse" }, { "name": "Keyboard" }] }',
              template: 'First: {{ items[0].name }}\nLast: {{ items[-1].name }}\nTotal: {{ items.size }}',
              output: 'First: Laptop\nLast: Keyboard\nTotal: 3',
              description: 'Array indexing and size'
            }
          ]
        },
        {
          id: '2.5',
          title: 'Complex data structures',
          content: 'Real applications often combine nested objects with arrays, creating complex hierarchies. Liquid handles these naturally by combining dot notation with array indexing.'
        },
        {
          id: '2.6',
          title: 'Key naming conventions',
          content: 'For multi-word keys, use snake_case (words separated by underscores in lowercase). This consistency helps when working with data from various sources. Examples: user.email_address, order.total_amount, product.is_available.'
        },
        {
          id: '2.7',
          title: 'Defensive templating with keys',
          content: 'When working with keys, defensive programming is crucial. Use the default filter for fallback values, check if keys exist before using them, and handle empty arrays gracefully.',
          examples: [{
            data: '{ "product": { "name": null } }',
            template: '{{ product.name | default: "Unknown Product" }}',
            output: 'Unknown Product',
            description: 'Providing fallback for missing values'
          }]
        },
        {
          id: '2.8',
          title: 'Performance considerations',
          content: 'While Liquid handles missing keys gracefully, deeply nested structures can impact template rendering performance. Consider flattening data in your application layer when possible and use variables to store frequently accessed nested values.'
        }
      ]
    },
    {
      id: '3.0',
      title: 'Understanding Liquid operators',
      readTime: '7 min read',
      content: 'Operators in Liquid enable comparisons and logical operations within conditional statements. They\'re the building blocks that make your templates dynamic.',
      subsections: [
        {
          id: '3.1',
          title: 'What are Liquid operators?',
          content: 'Operators are symbols and keywords that let you compare values and combine conditions in your Liquid templates. There are three main categories: Comparison operators (==, !=, >, <, >=, <=), Logical operators (and, or), and Special operators (contains).'
        },
        {
          id: '3.2',
          title: 'Comparison operators',
          content: 'Comparison operators evaluate relationships between values, returning true or false. Use == for equality, != for inequality, and >, <, >=, <= for numeric comparisons.',
          examples: [
            {
              data: '{ "user": { "subscription_status": "active", "account_balance": 1500 } }',
              template: '{% if user.subscription_status == "active" %}\nYour subscription is active.\n{% endif %}\n{% if user.account_balance > 1000 %}\nYou qualify for premium features!\n{% endif %}',
              output: 'Your subscription is active.\nYou qualify for premium features!',
              description: 'Equality and relational operators'
            }
          ]
        },
        {
          id: '3.3',
          title: 'Logical operators',
          content: 'Logical operators let you combine multiple conditions. Use "and" when all conditions must be true, and "or" when at least one condition must be true.',
          examples: [{
            data: '{ "user": { "is_verified": true, "profile_complete": true } }',
            template: '{% if user.is_verified and user.profile_complete %}\nYour account is fully activated!\n{% endif %}',
            output: 'Your account is fully activated!',
            description: 'Combining conditions with and'
          }]
        },
        {
          id: '3.4',
          title: 'Special operators',
          content: 'The "contains" operator checks whether a string includes a substring or an array includes an element. It\'s case-sensitive for strings.',
          examples: [{
            data: '{ "user": { "email": "sarah@company.com", "features": ["api_access", "sso"] } }',
            template: '{% if user.email contains "@company.com" %}\nWelcome, team member!\n{% endif %}\n{% if user.features contains "api_access" %}\nAPI access enabled.\n{% endif %}',
            output: 'Welcome, team member!\nAPI access enabled.',
            description: 'Using contains operator'
          }]
        },
        {
          id: '3.5',
          title: 'Understanding truthy and falsy values',
          content: 'Only two values are falsy in Liquid: nil (or null) and false. Everything else is truthy, including empty strings "", zero 0, and empty arrays []. This is important for conditional logic.',
          examples: [{
            data: '{ "user": { "phone_number": null, "bio": "", "login_count": 0 } }',
            template: '{% if user.phone_number %}\nPhone: {{ user.phone_number }}\n{% else %}\nNo phone number\n{% endif %}\n{% if user.bio %}\nBio exists (empty string is truthy!)\n{% endif %}',
            output: 'No phone number\nBio exists (empty string is truthy!)',
            description: 'Truthy and falsy behavior'
          }]
        },
        {
          id: '3.6',
          title: 'The unless tag with operators',
          content: 'The unless tag is the inverse of if—it executes when a condition is false. Use it for negative conditions to make your templates more readable.',
          examples: [{
            data: '{ "user": { "email_verified": false } }',
            template: '{% unless user.email_verified %}\n⚠️ Please verify your email address.\n{% endunless %}',
            output: '⚠️ Please verify your email address.',
            description: 'Using unless for negative conditions'
          }]
        },
        {
          id: '3.7',
          title: 'Putting operators together',
          content: 'Operators work together to create sophisticated conditional logic. Combine comparison and logical operators to build complex decision trees in your templates.'
        }
      ]
    },
    {
      id: '4.0',
      title: 'Understanding Liquid filters',
      readTime: '12 min read',
      content: 'Filters are one of Liquid\'s most powerful features, transforming raw data into polished, formatted output. They modify data without changing the underlying values.',
      subsections: [
        {
          id: '4.1',
          title: 'What are Liquid filters?',
          content: 'Filters are data transformation functions applied using the pipe character | after a key. They can accept parameters and be chained together, with each filter\'s output becoming the next filter\'s input.',
          examples: [{
            data: '{ "user": { "name": "sarah chen" } }',
            template: '{{ user.name | upcase }}',
            output: 'SARAH CHEN',
            description: 'Basic filter usage'
          }]
        },
        {
          id: '4.2',
          title: 'String filters',
          content: 'String filters handle text formatting and manipulation: capitalize, upcase, downcase, truncate, strip_html, escape, replace, remove, split, join, slugify, url_encode, append, prepend.',
          examples: [
            {
              data: '{ "article": { "title": "understanding liquid templating" } }',
              template: '{{ article.title | capitalize | append: " - A Guide" }}',
              output: 'Understanding liquid templating - A Guide',
              description: 'Chaining string filters'
            }
          ]
        },
        {
          id: '4.3',
          title: 'Numeric filters',
          content: 'Numeric filters handle mathematical operations and number formatting: plus, minus, times, divided_by, modulo, round, ceil, floor, at_least, at_most.',
          examples: [{
            data: '{ "product": { "price": 99.99, "quantity": 3 } }',
            template: 'Subtotal: ${{ product.price | times: product.quantity | round: 2 }}',
            output: 'Subtotal: $299.97',
            description: 'Mathematical operations'
          }]
        },
        {
          id: '4.4',
          title: 'Array filters',
          content: 'Array filters manipulate and extract data from collections: first, last, map, join, sort, reverse, uniq, size, compact.',
          examples: [{
            data: '{ "products": [{ "name": "Laptop" }, { "name": "Mouse" }] }',
            template: 'Products: {{ products | map: "name" | join: ", " }}',
            output: 'Products: Laptop, Mouse',
            description: 'Extracting and joining array data'
          }]
        },
        {
          id: '4.5',
          title: 'Date filters',
          content: 'The date filter formats timestamps using strftime patterns. Common codes: %Y (year), %m (month), %d (day), %B (full month), %b (abbr month), %A (full day), %I (12-hour), %H (24-hour), %M (minutes), %p (AM/PM).',
          examples: [{
            data: '{ "event": { "start_time": "2024-12-25T15:30:00Z" } }',
            template: '{{ event.start_time | date: "%B %d, %Y at %I:%M %p" }}',
            output: 'December 25, 2024 at 03:30 PM',
            description: 'Date formatting'
          }]
        },
        {
          id: '4.6',
          title: 'Default values',
          content: 'The default filter provides fallback values when data is missing or empty. Note: it only applies when a value is nil or false—empty strings won\'t trigger the default.',
          examples: [{
            data: '{ "user": { "nickname": null } }',
            template: 'Hello, {{ user.nickname | default: "friend" }}!',
            output: 'Hello, friend!',
            description: 'Fallback for missing data'
          }]
        },
        {
          id: '4.7',
          title: 'Chaining filters',
          content: 'The real power of filters emerges when you chain them together. Each filter\'s output becomes the next filter\'s input, allowing complex transformations in a single line.',
          examples: [{
            data: '{ "article": { "content": "<p>This is a <strong>great</strong> article about Liquid.</p>" } }',
            template: '{{ article.content | strip_html | truncate: 30 }}',
            output: 'This is a great article ab...',
            description: 'Chaining multiple filters'
          }]
        },
        {
          id: '4.8',
          title: 'Best practices for using filters',
          content: 'Order matters in filter chains—strip HTML before truncating. Use default filter defensively for missing data. Always round currency to appropriate precision. Keep filter chains readable by breaking complex transformations across lines or using intermediate variables.'
        }
      ]
    },
    {
      id: '5.0',
      title: 'Understanding Liquid tags',
      readTime: '13 min read',
      content: 'Tags provide the control structures that make Liquid a true templating language. They control what gets rendered and how, enabling conditional rendering, loops, and variable assignment.',
      subsections: [
        {
          id: '5.1',
          title: 'What are Liquid tags?',
          content: 'Tags are wrapped in {% %} and provide programming constructs. There are three main categories: Control flow tags (if, elsif, else, unless, case/when), Iteration tags (for loops), and Variable tags (assign, capture).'
        },
        {
          id: '5.2',
          title: 'Control flow tags',
          content: 'Control flow tags determine what content appears based on conditions. Use if for basic conditions, elsif/else for multiple branches, unless for negative conditions, and case/when for switch-like logic.',
          examples: [
            {
              data: '{ "user": { "subscription_status": "trialing", "trial_days_remaining": 5 } }',
              template: '{% if user.subscription_status == "active" %}\nYour subscription is active.\n{% elsif user.subscription_status == "trialing" %}\nYour trial ends in {{ user.trial_days_remaining }} days.\n{% else %}\nStart your free trial today!\n{% endif %}',
              output: 'Your trial ends in 5 days.',
              description: 'Multi-branch conditional logic'
            }
          ]
        },
        {
          id: '5.3',
          title: 'Iteration tags',
          content: 'The for tag iterates through arrays, executing template content for each element. Use limit to restrict iterations, offset to skip items, and the forloop object for metadata (index, first, last, length).',
          examples: [{
            data: '{ "order": { "items": [{ "name": "T-Shirt", "price": 25 }, { "name": "Jeans", "price": 80 }] } }',
            template: 'Order Summary:\n{% for item in order.items %}\n- {{ item.name }}: ${{ item.price }}\n{% endfor %}',
            output: 'Order Summary:\n- T-Shirt: $25\n- Jeans: $80',
            description: 'Looping through arrays'
          }]
        },
        {
          id: '5.4',
          title: 'Variable tags',
          content: 'Use assign to create variables that store values or computed results. Use capture to store a block of content (including logic) in a variable. Variables make complex templates more readable and avoid repetition.',
          examples: [{
            data: '{ "product": { "price": 99.99, "discount_rate": 0.2 } }',
            template: '{% assign discount = product.price | times: product.discount_rate %}\n{% assign final_price = product.price | minus: discount %}\nOriginal: ${{ product.price }}\nDiscount: -${{ discount | round: 2 }}\nFinal: ${{ final_price | round: 2 }}',
            output: 'Original: $99.99\nDiscount: -$20.00\nFinal: $79.99',
            description: 'Using variables for calculations'
          }]
        },
        {
          id: '5.5',
          title: 'Comment tags',
          content: 'Use {# ... #} for single-line comments or {% comment %}...{% endcomment %} for multi-line comments. Comments don\'t appear in output and are useful for documenting complex logic.'
        },
        {
          id: '5.6',
          title: 'Practical tag combinations',
          content: 'Real-world templates combine multiple tag types: variable assignment for calculations, conditional logic for customization, and loops for collections. This creates sophisticated, data-driven templates.'
        },
        {
          id: '5.7',
          title: 'Best practices for using tags',
          content: 'Keep conditional logic readable by breaking complex conditions into multiple lines. Use case for multiple value checks. Always provide else clauses in loops for empty arrays. Use variables to avoid repetition. Comment complex logic for maintainability.'
        }
      ]
    },
    {
      id: '6.0',
      title: 'Advanced Liquid concepts',
      readTime: '11 min read',
      content: 'With a solid understanding of Liquid basics, let\'s explore advanced concepts that enable sophisticated templates capable of handling complex real-world scenarios.',
      subsections: [
        {
          id: '6.1',
          title: 'Understanding date, time, and localization',
          content: 'Time-sensitive notifications require careful handling of dates and timezones. Use the date filter with strftime patterns to format timestamps. For relative time, calculate differences using date: "%s" (Unix timestamp) and arithmetic. Handle timezones by passing the timezone parameter to the date filter.',
          examples: [{
            data: '{ "event": { "start_time": "2024-12-25T15:30:00Z" } }',
            template: '{{ event.start_time | date: "%B %d, %Y" }}\n{{ event.start_time | date: "%m/%d/%Y" }}\n{{ event.start_time | date: "%A, %b %d at %I:%M %p" }}',
            output: 'December 25, 2024\n12/25/2024\nWednesday, Dec 25 at 03:30 PM',
            description: 'Multiple date formats'
          }]
        },
        {
          id: '6.2',
          title: 'Understanding whitespace control',
          content: 'Whitespace management is crucial for clean output. Use hyphens (-) inside tag delimiters to strip whitespace: {%- strips before, -%} strips after. This removes extra blank lines while keeping your template code readable.',
          examples: [{
            data: '{ "user": { "premium": true } }',
            template: '{%- if user.premium -%}\nPremium Member\n{%- endif -%}',
            output: 'Premium Member',
            description: 'Whitespace control for clean output'
          }]
        },
        {
          id: '6.3',
          title: 'Understanding encoding and escaping',
          content: 'Security and data integrity are paramount. Use url_encode for URL parameters, escape for HTML content, and json for JavaScript data. These filters prevent broken layouts and security vulnerabilities by converting special characters into safe formats.',
          examples: [
            {
              data: '{ "user": { "email": "sarah+test@example.com" } }',
              template: 'https://example.com?email={{ user.email | url_encode }}',
              output: 'https://example.com?email=sarah%2Btest%40example.com',
              description: 'URL encoding for safe parameters'
            },
            {
              data: '{ "comment": { "text": "<script>alert(\\"test\\")</script>Safe text" } }',
              template: '<p>{{ comment.text | escape }}</p>',
              output: '<p><script>alert("test")</script>Safe text</p>',
              description: 'HTML escaping for security'
            }
          ]
        }
      ]
    },
    {
      id: '7.0',
      title: 'AI Template Generator Guide',
      readTime: '5 min read',
      content: 'The AI Template Generator is an enterprise-grade tool that uses Gemini 1.5 Flash to help you build complex mapping logic for Azure Logic Apps. It transforms natural language requirements into optimized Liquid templates.',
      subsections: [
        {
          id: '7.1',
          title: 'Configuration & API Keys',
          content: 'To use the AI Generator, you must provide a Google Gemini API Key. Go to Settings > AI Engine to paste your key. You can generate a free key at aistudio.google.com/app/apikey. Once configured, ensure the "AI Assistance" toggle is turned ON.'
        },
        {
          id: '7.2',
          title: 'Writing Effective Requirements',
          content: 'Be specific in your natural language requirements. Instead of saying "format names", say "capitalize the first letter of each name and remove any special characters". Mention specific fields from your source data to help the AI map them correctly.'
        },
        {
          id: '7.3',
          title: 'Using Business Mapping Docs',
          content: 'You can attach Excel or Word content by pasting it into the "Business Mapping" field or using the "Attach Doc" button. This provides the AI with strict transformation rules (e.g., SourceFieldA -> TargetPropertyB), ensuring the generated template follows your enterprise logic exactly.'
        },
        {
          id: '7.4',
          title: 'Context Data & Formats',
          content: 'Always provide a sample of your source data (JSON or XML) in the "Context Data" section. This allows the AI to "see" the structure it needs to transform. You can toggle between JSON, XML, and Text formats to match your data source.'
        }
      ]
    }
  ],
  filters: [
    {
      name: 'Upcase',
      category: 'String',
      syntax: '{{ value | Upcase }}',
      description: 'Converts a string into uppercase characters.',
      input: '"hello world"',
      output: '"HELLO WORLD"',
      advantages: 'Ensures data consistency for headers or IDs that must be uppercase. Supported in Azure Logic Apps.'
    },
    {
      name: 'Downcase',
      category: 'String',
      syntax: '{{ value | Downcase }}',
      description: 'Converts a string into lowercase characters.',
      input: '"HELLO World"',
      output: '"hello world"',
      advantages: 'Useful for normalizing email addresses or keys for comparison. Supported in Azure Logic Apps.'
    },
    {
      name: 'Capitalize',
      category: 'String',
      syntax: '{{ value | Capitalize }}',
      description: 'Capitalizes the first word in a string.',
      input: '"my title"',
      output: '"My title"',
      advantages: 'Quickly formats titles or names for UI display. Supported in Azure Logic Apps.'
    },
    {
      name: 'Replace',
      category: 'String',
      syntax: '{{ value | Replace: "old", "new" }}',
      description: 'Replaces all occurrences of a substring with a new string.',
      input: '"I like apple", "apple", "orange"',
      output: '"I like orange"',
      advantages: 'Flexible string manipulation for dynamic pathing or content correction. Supported in Azure Logic Apps.'
    },
    {
      name: 'Split',
      category: 'String',
      syntax: '{{ value | Split: "," }}',
      description: 'Splits a string into an array using a separator.',
      input: '"a,b,c", ","',
      output: '["a", "b", "c"]',
      advantages: 'Converts delimited text (like CSV) into iterable Liquid arrays. Supported in Azure Logic Apps.'
    },
    {
      name: 'Strip',
      category: 'String',
      syntax: '{{ value | Strip }}',
      description: 'Removes leading and trailing whitespace from a string.',
      input: '"  hello  "',
      output: '"hello"',
      advantages: 'Cleans up user input or data from external sources. Supported in Azure Logic Apps.'
    },
    {
      name: 'Truncate',
      category: 'String',
      syntax: '{{ value | Truncate: 20 }}',
      description: 'Shortens a string to a specified length, adding "..." at the end.',
      input: '"This is a long text", 10',
      output: '"This is..."',
      advantages: 'Prevents text overflow in UI elements. Supported in Azure Logic Apps.'
    },
    {
      name: 'Append',
      category: 'String',
      syntax: '{{ value | Append: " suffix" }}',
      description: 'Adds text to the end of a string.',
      input: '"hello", " world"',
      output: '"hello world"',
      advantages: 'Builds dynamic strings without complex concatenation. Supported in Azure Logic Apps.'
    },
    {
      name: 'Prepend',
      category: 'String',
      syntax: '{{ value | Prepend: "prefix " }}',
      description: 'Adds text to the beginning of a string.',
      input: '"world", "hello "',
      output: '"hello world"',
      advantages: 'Adds prefixes to values dynamically. Supported in Azure Logic Apps.'
    },
    {
      name: 'Size',
      category: 'Other',
      syntax: '{{ value | Size }}',
      description: 'Returns the number of characters in a string or the number of items in an array.',
      input: '["a", "b", "c"]',
      output: '3',
      advantages: 'Essential for loop conditions or displaying counts. Supported in Azure Logic Apps.'
    },
    {
      name: 'Round',
      category: 'Math',
      syntax: '{{ value | Round: 2 }}',
      description: 'Rounds a number to a specified number of decimal places.',
      input: '3.14159, 2',
      output: '3.14',
      advantages: 'Critical for financial data and currency display. Supported in Azure Logic Apps.'
    },
    {
      name: 'Plus',
      category: 'Math',
      syntax: '{{ value | Plus: 5 }}',
      description: 'Adds a number to another number.',
      input: '10, 5',
      output: '15',
      advantages: 'Handles basic arithmetic within templates. Supported in Azure Logic Apps.'
    },
    {
      name: 'Minus',
      category: 'Math',
      syntax: '{{ value | Minus: 3 }}',
      description: 'Subtracts a number from another number.',
      input: '10, 3',
      output: '7',
      advantages: 'Calculates differences or remaining values. Supported in Azure Logic Apps.'
    },
    {
      name: 'Times',
      category: 'Math',
      syntax: '{{ value | Times: 2 }}',
      description: 'Multiplies a number by another number.',
      input: '5, 2',
      output: '10',
      advantages: 'Calculating subtotals or percentages. Supported in Azure Logic Apps.'
    },
    {
      name: 'DividedBy',
      category: 'Math',
      syntax: '{{ value | DividedBy: 2 }}',
      description: 'Divides a number by another number.',
      input: '10, 2',
      output: '5',
      advantages: 'Calculates averages or ratios. Supported in Azure Logic Apps.'
    },
    {
      name: 'Modulo',
      category: 'Math',
      syntax: '{{ value | Modulo: 3 }}',
      description: 'Returns the remainder of division.',
      input: '10, 3',
      output: '1',
      advantages: 'Useful for alternating patterns or pagination. Supported in Azure Logic Apps.'
    },
    {
      name: 'Date',
      category: 'Date',
      syntax: '{{ value | Date: "yyyy-MM-dd" }}',
      description: 'Converts a timestamp or date string into a specific format.',
      input: '"2026-05-12T10:00:00", "MMM dd, yyyy"',
      output: '"May 12, 2026"',
      advantages: 'Powerful formatting for international dates and human-readable logs. Supported in Azure Logic Apps with .NET format strings.'
    },
    {
      name: 'Join',
      category: 'Array',
      syntax: '{{ array | Join: ", " }}',
      description: 'Joins items in an array into a single string with a separator.',
      input: '["Red", "Blue"], " & "',
      output: '"Red & Blue"',
      advantages: 'Formats list data back into human-readable text. Supported in Azure Logic Apps.'
    },
    {
      name: 'First',
      category: 'Array',
      syntax: '{{ array | First }}',
      description: 'Returns the first item in an array.',
      input: '["a", "b", "c"]',
      output: '"a"',
      advantages: 'Quick access to primary records in a dataset. Supported in Azure Logic Apps.'
    },
    {
      name: 'Last',
      category: 'Array',
      syntax: '{{ array | Last }}',
      description: 'Returns the last item in an array.',
      input: '["a", "b", "c"]',
      output: '"c"',
      advantages: 'Useful for retrieving the most recent entry or tail markers. Supported in Azure Logic Apps.'
    },
    {
      name: 'Map',
      category: 'Array',
      syntax: '{{ array | Map: "property" }}',
      description: 'Extracts a single property from each object in an array.',
      input: '[{"name":"A"},{"name":"B"}], "name"',
      output: '["A", "B"]',
      advantages: 'Simplifies working with object arrays. Supported in Azure Logic Apps.'
    },
    {
      name: 'Sort',
      category: 'Array',
      syntax: '{{ array | Sort }}',
      description: 'Sorts array elements in ascending order.',
      input: '[3, 1, 2]',
      output: '[1, 2, 3]',
      advantages: 'Organizes data for display. Supported in Azure Logic Apps.'
    },
    {
      name: 'Reverse',
      category: 'Array',
      syntax: '{{ array | Reverse }}',
      description: 'Reverses the order of array elements.',
      input: '["a", "b", "c"]',
      output: '["c", "b", "a"]',
      advantages: 'Displays data in reverse chronological order. Supported in Azure Logic Apps.'
    },
    {
      name: 'Uniq',
      category: 'Array',
      syntax: '{{ array | Uniq }}',
      description: 'Removes duplicate values from an array.',
      input: '["a", "b", "a", "c"]',
      output: '["a", "b", "c"]',
      advantages: 'Ensures unique values in lists. Supported in Azure Logic Apps.'
    },
    {
      name: 'Default',
      category: 'Other',
      syntax: '{{ value | Default: "N/A" }}',
      description: 'Provides a fallback value if the input is null, empty, or false.',
      input: 'null, "Unknown"',
      output: '"Unknown"',
      advantages: 'Prevents empty fields or broken UI in generated documents. Supported in Azure Logic Apps.'
    },
    {
      name: 'Remove',
      category: 'String',
      syntax: '{{ value | Remove: "text" }}',
      description: 'Removes all occurrences of a substring from a string.',
      input: '"Hello World World", "World"',
      output: '"Hello  "',
      advantages: 'Cleans up unwanted text patterns. Supported in Azure Logic Apps.'
    },
    {
      name: 'StripHtml',
      category: 'String',
      syntax: '{{ value | StripHtml }}',
      description: 'Removes all HTML tags from a string.',
      input: '"<p>Hello <strong>World</strong></p>"',
      output: '"Hello World"',
      advantages: 'Extracts plain text from HTML content. Supported in Azure Logic Apps.'
    },
    {
      name: 'Escape',
      category: 'String',
      syntax: '{{ value | Escape }}',
      description: 'Escapes special HTML characters to prevent XSS attacks.',
      input: '"<script>alert(\\"xss\\")</script>"',
      output: '"<script>alert("xss")</script>"',
      advantages: 'Essential for security when displaying user-generated content. Supported in Azure Logic Apps.'
    },
    {
      name: 'UrlEncode',
      category: 'String',
      syntax: '{{ value | UrlEncode }}',
      description: 'Encodes a string for safe use in URLs.',
      input: '"hello world@test.com"',
      output: '"hello%20world%40test.com"',
      advantages: 'Ensures URL parameters are properly formatted. Supported in Azure Logic Apps.'
    },
    {
      name: 'Slugify',
      category: 'String',
      syntax: '{{ value | Slugify }}',
      description: 'Converts a string to a URL-friendly slug (lowercase, hyphens).',
      input: '"Hello World 2024"',
      output: '"hello-world-2024"',
      advantages: 'Creates SEO-friendly URLs. Supported in Azure Logic Apps.'
    },
    {
      name: 'TruncateWords',
      category: 'String',
      syntax: '{{ value | TruncateWords: 5 }}',
      description: 'Truncates a string to a specified number of words.',
      input: '"This is a long sentence with many words", 5',
      output: '"This is a long sentence..."',
      advantages: 'Cleaner truncation at word boundaries. Supported in Azure Logic Apps.'
    },
    {
      name: 'Ceil',
      category: 'Math',
      syntax: '{{ value | Ceil }}',
      description: 'Rounds a number up to the nearest integer.',
      input: '3.14',
      output: '4',
      advantages: 'Useful for pagination and quantity calculations. Supported in Azure Logic Apps.'
    },
    {
      name: 'Floor',
      category: 'Math',
      syntax: '{{ value | Floor }}',
      description: 'Rounds a number down to the nearest integer.',
      input: '3.99',
      output: '3',
      advantages: 'Ensures conservative calculations. Supported in Azure Logic Apps.'
    },
    {
      name: 'AtLeast',
      category: 'Math',
      syntax: '{{ value | AtLeast: 10 }}',
      description: 'Ensures a number is at least the specified minimum value.',
      input: '5, 10',
      output: '10',
      advantages: 'Enforces minimum thresholds. Supported in Azure Logic Apps.'
    },
    {
      name: 'AtMost',
      category: 'Math',
      syntax: '{{ value | AtMost: 100 }}',
      description: 'Ensures a number does not exceed the specified maximum value.',
      input: '150, 100',
      output: '100',
      advantages: 'Enforces maximum limits. Supported in Azure Logic Apps.'
    },
    {
      name: 'Compact',
      category: 'Array',
      syntax: '{{ array | Compact }}',
      description: 'Removes nil/null values from an array.',
      input: '["a", null, "b", null, "c"]',
      output: '["a", "b", "c"]',
      advantages: 'Cleans up arrays with missing data. Supported in Azure Logic Apps.'
    },
    {
      name: 'Concat',
      category: 'Array',
      syntax: '{{ array1 | Concat: array2 }}',
      description: 'Combines two arrays into one.',
      input: '["a", "b"], ["c", "d"]',
      output: '["a", "b", "c", "d"]',
      advantages: 'Merges multiple data sources. Supported in Azure Logic Apps.'
    }
  ],
  tags: [
    {
      name: 'assign',
      description: 'Creates a new variable in the template scope.',
      syntax: '{% assign my_var = "hello" %}',
      example: '{% assign subtotal = item.price | Times: item.qty %}\nSubtotal: ${{ subtotal }}'
    },
    {
      name: 'capture',
      description: 'Captures the rendered block between tags and stores it in a variable.',
      syntax: '{% capture my_var %}...{% endcapture %}',
      example: '{% capture full_name %}{{ user.first }} {{ user.last }}{% endcapture %}\nName: {{ full_name }}'
    },
    {
      name: 'for',
      description: 'Iterates over an array or collection.',
      syntax: '{% for item in collection %}...{% endfor %}',
      example: '{% for user in content.users %}\n- {{ user.name }}\n{% endfor %}'
    },
    {
      name: 'if / elsif / else',
      description: 'Conditional logic execution.',
      syntax: '{% if condition %}...{% elsif other %}...{% else %}...{% endif %}',
      example: '{% if user.role == "admin" %}\nWelcome Admin\n{% elsif user.role == "user" %}\nWelcome User\n{% else %}\nWelcome Guest\n{% endif %}'
    },
    {
      name: 'unless',
      description: 'Executes block when condition is false (inverse of if).',
      syntax: '{% unless condition %}...{% endunless %}',
      example: '{% unless user.verified %}\nPlease verify your email\n{% endunless %}'
    },
    {
      name: 'case / when',
      description: 'Switch-like conditional logic.',
      syntax: '{% case value %}{% when x %}...{% when y %}...{% endcase %}',
      example: '{% case user.status %}\n{% when "active" %}Online\n{% when "idle" %}Away\n{% else %}Offline\n{% endcase %}'
    },
    {
      name: 'comment',
      description: 'Multi-line comments that don\'t appear in output.',
      syntax: '{% comment %}...{% endcomment %}',
      example: '{% comment %}\nThis is a comment explaining the logic below\n{% endcomment %}'
    }
  ],
  references: [
    { title: 'DotLiquid Documentation', url: 'https://github.com/dotliquid/dotliquid/wiki/DotLiquid-for-Designers' },
    { title: 'Shopify Liquid Reference', url: 'https://shopify.github.io/liquid/' },
    { title: 'Azure Logic Apps Liquid Guide', url: 'https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-enterprise-integration-liquid-transform' },
    { title: 'Azure Integration Account Liquid', url: 'https://learn.microsoft.com/en-us/azure/logic-apps/logic-apps-enterprise-integration-maps' }
  ]
};

// Made with Bob
