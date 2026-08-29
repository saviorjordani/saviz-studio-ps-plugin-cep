// Dodge & Burn — botão "Macro" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real do painel Williams Academy: o botão cria um
// grupo "Macro" com 2 camadas de ajuste Curves, cada uma nascendo com
// máscara PRETA (mesmo padrão do botão Global — efeito escondido por
// padrão, revelado pintando de branco), de cima pra baixo:
//   1. fix for brightening
//   2. pores
//
// Valores das curvas extraídos dos .acv reais do cliente em
// IMPLEMENTAR/Dodge&Burn/Macro/ (parseados manualmente).
//
// Reaproveita shl_makeCurvesLayer / shl_findLayerByName (helpingLayers.jsx)
// e db_fillActiveLayerMaskBlack (dodgeAndBurnGlobal.jsx) — tudo
// concatenado no mesmo hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runDodgeAndBurnMacro()').

var DODGE_BURN_MACRO_GROUP = "Macro";

function db_makeMacroCurveLayer(layerName, points) {
    var layer = shl_makeCurvesLayer(layerName, points);
    db_fillActiveLayerMaskBlack();
    try {
        db_setLayerColorLabel(layer, "Ylw ");
    } catch (colorErr) {
        // Não trava a criação da camada por causa da cor.
    }
    return layer;
}

function runDodgeAndBurnMacro() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, DODGE_BURN_MACRO_GROUP);
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var group = doc.layerSets.add();
        group.name = DODGE_BURN_MACRO_GROUP;

        // move(..., ElementPlacement.INSIDE) sempre entra no topo do
        // grupo — criando de baixo pra cima o resultado final bate com o
        // print (de cima pra baixo: fix for brightening, pores).
        var pores = db_makeMacroCurveLayer("pores", [[0, 178], [255, 255]]);
        pores.move(group, ElementPlacement.INSIDE);

        var fixForBrightening = db_makeMacroCurveLayer("fix for brightening", [[0, 0], [152, 108], [255, 255]]);
        fixForBrightening.move(group, ElementPlacement.INSIDE);

        group.visible = true;
        return "true";
    } catch (e) {
        alert("Erro em Dodge & Burn (Macro): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
