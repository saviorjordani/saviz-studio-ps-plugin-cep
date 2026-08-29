// Color Correction — botão "Blush" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via .psd REAL do cliente
// (IMPLEMENTAR/ColorCorrection/funções-colorcorrection-lips-blush-teeth-glow.psd),
// lido com psd-tools. Estrutura simples — uma única camada, sem grupo:
//
//   Blush   (Preenchimento de Cor Sólida #FF0770, opacidade 13%, blend
//            Color, MÁSCARA PRÓPRIA preta — pintar de branco só na
//            bochecha)
//
// Reaproveita cc_hexToRgb (color-correction/colorCorrectionSkinTone.jsx),
// db_fillActiveLayerMaskBlack (dodge-and-burn/dodgeAndBurnGlobal.jsx),
// shl_findLayerByName (helping-layers/helpingLayers.jsx) — concatenados
// no mesmo hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runColorCorrectionBlush()').

/**
 * Cria uma camada de Preenchimento de Cor Sólida — reaproveitada também
 * pelo botão Lips (Darker Lips / Colorful Lips).
 */
function cc_makeSolidColorFillLayer(layerName, hex, opacity, blendModeCharID) {
    var rgb = cc_hexToRgb(hex);

    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("contentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var colorDesc = new ActionDescriptor();
    colorDesc.putDouble(stringIDToTypeID("red"), rgb.r);
    colorDesc.putDouble(stringIDToTypeID("green"), rgb.g);
    colorDesc.putDouble(stringIDToTypeID("blue"), rgb.b);

    var fillDesc = new ActionDescriptor();
    fillDesc.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), colorDesc);
    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("solidColorLayer"), fillDesc);

    layerDesc.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), opacity || 100);
    if (blendModeCharID) {
        layerDesc.putEnumerated(charIDToTypeID("Md  "), charIDToTypeID("BlnM"), charIDToTypeID(blendModeCharID));
    }

    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("contentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function runColorCorrectionBlush() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, "Blush");
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var blush = cc_makeSolidColorFillLayer("Blush", "FF0770", 13, "Clr ");
        cc_setYellowLabel(blush);
        try {
            db_fillActiveLayerMaskBlack();
        } catch (maskErr) {
            // Sem máscara própria por enquanto — camada continua ativa.
        }

        blush.visible = true;

        return "true";
    } catch (e) {
        alert("Erro em Color Correction (Blush): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
