// Dodge & Burn — botão "Global" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real do painel Williams Academy: o botão cria um
// grupo "Global" com 4 camadas de ajuste Curves, cada uma nascendo com
// máscara PRETA (efeito escondido por padrão — o usuário revela pintando
// de branco em cima onde quiser clarear/escurecer), de cima pra baixo:
//   1. strong brightening ++++
//   2. mild brightening
//   3. strong darkening ++++
//   4. mild darkening
//
// Valores das curvas extraídos dos .acv reais do cliente em
// IMPLEMENTAR/Dodge&Burn/Global/ (parseados manualmente, formato binário
// .acv da Adobe — mesmo processo já usado em helpingLayers.jsx).
//
// Reaproveita shl_makeCurvesLayer e shl_findLayerByName (definidas em
// helpingLayers.jsx, concatenadas junto no mesmo hostscript.jsx — ver
// scripts/package-test.js) em vez de duplicar a lógica de criar camada
// de Curves via Action Manager.
//
// Chamado do painel via csInterface.evalScript('runDodgeAndBurnGlobal()').

var DODGE_BURN_GLOBAL_GROUP = "Global";

function db_fillActiveLayerMaskBlack() {
    // Seleciona o canal da máscara da camada ativa (comando "slct" padrão,
    // bem mais simples/estável que os comandos que já deram problema em
    // Frequency Separation) e preenche de preto.
    var selectMaskDesc = new ActionDescriptor();
    var maskRef = new ActionReference();
    maskRef.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
    selectMaskDesc.putReference(charIDToTypeID("null"), maskRef);
    executeAction(charIDToTypeID("slct"), selectMaskDesc, DialogModes.NO);

    var doc = app.activeDocument;
    var black = new SolidColor();
    black.rgb.red = 0;
    black.rgb.green = 0;
    black.rgb.blue = 0;
    doc.selection.selectAll();
    doc.selection.fill(black);
    doc.selection.deselect();
}

function db_makeGlobalCurveLayer(layerName, points) {
    var layer = shl_makeCurvesLayer(layerName, points);
    db_fillActiveLayerMaskBlack();
    // Etiqueta amarela igual ao print real (só organizacional, não afeta
    // a imagem). Isolado num try/catch — "LayerColor" deu erro em outro
    // botão (não existe nesse ExtendScript), aqui já usa a versão via
    // Action Manager (db_setLayerColorLabel, em dodgeAndBurnGrey.jsx).
    try {
        db_setLayerColorLabel(layer, "Ylw ");
    } catch (colorErr) {
        // Não trava a criação da camada por causa da cor.
    }
    return layer;
}

function runDodgeAndBurnGlobal() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, DODGE_BURN_GLOBAL_GROUP);
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var group = doc.layerSets.add();
        group.name = DODGE_BURN_GLOBAL_GROUP;

        // move(..., ElementPlacement.INSIDE) sempre entra no topo do
        // grupo — criando de baixo pra cima o resultado final bate com o
        // print (de cima pra baixo: strong brightening ++++, mild
        // brightening, strong darkening ++++, mild darkening).
        var mildDarkening = db_makeGlobalCurveLayer("mild darkening", [[0, 0], [143, 114], [255, 255]]);
        mildDarkening.move(group, ElementPlacement.INSIDE);

        var strongDarkening = db_makeGlobalCurveLayer("strong darkening ++++", [[0, 0], [154, 103], [255, 255]]);
        strongDarkening.move(group, ElementPlacement.INSIDE);

        var mildBrightening = db_makeGlobalCurveLayer("mild brightening", [[0, 0], [112, 149], [255, 255]]);
        mildBrightening.move(group, ElementPlacement.INSIDE);

        var strongBrightening = db_makeGlobalCurveLayer("strong brightening ++++", [[0, 0], [102, 163], [255, 255]]);
        strongBrightening.move(group, ElementPlacement.INSIDE);

        group.visible = true;
        return "true";
    } catch (e) {
        alert("Erro em Dodge & Burn (Global): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
