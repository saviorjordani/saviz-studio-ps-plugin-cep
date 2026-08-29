// Color Correction — botão "Glow" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via .psd REAL do cliente
// (IMPLEMENTAR/ColorCorrection/funções-colorcorrection-lips-blush-teeth-glow.psd),
// lido com psd-tools. Estrutura:
//
//   [📂 Group] "Glow" (SEM máscara própria — só as camadas/grupos
//   │                   internos têm máscara)
//     ├─ Curvas 2            (Curves, opacidade 100%, MÁSCARA PRÓPRIA
//     │                        preta, pontos [16,0] [88,152] [234,255] —
//     │                        clareia bastante sombras/meios-tons)
//     └─ [📂 Group] "Highlights" (máscara de GRUPO preta)
//          ├─ Curvas 1        (Curves, opacidade 100%, máscara = SELEÇÃO
//          │                    DE REALCE — Color Range "Highlights",
//          │                    igual ao Quick Select — pontos [0,0]
//          │                    [119,131] [226,255], clareia mais suave)
//          └─ Matiz/Saturação 1 (Hue/Sat, EM BRANCO/neutro — sem nenhum
//                                 canal ajustado no .psd original,
//                                 máscara branca padrão)
//
// ⚠️ Cuidado com a leitura dos pontos de Curves: o .psd guarda cada
// ponto como (output, input), não (input, output) — mesma pegadinha já
// corrigida no Eyes/Helping Layers. Os pontos acima já estão na ordem
// certa (input, output) pra passar direto pro Action Manager.
//
// Reaproveita cc_addBlackMaskToGroup, cc_makeSelectiveColorLayer
// (color-correction/colorCorrectionSkinTone.jsx),
// cc_makeCurvesLayerWithOpacity, cc_makeBlankHueSatLayer
// (color-correction/colorCorrectionEyes.jsx), db_fillActiveLayerMaskBlack
// (dodge-and-burn/dodgeAndBurnGlobal.jsx), shl_findLayerByName
// (helping-layers/helpingLayers.jsx) — concatenados no mesmo
// hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runColorCorrectionGlow()').

var CC_GLOW_GROUP = "Glow";

/**
 * Etiqueta amarela — confirmado no .psd real (sheet_color=4 em TODAS as
 * camadas/grupos do Color Correction, sem exceção: Skin Tone, Eyes,
 * Glow, Teeth, Blush, Lips). Reaproveitada pelos outros arquivos desse
 * accordion. Usa db_setLayerColorLabel (dodge-and-burn/dodgeAndBurnGrey.jsx).
 */
function cc_setYellowLabel(layer) {
    try {
        db_setLayerColorLabel(layer, "Ylw ");
    } catch (colorErr) {
        // Não trava a criação da camada por causa da cor.
    }
}

function cc_selectHighlights() {
    // Mesma técnica já confirmada funcionando no Quick Select
    // "Highlights" (Color Range, chave "colors", valor "highlights").
    var desc = new ActionDescriptor();
    desc.putEnumerated(stringIDToTypeID("colors"), stringIDToTypeID("colors"), stringIDToTypeID("highlights"));
    executeAction(stringIDToTypeID("colorRange"), desc, DialogModes.NO);
}

function runColorCorrectionGlow() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, CC_GLOW_GROUP);
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var originalLayer = doc.activeLayer;

        var glowGroup = doc.layerSets.add();
        glowGroup.name = CC_GLOW_GROUP;
        cc_setYellowLabel(glowGroup);

        // Ordem real (topo pro fundo): Highlights, Curvas 2 — então
        // "Curvas 2" é criada PRIMEIRO (fica embaixo) e "Highlights"
        // (com o conteúdo dela) por último (fica em cima).
        var curves2 = cc_makeCurvesLayerWithOpacity("Curvas 2", [[16, 0], [88, 152], [234, 255]], 100);
        curves2.move(glowGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(curves2);
        try {
            db_fillActiveLayerMaskBlack();
        } catch (maskErr2) {
            // Sem máscara própria por enquanto — camada continua ativa.
        }

        // "Highlights" — ordem interna real (topo pro fundo): Matiz/
        // Saturação 1, Curvas 1 — "Curvas 1" criada primeiro (fica
        // embaixo), "Matiz/Saturação 1" por último (fica em cima).
        var highlightsGroup = glowGroup.layerSets.add();
        highlightsGroup.name = "Highlights";
        cc_setYellowLabel(highlightsGroup);

        doc.activeLayer = originalLayer;
        try {
            cc_selectHighlights();
        } catch (selErr) {
            // Sem seleção de realces — Curvas 1 nasce com máscara branca
            // padrão em vez da seleção, mas continua funcional.
        }
        var curves1 = cc_makeCurvesLayerWithOpacity("Curvas 1", [[0, 0], [119, 131], [226, 255]], 100);
        curves1.move(highlightsGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(curves1);

        var hueSat1 = cc_makeBlankHueSatLayer("Matiz/Saturação 1");
        hueSat1.move(highlightsGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(hueSat1);

        try {
            cc_addBlackMaskToGroup(highlightsGroup);
        } catch (maskErr1) {
            // Grupo continua funcional sem máscara.
        }

        // O grupo "Glow" (o mais externo) NÃO tem máscara no .psd
        // original — só "Curvas 2" e "Highlights" (que já têm a delas
        // acima). Corrigido depois de reportado — eu tinha adicionado
        // uma máscara aqui por engano.

        glowGroup.visible = true;

        return "true";
    } catch (e) {
        alert("Erro em Color Correction (Glow): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
