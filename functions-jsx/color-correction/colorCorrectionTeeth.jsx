// Color Correction — botão "Teeth" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via .psd REAL do cliente
// (IMPLEMENTAR/ColorCorrection/funções-colorcorrection-lips-blush-teeth-glow.psd),
// lido com psd-tools. No arquivo o grupo se chama "Draw for white teeth"
// — é o botão "Teeth" do painel. Estrutura:
//
//   [📂 Group] "Draw for white teeth" (máscara de GRUPO preta — pintar
//   │                                   de branco só nos dentes)
//     ├─ Misturador de Canais 1 (Channel Mixer, MONOCROMÁTICO,
//     │                           Red=-126% Green=146% Blue=66%
//     │                           Constante=0%, opacidade 59%, blend
//     │                           SCREEN, máscara branca padrão)
//     └─ Matiz/Saturação 2      (Hue/Sat, canal Yellows: sat=-62 luz=+95
//                                 — mata o amarelado do dente, opacidade
//                                 87%, Normal, máscara branca padrão)
//
// Reaproveita cc_addBlackMaskToGroup (color-correction/colorCorrectionSkinTone.jsx),
// cc_setHueSatChannels/CC_HUE_SAT_CHANNEL_RANGES
// (color-correction/colorCorrectionEyes.jsx), shl_findLayerByName
// (helping-layers/helpingLayers.jsx) — concatenados no mesmo
// hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runColorCorrectionTeeth()').

var CC_TEETH_GROUP = "Draw for white teeth";

function cc_makeBlankChannelMixerLayer(layerName, opacity, blendModeCharID) {
    // Cria em branco (RGB, sem monocromático ainda) — o monocromático
    // com os valores reais é setado DEPOIS com
    // cc_setChannelMixerMonochrome, mesmo padrão em 2 passos já usado
    // pra Selective Color e Hue/Sat multi-canal (criar em branco, "setd"
    // depois com os valores de verdade — confirmado com scripts reais).
    // Opacidade/blend mode embutidos aqui no descriptor de criação (não
    // via DOM depois), mesma cautela já aprendida com o Gradient Map.
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(charIDToTypeID("AdjL"));
    desc.putReference(charIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    var cmDesc = new ActionDescriptor();
    cmDesc.putEnumerated(stringIDToTypeID("presetKind"), stringIDToTypeID("presetKindType"), stringIDToTypeID("presetKindDefault"));
    layerDesc.putObject(charIDToTypeID("Type"), charIDToTypeID("ChnM"), cmDesc);
    layerDesc.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), opacity || 100);
    if (blendModeCharID) {
        layerDesc.putEnumerated(charIDToTypeID("Md  "), charIDToTypeID("BlnM"), charIDToTypeID(blendModeCharID));
    }
    desc.putObject(charIDToTypeID("Usng"), charIDToTypeID("AdjL"), layerDesc);

    executeAction(charIDToTypeID("Mk  "), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    layer.name = layerName;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

/**
 * Define o modo Monocromático do Channel Mixer JÁ CRIADO e ativo, com
 * os 3 canais + constante — estrutura confirmada num script real
 * publicado num fórum da Adobe (charIDs clássicos "Mnch"/"Gry "/"ChMx").
 */
function cc_setChannelMixerMonochrome(red, green, blue, constant) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("AdjL"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var typeDesc = new ActionDescriptor();
    typeDesc.putEnumerated(stringIDToTypeID("presetKind"), stringIDToTypeID("presetKindType"), stringIDToTypeID("presetKindCustom"));
    typeDesc.putBoolean(charIDToTypeID("Mnch"), true);

    var grayDesc = new ActionDescriptor();
    grayDesc.putUnitDouble(charIDToTypeID("Rd  "), charIDToTypeID("#Prc"), red);
    grayDesc.putUnitDouble(charIDToTypeID("Grn "), charIDToTypeID("#Prc"), green);
    grayDesc.putUnitDouble(charIDToTypeID("Bl  "), charIDToTypeID("#Prc"), blue);
    grayDesc.putUnitDouble(charIDToTypeID("Cnst"), charIDToTypeID("#Prc"), constant);
    typeDesc.putObject(charIDToTypeID("Gry "), charIDToTypeID("ChMx"), grayDesc);

    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("ChnM"), typeDesc);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function runColorCorrectionTeeth() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, CC_TEETH_GROUP);
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var teethGroup = doc.layerSets.add();
        teethGroup.name = CC_TEETH_GROUP;
        cc_setYellowLabel(teethGroup);

        // 1. "Matiz/Saturação 2" criada ANTES pra ficar embaixo do
        //    Misturador de Canais.
        var hueSat2 = cc_makeBlankHueSatLayer("Matiz/Saturação 2", 87);
        try {
            cc_setHueSatChannels([
                { channelId: "yellows", hue: 0, saturation: -62, lightness: 95 }
            ]);
        } catch (hsErr) {
            alert("Color Correction (Teeth): não consegui setar o canal Yellows da Matiz/Saturação 2 (" + hsErr.message + "). A camada foi criada mesmo assim, em branco.");
        }
        hueSat2.move(teethGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(hueSat2);

        // 2. Misturador de Canais 1 — criado por último pra ficar em cima.
        var channelMixer1 = cc_makeBlankChannelMixerLayer("Misturador de Canais 1", 59, "Scrn");
        try {
            cc_setChannelMixerMonochrome(-126, 146, 66, 0);
        } catch (cmErr) {
            alert("Color Correction (Teeth): não consegui setar o Misturador de Canais 1 (" + cmErr.message + "). A camada foi criada mesmo assim, em branco.");
        }
        channelMixer1.move(teethGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(channelMixer1);

        try {
            cc_addBlackMaskToGroup(teethGroup);
        } catch (maskErr) {
            // Grupo continua funcional sem máscara.
        }

        teethGroup.visible = true;

        return "true";
    } catch (e) {
        alert("Erro em Color Correction (Teeth): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
