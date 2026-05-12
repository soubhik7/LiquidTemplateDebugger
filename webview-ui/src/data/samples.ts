export interface SampleTransformation {
  name: string;
  description: string;
  template: string;
  data: string;
  format: 'json' | 'xml' | 'text';
}

export const SAMPLES: SampleTransformation[] = [
  {
    name: 'Comprehensive JSON Transformation',
    description: 'A deep-dive sample covering variables, math, flow control (case/if), loops, capture, and complex JSON construction',
    format: 'json',
    data: `{
  "user": {
    "id": "u-1001",
    "firstName": "  Soubhik ",
    "lastName": "Mukherjee",
    "email": "SOUBHIK@EXAMPLE.COM",
    "role": "admin",
    "status": "active",
    "createdDate": "2026-01-15T10:30:00Z"
  },
  "numbers": {
    "price": 99.567,
    "quantity": 3,
    "discount": -10,
    "tax": 18
  },
  "tags": "azure,logic,apps,liquid",
  "items": [
    { "id": 1, "name": "item1", "type": "A", "price": 10, "available": true },
    { "id": 2, "name": "item2", "type": "B", "price": 20, "available": false },
    { "id": 3, "name": "item3", "type": "A", "price": 30, "available": true }
  ],
  "address": {
    "city": "Bangalore",
    "country": "India"
  },
  "emptyValue": null
}`,
    template: `{% assign baseTotal = content.numbers.price | Times: content.numbers.quantity %}
{% assign discountedTotal = baseTotal | Plus: content.numbers.discount %}
{% assign taxAmount = discountedTotal | Times: content.numbers.tax | DividedBy: 100 %}
{% assign grandTotal = discountedTotal | Plus: taxAmount %}

{% capture fullName %}
{{ content.user.firstName | Strip }} {{ content.user.lastName | Strip }}
{% endcapture %}

{
  "content.userSummary": {
    "id": "{{ content.user.id }}",
    "name": "{{ fullName | Strip }}",
    "email": "{{ content.user.email | Downcase }}",
    "status": "{% if content.user.status == 'active' %}ACTIVE{% else %}INACTIVE{% endif %}",
    "roleLabel": "{%- case content.user.role -%}
                    {%- when 'admin' -%}Administrator{%- when 'editor' -%}Editor
                    {%- else -%}content.user
                    {%- endcase -%}",
    "createdDate": "{{ content.user.createdDate | Date: 'yyyy-MM-dd' }}"
  },

  "orderFlags": {
    "isBulkOrder": {% if content.numbers.quantity >= 3 and content.numbers.price > 50 %}true{% else %}false{% endif %},
    "hasDiscount": {% if content.numbers.discount < 0 %}true{% else %}false{% endif %},
    "needsManualReview": {% if content.user.role != 'admin' or content.numbers.discount < -20 %}true{% else %}false{% endif %}
  },

  "pricing": {
    "unitPrice": {{ content.numbers.price | Round: 2 }},
    "quantity": {{ content.numbers.quantity }},
    "baseTotal": {{ baseTotal | Round: 2 }},
    "discount": {{ content.numbers.discount }},
    "taxPercent": {{ content.numbers.tax }},
    "taxAmount": {{ taxAmount | Round: 2 }},
    "grandTotal": {{ grandTotal | Round: 2 }},
    "pricingCategory": "{%- if content.numbers.price > 100 -%}Premium
                        {%- elsif content.numbers.price > 50 -%}Standard{%- else -%}Budget
                        {%- endif -%}"
  },

  "content.tagsInfo": {
    "original": "{{ content.tags }}",
    "normalized": "{{ content.tags | Downcase }}",
    "content.tagsArray": "{{ content.tags | Split: ',' | Join: '|' }}",
    "firstTag": "{{ content.tags | Split: ',' | First }}",
    "content.tagsCount": {{ content.tags | Split: ',' | Size }},
    "shortcontent.tags": "{{ content.tags | Truncate: 12 }}"
  },

  "content.items": [
    {% if content.items != null and content.items.size > 0 %}
      {% for item in content.items %}
      {
        "id": {{ item.id }},
        "name": "{{ item.name }}",
        "type": "{{ item.type }}",
        "price": {{ item.price }},
        "available": {{ item.available | Downcase }},
        "availabilityLabel": "{% if item.available == true %}InStock{% else %}OutOfStock{% endif %}",
        "priceClass": "{% if item.price >= 25 %}High{% else %}Low{% endif %}",
        "index": {{ forloop.index }},
        "isFirst": {{ forloop.first }},
        "isLast": {{ forloop.last }}
      }{% unless forloop.last %},{% endunless %}
      {% endfor %}
    {% else %}
      {
        "message": "No content.items available"
      }
    {% endif %}
  ],

  "typeAcontent.itemsOnly": [
    {% if content.items != null and content.items.size > 0 %}
      {% assign firstA = true %}
      {% for item in content.items %}
        {% if item.type != 'A' %}
          {% continue %}
        {% endif %}
        {% if firstA == false %},{% endif %}
        {
          "name": "{{ item.name }}",
          "price": {{ item.price }}
        }
        {% assign firstA = false %}
      {% endfor %}
    {% else %}
      {
        "message": "No Type A content.items"
      }
    {% endif %}
  ],

  "location": {
    "city": "{{ content.address.city | Default: 'Unknown' }}",
    "country": "{{ content.address.country | Upcase }}"
  },

  "safeValues": {
    "emptyHandled": "{{ content.emptyValue | Default: 'N/A' }}",
    "emailEncoded": "{{ content.user.email | Downcase | UrlEncode }}"
  }
}`
  },
  {
    name: 'JSON to JSON',
    description: 'Advanced transformation with nested iterations, multiple variables, and conditional logic',
    format: 'json',
    data: `{
  "order": {
    "id": "ORD-2024-X1",
    "customer": {
      "name": "Soubhik Mukherjee",
      "tags": ["loyalty", "beta-user"]
    },
    "shipping": { "method": "express", "zone": 4 },
    "items": [
      { "sku": "BASE-1", "price": 100, "qty": 2, "discounts": [10, 5] },
      { "sku": "PRO-99", "price": 250, "qty": 1, "discounts": [] }
    ]
  }
}`,
    template: `{
  "invoice": {
    "reference": "{{ content.order.id | Upcase }}",
    "customer_id": "{{ content.order.customer.name | Split: ' ' | First | Downcase }}-{{ content.order.id | Split: '-' | Last }}",
    "is_express": {% if content.order.shipping.method == 'express' %}true{% else %}false{% endif %},
    "lines": [
      {% for item in content.order.items -%}
      {
        "product": "{{ item.sku }}",
        "quantity": {{ item.qty }},
        "unit_cost": {{ item.price | Round: 2 }},
        {% assign total_discount = 0 -%}
        {% for d in item.discounts -%}
          {% assign total_discount = total_discount | Plus: d -%}
        {% endfor -%}
        "discount_applied": {{ total_discount }},
        "subtotal": {{ item.price | Times: item.qty | Minus: total_discount | Round: 2 }}
      }{% unless forloop.Last %},{% endunless %}
      {% endfor -%}
    ],
    "total_summary": {
      {% assign grand_total = 0 -%}
      {% for item in content.order.items -%}
        {% assign item_total = item.price | Times: item.qty -%}
        {% for d in item.discounts -%}{% assign item_total = item_total | Minus: d -%}{% endfor -%}
        {% assign grand_total = grand_total | Plus: item_total -%}
      {% endfor -%}
      "final_amount": {{ grand_total | Round: 2 }},
      "priority": "{% case content.order.shipping.zone %}{% when 1,2 %}LOW{% when 3,4 %}MEDIUM{% else %}HIGH{% endcase %}"
    }
  }
}`
  },
  {
    name: 'JSON to XML',
    description: 'Complex XML structure with conditional attributes and multi-level data nesting',
    format: 'json',
    data: `{
  "batchId": "BT-772",
  "status": "PROCESSED",
  "records": [
    { "id": 1, "type": "USER", "payload": { "name": "Soubhik Mukherjee", "score": 88 } },
    { "id": 2, "type": "SYSTEM", "payload": { "event": "Heartbeat", "ok": true } }
  ]
}`,
    template: `<?xml version="1.0" encoding="UTF-8"?>
<Batch id="{{ content.batchId }}" status="{{ content.status | Capitalize }}">
  <Summary generated_at="{{ "now" | Date: "%Y-%m-%d" }}">
    <Count>{{ content.records.Size }}</Count>
  </Summary>
  <Items>
    {% for rec in content.records -%}
    <Item id="{{ rec.id }}" category="{{ rec.type | Downcase }}">
      {% if rec.type == 'USER' -%}
      <UserProfile>
        <Name>{{ rec.payload.name | Upcase }}</Name>
        <Grade>{% if rec.payload.score > 80 %}A{% else %}B{% endif %}</Grade>
      </UserProfile>
      {% else -%}
      <SystemLog event="{{ rec.payload.event }}">
        <Status>{{ rec.payload.ok | Default: false | Upcase }}</Status>
      </SystemLog>
      {% endif -%}
    </Item>
    {% endfor -%}
  </Items>
</Batch>`
  },
  {
    name: 'JSON to CSV',
    description: 'CSV export with complex row logic and summary footer',
    format: 'json',
    data: `{
  "export_id": "EXP-9",
  "data": [
    { "name": "Monitor", "price": 200, "stocked": true },
    { "name": "Mouse", "price": 25, "stocked": false },
    { "name": "Keyboard", "price": 80, "stocked": true }
  ]
}`,
    template: `Product Name,Price,Status,Tax (10%)
{% for item in content.data -%}
"{{ item.name | Strip | Capitalize }}",{{ item.price | Round: 2 }},{% if item.stocked %}AVAILABLE{% else %}OUT_OF_STOCK{% endif %},{{ item.price | Times: 0.1 | Round: 2 }}
{% endfor -%}
# ExportID: {{ content.export_id | Replace: "EXP-", "" }} | Total Records: {{ content.data.Size }}`
  },
  {
    name: 'XML to XML',
    description: 'XML mapping with deep nesting and value transformations',
    format: 'xml',
    data: `<ServiceRequest>
  <Client id="C-001">
    <Name>Global Corp</Name>
    <Location>Europe</Location>
  </Client>
  <Tasks>
    <Task type="audit">
      <Title>Financial Review</Title>
      <Urgency>3</Urgency>
    </Task>
    <Task type="support">
      <Title>Cloud Migration</Title>
      <Urgency>5</Urgency>
    </Task>
  </Tasks>
</ServiceRequest>`,
    template: `<InternalWorkOrder clientId="{{ content.ServiceRequest.Client.id }}">
  <Organization>{{ content.ServiceRequest.Client.Name | Upcase }}</Organization>
  <Region>{{ content.ServiceRequest.Client.Location | Replace: "Europe", "EU-Zone" }}</Region>
  <Jobs>
    {% for t in content.ServiceRequest.Tasks.Task -%}
    <Job type="{{ t.type | Append: "_processed" }}">
      <Description>{{ t.Title | Strip }}</Description>
      <Priority>{% if t.Urgency > 4 %}CRITICAL{% else %}NORMAL{% endif %}</Priority>
      <Timestamp>{{ "now" | Date: "f" }}</Timestamp>
    </Job>
    {% endfor -%}
  </Jobs>
</InternalWorkOrder>`
  },
  {
    name: 'XML to JSON',
    description: 'XML parsing into a structured JSON with arrays and conditional objects',
    format: 'xml',
    data: `<Department name="Engineering">
  <Member role="Lead">
    <Name>Soubhik Mukherjee</Name>
    <Skills>C++, Go, Rust</Skills>
  </Member>
  <Member role="Dev">
    <Name>Soubhik Mukherjee</Name>
    <Skills>React, TypeScript</Skills>
  </Member>
</Department>`,
    template: `{
  "department_id": "{{ content.Department.name | Downcase }}",
  "roster": [
    {% for m in content.Department.Member -%}
    {
      "name": "{{ m.Name | Capitalize }}",
      "position": "{{ m.role | Upcase }}",
      "skill_set": [
        {% assign skills = m.Skills | Split: ',' -%}
        {% for s in skills -%}
        "{{ s | Strip | Upcase }}"{% unless forloop.Last %},{% endunless %}
        {% endfor -%}
      ]
    }{% unless forloop.Last %},{% endunless %}
    {% endfor -%}
  ]
}`
  },
  {
    name: 'XML to CSV',
    description: 'Flattening XML hierarchies into CSV records',
    format: 'xml',
    data: `<Catalog>
  <Item id="101"><Cat>Books</Cat><Title>Liquid Guide</Title></Item>
  <Item id="202"><Cat>Gear</Cat><Title>Coffee Mug</Title></Item>
</Catalog>`,
    template: `ID,Category,Item Name
{% for i in content.Catalog.Item -%}
{{ i.id }},{{ i.Cat | Upcase }},"{{ i.Title | Strip }}"
{% endfor -%}`
  },
  {
    name: 'XML to Text',
    description: 'Email or alert generation from XML payloads',
    format: 'xml',
    data: `<Alert>
  <Level>Critical</Level>
  <Source>DB-Prod</Source>
  <Info>Connections dropped</Info>
</Alert>`,
    template: `[LOG ALERT]
Severity: {{ content.Alert.Level | Upcase }}
Origin: {{ content.Alert.Source }}
Details: {{ content.Alert.Info | Replace: "dropped", "FAILED" }}
Date: {{ "now" | Date: "%Y-%m-%d %H:%M" }}`
  },
  {
    name: 'Text to Text',
    description: 'Text-to-text transformation with multiple string operations',
    format: 'text',
    data: `App=Shopify
Status=Active
Version=1.4`,
    template: `Application: {{ content.App | Upcase }}
Current Status: {{ content.Status | Replace: "Active", "ONLINE" }}
Build: v{{ content.Version | Plus: 0.1 | Round: 1 }}`
  },
  {
    name: 'Text to CSV',
    description: 'Key-value extraction into CSV with static headers',
    format: 'text',
    data: `Key=Value
User=Admin
Mode=Debug`,
    template: `Property,Value
Mode,{{ content.Mode | Capitalize }}
Authorized,{{ content.User | Upcase }}`
  },
  {
    name: 'CSV to JSON',
    description: 'Advanced row parsing from raw text CSV into JSON',
    format: 'text',
    data: `code,name,val
A,Test1,10.5
B,Test2,20.0
C,Test3,5.5`,
    template: `{
  "items": [
    {% assign rows = content.value | Split: '
' -%}
    {% for r in rows offset:1 -%}
      {% assign c = r | Split: ',' -%}
      {% if c.Size < 3 %}{% Continue %}{% endif -%}
      {
        "id": "{{ c[0] | Upcase }}",
        "label": "{{ c[1] | Strip }}",
        "amount": {{ c[2] | Plus: 0 | Round: 2 }},
        "tax": {{ c[2] | Times: 0.15 | Round: 2 }}
      }{% unless forloop.Last %},{% endunless %}
    {% endfor -%}
  ]
}`
  },
  {
    name: 'CSV to XML',
    description: 'Raw CSV text to XML transformation with logic',
    format: 'text',
    data: `ID,Msg
1,Hello
2,World`,
    template: `<Messages>
{% assign lines = content.value | Split: '
' -%}
{% for l in lines offset:1 -%}
  {% assign d = l | Split: ',' -%}
  <Msg id="{{ d[0] }}">{{ d[1] | Strip | Upcase }}</Msg>
{% endfor -%}
</Messages>`
  }
];
