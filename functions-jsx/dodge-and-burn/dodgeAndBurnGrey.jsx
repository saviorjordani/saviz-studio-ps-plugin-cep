// Dodge & Burn — botão "50% Grey" (lado do host — ExtendScript / Action Manager clássico)
//
// Descrito pelo cliente (comparando com o painel real da Williams
// Academy): cria uma camada rasterizada preenchida com #808080 (cinza
// 50%), modo de mesclagem "Sobrepor" (Overlay), muda a ferramenta ativa
// pra Pincel com cor de frente branca, tamanho 50, dureza 0 — clássico
// dodge & burn manual: pinta de branco pra clarear, preto (X pra trocar
// cor) pra escurecer, o Overlay faz o efeito de luz/sombra.
//
// Reaproveita fs_newEmptyLayer (frequencySeparation.jsx) e
// shl_findLayerByName (helpingLayers.jsx) — tudo concatenado no mesmo
// hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runDodgeAndBurnGrey()').

var DODGE_BURN_GREY_LAYER = "50% Grey";

function db_fillActiveLayerColor(hex) {
    var color = new SolidColor();
    color.rgb.hexValue = hex;
    var doc = app.activeDocument;
    doc.selection.selectAll();
    doc.selection.fill(color);
    doc.selection.deselect();
}

function db_selectBrushTool() {
    app.currentTool = "paintbrushTool";
}

function db_setForegroundWhite() {
    var white = new SolidColor();
    white.rgb.red = 255;
    white.rgb.green = 255;
    white.rgb.blue = 255;
    app.foregroundColor = white;
}

function db_setLayerColorLabel(layer, colorCharID) {
    // "layer.color = LayerColor.XXX" deu "LayerColor não está definido"
    // — esse enum não existe nesse ExtendScript. Troquei pra Action
    // Manager (idioma clássico de ScriptListener pra "setd" na cor da
    // camada), mais confiável.
    // colorCharID: "Rd  " vermelho, "Orng" laranja, "Ylw " amarelo,
    // "Grn " verde, "Bl  " azul, "Vlt " violeta, "Gry " cinza, "None" nenhum.
    var doc = app.activeDocument;
    doc.activeLayer = layer;

    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var colorDesc = new ActionDescriptor();
    colorDesc.putEnumerated(charIDToTypeID("Clr "), charIDToTypeID("Clr "), charIDToTypeID(colorCharID));
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lyr "), colorDesc);

    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function db_setBrushSizeAndHardness(diameter, hardness) {
    // Idioma clássico de ScriptListener pra "setd" no brush da ferramenta
    // atual (Options Bar / painel Pincel) — referência via propriedade
    // "Brsh" do alvo atual ("capp"/"Trgt"), valor com Dmtr (#Pxl) e Hrdn
    // (#Prc).
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Brsh"));
    ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var brushDesc = new ActionDescriptor();
    brushDesc.putUnitDouble(charIDToTypeID("Dmtr"), charIDToTypeID("#Pxl"), diameter);
    brushDesc.putUnitDouble(charIDToTypeID("Hrdn"), charIDToTypeID("#Prc"), hardness);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Brsh"), brushDesc);

    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function runDodgeAndBurnGrey() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, DODGE_BURN_GREY_LAYER);
    if (existing) {
        existing.visible = !existing.visible;
        return existing.visible ? "true" : "false";
    }

    try {
        var greyLayer = fs_newEmptyLayer(DODGE_BURN_GREY_LAYER);
        db_fillActiveLayerColor("808080");
        greyLayer.blendMode = BlendMode.OVERLAY;

        db_selectBrushTool();
        db_setForegroundWhite();
        try {
            db_setBrushSizeAndHardness(50, 0);
        } catch (brushErr) {
            // Não deixa o resto (camada cinza já criada) travar se o PS
            // recusar o "setd" do pincel por algum motivo de versão/estado.
        }

        return "true";
    } catch (e) {
        alert("Erro em Dodge & Burn (50% Grey): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
