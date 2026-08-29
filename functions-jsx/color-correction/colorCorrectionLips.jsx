// Color Correction — botão "Lips" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via .psd REAL do cliente
// (IMPLEMENTAR/ColorCorrection/funções-colorcorrection-lips-blush-teeth-glow.psd),
// lido com psd-tools. Estrutura:
//
//   [📂 Group] "Lips" (máscara de GRUPO preta)
//     ├─ Colorful Lips   (Preenchimento de Cor Sólida #F42A42 — MESMA
//     │                    cor de Darker Lips, só muda o blend —
//     │                    opacidade 46%, blend Color, OCULTA por
//     │                    padrão, máscara branca padrão)
//     └─ Darker Lips     (Preenchimento de Cor Sólida #F42A42,
//                          opacidade 80%, blend MULTIPLY, VISÍVEL,
//                          máscara branca padrão — escurece o lábio)
//
// ⚠️ Ordem real confirmada pelo cliente (Colorful Lips em cima, Darker
// Lips embaixo) — diferente da ordem que a leitura inicial do .psd
// sugeria.
//
// Reaproveita cc_makeSolidColorFillLayer (color-correction/colorCorrectionBlush.jsx),
// cc_addBlackMaskToGroup (color-correction/colorCorrectionSkinTone.jsx),
// shl_findLayerByName (helping-layers/helpingLayers.jsx) — concatenados
// no mesmo hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runColorCorrectionLips()').

var CC_LIPS_GROUP = "Lips";

function runColorCorrectionLips() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, CC_LIPS_GROUP);
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var lipsGroup = doc.layerSets.add();
        lipsGroup.name = CC_LIPS_GROUP;
        cc_setYellowLabel(lipsGroup);

        // Ordem real (confirmada pelo cliente): Colorful Lips em cima,
        // Darker Lips embaixo — "Darker Lips" criada PRIMEIRO (fica
        // embaixo), "Colorful Lips" por último (fica em cima).
        var darkerLips = cc_makeSolidColorFillLayer("Darker Lips", "F42A42", 80, "Mltp");
        darkerLips.move(lipsGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(darkerLips);

        var colorfulLips = cc_makeSolidColorFillLayer("Colorful Lips", "F42A42", 46, "Clr ");
        colorfulLips.visible = false;
        colorfulLips.move(lipsGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(colorfulLips);

        try {
            cc_addBlackMaskToGroup(lipsGroup);
        } catch (maskErr) {
            // Grupo continua funcional sem máscara.
        }

        lipsGroup.visible = true;

        return "true";
    } catch (e) {
        alert("Erro em Color Correction (Lips): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
