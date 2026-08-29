// Texture — 3º slot: "Clone Stamp Soft" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real: cria uma camada vazia chamada
// "Texture: Clone Stamp Soft" e muda a ferramenta ativa pro Carimbo
// (Clone Stamp) com um pincel específico do cliente
// (IMPLEMENTAR/Texture/texture-clone-stamp-soft.abr).
//
// O .abr é um preset "computado" (não tem imagem de textura própria, só
// parâmetros de forma), então em vez de importar o arquivo .abr dentro
// do Photoshop via script (bem mais arriscado/complexo), parseei os
// valores binários direto (mesmo processo usado pros .acv/.blw) e
// reproduzo só com os parâmetros — resultado idêntico:
//   Tamanho: 20px, Rigidez: 42%, Espaçamento: 25%, Ângulo: 37°,
//   Circularidade: 35%
//
// Identificador da ferramenta ("cloneStampTool") confirmado via log real
// do ScriptListener — dessa vez o nome óbvio bateu certo (diferente do
// Magic Stamp/Healing Brush, que precisou do log pra descobrir
// "magicStampTool").
//
// Reaproveita fs_newEmptyLayer (frequencySeparation.jsx),
// shl_findLayerByName (helpingLayers.jsx), tx_selectToolClassic
// (textureMagicStamp.jsx) e tx_setSpotHealingBrushOptions
// (textureSpotHealing.jsx) — concatenados no mesmo hostscript.jsx (ver
// scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runTextureCloneStamp()').

var TEXTURE_CLONE_STAMP_LAYER = "Texture: Clone Stamp Soft";

function runTextureCloneStamp() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, TEXTURE_CLONE_STAMP_LAYER);

    try {
        if (!existing) {
            var layer = fs_newEmptyLayer(TEXTURE_CLONE_STAMP_LAYER);
            try {
                db_setLayerColorLabel(layer, "Grn ");
            } catch (colorErr) {
                // Não trava a criação da camada por causa da cor.
            }
        }
    } catch (layerErr) {
        alert("Erro em Texture (Clone Stamp Soft) ao criar camada: " + layerErr.message + " (linha " + layerErr.line + ")");
        return "false";
    }

    try {
        tx_selectToolClassic("cloneStampTool");
    } catch (toolErr) {
        alert("Texture (Clone Stamp Soft): não consegui trocar pra ferramenta Carimbo (" + toolErr.message + "). A camada foi criada mesmo assim — selecione a ferramenta manualmente.");
        return "true";
    }

    try {
        tx_setSpotHealingBrushOptions(20, 42, 25, 37, 35);
    } catch (brushErr) {
        // Não deixa a camada/ferramenta já configuradas travarem se o
        // "setd" do pincel falhar por algum motivo de versão/estado.
    }

    return "true";
}
