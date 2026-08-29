// Color Correction — botão "Eyes" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via um .psd REAL do cliente (IMPLEMENTAR/ColorCorrection/
// Eyes-button.psd), lido com psd-tools (Python). Estrutura exata:
//
//   [📂 Group] "Eye Color" (máscara de GRUPO preta — pintar de branco
//   │                        pra revelar, igual Paint to Unify Skin Tone)
//     ├─ Curvas 1            (Curves, opacidade 50%, pontos
//     │                        [7,0] [96,160] [230,255] — clareia os
//     │                        tons médios (curva pra cima), dá brilho
//     │                        na íris)
//     └─ Matiz/Saturação 2   (Hue/Sat, COLORIZE ligado: matiz=192°,
//                              saturação=25, luz=0 — tinge a íris com
//                              uma cor sólida)
//
//   [📂 Group] "Eye White" (máscara de GRUPO preta)
//     ├─ Removing Blood Vessels (camada de PIXEL — duplicata cheia da
//     │                           foto original, 100% opaca — pra
//     │                           retocar com Carimbo/Recuperação direto
//     │                           nela, igual ao padrão do Texture)
//     ├─ Matiz/Saturação 1   (Hue/Sat multi-canal: Reds sat=-64 luz=+47,
//     │                        Yellows sat=-10 luz=+8 — mata o vermelho
//     │                        dos vasinhos e o amarelado)
//     ├─ Níveis 1             (Levels, canal composto, gama=1.16 —
//     │                        clareia os tons médios)
//     └─ Cor Seletiva 1       (Selective Color, canal Neutros, Preto=-45
//                              relativo — clareia sem mexer na cor)
//
// 🟡 Primeira implementação — Selective Color com valor específico
// (Neutrals/Black) e Hue/Sat multi-canal são estruturas de Action
// Manager NOVAS nesse projeto (nunca usadas antes), montadas com base em
// scripts reais publicados em fóruns da Adobe, não confirmadas ao vivo
// ainda. A faixa customizada do canal Reds (Matiz/Saturação 1) foi
// simplificada pra faixa PADRÃO do Photoshop (não a customizada do
// arquivo original) — não achei com confiança as chaves de Action
// Manager pros 4 limites de faixa custom, e a diferença visual deve ser
// pequena.
//
// Reaproveita cc_addBlackMaskToGroup, cc_makeSelectiveColorLayer
// (color-correction/colorCorrectionSkinTone.jsx), fs_duplicateActiveLayer
// (frequency-separation/frequencySeparation.jsx), shl_findLayerByName
// (helping-layers/helpingLayers.jsx) — concatenados no mesmo
// hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runColorCorrectionEyes()').

var CC_EYE_COLOR_GROUP = "Eye Color";
var CC_EYE_WHITE_GROUP = "Eye White";

function cc_makeCurvesLayerWithOpacity(layerName, points, opacity) {
    // Cópia de shl_makeCurvesLayer (helping-layers/helpingLayers.jsx) com
    // opacidade embutida no descriptor de criação — mesma correção já
    // aplicada em cc_makeGradientMapLayer/cc_makeBlackWhiteLayerWithBlend
    // (setar via DOM logo depois de criar já deu erro antes).
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var curvesDesc = new ActionDescriptor();
    var curvesList = new ActionList();
    var channelDesc = new ActionDescriptor();
    var channelRef = new ActionReference();
    channelRef.putEnumerated(stringIDToTypeID("channel"), stringIDToTypeID("channel"), stringIDToTypeID("composite"));
    channelDesc.putReference(stringIDToTypeID("channel"), channelRef);

    var pointsList = new ActionList();
    for (var i = 0; i < points.length; i++) {
        var ptDesc = new ActionDescriptor();
        ptDesc.putDouble(stringIDToTypeID("horizontal"), points[i][0]);
        ptDesc.putDouble(stringIDToTypeID("vertical"), points[i][1]);
        pointsList.putObject(stringIDToTypeID("point"), ptDesc);
    }
    channelDesc.putList(stringIDToTypeID("curve"), pointsList);
    curvesList.putObject(stringIDToTypeID("curvesAdjustment"), channelDesc);
    curvesDesc.putList(stringIDToTypeID("adjustment"), curvesList);
    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("curves"), curvesDesc);

    layerDesc.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), opacity);

    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function cc_makeColorizeHueSatLayer(layerName, hue, saturation, lightness) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var hueSatDesc = new ActionDescriptor();
    hueSatDesc.putBoolean(stringIDToTypeID("colorize"), true);

    var colorizeDesc = new ActionDescriptor();
    colorizeDesc.putDouble(stringIDToTypeID("hue"), hue);
    colorizeDesc.putDouble(stringIDToTypeID("saturation"), saturation);
    colorizeDesc.putDouble(stringIDToTypeID("lightness"), lightness);
    hueSatDesc.putObject(stringIDToTypeID("colorizeColor"), stringIDToTypeID("HSBColorClass"), colorizeDesc);

    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("hueSaturation"), hueSatDesc);
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function cc_makeBlankHueSatLayer(layerName, opacity) {
    // Camada Hue/Sat "em branco" (Master 0/0/0, sem canal nenhum ainda)
    // — os canais específicos (Reds/Yellows etc) são setados DEPOIS com
    // cc_setHueSatChannels, não aqui. Embutir os canais direto no "make"
    // fez o valor do último canal vazar pro Master (bug real, testado).
    // "opacity" é opcional (default 100) — embutida no descriptor de
    // criação, não setada via DOM depois (mesma cautela já aprendida
    // com o Gradient Map).
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var hueSatDesc = new ActionDescriptor();
    hueSatDesc.putBoolean(stringIDToTypeID("colorize"), false);
    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("hueSaturation"), hueSatDesc);
    layerDesc.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), opacity || 100);
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

/**
 * Define canais específicos (Reds/Yellows/etc) numa camada Hue/Sat JÁ
 * CRIADA e ativa — via "set" (não "make"), estrutura confirmada num
 * script real publicado num fórum da Adobe. channels: [{ channelId,
 * hue, saturation, lightness }]. Usa a FAIXA PADRÃO de cada canal (não
 * uma faixa customizada) — ver nota no topo do arquivo.
 */
// Faixas padrão de cada canal (BgnR/BgnS/EndS/EndR) e o índice usado em
// "LclR" — confirmado num log real do ScriptListener (o cliente mexeu
// manualmente nos canais Reds/Yellows e capturou o comando de verdade).
var CC_HUE_SAT_CHANNEL_RANGES = {
    reds: { lclR: 1, range: [315, 345, 15, 45] },
    yellows: { lclR: 2, range: [15, 45, 75, 105] },
    greens: { lclR: 3, range: [75, 105, 135, 165] },
    cyans: { lclR: 4, range: [135, 165, 195, 225] },
    blues: { lclR: 5, range: [195, 225, 255, 285] },
    magentas: { lclR: 6, range: [255, 285, 315, 345] }
};

/**
 * Define vários canais (Reds/Yellows/etc) de uma vez numa camada Hue/Sat
 * JÁ CRIADA e ativa. Estrutura 100% baseada num log real do
 * ScriptListener — 2 tentativas anteriores (stringIDs "channel"/
 * "hueSatAdjustmentV2"/"adjustment") vazavam o último canal pro Master.
 * A estrutura real usa charIDs clássicos ("H   ", "Strt", "Lght", "Hst2")
 * e cada entrada da lista precisa também dos limites de faixa
 * (BgnR/BgnS/EndS/EndR) e do índice do canal (LclR) — sem isso o
 * Photoshop não sabe a qual canal aquela entrada pertence.
 */
function cc_setHueSatChannels(channels) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("AdjL"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var typeDesc = new ActionDescriptor();
    typeDesc.putEnumerated(stringIDToTypeID("presetKind"), stringIDToTypeID("presetKindType"), stringIDToTypeID("presetKindCustom"));

    var adjustmentList = new ActionList();
    for (var i = 0; i < channels.length; i++) {
        var channelInfo = CC_HUE_SAT_CHANNEL_RANGES[channels[i].channelId];
        var channelDesc = new ActionDescriptor();
        channelDesc.putInteger(charIDToTypeID("LclR"), channelInfo.lclR);
        channelDesc.putInteger(charIDToTypeID("BgnR"), channelInfo.range[0]);
        channelDesc.putInteger(charIDToTypeID("BgnS"), channelInfo.range[1]);
        channelDesc.putInteger(charIDToTypeID("EndS"), channelInfo.range[2]);
        channelDesc.putInteger(charIDToTypeID("EndR"), channelInfo.range[3]);
        channelDesc.putInteger(charIDToTypeID("H   "), channels[i].hue);
        channelDesc.putInteger(charIDToTypeID("Strt"), channels[i].saturation);
        channelDesc.putInteger(charIDToTypeID("Lght"), channels[i].lightness);
        adjustmentList.putObject(charIDToTypeID("Hst2"), channelDesc);
    }
    typeDesc.putList(charIDToTypeID("Adjs"), adjustmentList);

    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("HStr"), typeDesc);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function cc_makeLevelsLayer(layerName, compositeGamma) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var levelsDesc = new ActionDescriptor();
    var channelDesc = new ActionDescriptor();
    var channelRef = new ActionReference();
    channelRef.putEnumerated(stringIDToTypeID("channel"), stringIDToTypeID("channel"), stringIDToTypeID("composite"));
    channelDesc.putReference(stringIDToTypeID("channel"), channelRef);
    channelDesc.putDouble(stringIDToTypeID("gamma"), compositeGamma);

    var channelsList = new ActionList();
    channelsList.putObject(stringIDToTypeID("levelsAdjustment"), channelDesc);
    levelsDesc.putList(stringIDToTypeID("levelsAdjustment"), channelsList);

    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("levels"), levelsDesc);
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

/**
 * Define um canal específico (ex: Neutros) de uma camada Selective Color
 * JÁ CRIADA e ativa — via "setd", estrutura baseada num script real
 * publicado num fórum da Adobe (não confirmada ao vivo ainda).
 */
function cc_setSelectiveColorChannel(colorRangeCharID, cyan, magenta, yellow, black) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("AdjL"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var typeDesc = new ActionDescriptor();
    typeDesc.putEnumerated(stringIDToTypeID("presetKind"), stringIDToTypeID("presetKindType"), stringIDToTypeID("presetKindCustom"));

    var colorDesc = new ActionDescriptor();
    colorDesc.putEnumerated(charIDToTypeID("Clrs"), charIDToTypeID("Clrs"), charIDToTypeID(colorRangeCharID));
    colorDesc.putUnitDouble(charIDToTypeID("Cyn "), charIDToTypeID("#Prc"), cyan);
    colorDesc.putUnitDouble(charIDToTypeID("Mgnt"), charIDToTypeID("#Prc"), magenta);
    colorDesc.putUnitDouble(charIDToTypeID("Ylw "), charIDToTypeID("#Prc"), yellow);
    colorDesc.putUnitDouble(charIDToTypeID("Blck"), charIDToTypeID("#Prc"), black);

    var list = new ActionList();
    list.putObject(charIDToTypeID("ClrC"), colorDesc);
    typeDesc.putList(stringIDToTypeID("adjustment"), list);

    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("SlcC"), typeDesc);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function runColorCorrectionEyes() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, CC_EYE_COLOR_GROUP);
    if (existing) {
        var whiteExisting = shl_findLayerByName(doc.layers, CC_EYE_WHITE_GROUP);
        existing.visible = !existing.visible;
        if (whiteExisting) whiteExisting.visible = existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var originalLayer = doc.activeLayer;

        // 1. "Eye Color" — Matiz/Saturação 2 criada ANTES pra ficar
        //    embaixo (move INSIDE sempre entra no topo do grupo).
        var eyeColorGroup = doc.layerSets.add();
        eyeColorGroup.name = CC_EYE_COLOR_GROUP;
        cc_setYellowLabel(eyeColorGroup);

        // Matiz vinha -168 no .psd bruto — o Photoshop não aceitou
        // negativo (zerou). -168 + 360 = 192, mesmo ângulo, positivo.
        var hueSat2 = cc_makeColorizeHueSatLayer("Matiz/Saturação 2", 192, 25, 0);
        hueSat2.move(eyeColorGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(hueSat2);

        // Pontos vêm do .psd como (output, input) — mesma pegadinha já
        // vista no Helping Layers (.acv). Invertido pra (input, output):
        // (0,7)→(7,0), (160,96)→(96,160), (255,230)→(230,255) — dá uma
        // curva pra CIMA (clareia), não pra baixo.
        var curves1 = cc_makeCurvesLayerWithOpacity("Curvas 1", [[7, 0], [96, 160], [230, 255]], 50);
        curves1.move(eyeColorGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(curves1);

        try {
            cc_addBlackMaskToGroup(eyeColorGroup);
        } catch (maskErr1) {
            // Sem máscara por enquanto — o grupo continua funcional.
        }

        // 2. "Eye White" — criado depois de "Eye Color" (ordem real do
        //    .psd: Eye Color em cima, Eye White embaixo).
        var eyeWhiteGroup = doc.layerSets.add();
        eyeWhiteGroup.name = CC_EYE_WHITE_GROUP;
        cc_setYellowLabel(eyeWhiteGroup);

        // Cor Seletiva 1 criada ANTES pra ficar embaixo, subindo até
        // "Removing Blood Vessels" no topo (ordem real: Removing Blood
        // Vessels, Matiz/Saturação 1, Níveis 1, Cor Seletiva 1).
        var selectiveColor1 = cc_makeSelectiveColorLayer("Cor Seletiva 1");
        selectiveColor1.move(eyeWhiteGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(selectiveColor1);
        try {
            cc_setSelectiveColorChannel("Ntrl", 0, 0, 0, -45);
        } catch (scErr) {
            alert("Color Correction (Eyes): não consegui setar o canal Neutros da Cor Seletiva 1 (" + scErr.message + "). A camada foi criada mesmo assim, em branco.");
        }

        var levels1 = cc_makeLevelsLayer("Níveis 1", 1.16);
        levels1.move(eyeWhiteGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(levels1);

        var hueSat1 = cc_makeBlankHueSatLayer("Matiz/Saturação 1");
        try {
            cc_setHueSatChannels([
                { channelId: "reds", hue: 0, saturation: -64, lightness: 47 },
                { channelId: "yellows", hue: 0, saturation: -10, lightness: 8 }
            ]);
        } catch (hsErr) {
            alert("Color Correction (Eyes): não consegui setar os canais Reds/Yellows da Matiz/Saturação 1 (" + hsErr.message + "). A camada foi criada mesmo assim, em branco.");
        }
        hueSat1.move(eyeWhiteGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(hueSat1);

        doc.activeLayer = originalLayer;
        var bloodVessels = fs_duplicateActiveLayer();
        bloodVessels.name = "Removing Blood Vessels";
        bloodVessels.move(eyeWhiteGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(bloodVessels);

        try {
            cc_addBlackMaskToGroup(eyeWhiteGroup);
        } catch (maskErr2) {
            // Sem máscara por enquanto — o grupo continua funcional.
        }

        eyeColorGroup.visible = true;
        eyeWhiteGroup.visible = true;

        return "true";
    } catch (e) {
        alert("Erro em Color Correction (Eyes): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
