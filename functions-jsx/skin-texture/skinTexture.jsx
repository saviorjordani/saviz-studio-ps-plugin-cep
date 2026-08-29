// Skin Texture — lado do host (ExtendScript / Action Manager clássico)
//
// Confirmado com um PSD real (SKINTEXTURE-CAMADAS-POR-AÇÃO.psd) gerado
// rodando cada ação do plugin original manualmente, uma de cada vez, e
// inspecionado com psd-tools: o Action Set SKINTEXTURES NÃO tem uma
// única ação "TEXTURE FINISH" que cria as 9 texturas — cada textura é
// sua PRÓPRIA ação independente ("hand and skin", "Forehead skin",
// "Forehead pores", "Highlight texture", "skin highlight texture",
// "cheek", "cheeks highlight", "forehead pores INDIVIDUAL",
// "cheek individual pores", "cheek highlights"), cada uma criando UMA
// camada pixel (padrão já rasterizado dentro dela, não uma fill layer)
// com Bevel & Emboss aplicado e máscara preta (background_color=0,
// bbox vazio = 100% oculta, pinta de branco pra revelar). "TEXTURE
// FINISH" é só um passo de preparo (Copiar Mesclado + Colar), não uma
// textura em si — não faz parte do fluxo de adicionar textura.
//
// Fluxo do painel: usuário escolhe a textura no dropdown (lista fixa
// dos nomes reais de ação, ver js/main.js) e clica "Add" — isso roda
// SÓ aquela ação específica, criando uma única camada nova. Os
// sliders Angle/Altitude/Size/Highlights/Shadows editam o Bevel &
// Emboss da camada recém-criada via um ciclo getd → modifica só as
// chaves que mudaram → setd (mais seguro que reconstruir o efeito do
// zero, porque parte de um descriptor que o próprio Photoshop já
// validou).

/**
 * Cria a camada de textura inteiramente via Action Manager, SEM rodar
 * app.doAction()/SKINTEXTURES.atn. Motivo: "Copiar como JavaScript" de
 * cada ação real (feito no Photoshop do cliente) mostrou que a própria
 * Action tenta aplicar o Bevel & Emboss com um Pattern referenciado por
 * um ID FIXO da hora que foi gravada — esse ID nunca bate com o pattern
 * que a gente recarrega aqui (cada Append gera um ID novo), e É ISSO
 * que dispara "Definir não disponível" toda vez, de DENTRO do
 * doAction(), antes do nosso código sequer rodar. Reproduzindo os
 * mesmos passos manualmente (sem essa referência quebrada), o problema
 * desaparece na raiz. Confirmado funcionando ao vivo pra "hand and
 * skin" antes de generalizar pras outras texturas.
 *
 * Passos replicados do batchPlay real (na ordem): criar camada → 50%
 * cinza → Bevel & Emboss com o pattern certo → modo de mesclagem
 * (Overlay ou Soft Light, varia por textura) → cor da label
 * (cosmético) → máscara oculta (Hide All = já nasce preta, equivalente
 * ao "Reveal All + Inverter" que a Action faz em dois passos). Passos
 * de "selecionar pincel/canal" no fim de várias Actions são sobra de
 * gravação manual, sem efeito no resultado — não replicados.
 */
function st_createTextureLayerScripted(layerName, bevel, addHiddenMask) {
    var layer = fs_newEmptyLayer(layerName);
    db_fillActiveLayerColor("808080");
    st_createBevelEmbossFromScratch(bevel);
    layer.blendMode = BlendMode[bevel.blendMode] || BlendMode.OVERLAY;
    try {
        db_setLayerColorLabel(layer, "Vlt ");
    } catch (labelErr) { /* cosmético, não trava o fluxo */ }
    if (addHiddenMask !== false) {
        st_addHiddenMaskToLayer(layer);
    }
    return layer;
}

function st_selectLayerForMask(layer) {
    var doc = app.activeDocument;
    try {
        if (layer.id !== undefined) {
            var desc = new ActionDescriptor();
            var ref = new ActionReference();
            ref.putIdentifier(charIDToTypeID("Lyr "), layer.id);
            try {
                var docRef = new ActionReference();
                docRef.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
                var docDesc = executeActionGet(docRef);
                if (docDesc.hasKey(charIDToTypeID("DocI"))) {
                    ref.putIdentifier(charIDToTypeID("Dcmn"), docDesc.getInteger(charIDToTypeID("DocI")));
                }
            } catch (docIdErr) { /* seleção por layer id ainda funciona na maioria das versões */ }
            desc.putReference(charIDToTypeID("null"), ref);
            var list = new ActionList();
            list.putInteger(layer.id);
            desc.putList(charIDToTypeID("LyrI"), list);
            executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
            return;
        }
    } catch (selectErr) { /* DOM fallback abaixo */ }
    doc.activeLayer = layer;
}

function st_layerHasUserMask(layer) {
    st_selectLayerForMask(layer);
    try {
        var ref = new ActionReference();
        ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("hasUserMask"));
        ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var desc = executeActionGet(ref);
        var key = stringIDToTypeID("hasUserMask");
        if (desc.hasKey(key)) {
            return desc.getBoolean(key);
        }
    } catch (hasMaskErr) { /* fallback abaixo */ }
    try {
        var legacyRef = new ActionReference();
        legacyRef.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("UsrM"));
        legacyRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var legacyDesc = executeActionGet(legacyRef);
        return legacyDesc.hasKey(charIDToTypeID("UsrM"));
    } catch (legacyMaskErr) { /* sem máscara detectável */ }
    return false;
}

function st_addHiddenMaskToLayer(layer) {
    if (st_layerHasUserMask(layer)) return;
    st_selectLayerForMask(layer);
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
    var desc = new ActionDescriptor();
    desc.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
    desc.putReference(charIDToTypeID("At  "), ref);
    desc.putEnumerated(charIDToTypeID("Usng"), charIDToTypeID("UsrM"), charIDToTypeID("HdAl"));
    try {
        executeAction(charIDToTypeID("Mk  "), desc, DialogModes.NO);
    } catch (maskErr) {
        if (st_layerHasUserMask(layer)) return;
        throw maskErr;
    }
}

function st_addWhiteMaskToLayer(layer) {
    if (st_layerHasUserMask(layer)) return;
    st_selectLayerForMask(layer);
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Msk "));
    var desc = new ActionDescriptor();
    desc.putClass(charIDToTypeID("Nw  "), charIDToTypeID("Chnl"));
    desc.putReference(charIDToTypeID("At  "), ref);
    desc.putEnumerated(charIDToTypeID("Usng"), charIDToTypeID("UsrM"), charIDToTypeID("RvlA"));
    try {
        executeAction(charIDToTypeID("Mk  "), desc, DialogModes.NO);
    } catch (maskErr) {
        if (st_layerHasUserMask(layer)) return;
        throw maskErr;
    }
}

function st_setLayerFillOpacity(layer, opacity) {
    st_selectLayerForMask(layer);
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putUnitDouble(stringIDToTypeID("fillOpacity"), charIDToTypeID("#Prc"), opacity);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lyr "), layerDesc);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function st_makeWhiteHardMixSolidLayer(layerName) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("contentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);
    layerDesc.putEnumerated(charIDToTypeID("Md  "), charIDToTypeID("BlnM"), stringIDToTypeID("hardMix"));

    var colorDesc = new ActionDescriptor();
    colorDesc.putDouble(stringIDToTypeID("red"), 255);
    colorDesc.putDouble(stringIDToTypeID("green"), 255);
    colorDesc.putDouble(stringIDToTypeID("blue"), 255);

    var fillDesc = new ActionDescriptor();
    fillDesc.putObject(stringIDToTypeID("color"), stringIDToTypeID("RGBColor"), colorDesc);
    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("solidColorLayer"), fillDesc);

    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("contentLayer"), layerDesc);
    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);

    var layer = app.activeDocument.activeLayer;
    st_setLayerFillOpacity(layer, 18);
    return layer;
}

function st_createImproveHighlightLayer(textureLayer) {
    var doc = app.activeDocument;

    st_addWhiteMaskToLayer(textureLayer);
    doc.activeLayer = textureLayer;
    var improveLayer = st_makeWhiteHardMixSolidLayer("Adjust here");
    st_addWhiteMaskToLayer(improveLayer);

    var group = doc.layerSets.add();
    group.name = "Paint Here";

    textureLayer.move(group, ElementPlacement.INSIDE);
    improveLayer.move(group, ElementPlacement.INSIDE);

    st_addHiddenMaskToLayer(group);

    return group;
}

/**
 * Bevel & Emboss criado do ZERO (não modifica um efeito existente).
 * Valores confirmados via "Copiar como JavaScript" da ação real —
 * bevel: { angle, altitude, size, highlightOpacity, shadowOpacity,
 * bevelDirection (charID "Out " ou "In  "), patternName, patternScale,
 * patternInvert, patternDepth }.
 */
function st_createBevelEmbossFromScratch(bevel) {
    var idPrc = charIDToTypeID("#Prc");
    var idAng = charIDToTypeID("#Ang");
    var idPxl = charIDToTypeID("#Pxl");

    var beDesc = new ActionDescriptor();
    beDesc.putBoolean(charIDToTypeID("enab"), true);
    beDesc.putBoolean(stringIDToTypeID("present"), true);
    beDesc.putBoolean(stringIDToTypeID("showInDialog"), true);
    beDesc.putEnumerated(charIDToTypeID("hglM"), charIDToTypeID("BlnM"), charIDToTypeID("Ovrl"));
    var hglC = new ActionDescriptor();
    hglC.putDouble(charIDToTypeID("Rd  "), 255);
    hglC.putDouble(charIDToTypeID("Grn "), 255);
    hglC.putDouble(charIDToTypeID("Bl  "), 255);
    beDesc.putObject(charIDToTypeID("hglC"), charIDToTypeID("RGBC"), hglC);
    beDesc.putUnitDouble(charIDToTypeID("hglO"), idPrc, bevel.highlightOpacity);
    beDesc.putEnumerated(charIDToTypeID("sdwM"), charIDToTypeID("BlnM"), charIDToTypeID("Ovrl"));
    var sdwC = new ActionDescriptor();
    sdwC.putDouble(charIDToTypeID("Rd  "), 0);
    sdwC.putDouble(charIDToTypeID("Grn "), 0);
    sdwC.putDouble(charIDToTypeID("Bl  "), 0);
    beDesc.putObject(charIDToTypeID("sdwC"), charIDToTypeID("RGBC"), sdwC);
    beDesc.putUnitDouble(charIDToTypeID("sdwO"), idPrc, bevel.shadowOpacity);
    beDesc.putEnumerated(charIDToTypeID("bvlT"), charIDToTypeID("bvlT"), charIDToTypeID("SfBL"));
    beDesc.putEnumerated(charIDToTypeID("bvlS"), charIDToTypeID("BESl"), charIDToTypeID("InrB"));
    beDesc.putBoolean(charIDToTypeID("uglg"), true);
    beDesc.putUnitDouble(charIDToTypeID("lagl"), idAng, bevel.angle);
    beDesc.putUnitDouble(charIDToTypeID("Lald"), idAng, bevel.altitude);
    beDesc.putUnitDouble(charIDToTypeID("srgR"), idPrc, 100);
    beDesc.putUnitDouble(charIDToTypeID("blur"), idPxl, bevel.size);
    beDesc.putEnumerated(charIDToTypeID("bvlD"), charIDToTypeID("BESs"), charIDToTypeID(bevel.bevelDirection));
    var trnS = new ActionDescriptor();
    trnS.putString(charIDToTypeID("Nm  "), "$$$/Contours/Defaults/Linear=Linear");
    beDesc.putObject(charIDToTypeID("TrnS"), charIDToTypeID("ShpC"), trnS);
    beDesc.putBoolean(stringIDToTypeID("antialiasGloss"), false);
    beDesc.putUnitDouble(charIDToTypeID("Sftn"), idPxl, 0);
    beDesc.putBoolean(stringIDToTypeID("useShape"), false);
    beDesc.putBoolean(stringIDToTypeID("useTexture"), true);
    beDesc.putBoolean(charIDToTypeID("InvT"), !!bevel.patternInvert);
    beDesc.putBoolean(charIDToTypeID("Algn"), true);
    beDesc.putUnitDouble(charIDToTypeID("Scl "), idPrc, bevel.patternScale);
    beDesc.putUnitDouble(stringIDToTypeID("textureDepth"), idPrc, bevel.patternDepth);
    var patternDesc = new ActionDescriptor();
    patternDesc.putString(charIDToTypeID("Nm  "), bevel.patternName);
    // Sem "ID"/Idnt de propósito — é o GUID quebrado que causava o bug;
    // só o nome já resolve pro pattern certo que a gente carregou.
    beDesc.putObject(charIDToTypeID("Ptrn"), charIDToTypeID("Ptrn"), patternDesc);
    var phaseDesc = new ActionDescriptor();
    phaseDesc.putDouble(charIDToTypeID("Hrzn"), 0);
    phaseDesc.putDouble(charIDToTypeID("Vrtc"), 0);
    beDesc.putObject(stringIDToTypeID("phase"), charIDToTypeID("Pnt "), phaseDesc);

    var lefxDesc = new ActionDescriptor();
    lefxDesc.putUnitDouble(charIDToTypeID("Scl "), idPrc, 416.666667);
    lefxDesc.putObject(charIDToTypeID("ebbl"), charIDToTypeID("ebbl"), beDesc);

    var setRef = new ActionReference();
    setRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    var setDesc = new ActionDescriptor();
    setDesc.putReference(charIDToTypeID("null"), setRef);
    setDesc.putObject(charIDToTypeID("T   "), charIDToTypeID("Lefx"), lefxDesc);
    st_retryExecuteAction(charIDToTypeID("setd"), setDesc);
}

/**
 * Carrega (Append) um arquivo .pat inteiro nos Pattern presets — mesmo
 * idioma já confirmado funcionando pros pincéis .abr do Details
 * (Prpr/capp/Ordn/Trgt + setd + caminho + Appe). Mais robusto que
 * "Define Pattern" a partir de um .png: não precisa abrir/fechar um
 * documento temporário, então não tem risco de bagunçar qual camada
 * está ativa no documento original. Preferir .pat sempre que tiver.
 */
function st_loadPatternFile(patPath) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Ptrn"));
    ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    desc.putPath(charIDToTypeID("T   "), new File(patPath));
    desc.putBoolean(charIDToTypeID("Appe"), true);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

/**
 * Instala o pacote de texturas (Append do SAVIZTEXTURES.pat) UMA vez
 * só, via botão dedicado e obrigatório no painel ("Instalar Texturas")
 * — não mais dentro do fluxo de Add. Duas tentativas anteriores de
 * evitar reappendar automaticamente (cache na memória do painel, depois
 * um check via executeActionGet numa referência "Ptrn" nomeada) não
 * seguraram na prática — o arquivo continuava sendo reappendado e
 * criando grupos duplicados ("SAVIZTEXTURES", "SAVIZTEXTURES 2", ...).
 * Só carregar o arquivo a partir de UMA ação explícita do usuário,
 * controlada por uma flag persistida no painel (localStorage, ver
 * functions/skin-texture/skinTexture.js), garante que o Append nunca
 * roda mais de uma vez.
 */
function runSkinTextureInstallPatterns(patternPath) {
    // Mesmo idioma de Action Manager (Prpr + capp/Ordn/Trgt, "alvo atual
    // da aplicação") usado pra carregar os pincéis do Details — lá já é
    // exigido documento aberto (dt_loadBrushFile, via runDetailsBrush em
    // functions-jsx/details/detailsBrush.jsx), então o mesmo requisito
    // vale aqui. Sem essa checagem, "Definir" falha silenciosamente
    // quando o usuário clica em Instalar sem nenhum documento aberto.
    if (app.documents.length === 0) return "ERROR:Abra um documento antes de instalar as texturas.";
    try {
        st_loadPatternFile(patternPath);
        return "true";
    } catch (e) {
        return "ERROR:" + e.message + " (linha " + e.line + ")";
    }
}

function st_retryExecuteAction(eventId, desc) {
    var delays = [300, 600, 1200];
    for (var i = 0; i < delays.length; i++) {
        try {
            executeAction(eventId, desc, DialogModes.NO);
            return;
        } catch (err) {
            $.sleep(delays[i]);
        }
    }
    executeAction(eventId, desc, DialogModes.NO);
}

/**
 * actionName: nome exato da textura (ex: "hand and skin", "cheeks
 * highlight") — vem do dropdown do painel, também usado como nome da
 * camada criada.
 * bevelConfigJSON: string JSON com a config completa confirmada via
 * "Copiar como JavaScript" (angle/altitude/size/highlightOpacity/
 * shadowOpacity/bevelDirection/blendMode/patternName/patternScale/
 * patternInvert/patternDepth). Cria a camada inteira por script
 * (st_createTextureLayerScripted).
 */
function runSkinTextureAddTexture(actionName, bevelConfigJSON) {
    if (app.documents.length === 0) return "ERROR:Abra um documento antes de usar.";
    try {
        var bevel = eval("(" + bevelConfigJSON + ")");
        var textureLayer = st_createTextureLayerScripted(actionName, bevel, actionName !== "Highlight texture");
        if (actionName === "Highlight texture") {
            st_createImproveHighlightLayer(textureLayer);
            app.activeDocument.activeLayer = textureLayer;
        }
        return "true";
    } catch (e) {
        return "ERROR:" + e.message + " (linha " + e.line + ")";
    }
}

/**
 * Lista os nomes das camadas/grupos de topo do documento ativo — usado
 * pra popular o dropdown com o que a ação realmente criou, em vez de
 * cravar nomes fixos no painel (mais seguro, já que a leitura exata de
 * cada nome dentro do .atn binário não é 100% confiável).
 */
function runSkinTextureListLayers() {
    if (app.documents.length === 0) return "[]";
    var doc = app.activeDocument;
    var names = [];
    for (var i = 0; i < doc.layers.length; i++) {
        names.push(doc.layers[i].name);
    }
    return JSON.stringify(names);
}

function st_findLayerByName(layers, name) {
    for (var i = 0; i < layers.length; i++) {
        var lyr = layers[i];
        if (lyr.name === name) return lyr;
        if (lyr.typename === "LayerSet") {
            var found = st_findLayerByName(lyr.layers, name);
            if (found) return found;
        }
    }
    return null;
}

function runSkinTextureSelectLayer(layerName) {
    if (app.documents.length === 0) return "ERROR:Nenhum documento aberto.";
    try {
        var doc = app.activeDocument;
        var lyr = st_findLayerByName(doc.layers, layerName);
        if (!lyr) return "ERROR:Camada \"" + layerName + "\" não encontrada. Clique em Add primeiro.";
        doc.activeLayer = lyr;
        return "true";
    } catch (e) {
        return "ERROR:" + e.message + " (linha " + e.line + ")";
    }
}

/**
 * Lê o Bevel & Emboss da camada ativa — usado pra sincronizar os
 * sliders do painel quando o usuário troca de camada no dropdown.
 * Retorna "null" (string) se a camada não tiver Bevel & Emboss.
 */
function runSkinTextureGetBevelEmboss() {
    if (app.documents.length === 0) return "null";
    try {
        var idLefx = charIDToTypeID("Lefx");
        var idebbl = charIDToTypeID("ebbl");

        var ref = new ActionReference();
        ref.putProperty(charIDToTypeID("Prpr"), idLefx);
        ref.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var desc = executeActionGet(ref);

        if (!desc.hasKey(idLefx)) return "null";
        var lefxDesc = desc.getObjectValue(idLefx);
        if (!lefxDesc.hasKey(idebbl)) return "null";
        var be = lefxDesc.getObjectValue(idebbl);

        var idlagl = charIDToTypeID("lagl");
        var idLald = charIDToTypeID("Lald");
        var idblur = charIDToTypeID("blur");
        var idhglO = charIDToTypeID("hglO");
        var idsdwO = charIDToTypeID("sdwO");
        var iduglg = charIDToTypeID("uglg");
        var idtextureDepth = stringIDToTypeID("textureDepth");
        // "Scl " dentro do próprio objeto "ebbl" é o Pattern Scale da
        // Texture (confirmado via log real) — não confundir com o "Scl "
        // que fica no nível de cima (Lefx), que é a escala geral dos
        // efeitos da camada, não da textura.
        var idScl = charIDToTypeID("Scl ");

        var result = {
            angle: be.hasKey(idlagl) ? be.getUnitDoubleValue(idlagl) : 120,
            altitude: be.hasKey(idLald) ? be.getUnitDoubleValue(idLald) : 30,
            size: be.hasKey(idblur) ? be.getUnitDoubleValue(idblur) : 5,
            scale: be.hasKey(idScl) ? be.getUnitDoubleValue(idScl) : 100,
            textureDepth: be.hasKey(idtextureDepth) ? be.getUnitDoubleValue(idtextureDepth) : 100,
            highlightOpacity: be.hasKey(idhglO) ? be.getUnitDoubleValue(idhglO) : 80,
            shadowOpacity: be.hasKey(idsdwO) ? be.getUnitDoubleValue(idsdwO) : 80,
            useGlobalLight: be.hasKey(iduglg) ? be.getBoolean(iduglg) : false
        };
        return JSON.stringify(result);
    } catch (e) {
        return "null";
    }
}

/**
 * paramsJSON: string JSON com campos opcionais angle/altitude/size/
 * highlightOpacity/shadowOpacity/useGlobalLight. Só mexe nas chaves
 * presentes — parte do descriptor Bevel & Emboss JÁ EXISTENTE na
 * camada (lido via getd), não reconstrói o efeito do zero.
 */
function runSkinTextureSetBevelEmboss(paramsJSON) {
    if (app.documents.length === 0) return "ERROR:Nenhum documento aberto.";
    try {
        var params = eval("(" + paramsJSON + ")");

        var idLefx = charIDToTypeID("Lefx");
        var idebbl = charIDToTypeID("ebbl");

        var getRef = new ActionReference();
        getRef.putProperty(charIDToTypeID("Prpr"), idLefx);
        getRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var currentDesc = executeActionGet(getRef);

        if (!currentDesc.hasKey(idLefx)) {
            return "ERROR:Essa camada não tem Bevel & Emboss. Clique em Add e selecione uma textura no dropdown primeiro.";
        }
        var lefxDesc = currentDesc.getObjectValue(idLefx);
        if (!lefxDesc.hasKey(idebbl)) {
            return "ERROR:Essa camada não tem Bevel & Emboss configurado.";
        }
        var beDesc = lefxDesc.getObjectValue(idebbl);

        var idAng = charIDToTypeID("#Ang");
        var idPrc = charIDToTypeID("#Prc");
        var idPxl = charIDToTypeID("#Pxl");

        if (params.angle !== undefined) {
            beDesc.putUnitDouble(charIDToTypeID("lagl"), idAng, params.angle);
        }
        if (params.altitude !== undefined) {
            beDesc.putUnitDouble(charIDToTypeID("Lald"), idAng, params.altitude);
        }
        if (params.useGlobalLight !== undefined) {
            beDesc.putBoolean(charIDToTypeID("uglg"), params.useGlobalLight);
        }
        if (params.size !== undefined) {
            beDesc.putUnitDouble(charIDToTypeID("blur"), idPxl, params.size);
        }
        if (params.scale !== undefined) {
            beDesc.putUnitDouble(charIDToTypeID("Scl "), idPrc, params.scale);
        }
        if (params.textureDepth !== undefined) {
            beDesc.putUnitDouble(stringIDToTypeID("textureDepth"), idPrc, params.textureDepth);
        }
        if (params.highlightOpacity !== undefined) {
            beDesc.putUnitDouble(charIDToTypeID("hglO"), idPrc, params.highlightOpacity);
        }
        if (params.shadowOpacity !== undefined) {
            beDesc.putUnitDouble(charIDToTypeID("sdwO"), idPrc, params.shadowOpacity);
        }

        lefxDesc.putObject(idebbl, idebbl, beDesc);

        var setRef = new ActionReference();
        setRef.putEnumerated(charIDToTypeID("Lyr "), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
        var setDesc = new ActionDescriptor();
        setDesc.putReference(charIDToTypeID("null"), setRef);
        setDesc.putObject(charIDToTypeID("T   "), idLefx, lefxDesc);
        st_retryExecuteAction(charIDToTypeID("setd"), setDesc);

        return "true";
    } catch (e) {
        return "ERROR:" + e.message + " (linha " + e.line + ")";
    }
}
