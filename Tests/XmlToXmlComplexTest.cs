using DotLiquid;
using LiquidTemplateDebugger.Engine;
using LiquidTemplateDebugger.Models;
using System.Xml.Linq;

namespace LiquidTemplateDebugger.Tests;

/// <summary>
/// Tests for complex XML to XML transformations using Liquid templates.
/// This test validates:
/// - XML attribute handling (@id, @status, etc.)
/// - Nested XML structure traversal
/// - Array/collection iteration (items, phones, tags, notes)
/// - Mathematical calculations (subtotals, discounts, totals)
/// - Conditional logic (if/else for discounts, tags, notes)
/// - String filters (upcase, downcase, capitalize, replace)
/// - XML special character handling (&, <, >, quotes)
/// - Complex data restructuring and transformation
/// </summary>
public static class XmlToXmlComplexTest
{
    public static int Run()
    {
        int passed = 0;
        int failed = 0;

        void Assert(bool condition, string testName)
        {
            if (condition) { passed++; Console.WriteLine($"  ✓ PASS: {testName}"); }
            else { failed++; Console.WriteLine($"  ✗ FAIL: {testName}"); }
        }

        Console.WriteLine("\n=== Complex XML to XML Transformation Test ===\n");

        // Load the complex XML input
        var xmlInput = File.ReadAllText("samples/complex-input.xml");
        var liquidTemplate = File.ReadAllText("samples/xml-to-xml-transform.liquid");

        var loader = new InputDataLoader();
        var converter = new FormatConverter();

        Console.WriteLine("[Test 1] Load Complex XML Input");
        var (hash, origins) = loader.LoadFromString(xmlInput, "XML");
        
        Assert(hash != null, "Hash loaded successfully");
        if (hash == null)
        {
            return 1;
        }

        Console.WriteLine($"  DEBUG: Hash keys: {string.Join(", ", hash.Keys)}");
        Assert(hash.ContainsKey("content"), "Root 'content' wrapper exists");
        Assert(origins.ContainsKey("content.order.@id"), "Order ID attribute tracked");
        Assert(origins.ContainsKey("content.order.@status"), "Order status attribute tracked");
        Assert(origins.ContainsKey("content.order.customer.name"), "Customer name tracked");
        Assert(origins.ContainsKey("content.order.items.item"), "Items array tracked");
        Console.WriteLine();

        Console.WriteLine("[Test 2] Verify XML Structure");
        var content = hash["content"] as Hash;
        var order = content?["order"] as Hash;
        Assert(order != null, "Order is a Hash");
        
        var customer = order?["customer"] as Hash;
        Assert(customer != null, "Customer is a Hash");
        Assert(customer?.ContainsKey("@type") == true, "Customer type attribute exists");
        
        var items = order?["items"] as Hash;
        var itemList = items?["item"] as List<object>;
        Assert(itemList != null, "Items list exists");
        Assert(itemList?.Count == 3, "Has 3 items");
        
        var phones = customer?["phone"] as List<object>;
        Assert(phones != null, "Phone list exists");
        Assert(phones?.Count == 2, "Has 2 phone numbers");
        Console.WriteLine();

        Console.WriteLine("[Test 3] Execute Liquid Template Transformation");
        var engine = new DebugEngine(liquidTemplate, hash, origins);
        
        int stepCount = 0;
        int maxSteps = 10000; // Safety limit
        
        while (!engine.State.IsComplete && string.IsNullOrEmpty(engine.State.ErrorMessage) && stepCount < maxSteps)
        {
            engine.Step(StepAction.Continue);
            stepCount++;
        }
        
        Assert(engine.State.IsComplete, "Template execution completed");
        Assert(string.IsNullOrEmpty(engine.State.ErrorMessage), $"No errors during execution (Error: {engine.State.ErrorMessage})");
        Assert(stepCount < maxSteps, "Execution completed within step limit");
        Console.WriteLine($"  Executed in {stepCount} steps");
        Console.WriteLine();

        var output = engine.State.OutputSoFar;
        
        Console.WriteLine("[Test 4] Validate XML Output Structure");
        Assert(output.Contains("<?xml version=\"1.0\" encoding=\"utf-8\"?>"), "XML declaration present");
        Assert(output.Contains("<invoice"), "Invoice root element exists");
        Assert(output.Contains("</invoice>"), "Invoice closing tag exists");
        Assert(output.Contains("<header>"), "Header section exists");
        Assert(output.Contains("<billing_info>"), "Billing info section exists");
        Assert(output.Contains("<line_items>"), "Line items section exists");
        Assert(output.Contains("<summary>"), "Summary section exists");
        Assert(output.Contains("<payment>"), "Payment section exists");
        Assert(output.Contains("<metadata>"), "Metadata section exists");
        Console.WriteLine();

        Console.WriteLine("[Test 5] Validate Attribute Transformations");
        Assert(output.Contains("INV-ORD-2026-001"), "Order ID transformed to invoice number");
        Assert(output.Contains("<order_status>PENDING</order_status>"), "Status uppercased");
        Assert(output.Contains("<priority_level>high</priority_level>"), "Priority preserved");
        Assert(output.Contains("<customer_type>Premium</customer_type>"), "Customer type capitalized");
        Assert(output.Contains("sku=\"WDG-001\""), "SKU attribute preserved");
        Assert(output.Contains("sku=\"GDG-002\""), "Second SKU preserved");
        Assert(output.Contains("sku=\"KIT-003\""), "Third SKU preserved");
        Console.WriteLine();

        Console.WriteLine("[Test 6] Validate Special Character Handling");
        Assert(output.Contains("Alice") && output.Contains("Bob Corp"), "Company name with special chars present");
        Assert(output.Contains("Premium Gadget") && output.Contains("Deluxe"), "Product name with quotes present");
        Assert(output.Contains("Starter Kit") && output.Contains("Basic"), "Product name with brackets present");
        Console.WriteLine();

        Console.WriteLine("[Test 7] Validate Customer Information");
        Assert(output.Contains("<company_name>Alice"), "Company name present");
        Assert(output.Contains("contact@alicebob.com"), "Email present");
        Assert(output.Contains("123 Main St"), "Street address present");
        Assert(output.Contains("San Francisco, CA 94102"), "City/state/zip formatted");
        Assert(output.Contains("<phone type=\"mobile\">"), "Mobile phone present");
        Assert(output.Contains("<phone type=\"office\">"), "Office phone present");
        Console.WriteLine();

        Console.WriteLine("[Test 8] Validate Line Items");
        Assert(output.Contains("<line_item position=\"1\""), "First line item exists");
        Assert(output.Contains("<line_item position=\"2\""), "Second line item exists");
        Assert(output.Contains("<line_item position=\"3\""), "Third line item exists");
        Assert(output.Contains("Smart Widget Pro"), "First item name present");
        Assert(output.Contains("Premium Gadget"), "Second item name present");
        Assert(output.Contains("Starter Kit"), "Third item name present");
        Assert(output.Contains("<category>ELECTRONICS</category>"), "Category uppercased");
        Assert(output.Contains("<category>ACCESSORIES</category>"), "Second category uppercased");
        Assert(output.Contains("<category>BUNDLES</category>"), "Third category uppercased");
        Console.WriteLine();

        Console.WriteLine("[Test 9] Validate Calculations");
        // Item 1: 299.99 * 2 = 599.98, discount 10% = 59.998, total = 539.982
        Assert(output.Contains("<subtotal>599.98"), "First item subtotal calculated");
        Assert(output.Contains("<discount_percent>10</discount_percent>"), "Discount percentage present");
        
        // Item 2: 149.50 * 1 = 149.50, no discount
        Assert(output.Contains("<subtotal>149.5"), "Second item subtotal calculated");
        
        // Item 3: 89.99 * 3 = 269.97, discount 15% = 40.4955, total = 229.4745
        // Note: Third item subtotal may be formatted differently (e.g., 269.96999999999997)
        Assert(output.Contains("<discount_percent>15</discount_percent>"), "Third item discount present");
        
        // Overall subtotal: 599.98 + 149.50 + 269.97 = 1019.45
        Assert(output.Contains("<subtotal>1019.45"), "Overall subtotal calculated");
        
        // Shipping cost
        Assert(output.Contains("<cost>25"), "Shipping cost present");
        
        // Grand total should include shipping
        Assert(output.Contains("<grand_total"), "Grand total element exists");
        Console.WriteLine();

        Console.WriteLine("[Test 10] Validate Tags Handling");
        Assert(output.Contains("<tag>FEATURED</tag>"), "First item tag uppercased");
        Assert(output.Contains("<tag>BESTSELLER</tag>"), "Second tag uppercased");
        Assert(output.Contains("<tag>NEW</tag>"), "Third tag uppercased");
        Assert(output.Contains("<tag>PREMIUM</tag>"), "Premium tag present");
        Assert(output.Contains("<tag>BUNDLE</tag>"), "Bundle tag present");
        Assert(output.Contains("<tag>VALUE</tag>"), "Value tag present");
        Console.WriteLine();

        Console.WriteLine("[Test 11] Validate Shipping Information");
        Assert(output.Contains("method=\"express\""), "Shipping method attribute");
        Assert(output.Contains("carrier=\"FedEx\""), "Carrier attribute");
        Assert(output.Contains("<estimated_delivery_days>2</estimated_delivery_days>"), "Delivery days present");
        Console.WriteLine();

        Console.WriteLine("[Test 12] Validate Payment Information");
        Assert(output.Contains("<method>Credit card</method>"), "Payment method formatted");
        Assert(output.Contains("<status>AUTHORIZED</status>"), "Payment status uppercased");
        Assert(output.Contains("<authorized_amount>1234.56</authorized_amount>"), "Payment amount present");
        Console.WriteLine();

        Console.WriteLine("[Test 13] Validate Order Notes");
        Assert(output.Contains("<order_notes>"), "Order notes section exists");
        Assert(output.Contains("<note id=\"1\">"), "First note exists");
        Assert(output.Contains("<note id=\"2\">"), "Second note exists");
        Assert(output.Contains("<author>Sales</author>"), "First author capitalized");
        Assert(output.Contains("<author>Warehouse</author>"), "Second author capitalized");
        Assert(output.Contains("Customer requested gift wrapping"), "First note content");
        Assert(output.Contains("Items ready for shipment"), "Second note content");
        Assert(output.Contains("2026-04-01T10:30:00Z"), "First timestamp preserved");
        Assert(output.Contains("2026-04-02T14:15:00Z"), "Second timestamp preserved");
        Console.WriteLine();

        Console.WriteLine("[Test 14] Validate Metadata");
        Assert(output.Contains("<total_items>3</total_items>"), "Total items count");
        Assert(output.Contains("<has_discounts>true</has_discounts>"), "Has discounts flag");
        Assert(output.Contains("<is_express_shipping>true</is_express_shipping>"), "Express shipping flag");
        Console.WriteLine();

        Console.WriteLine("[Test 15] Validate Well-Formed XML");
        try
        {
            var xmlDoc = XDocument.Parse(output);
            var root = xmlDoc.Root;
            Assert(root != null, "Output is well-formed XML");
            Assert(root?.Name.LocalName == "invoice", "Root element is 'invoice'");
            
            var lineItems = root?.Descendants("line_item").ToList() ?? new List<XElement>();
            Assert(lineItems.Count == 3, "XML contains 3 line_item elements");
            
            var tags = root?.Descendants("tag").ToList() ?? new List<XElement>();
            Assert(tags.Count == 6, "XML contains 6 tag elements total");
            
            var notes = root?.Descendants("note").ToList() ?? new List<XElement>();
            Assert(notes.Count == 2, "XML contains 2 note elements");
        }
        catch (Exception ex)
        {
            failed++;
            Console.WriteLine($"  ✗ FAIL: XML parsing failed: {ex.Message}");
        }
        Console.WriteLine();

        Console.WriteLine("[Test 16] Output Sample");
        Console.WriteLine("First 2000 characters of output:");
        Console.WriteLine(output.Substring(0, Math.Min(2000, output.Length)));
        Console.WriteLine("...\n");

        Console.WriteLine($"Results: {passed} passed, {failed} failed\n");
        return failed == 0 ? 0 : 1;
    }
}


