// Texture — 6º slot: "AI Edit" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real do painel Williams Academy: clicar no botão
// cria uma camada vazia chamada "Paint over areas to edit" e muda a
// ferramenta ativa pro Pincel, tamanho 50px, dureza 0, cor de frente
// vermelha — o usuário pinta por cima da área que quer editar.
//
// Diferente do que eu tinha assumido antes: os botões "Apply"/"Cancel"
// NÃO são a Barra de Tarefas Contextual nativa do Photoshop — são UI
// PRÓPRIA do painel da Williams Academy (aparecem dentro do próprio
// accordion Texture, no mesmo estilo do resto do painel deles). Depois
// de "Apply", a camada resultante vira "Texture: AI" (com máscara,
// etiqueta vermelha) — resultado de um Preenchimento Generativo.
//
// O comando de geração em si (chamar o Firefly/"syntheticFill") foi
// confirmado via log real do ScriptListener (o cliente gerou manualmente
// uma vez com o plugin instalado e capturou o log) — comando
// `stringIDToTypeID("syntheticFill")`, serviço `"clio"` (nome interno da
// Adobe pro Firefly dentro do Photoshop), prompt vazio (`""`),
// workflowType `"in_painting"`. Os valores de DocI/LyrI no log eram fixos
// da sessão gravada; aqui uso `doc.id`/`doc.activeLayer.id` dinâmicos.
//
// Reproduzido aqui como duas funções extras (Apply/Cancel), ligadas a
// uma barrinha que aparece no nosso painel depois de clicar "AI Edit"
// (ver js/main.js e index.html, #aiEditApplyBar):
//
//   - Apply: carrega a pintura vermelha como seleção (transparência da
//     camada "Paint over areas to edit"), apaga essa camada de pintura,
//     e chama o Preenchimento Generativo (tx_generativeFill) com prompt
//     vazio — gera direto, sem precisar de mais nenhum clique.
//   - Cancel: só apaga a camada de pintura e desmarca a seleção.
//
// Reaproveita fs_newEmptyLayer (frequency-separation/frequencySeparation.jsx),
// shl_findLayerByName (helping-layers/helpingLayers.jsx),
// db_selectBrushTool e db_setBrushSizeAndHardness
// (dodge-and-burn/dodgeAndBurnGrey.jsx) — concatenados no mesmo
// hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runTextureAiEdit()'),
// 'runTextureAiEditApply()' e 'runTextureAiEditCancel()'.

var TEXTURE_AI_EDIT_LAYER = "Paint over areas to edit";

function tx_setForegroundColor(hex) {
    var color = new SolidColor();
    color.rgb.hexValue = hex;
    app.foregroundColor = color;
}

/**
 * Preenchimento Generativo (Firefly) via Action Manager — estrutura
 * exata capturada num log real de ScriptListener (comando
 * "syntheticFill"). Assume que já existe uma seleção ativa na camada
 * que deve receber o preenchimento.
 */
function tx_generativeFill(prompt) {
    var doc = app.activeDocument;

    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    desc.putInteger(charIDToTypeID("DocI"), doc.id);
    desc.putInteger(charIDToTypeID("LyrI"), doc.activeLayer.id);
    desc.putString(stringIDToTypeID("prompt"), prompt || "");
    desc.putString(stringIDToTypeID("serviceID"), "clio");
    desc.putEnumerated(stringIDToTypeID("workflowType"), stringIDToTypeID("genWorkflow"), stringIDToTypeID("in_painting"));

    var clioDesc = new ActionDescriptor();
    clioDesc.putString(stringIDToTypeID("gi_PROMPT"), prompt || "");
    clioDesc.putString(stringIDToTypeID("gi_MODE"), "ginp");
    clioDesc.putInteger(stringIDToTypeID("gi_SEED"), -1);
    clioDesc.putInteger(stringIDToTypeID("gi_NUM_STEPS"), -1);
    clioDesc.putInteger(stringIDToTypeID("gi_GUIDANCE"), 6);
    clioDesc.putInteger(stringIDToTypeID("gi_SIMILARITY"), 0);
    clioDesc.putBoolean(stringIDToTypeID("gi_CROP"), false);
    clioDesc.putBoolean(stringIDToTypeID("gi_DILATE"), false);
    clioDesc.putInteger(stringIDToTypeID("gi_CONTENT_PRESERVE"), 0);
    clioDesc.putBoolean(stringIDToTypeID("gi_ENABLE_PROMPT_FILTER"), true);
    clioDesc.putBoolean(stringIDToTypeID("dualCrop"), true);
    clioDesc.putString(stringIDToTypeID("gi_ADVANCED"), '{"enable_mts":true}');

    var serviceOptionsDesc = new ActionDescriptor();
    serviceOptionsDesc.putObject(stringIDToTypeID("clio"), stringIDToTypeID("clio"), clioDesc);
    desc.putObject(stringIDToTypeID("serviceOptionsList"), charIDToTypeID("null"), serviceOptionsDesc);

    executeAction(stringIDToTypeID("syntheticFill"), desc, DialogModes.NO);
}

function runTextureAiEdit() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, TEXTURE_AI_EDIT_LAYER);

    try {
        if (!existing) {
            var layer = fs_newEmptyLayer(TEXTURE_AI_EDIT_LAYER);
            try {
                db_setLayerColorLabel(layer, "Ylw ");
            } catch (colorErr) {
                // Não trava a criação da camada por causa da cor.
            }
        }
    } catch (layerErr) {
        alert("Erro em Texture (AI Edit) ao criar camada: " + layerErr.message + " (linha " + layerErr.line + ")");
        return "false";
    }

    try {
        db_selectBrushTool();
        
        // Tenta selecionar o pincel redondo macio padrão pelo nome
        var softBrushNames = ["Soft Round", "Redondo macio", "Redondo difuso", "Soft Round 30", "Redondo macio 30"];
        for (var i = 0; i < softBrushNames.length; i++) {
            try {
                dt_selectBrushByName(softBrushNames[i]);
                break;
            } catch (brushSelectErr) {
                // Continua tentando os outros nomes
            }
        }

        tx_setForegroundColor("FF0000");
        try {
            db_setBrushSizeAndHardness(50, 0);
        } catch (brushErr) {
            // Não deixa a camada/ferramenta já configuradas travarem se o
            // "setd" do pincel falhar por algum motivo de versão/estado.
        }
    } catch (toolErr) {
        alert("Texture (AI Edit): não consegui configurar o Pincel (" + toolErr.message + "). A camada foi criada mesmo assim — configure manualmente.");
        return "true";
    }

    return "true";
}

/**
 * Botão "Apply" da barrinha do nosso painel: carrega a transparência da
 * camada de pintura como seleção (mesmo idioma de Action Manager já
 * corrigido/confirmado em quickSelectHighlights.jsx: "fsel" minúsculo +
 * "setd", trocando só o canal alvo pra "Trsp" — transparência), apaga a
 * camada de pintura, e chama o Preenchimento Generativo com prompt vazio
 * — a camada abaixo (a foto de verdade) fica ativa depois de remover a
 * camada de pintura, então é ela que recebe o preenchimento.
 */
function runTextureAiEditApply() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var layer = shl_findLayerByName(doc.layers, TEXTURE_AI_EDIT_LAYER);
    if (!layer) {
        alert("Texture (AI Edit): pinte a área antes de clicar em Apply.");
        return "false";
    }

    try {
        doc.activeLayer = layer;

        var desc = new ActionDescriptor();
        var refSelection = new ActionReference();
        refSelection.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
        desc.putReference(charIDToTypeID("null"), refSelection);

        var refChannel = new ActionReference();
        refChannel.putEnumerated(charIDToTypeID("Chnl"), charIDToTypeID("Chnl"), charIDToTypeID("Trsp"));
        desc.putReference(charIDToTypeID("T   "), refChannel);

        executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);

        layer.remove();

        try {
            tx_generativeFill("");
        } catch (genErr) {
            alert("Texture (AI Edit): a seleção foi criada, mas o Preenchimento Generativo falhou (" + genErr.message + "). Tente gerar manualmente pela barra do Photoshop.");
        }

        return "true";
    } catch (e) {
        alert("Erro em Texture (AI Edit) ao aplicar: " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}

/**
 * Botão "Cancel" da barrinha do nosso painel: apaga a camada de pintura
 * e desmarca qualquer seleção, sem gerar nada.
 */
function runTextureAiEditCancel() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var layer = shl_findLayerByName(doc.layers, TEXTURE_AI_EDIT_LAYER);

    try {
        if (layer) layer.remove();
        if (doc.selection) {
            try {
                doc.selection.deselect();
            } catch (selErr) {
                // Sem seleção ativa — sem problema.
            }
        }
        return "true";
    } catch (e) {
        alert("Erro em Texture (AI Edit) ao cancelar: " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
