// Frequency Separation (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real do painel Williams Academy — estrutura de
// camadas bem diferente da minha primeira tentativa (baseada só em
// tutoriais genéricos):
//
//   [📂 Group] "Gaussian Blur" (ou "Median", o nome do grupo É o método)
//     ├─ HIGH - Texture copiar   (clipping mask sobre "HIGH - Texture")
//     ├─ HIGH - Texture          (camada de alta frequência / Apply Image)
//     ├─ Correct Colors          (camada vazia normal, pra correção de cor)
//     └─ LOW - Base/Colors       (OBJETO INTELIGENTE, com o blur/median
//                                  aplicado como FILTRO INTELIGENTE, não
//                                  destrutivo — dá pra editar o raio
//                                  depois com duplo clique)
//   Camada 0 (imagem original, fora do grupo)
//
// A diferença mais importante: a camada LOW não recebe o blur direto
// (destrutivo) — ela primeiro é convertida em Objeto Inteligente
// (newPlacedLayer), e SÓ DEPOIS o Gaussian Blur/Median é aplicado, o
// que automaticamente vira Filtro Inteligente nesse contexto.
//
// Concatenado dentro de jsx/hostscript.jsx no build (ver scripts/package-test.js).
// Chamado do painel via csInterface.evalScript('runFrequencySeparation("gaussian", 6)')
// ou runFrequencySeparation("median", 7).

function fs_duplicateActiveLayer() {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(stringIDToTypeID("layer"), stringIDToTypeID("ordinal"), stringIDToTypeID("targetEnum"));
    desc.putReference(stringIDToTypeID("null"), ref);
    executeAction(stringIDToTypeID("duplicate"), desc, DialogModes.NO);
    return app.activeDocument.activeLayer;
}

function fs_convertToSmartObject() {
    // "Converter para Objeto Inteligente" — evento gravado pelo próprio
    // Photoshop ao rodar esse comando pelo menu.
    var desc = new ActionDescriptor();
    executeAction(stringIDToTypeID("newPlacedLayer"), desc, DialogModes.NO);
    return app.activeDocument.activeLayer;
}

function fs_applyGaussianBlur(radius) {
    var desc = new ActionDescriptor();
    desc.putUnitDouble(charIDToTypeID("Rds "), charIDToTypeID("#Pxl"), radius);
    executeAction(charIDToTypeID("GsnB"), desc, DialogModes.NO);
}

function fs_applyMedian(radius) {
    var desc = new ActionDescriptor();
    desc.putUnitDouble(charIDToTypeID("Rds "), charIDToTypeID("#Pxl"), radius);
    executeAction(stringIDToTypeID("median"), desc, DialogModes.NO);
}

// Depois de DUAS tentativas de acertar a estrutura exata do Apply Image
// via Action Manager sem conseguir testar ao vivo (confirmado via
// diagnóstico que o cálculo simplesmente não tinha efeito nenhum nas
// duas vezes), troquei de estratégia: em vez de um comando complexo com
// dezenas de chaves de descriptor pra adivinhar, uso só comandos
// simples e de parâmetro único (Rasterizar, Inverter, Fundir), cada um
// bem mais difícil de errar.
//
// Matemática: Normal blend de uma camada A com opacidade 50% sobre uma
// camada B dá: resultado = 0.5*A + 0.5*B. Com A = inverso(LOW) = 255-LOW
// e B = HIGH (original sem blur):
//   resultado = 0.5*(255-LOW) + 0.5*HIGH = (HIGH-LOW)/2 + 127.5
// Praticamente idêntico (diferença de 0.5, sem efeito visual) à fórmula
// clássica do Apply Image Subtract/Scale2/Offset128:
//   (HIGH-LOW)/2 + 128

function fs_rasterizeActiveLayer() {
    // A versão via Action Manager (stringID "rasterizeLayer" sem descriptor
    // de destino) falhou com "comando Rasterizar não está disponível no
    // momento" ao tentar rasterizar um Objeto Inteligente. O método do DOM
    // resolve isso diretamente e cobre Objeto Inteligente inteiro.
    app.activeDocument.activeLayer.rasterize(RasterizeType.ENTIRELAYER);
}

function fs_invertActiveLayer() {
    // Duas tentativas anteriores falharam: Action Manager (charID "Invt")
    // deu "comando não disponível", e ArtLayer.applyInvert() nem existe
    // (só há applyX de filtro no DOM, Invert não é filtro). Solução: uma
    // curva reta invertida via adjustCurves — mesmo método já comprovado
    // funcionando em helpingLayers.jsx — dá exatamente o mesmo resultado
    // de um Invert (ponto 0→255 e 255→0).
    app.activeDocument.activeLayer.adjustCurves([[0, 255], [255, 0]]);
}

function fs_mergeDown() {
    // charID "Mrg2" confirmado (Merge Down, sem parâmetros).
    executeAction(charIDToTypeID("Mrg2"), undefined, DialogModes.NO);
    return app.activeDocument.activeLayer;
}

/**
 * Recebe a camada HIGH (original sem blur, ainda intacta) e a camada LOW
 * (já borrada). Devolve a camada resultante já com o cálculo de alta
 * frequência aplicado (substitui a HIGH original, mesma posição na pilha).
 */
function fs_extractHighFrequency(highLayer, lowLayer) {
    var doc = app.activeDocument;

    doc.activeLayer = lowLayer;
    var lowInverted = fs_duplicateActiveLayer();
    lowInverted.move(highLayer, ElementPlacement.PLACEBEFORE);
    fs_rasterizeActiveLayer(); // garante pixel puro, sem depender do Objeto Inteligente
    fs_invertActiveLayer();
    // Re-pega a referência depois de rasterizar/inverter — mais seguro
    // do que confiar que o objeto "lowInverted" antigo continua válido.
    lowInverted = doc.activeLayer;
    lowInverted.opacity = 50;
    lowInverted.blendMode = BlendMode.NORMAL;

    doc.activeLayer = lowInverted;
    return fs_mergeDown(); // funde na camada de baixo (a HIGH), devolve o resultado
}

function fs_newEmptyLayer(name) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("layer"));
    desc.putReference(stringIDToTypeID("null"), ref);
    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), name);
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("layer"), layerDesc);
    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);
    return app.activeDocument.activeLayer;
}

/**
 * method: "gaussian" | "median"
 * radius: raio em pixels (padrão 6 pra gaussian, 7 pra median — mesmos
 * valores já usados antes, ainda não confirmados como sendo os defaults
 * reais da Williams Academy).
 */
function runFrequencySeparation(method, radius) {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;
    if (!radius) radius = (method === "median") ? 7 : 6;

    try {
        // Guarda a referência da camada original ANTES de mexer em mais
        // nada — nunca usar índice de array pra "achar de novo depois",
        // isso é frágil assim que o grupo/outras camadas entram na pilha.
        var originalLayer = doc.activeLayer;
        var is16Bit = (doc.bitsPerChannel === BitsPerChannelType.SIXTEEN);
        var groupLabel = (method === "median") ? "Median" : "Gaussian Blur";

        // 1. Grupo com o nome do método (igual ao print real).
        var group = doc.layerSets.add();
        group.name = groupLabel;

        // 2. LOW - Base/Colors: duplica a camada original, converte em
        //    Objeto Inteligente, aplica o blur/median como Filtro
        //    Inteligente (não destrutivo).
        doc.activeLayer = originalLayer;
        var lowLayer = fs_duplicateActiveLayer();
        lowLayer.name = "LOW - Base/Colors";
        lowLayer = fs_convertToSmartObject();
        lowLayer.name = "LOW - Base/Colors";
        if (method === "median") {
            fs_applyMedian(radius);
        } else {
            fs_applyGaussianBlur(radius);
        }
        lowLayer.move(group, ElementPlacement.INSIDE);

        // 3. Correct Colors: camada vazia normal acima da LOW (equivalente
        //    ao "Low Retouch" dos tutoriais genéricos, com o nome real).
        var correctColors = fs_newEmptyLayer("Correct Colors");
        correctColors.move(group, ElementPlacement.INSIDE);

        // 4. HIGH - Texture: duplica a camada original de novo (sem blur),
        //    extrai a alta frequência via Inverter+Fundir (não mais Apply
        //    Image — ver comentário grande acima de fs_extractHighFrequency).
        doc.activeLayer = originalLayer;
        var highLayer = fs_duplicateActiveLayer();
        highLayer.name = "HIGH - Texture";
        highLayer.move(group, ElementPlacement.INSIDE);

        highLayer = fs_extractHighFrequency(highLayer, lowLayer);
        highLayer.name = "HIGH - Texture";
        highLayer.blendMode = BlendMode.LINEARLIGHT;

        // 5. HIGH - Texture copiar: CÓPIA de "HIGH - Texture" (mesmo
        //    conteúdo, já com o Apply Image aplicado), em blend mode
        //    Normal, configurada como clipping mask sobre a "HIGH -
        //    Texture" (Linear Light) — não é uma camada vazia.
        doc.activeLayer = highLayer;
        var highRetouch = fs_duplicateActiveLayer();
        highRetouch.name = "HIGH - Texture copiar";
        highRetouch.blendMode = BlendMode.NORMAL;
        highRetouch.grouped = true;

        return "true";
    } catch (e) {
        // Mostra o erro real do Photoshop na hora (alert nativo), em vez
        // de engolir silenciosamente — precisamos saber a mensagem exata
        // pra corrigir a estrutura do Apply Image com precisão, não
        // chutando de novo.
        alert("Erro em Frequency Separation: " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
