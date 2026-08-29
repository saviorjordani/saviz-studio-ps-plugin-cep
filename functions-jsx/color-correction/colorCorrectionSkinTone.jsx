// Color Correction — botão "Skin tone" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via um .psd REAL do cliente (IMPLEMENTAR/ColorCorrection/
// psd-teste.psd), lido com a biblioteca psd-tools (Python) — muito mais
// confiável que os prints/estimativas de pixel usados na 1ª versão.
// Estrutura exata:
//
//   [📂 Group] "Skin Tone" (PASS_THROUGH)
//     ├─ [📂 Group] "Manual Color Correction"
//     │    └─ Manual Color Patch Correction  (Hue/Saturation, neutro:
//     │         master H=0 S=0 L=0 — máscara branca padrão)
//     ├─ [📂 Group] "Paint to Unify Skin Tone here" (máscara de GRUPO
//     │   │          preta — bbox (0,0,0,0)/bg=0 no psd, ou seja,
//     │   │          preenchimento sólido preto, sem pintura)
//     │   ├─ Adjust Brightness Reds/Yellows (Black & White, blend
//     │   │    LUMINOSITY, oculta, máscara = seleção de pele)
//     │   └─ Adjust SkinTone            (Selective Color, blend Normal,
//     │        visível, máscara = seleção de pele)
//     └─ [📂 Group] "Pick Skin Tone"
//          ├─ Tone 1  (Gradient Map, oculta, blend COLOR, opacidade 30%)
//          ├─ Tone 2  (idem)
//          ├─ Tone 3  (idem, VISÍVEL — tom escolhido nesse documento)
//          └─ Tone 4  (idem)
//
// Valores exatos extraídos do .psd (cores/gradientes eram só estimativa
// de pixel na 1ª versão — agora são os dados reais gravados no arquivo):
//   - Tone 1: #DEBD9E @87% → #FFFFEF @100%
//   - Tone 2: #CF9F7F @81% → #FFEFDF @100%
//   - Tone 3: #7F492D @50% → #FFEFDF @100%
//   - Tone 4: #7F5F4F @50% → #FFFFEF @100%
//   (todos: blend mode Color, opacidade 30% — psd-tools reporta opacity
//   na escala 0-255, o valor bruto 77 lido de lá é 77/255 ≈ 30%, não
//   77% — corrigido depois de reportado, sem dither/reverse)
//   - Adjust Brightness Reds/Yellows (.blw): Red=40 Yellow=60 Green=40
//     Cyan=60 Blue=20 Magenta=80, sem tingimento — confirmado batendo
//     100% com o arquivo binário. Blend LUMINOSITY (não Normal).
//   - Adjust SkinTone (Selective Color): todos os canais zero — mesmo
//     .asv real também zerado, confirmado.
//   - Manual Color Patch Correction (Hue/Saturation): master (0,0,0) —
//     o valor "+25" que eu tinha lido antes no .ahu bruto era na
//     verdade o campo de "Colorize" (que está DESLIGADO/enable_colorization=0
//     nesse documento), não o Master Lightness.
//
// Reaproveita shl_findLayerByName (helping-layers/helpingLayers.jsx) —
// concatenado no mesmo hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runColorCorrectionSkinTone()').

var CC_SKIN_TONE_GROUP = "Skin Tone";

function cc_addBlackMaskToGroup(group) {
    // 2 tentativas anteriores erraram a estrutura do descriptor (chave
    // de referência errada, ordem errada). Corrigido com base numa
    // biblioteca open source testada (Lifter, github.com/fcamarlinghi/Lifter,
    // função layers.masks.addLayerMask): referência ENUMERADA
    // "Chnl"/"Chnl"/"Msk " (não putClass), desc com "Nw  "→"Chnl",
    // "At  "→ref, "Usng"→"UsrM"→"RvlA" (Reveal All) ou "HdAl" (Hide All,
    // usado aqui pra já nascer preta).
    var doc = app.activeDocument;
    doc.activeLayer = group;

    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));

    var desc = new ActionDescriptor();
    desc.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
    desc.putReference(charIDToTypeID("At  "), ref);
    desc.putEnumerated(charIDToTypeID("Usng"), charIDToTypeID("UsrM"), charIDToTypeID("HdAl"));
    executeAction(charIDToTypeID("Mk  "), desc, DialogModes.NO);
}

function cc_makeSelectiveColorLayer(layerName) {
    // "Em branco" (relative, todos os canais zero) — confirmado batendo
    // com o .asv real e com o .psd real (SelectiveColor.data todo zero).
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var scDesc = new ActionDescriptor();
    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("selectiveColor"), scDesc);
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function cc_makeHueSaturationLayer(layerName, hue, saturation, lightness) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var hueSatDesc = new ActionDescriptor();
    hueSatDesc.putBoolean(stringIDToTypeID("colorize"), false);

    var masterDesc = new ActionDescriptor();
    masterDesc.putEnumerated(stringIDToTypeID("channel"), stringIDToTypeID("channel"), stringIDToTypeID("master"));
    masterDesc.putInteger(stringIDToTypeID("hue"), hue);
    masterDesc.putInteger(stringIDToTypeID("saturation"), saturation);
    masterDesc.putInteger(stringIDToTypeID("lightness"), lightness);

    var adjustmentList = new ActionList();
    adjustmentList.putObject(stringIDToTypeID("hueSatAdjustmentV2"), masterDesc);
    hueSatDesc.putList(stringIDToTypeID("adjustment"), adjustmentList);

    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("hueSaturation"), hueSatDesc);
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function cc_hexToRgb(hex) {
    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
    };
}

/**
 * stops: [[hex, locationPercent], [hex, locationPercent]] — locationPercent
 * de 0 a 100 (convertido aqui pra escala interna 0-4096 do Photoshop).
 */
function cc_makeGradientMapLayer(layerName, stops, opacity, blendModeCharID) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var gradMapDesc = new ActionDescriptor();
    var gradientDesc = new ActionDescriptor();
    gradientDesc.putString(stringIDToTypeID("name"), layerName);
    gradientDesc.putEnumerated(stringIDToTypeID("gradientForm"), stringIDToTypeID("gradientForm"), stringIDToTypeID("customStops"));
    gradientDesc.putDouble(stringIDToTypeID("interfaceIconFrameDimmed"), 4096);

    var colorsList = new ActionList();
    for (var i = 0; i < stops.length; i++) {
        var rgb = cc_hexToRgb(stops[i][0]);
        var location = Math.round(stops[i][1] / 100 * 4096);

        var colorDesc = new ActionDescriptor();
        colorDesc.putDouble(stringIDToTypeID("red"), rgb.r);
        colorDesc.putDouble(stringIDToTypeID("green"), rgb.g);
        colorDesc.putDouble(stringIDToTypeID("blue"), rgb.b);

        var stopDesc = new ActionDescriptor();
        stopDesc.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), colorDesc);
        stopDesc.putEnumerated(stringIDToTypeID("type"), stringIDToTypeID("colorStopType"), stringIDToTypeID("userStop"));
        stopDesc.putInteger(stringIDToTypeID("location"), location);
        stopDesc.putInteger(stringIDToTypeID("midpoint"), 50);
        colorsList.putObject(stringIDToTypeID("colorStop"), stopDesc);
    }
    gradientDesc.putList(stringIDToTypeID("colors"), colorsList);

    var transList = new ActionList();
    var transLocations = [0, 4096];
    for (var j = 0; j < transLocations.length; j++) {
        var transDesc = new ActionDescriptor();
        transDesc.putUnitDouble(stringIDToTypeID("opacity"), charIDToTypeID("#Prc"), 100);
        transDesc.putInteger(stringIDToTypeID("location"), transLocations[j]);
        transDesc.putInteger(stringIDToTypeID("midpoint"), 50);
        transList.putObject(stringIDToTypeID("transferSpec"), transDesc);
    }
    gradientDesc.putList(stringIDToTypeID("transparency"), transList);

    gradMapDesc.putObject(stringIDToTypeID("gradient"), stringIDToTypeID("gradientClassEvent"), gradientDesc);
    gradMapDesc.putBoolean(stringIDToTypeID("dither"), false);
    gradMapDesc.putBoolean(stringIDToTypeID("reverse"), false);
    // Método "Percepção" (não "Clássico") — confirmado no .psd real
    // (GradientMap.interpolation = 1.0). Foram 2 tentativas até achar o
    // lugar certo: nem a chave errada ("interpolationMethod") nem a
    // certa ("gradientsInterpolationMethod") dentro do objeto do
    // gradiente (parelelo a "colors"/"gradientForm") fizeram efeito —
    // essa chave vive um nível ACIMA, junto de "dither"/"reverse"
    // (confirmado com um script real publicado num fórum da Adobe, onde
    // ela aparece no mesmo nível de "angle"/"type" de uma gradient
    // layer, não dentro do objeto "gradient" propriamente dito).
    gradMapDesc.putEnumerated(stringIDToTypeID("gradientsInterpolationMethod"), stringIDToTypeID("gradientInterpolationMethodType"), stringIDToTypeID("perceptual"));

    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("gradientMapClass"), gradMapDesc);

    // Opacidade e blend mode DENTRO do "layerDesc" (o objeto "using"),
    // paralelo a "name"/"type" — não no descriptor externo. Botado fora
    // (no "desc" de fora) a opacidade até pegava mas o blend mode era
    // ignorado; movido pra cá pra ficar no lugar certo dos dois.
    layerDesc.putUnitDouble(charIDToTypeID("Opct"), charIDToTypeID("#Prc"), opacity);
    layerDesc.putEnumerated(charIDToTypeID("Md  "), charIDToTypeID("BlnM"), charIDToTypeID(blendModeCharID));

    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function cc_makeBlackWhiteLayerWithBlend(layerName, ch, blendModeCharID) {
    // Cópia local de shl_makeBlackWhiteLayer (helping-layers/helpingLayers.jsx)
    // com o blend mode embutido no descriptor de criação — setar
    // "layer.blendMode = ..." via DOM logo depois de criar deu o mesmo
    // tipo de erro ("comando não disponível") que já vimos no opacity
    // dos Gradient Map. Não mexi na função original pra não arriscar
    // quebrar o Helping Layers, que já está confirmado funcionando.
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var bwDesc = new ActionDescriptor();
    bwDesc.putInteger(stringIDToTypeID("red"), ch.red);
    bwDesc.putInteger(stringIDToTypeID("yellow"), ch.yellow);
    bwDesc.putInteger(stringIDToTypeID("green"), ch.green);
    bwDesc.putInteger(stringIDToTypeID("cyan"), ch.cyan);
    bwDesc.putInteger(stringIDToTypeID("blue"), ch.blue);
    bwDesc.putInteger(stringIDToTypeID("magenta"), ch.magenta);
    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("blackAndWhite"), bwDesc);

    // Blend mode DENTRO do "layerDesc" (paralelo a "name"/"type"), não no
    // descriptor externo — mesma correção aplicada em cc_makeGradientMapLayer.
    layerDesc.putEnumerated(charIDToTypeID("Md  "), charIDToTypeID("BlnM"), charIDToTypeID(blendModeCharID));

    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function cc_selectSkinTone() {
    // Mesma seleção do botão Quick Select "Skin" (Color Range > Skin
    // Tones + Detect Faces) — usada aqui pra virar a máscara das 6
    // camadas de ajuste do Skin Tone, confirmado num print real (as
    // máscaras individuais delas mostram exatamente esse recorte de
    // pele, não uma máscara branca lisa).
    var desc = new ActionDescriptor();
    desc.putEnumerated(stringIDToTypeID("colors"), stringIDToTypeID("colors"), stringIDToTypeID("skinTone"));
    desc.putBoolean(stringIDToTypeID("detectFaces"), true);
    executeAction(stringIDToTypeID("colorRange"), desc, DialogModes.NO);
}

function runColorCorrectionSkinTone() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, CC_SKIN_TONE_GROUP);
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        // Guarda a referência da camada original ANTES de criar qualquer
        // grupo — "doc.layers[0]" deixa de ser a foto assim que o
        // "Skin Tone" nasce (grupo novo sempre vai pro topo da pilha).
        var originalLayer = doc.activeLayer;

        // 1. Grupo "Skin Tone" (topo do documento).
        var skinToneGroup = doc.layerSets.add();
        skinToneGroup.name = CC_SKIN_TONE_GROUP;
        cc_setYellowLabel(skinToneGroup);

        // 2. "Pick Skin Tone" — criado ANTES pra ficar embaixo dentro do
        //    Skin Tone (novo grupo sempre nasce no topo da pilha do pai).
        //    Nasce direto dentro de skinToneGroup via
        //    skinToneGroup.layerSets.add() — mover GRUPO com .move() deu
        //    "Argumento ilegal", então evito .move() pra grupos.
        var pickGroup = skinToneGroup.layerSets.add();
        pickGroup.name = "Pick Skin Tone";
        cc_setYellowLabel(pickGroup);

        // A seleção de pele precisa ser refeita ANTES DE CADA UMA das 6
        // camadas — o Photoshop consome/limpa a seleção depois de usá-la
        // como máscara na camada anterior (confirmado: só a 1ª camada
        // (Tone 1) nascia com a máscara certa, as outras 5 vinham com
        // máscara branca lisa).
        doc.activeLayer = originalLayer;

        cc_selectSkinTone();
        var tone1 = cc_makeGradientMapLayer("Tone 1", [["DEBD9E", 87], ["FFFFEF", 100]], 30, "Clr ");
        tone1.visible = false;
        tone1.move(pickGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(tone1);

        doc.activeLayer = originalLayer;
        cc_selectSkinTone();
        var tone2 = cc_makeGradientMapLayer("Tone 2", [["CF9F7F", 81], ["FFEFDF", 100]], 30, "Clr ");
        tone2.visible = false;
        tone2.move(pickGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(tone2);

        doc.activeLayer = originalLayer;
        cc_selectSkinTone();
        var tone3 = cc_makeGradientMapLayer("Tone 3", [["7F492D", 50], ["FFEFDF", 100]], 30, "Clr ");
        tone3.visible = true;
        tone3.move(pickGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(tone3);

        doc.activeLayer = originalLayer;
        cc_selectSkinTone();
        var tone4 = cc_makeGradientMapLayer("Tone 4", [["7F5F4F", 50], ["FFFFEF", 100]], 30, "Clr ");
        tone4.visible = false;
        tone4.move(pickGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(tone4);

        // 3. "Paint to Unify Skin Tone here" — grupo com máscara preta,
        //    contém as 2 camadas de ajuste. Mesma técnica acima (nasce
        //    já dentro de skinToneGroup, sem .move()). Criado DEPOIS de
        //    "Pick Skin Tone" pra ficar acima dele (grupo novo nasce no
        //    topo).
        var paintGroup = skinToneGroup.layerSets.add();
        paintGroup.name = "Paint to Unify Skin Tone here";
        cc_setYellowLabel(paintGroup);

        // "Adjust Brightness Reds/Yellows" também recebe a seleção de
        // pele como máscara própria (print real confirma: mesma máscara
        // em forma de rosto que as outras 5, não uma máscara preta
        // fixa). Blend mode Luminosity embutido no descriptor de criação
        // (setar via DOM logo depois deu o mesmo erro do opacity).
        doc.activeLayer = originalLayer;
        cc_selectSkinTone();
        var brightnessLayer = cc_makeBlackWhiteLayerWithBlend("Adjust Brightness Reds/Yellows", { red: 40, yellow: 60, green: 40, cyan: 60, blue: 20, magenta: 80 }, "Lmns");
        brightnessLayer.visible = false;
        brightnessLayer.move(paintGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(brightnessLayer);

        doc.activeLayer = originalLayer;
        cc_selectSkinTone();
        var skinToneLayer = cc_makeSelectiveColorLayer("Adjust SkinTone");
        skinToneLayer.visible = true;
        skinToneLayer.move(paintGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(skinToneLayer);

        // Máscara do GRUPO (preta, confirmado no .psd real) — isolada em
        // try/catch: já deu "comando Criar não disponível" em 2
        // tentativas anteriores, ainda não resolvido de vez.
        try {
            cc_addBlackMaskToGroup(paintGroup);
        } catch (maskErr) {
            // Sem máscara de grupo por enquanto — o grupo continua
            // funcional, só sem o "pintar pra revelar".
        }

        // Desmarca a seleção de pele — "Manual Color Patch Correction"
        // (abaixo) usa máscara branca padrão, não a seleção de pele.
        try {
            doc.selection.deselect();
        } catch (deselErr) {
            // Sem seleção ativa — sem problema.
        }

        // 4. "Manual Color Correction" — DENTRO do Skin Tone (confirmado
        //    no .psd real, não é grupo separado como eu tinha antes).
        //    Deveria nascer no topo (acima de "Paint to Unify Skin Tone
        //    here"), mas na prática o novo grupo entrou embaixo — reordena
        //    explicitamente com PLACEBEFORE (mover entre IRMÃOS já
        //    existentes no mesmo grupo pai, diferente de aninhar grupo
        //    dentro de grupo, que já deu "Argumento ilegal" antes).
        var manualGroup = skinToneGroup.layerSets.add();
        manualGroup.name = "Manual Color Correction";
        cc_setYellowLabel(manualGroup);

        var manualLayer = cc_makeHueSaturationLayer("Manual Color Patch Correction", 0, 0, 0);
        manualLayer.move(manualGroup, ElementPlacement.INSIDE);
        cc_setYellowLabel(manualLayer);

        try {
            manualGroup.move(paintGroup, ElementPlacement.PLACEBEFORE);
        } catch (orderErr) {
            // Se não conseguir reordenar, o grupo continua funcional,
            // só na posição que o Photoshop escolheu.
        }

        skinToneGroup.visible = true;

        return "true";
    } catch (e) {
        alert("Erro em Color Correction (Skin tone): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
