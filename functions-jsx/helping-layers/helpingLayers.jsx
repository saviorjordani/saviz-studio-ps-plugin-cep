// Helping Layers (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real do painel Williams Academy: grupo
// "Helping Layers" contendo 3 camadas de ajuste, nessa ordem:
//   1. Solar Curve   — Curves, curva "dente de serra"
//   2. D&B Help B/W  — Black & White
//   3. D&B Help      — Curves (curva diferente da Solar)
//
// Valores extraídos direto dos arquivos de predefinição reais que o
// cliente exportou da própria Williams Academy (IMPLEMENTAR/):
//   - solarcurves-savizstudio.acv  -> curva do Solar Curve
//   - p&b-help-savizstudio.acv     -> curva do D&B Help
//   - p&b-savizstudio.blw          -> canais do D&B Help B/W
// Parseados manualmente (formato binário .acv/.blw da Adobe).
//
// Agrupamento: cria o grupo primeiro (LayerSet vazio) e MOVE cada camada
// pra dentro dele via layer.move(...) (API de objeto do DOM do
// ExtendScript), em vez de selecionar as 3 via Action Manager e agrupar
// depois — a versão anterior (select com addToSelection + groupEvent)
// não estava juntando as 3 de forma confiável e as camadas ficavam soltas
// (e herdando "clipping" indevido). Também força `grouped = false`
// (equivalente a "não é máscara de recorte") em cada camada logo após
// criar, como garantia extra.
//
// Concatenado dentro de jsx/hostscript.jsx no build (ver scripts/package-test.js).
// Chamado do painel via csInterface.evalScript('toggleHelpingLayers()').

var HELPING_LAYERS_GROUP = "Helping Layers";

function shl_makeCurvesLayer(layerName, points) {
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
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    // "grouped = false" (soltar máscara de recorte) só é um comando
    // válido se a camada JÁ estiver clipada — chamar isso incondicional
    // numa camada que nasce sem clipping (comportamento padrão) dá erro
    // "comando não disponível" e trava o resto da função.
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function shl_makeBlackWhiteLayer(layerName, ch) {
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
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    if (layer.grouped) layer.grouped = false;
    return layer;
}

function shl_findLayerByName(layers, name) {
    for (var i = 0; i < layers.length; i++) {
        if (layers[i].name === name) return layers[i];
        if (layers[i].typename === "LayerSet") {
            var found = shl_findLayerByName(layers[i].layers, name);
            if (found) return found;
        }
    }
    return null;
}

function toggleHelpingLayers() {
    if (app.documents.length === 0) return "true";
    var doc = app.activeDocument;
    var group = shl_findLayerByName(doc.layers, HELPING_LAYERS_GROUP);

    if (group) {
        group.visible = !group.visible;
        return group.visible ? "true" : "false";
    }

    try {
        // 1. Grupo vazio primeiro, no topo da pilha.
        group = doc.layerSets.add();
        group.name = HELPING_LAYERS_GROUP;

        // 2. Cada camada nasce FORA do grupo (acima da pilha, que nesse
        //    momento já inclui o grupo vazio), com visibilidade individual
        //    desligada, e é movida pra dentro do grupo logo em seguida.
        //    move(..., ElementPlacement.INSIDE) sempre entra como topo do
        //    grupo, então criando/movendo nessa ordem (D&B Help, D&B Help
        //    B/W, Solar Curve) o resultado final de cima pra baixo fica:
        //    Solar Curve, D&B Help B/W, D&B Help — igual ao print.
        // Confirmado com o cliente: no Williams Academy real as 3 camadas
        // TAMBÉM ficam em blend mode Normal (não é Soft Light/Overlay).
        // A diferença visual entre o nosso resultado e o deles não vem do
        // blend mode — ainda não sabemos a causa real (pode ser algo nos
        // próprios valores da curva, Blend If, ordem, ou outra coisa).
        // Ver docs/scripts/01-helping-layers.md, pendência em aberto.
        var dbHelp = shl_makeCurvesLayer("D&B Help", [[0, 0], [182, 86], [255, 255]]);
        dbHelp.visible = false;
        dbHelp.move(group, ElementPlacement.INSIDE);

        var dbHelpBW = shl_makeBlackWhiteLayer("D&B Help B/W", { red: 40, yellow: 60, green: 40, cyan: 60, blue: 20, magenta: 80 });
        dbHelpBW.visible = false;
        dbHelpBW.move(group, ElementPlacement.INSIDE);

        var solarCurve = shl_makeCurvesLayer("Solar Curve", [[0, 0], [38, 255], [98, 0], [151, 255], [209, 0], [255, 255]]);
        solarCurve.visible = false;
        solarCurve.move(group, ElementPlacement.INSIDE);

        group.visible = true;
    } catch (e) {
        // Não trava o painel numa Promise pendente pra sempre — se algo
        // no Action Manager falhar (nome de chave errado, versão do PS
        // diferente etc.), ainda devolve um estado válido pro botão.
        return "true";
    }

    return "true";
}
