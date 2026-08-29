// Texture — 2º slot: "Magic Stamp" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real: cria uma camada vazia chamada
// "Texture: Magic Stamp" e muda a ferramenta ativa pro Pincel de
// Recuperação (Healing Brush — diferente do slot 1, que é o Spot
// Healing Brush) com:
//   Tamanho: 20px, Rigidez: 70%, Espaçamento: 25%, Ângulo: 42°,
//   Circularidade: 47%, Tamanho controlado por: Pressão da Caneta
//
// A troca de ferramenta deu 3 rodadas de erro ("comando Selecionar não
// disponível") até confirmar via log real do ScriptListener que o
// identificador interno certo é "magicStampTool" — nem "healingBrushTool"
// (nome "óbvio") nem app.currentTool funcionavam.
//
// Reaproveita fs_newEmptyLayer (frequencySeparation.jsx) e
// tx_setSpotHealingBrushOptions (textureSpotHealing.jsx — o nome ficou
// "spot" mas a função é genérica pra qualquer ferramenta de pincel, só
// muda a ferramenta antes de chamar) — concatenados no mesmo
// hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runTextureMagicStamp()').

var TEXTURE_MAGIC_STAMP_LAYER = "Texture: Magic Stamp";

function tx_selectToolClassic(toolStringID) {
    // app.currentTool = "healingBrushTool" e a tentativa via Action
    // Manager com esse mesmo nome deram "comando Selecionar não
    // disponível" — confirmado com o log real do ScriptListener que o
    // identificador certo dessa ferramenta no Photoshop 2025 é
    // "magicStampTool" (não "healingBrushTool"), coincidência com o nome
    // do nosso botão.
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID(toolStringID));
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

function runTextureMagicStamp() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, TEXTURE_MAGIC_STAMP_LAYER);

    try {
        if (!existing) {
            var layer = fs_newEmptyLayer(TEXTURE_MAGIC_STAMP_LAYER);
            try {
                db_setLayerColorLabel(layer, "Vlt ");
            } catch (colorErr) {
                // Não trava a criação da camada por causa da cor.
            }
        }
    } catch (layerErr) {
        alert("Erro em Texture (Magic Stamp) ao criar camada: " + layerErr.message + " (linha " + layerErr.line + ")");
        return "false";
    }

    try {
        tx_selectToolClassic("magicStampTool");
    } catch (toolErr) {
        alert("Texture (Magic Stamp): não consegui trocar pra ferramenta Pincel de Recuperação (" + toolErr.message + "). A camada foi criada mesmo assim — selecione a ferramenta manualmente.");
        return "true";
    }

    try {
        tx_setSpotHealingBrushOptions(20, 70, 25, 42, 47);
    } catch (brushErr) {
        // Não deixa a camada/ferramenta já configuradas travarem se o
        // "setd" do pincel falhar por algum motivo de versão/estado.
    }

    return "true";
}
