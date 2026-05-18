using System;
using System.Collections.Generic;
using DotLiquid;
using LiquidTemplateDebugger.Engine;
using LiquidTemplateDebugger.Models;

namespace LiquidTemplateDebugger
{
    class ScratchEval
    {
        static void Main(string[] args)
        {
            try
            {
                var template = @"<?xml version=""1.0"" encoding=""UTF-8""?>
<Batch id=""{{ content.batchId }}"" status=""{{ content.status | Capitalize }}"">
  <Summary generated_at=""{{ ""now"" | Date: ""%Y-%m-%d"" }}"">
    <Count>{{ content.records.Size }}</Count>
  </Summary>
  <Items>
    {% for rec in content.records -%}
    <Item id=""{{ rec.id }}"" category=""{{ rec.type | Downcase }}"">
      {% if rec.type == 'USER' -%}
      <UserProfile>
        <Name>{{ rec.payload.name | Upcase }}</Name>
        <Grade>{% if rec.payload.score > 80 %}A{% else %}B{% endif %}</Grade>
      </UserProfile>
      {% else -%}
      <SystemLog event=""{{ rec.payload.event }}"">
        <Status>{{ rec.payload.ok | Default: false | Upcase }}</Status>
      </SystemLog>
      {% endif -%}
    </Item>
    {% endfor -%}
  </Items>
</Batch>";

                var jsonInput = @"{
  ""batchId"": ""BT-772"",
  ""status"": ""PROCESSED"",
  ""records"": [
    { ""id"": 1, ""type"": ""USER"", ""payload"": { ""name"": ""Soubhik Mukherjee"", ""score"": 88 } },
    { ""id"": 2, ""type"": ""SYSTEM"", ""payload"": { ""event"": ""Heartbeat"", ""ok"": true } }
  ]
}";
                
                var loader = new InputDataLoader();
                var (hash, origins) = loader.LoadFromString(jsonInput, "json");
                
                var engine = new DebugEngine(template, hash, origins);
                
                Console.WriteLine("Stepping through elements...");
                int stepCount = 0;
                while (!engine.State.IsComplete && stepCount < 100)
                {
                    engine.Step(StepAction.StepNext);
                    stepCount++;
                    
                    var element = engine.Elements[engine.State.CurrentElementIndex >= engine.Elements.Count ? engine.Elements.Count - 1 : engine.State.CurrentElementIndex];
                    Console.WriteLine($"Step {stepCount}: Paused on Element {engine.State.CurrentElementIndex} (Line {element.LineNumber}) type {element.ElementType} tag {element.TagName}");
                    
                    if (element.LineNumber == 12)
                    {
                        Console.WriteLine("\n[PAUSED ON LINE 12]");
                        Console.WriteLine("Variables in scope:");
                        foreach (var kvp in engine.State.Variables)
                        {
                            Console.WriteLine($"  {kvp.Key}: {kvp.Value.CurrentValue?.GetType().Name} -> {kvp.Value.CurrentValue}");
                        }
                        
                        var recScore = engine.Evaluate("rec.payload.score");
                        Console.WriteLine($"\nEvaluate(\"rec.payload.score\"): {(recScore == null ? "nil" : recScore.GetType().Name)} -> {recScore}");
                        
                        var rec = engine.Evaluate("rec");
                        Console.WriteLine($"Evaluate(\"rec\"): {(rec == null ? "nil" : rec.GetType().Name)} -> {rec}");
                        
                        var payload = engine.Evaluate("rec.payload");
                        Console.WriteLine($"Evaluate(\"rec.payload\"): {(payload == null ? "nil" : payload.GetType().Name)} -> {payload}");
                        break;
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error: {ex}");
            }
        }
    }
}
