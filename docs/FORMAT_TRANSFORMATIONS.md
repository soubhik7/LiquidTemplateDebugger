# Format Transformation Guide

The DotLiquid Template Debugger supports transformation and debugging workflows for these first-class formats:

- **JSON**
- **XML**
- **CSV**
- **TEXT**

This document describes what is actually implemented in the project, what each transformation does, important limitations, and realistic working examples.

## Scope Clarification

This project does **not** currently implement first-class YAML or HTML parsing/serialization. The supported transformation matrix in this repository is limited to **JSON, XML, CSV, and TEXT**.

If you request unsupported formats through code paths that validate format names, the application should now return a clear error.

## Supported Input Formats

- **JSON** - objects, arrays, and scalar roots
- **XML** - nested elements, repeated sibling elements, attributes, and mixed attribute/text structures
- **CSV** - header row plus data rows, quoted fields, embedded commas, embedded quotes, multiline fields, null-like values
- **TEXT** - key=value lines with optional freeform lines preserved under `value`

## Supported Output Formats

- **JSON**
- **XML**
- **CSV**
- **TEXT**

## Effective Transformation Matrix

All combinations within the supported scope are implemented:

| From \ To | JSON | XML | CSV | TEXT |
|---|---:|---:|---:|---:|
| JSON | ✅ | ✅ | ✅ | ✅ |
| XML  | ✅ | ✅ | ✅ | ✅ |
| CSV  | ✅ | ✅ | ✅ | ✅ |
| TEXT | ✅ | ✅ | ✅ | ✅ |

## Behavioral Notes

### JSON
- JSON scalar roots are wrapped as `{ "value": ... }` when needed for input loading.
- Nested arrays and objects are preserved for JSON output.
- JSON to CSV flattens object rows into columns and serializes nested arrays as JSON strings when needed.

### XML
- XML attributes are represented using `@attributeName`.
- XML text content with attributes/children may use `#text`.
- Repeated sibling elements become arrays/lists.
- XML to CSV flattens nested values into dot-notated columns.

### CSV
- First record is treated as the header.
- Empty fields become null/empty depending on the target format.
- `null` is interpreted as null.
- Quoted multiline values are supported.
- Embedded commas and quotes are preserved and escaped correctly.

### TEXT
- `key=value` lines become properties.
- Non-`key=value` lines are preserved under `value`.
- TEXT to TEXT returns the original content unchanged through `ConvertOutput`.
- Structured conversions from TEXT attempt to preserve inferred booleans, numbers, nulls, and freeform text.

## Common Edge Cases Now Handled

- Nested objects and arrays
- XML attributes
- XML repeated child elements
- CSV quoted values with commas
- CSV embedded double quotes
- CSV multiline fields
- Null values
- Empty values
- Unicode text such as `₹`
- Unsupported format validation
- Scalar JSON roots during loading

---

# Working Examples by Transformation Type

The following examples are realistic and intentionally include special characters, nulls, nested structures, arrays, and multiline values.

## Shared Example Inputs

### JSON Input
```json
{
  "order": {
    "id": 1001,
    "customer": {
      "name": "Alice & Bob",
      "email": "alice@example.com"
    },
    "items": [
      {
        "sku": "A-1",
        "qty": 2,
        "price": 19.95,
        "notes": "Fragile, handle with care"
      },
      {
        "sku": "B-2",
        "qty": 1,
        "price": null,
        "notes": "Gift \"wrapped\""
      }
    ],
    "active": true,
    "comment": "Line1\nLine2"
  }
}
```

### XML Input
```xml
<catalog generated="2026-04-03">
  <product id="1">
    <name>Widget & Gear</name>
    <price>29.99</price>
    <active>true</active>
  </product>
  <product id="2">
    <name>Gadget</name>
    <price></price>
    <active>false</active>
  </product>
</catalog>
```

### CSV Input
```csv
id,name,description,active,price
1,"Widget, A","Line1
Line2",true,29.99
2,"Gadget ""Deluxe""","",false,null
```

### TEXT Input
```text
title=Quarterly Report
attempts=3
enabled=true
notes=Contains commas, quotes "and" unicode ₹
orphan freeform line
```

---

## 1. JSON to JSON

### Input
Use the shared JSON input.

### Logic
```csharp
var converter = new FormatConverter();
var output = converter.ConvertOutput(jsonInput, "JSON", "JSON");
```

### Expected Output
- Valid formatted JSON
- Nested objects retained
- Null retained
- Special characters retained

```json
{
  "order": {
    "id": 1001,
    "customer": {
      "name": "Alice & Bob",
      "email": "alice@example.com"
    },
    "items": [
      {
        "sku": "A-1",
        "qty": 2,
        "price": 19.95,
        "notes": "Fragile, handle with care"
      },
      {
        "sku": "B-2",
        "qty": 1,
        "price": null,
        "notes": "Gift \"wrapped\""
      }
    ],
    "active": true,
    "comment": "Line1\nLine2"
  }
}
```

## 2. JSON to XML

### Logic
```csharp
var output = converter.ConvertOutput(jsonInput, "XML", "JSON");
```

### Expected Output
```xml
<root>
  <order>
    <id>1001</id>
    <customer>
      <name>Alice & Bob</name>
      <email>alice@example.com</email>
    </customer>
    <items>
      <item>
        <sku>A-1</sku>
        <qty>2</qty>
        <price>19.95</price>
        <notes>Fragile, handle with care</notes>
      </item>
      <item>
        <sku>B-2</sku>
        <qty>1</qty>
        <price></price>
        <notes>Gift "wrapped"</notes>
      </item>
    </items>
    <active>true</active>
    <comment>Line1
Line2</comment>
  </order>
</root>
```

## 3. JSON to CSV

### Input
```json
[
  { "id": 1, "name": "Alice", "tags": ["vip", "priority"] },
  { "id": 2, "name": "Bob", "tags": [] }
]
```

### Logic
```csharp
var output = converter.ConvertOutput(jsonArrayInput, "CSV", "JSON");
```

### Expected Output
```csv
id,name,tags
1,Alice,"[""vip"",""priority""]"
2,Bob,[]
```

## 4. JSON to TEXT

### Logic
```csharp
var output = converter.ConvertOutput(jsonInput, "TEXT", "JSON");
```

### Expected Output
```text
order.id=1001
order.customer.name=Alice & Bob
order.customer.email=alice@example.com
order.items[0].sku=A-1
order.items[0].qty=2
order.items[0].price=19.95
order.items[0].notes=Fragile, handle with care
order.items[1].sku=B-2
order.items[1].qty=1
order.items[1].price=
order.items[1].notes=Gift "wrapped"
order.active=true
order.comment=Line1
Line2
```

## 5. XML to JSON

### Logic
```csharp
var output = converter.ConvertOutput(xmlInput, "JSON", "XML");
```

### Expected Output
```json
{
  "catalog": {
    "@generated": "2026-04-03",
    "product": [
      {
        "@id": "1",
        "name": "Widget & Gear",
        "price": "29.99",
        "active": "true"
      },
      {
        "@id": "2",
        "name": "Gadget",
        "price": "",
        "active": "false"
      }
    ]
  }
}
```

## 6. XML to XML

### Logic
```csharp
var output = converter.ConvertOutput(xmlInput, "XML", "XML");
```

### Expected Output
- Valid XML
- Same semantic structure preserved
- Attributes retained

## 7. XML to CSV

### Logic
```csharp
var output = converter.ConvertOutput(xmlInput, "CSV", "XML");
```

### Expected Output
```csv
@id,name,price,active
1,Widget & Gear,29.99,true
2,Gadget,,false
```

## 8. XML to TEXT

### Logic
```csharp
var output = converter.ConvertOutput(xmlInput, "TEXT", "XML");
```

### Expected Output
```text
catalog.@generated=2026-04-03
catalog.product[0].@id=1
catalog.product[0].name=Widget & Gear
catalog.product[0].price=29.99
catalog.product[0].active=true
catalog.product[1].@id=2
catalog.product[1].name=Gadget
catalog.product[1].price=
catalog.product[1].active=false
```

## 9. CSV to JSON

### Logic
```csharp
var output = converter.ConvertOutput(csvInput, "JSON", "CSV");
```

### Expected Output
```json
{
  "rows": [
    {
      "id": 1,
      "name": "Widget, A",
      "description": "Line1\nLine2",
      "active": true,
      "price": 29.99
    },
    {
      "id": 2,
      "name": "Gadget \"Deluxe\"",
      "description": null,
      "active": false,
      "price": null
    }
  ]
}
```

## 10. CSV to XML

### Logic
```csharp
var output = converter.ConvertOutput(csvInput, "XML", "CSV");
```

### Expected Output
```xml
<root>
  <rows>
    <item>
      <id>1</id>
      <name>Widget, A</name>
      <description>Line1
Line2</description>
      <active>true</active>
      <price>29.99</price>
    </item>
    <item>
      <id>2</id>
      <name>Gadget "Deluxe"</name>
      <description></description>
      <active>false</active>
      <price></price>
    </item>
  </rows>
</root>
```

## 11. CSV to CSV

### Logic
```csharp
var output = converter.ConvertOutput(csvInput, "CSV", "CSV");
```

### Expected Output
- CSV normalized
- Escaping retained
- Multiline quoted values retained

## 12. CSV to TEXT

### Logic
```csharp
var output = converter.ConvertOutput(csvInput, "TEXT", "CSV");
```

### Expected Output
```text
rows[0].id=1
rows[0].name=Widget, A
rows[0].description=Line1
Line2
rows[0].active=true
rows[0].price=29.99
rows[1].id=2
rows[1].name=Gadget "Deluxe"
rows[1].description=
rows[1].active=false
rows[1].price=
```

## 13. TEXT to JSON

### Logic
```csharp
var output = converter.ConvertOutput(textInput, "JSON", "TEXT");
```

### Expected Output
```json
{
  "title": "Quarterly Report",
  "attempts": 3,
  "enabled": true,
  "notes": "Contains commas, quotes \"and\" unicode ₹",
  "value": "orphan freeform line"
}
```

## 14. TEXT to XML

### Logic
```csharp
var output = converter.ConvertOutput(textInput, "XML", "TEXT");
```

### Expected Output
```xml
<root>
  <title>Quarterly Report</title>
  <attempts>3</attempts>
  <enabled>true</enabled>
  <notes>Contains commas, quotes "and" unicode ₹</notes>
  <value>orphan freeform line</value>
</root>
```

## 15. TEXT to CSV

### Logic
```csharp
var output = converter.ConvertOutput(textInput, "CSV", "TEXT");
```

### Expected Output
```csv
title,attempts,enabled,notes,value
Quarterly Report,3,true,"Contains commas, quotes ""and"" unicode ₹",orphan freeform line
```

## 16. TEXT to TEXT

### Logic
```csharp
var output = converter.ConvertOutput(textInput, "TEXT", "TEXT");
```

### Expected Output
- Original text returned unchanged

---

# Template-Driven Transformation Example

The debugger is primarily useful when Liquid templates reshape source data before optional output conversion.

## CSV to JSON via Template

### Input CSV
```csv
name,age,city
Alice,30,Kolkata
```

### Template
```liquid
[{ "name": "{{ rows[0].name }}", "age": {{ rows[0].age }}, "city": "{{ rows[0].city }}" }]
```

### C# Logic
```csharp
var loader = new InputDataLoader();
var (hash, origins) = loader.LoadFromString(csvInput, "CSV");

var engine = new DebugEngine(template, hash, origins);
while (!engine.State.IsComplete && string.IsNullOrEmpty(engine.State.ErrorMessage))
{
    engine.Step(StepAction.Continue);
}

var rendered = engine.State.OutputSoFar;

var converter = new FormatConverter();
var finalJson = converter.ConvertOutput(rendered, "JSON", "JSON");
```

### Expected Output
```json
[
  {
    "name": "Alice",
    "age": 30,
    "city": "Kolkata"
  }
]
```

---

# API Notes

## `/api/convert`
Converts the debugger's current rendered output from the declared input/source format to the requested target format.

## `/api/transform`
Loads input data, renders the template, and then converts the **rendered output** to the requested target format.

This is important because the endpoint should convert the template result, not simply reserialize the original input data.

---

# Current Limitations

These are known design characteristics, not hidden gaps:

- Only **JSON, XML, CSV, TEXT** are first-class supported formats.
- CSV is inherently tabular, so nested objects/arrays are flattened or serialized to string form.
- XML mixed content beyond simple text-plus-attributes is normalized into a practical object model, not a full fidelity DOM round-trip model.
- TEXT is intentionally lightweight and key/value oriented, not a schema-driven format.

---

# Recommended Validation Scenarios

Use the test suite to validate:

- JSON nested object preservation
- XML attribute retention
- CSV multiline quoted field parsing
- Null and empty-field propagation
- Unicode and special-character handling
- Conversion between all supported format pairs
- Template-driven transformations followed by output conversion

---

# Summary

Within the confirmed scope of **JSON, XML, CSV, and TEXT**, the project now implements the full conversion matrix:

- JSON → JSON/XML/CSV/TEXT
- XML → JSON/XML/CSV/TEXT
- CSV → JSON/XML/CSV/TEXT
- TEXT → JSON/XML/CSV/TEXT

Unsupported formats such as YAML and HTML remain out of scope for this repository unless explicitly added later.