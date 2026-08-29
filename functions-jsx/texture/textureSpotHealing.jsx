// Texture — 1º slot: "Spot Healing Brush" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real: cria uma camada vazia chamada
// "Texture: Spot Healing Brush" e muda a ferramenta ativa pro Pincel de
// Recuperação Pontual (Spot Healing Brush) com:
//   Tamanho: 20px, Rigidez: 65%, Espaçamento: 25%, Ângulo: 46°,
//   Circularidade: 47%, Tamanho controlado por: Pressão da Caneta
//
// Reaproveita fs_newEmptyLayer (frequencySeparation.jsx) — concatenado
// no mesmo hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runTextureSpotHealing()').

var TEXTURE_SPOT_HEALING_LAYER = "Texture: Spot Healing Brush";

function tx_selectSpotHealingBrushTool() {
    app.currentTool = "spotHealingBrushTool";
}

function tx_setSpotHealingBrushOptions(size, hardness, spacing, angle, roundness) {
    // Mesmo idioma de Action Manager já usado em dodgeAndBurnGrey.jsx
    // (setd na propriedade "Brsh" da ferramenta atual), incluindo aqui as
    // chaves adicionais de espaçamento/ângulo/circularidade.
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Brsh"));
    ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var brushDesc = new ActionDescriptor();
    brushDesc.putUnitDouble(charIDToTypeID("Dmtr"), charIDToTypeID("#Pxl"), size);
    brushDesc.putUnitDouble(charIDToTypeID("Hrdn"), charIDToTypeID("#Prc"), hardness);
    brushDesc.putUnitDouble(charIDToTypeID("Spcn"), charIDToTypeID("#Prc"), spacing);
    brushDesc.putUnitDouble(charIDToTypeID("Angl"), charIDToTypeID("#Ang"), angle);
    brushDesc.putUnitDouble(charIDToTypeID("Rndn"), charIDToTypeID("#Prc"), roundness);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Brsh"), brushDesc);

    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function runTextureSpotHealing() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, TEXTURE_SPOT_HEALING_LAYER);

    try {
        if (!existing) {
            var layer = fs_newEmptyLayer(TEXTURE_SPOT_HEALING_LAYER);
            try {
                db_setLayerColorLabel(layer, "Bl  ");
            } catch (colorErr) {
                // Não trava a criação da camada por causa da cor.
            }
        }

        tx_selectSpotHealingBrushTool();
        try {
            tx_setSpotHealingBrushOptions(20, 65, 25, 46, 47);
        } catch (brushErr) {
            // Não deixa a camada já criada travar se o "setd" do pincel
            // falhar por algum motivo de versão/estado (mesma cautela
            // usada em dodgeAndBurnGrey.jsx).
        }

        return "true";
    } catch (e) {
        alert("Erro em Texture (Spot Healing Brush): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
