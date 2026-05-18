const { Liquid } = require('liquidjs');

async function main() {
    try {
        const liquid = new Liquid();
        
        const rawData = {
            batchId: "BT-772",
            status: "PROCESSED",
            records: [
                { id: 1, type: "USER" },
                { id: 2, type: "SYSTEM" }
            ]
        };
        
        // Emulate fast-xml-parser Object.create(null) structure if loaded via that
        const cleanData = Object.create(null);
        cleanData.batchId = "BT-772";
        cleanData.status = "PROCESSED";
        cleanData.records = [
            { id: 1, type: "USER" },
            { id: 2, type: "SYSTEM" }
        ];
        
        const context = {
            content: cleanData
        };
        
        console.log("Evaluating content.records directly:");
        const val1 = await liquid.evalValue("content.records", context);
        console.log("val1:", val1);
        
        console.log("\nEvaluating content.records via parseAndRender:");
        const val2 = await liquid.parseAndRender("{{ content.records }}", context);
        console.log("val2:", val2);
        
        console.log("\nEvaluating content.records on plain object context:");
        const plainContext = {
            content: rawData
        };
        const val3 = await liquid.evalValue("content.records", plainContext);
        console.log("val3:", val3);
    } catch (e) {
        console.error("Error:", e);
    }
}

main();
