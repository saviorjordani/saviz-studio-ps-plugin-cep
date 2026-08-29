// Texture — 4º slot: "Clone Stamp Hard" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real: cria uma camada vazia chamada
// "Texture: Clone Stamp Hard" e muda a ferramenta ativa pro Carimbo
// (Clone Stamp) com um pincel específico do cliente
// (IMPLEMENTAR/Texture/texture-clone-stamp-hard.abr) — mesma ideia do
// slot 3 (Clone Stamp Soft), só com um pincel mais "duro" (maior,
// mais rígido).
//
// Valores parseados direto do .abr (preset "computado", sem textura de
// imagem própria):
//   Tamanho: 30px, Rigidez: 58%, Espaçamento: 25%, Ângulo: 46°,
//   Circularidade: 43%
//
// Reaproveita fs_newEmptyLayer (frequency-separation/frequencySeparation.jsx),
// shl_findLayerByName (helping-layers/helpingLayers.jsx), tx_selectToolClassic
// e tx_setSpotHealingBrushOptions (texture/textureMagicStamp.jsx e
// texture/textureSpotHealing.jsx) — concatenados no mesmo hostscript.jsx
// (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runTextureCloneStampHard()').

var TEXTURE_CLONE_STAMP_HARD_LAYER = "Texture: Clone Stamp Hard";

function runTextureCloneStampHard() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, TEXTURE_CLONE_STAMP_HARD_LAYER);

    try {
        if (!existing) {
            var layer = fs_newEmptyLayer(TEXTURE_CLONE_STAMP_HARD_LAYER);
            try {
                db_setLayerColorLabel(layer, "Orng");
            } catch (colorErr) {
                // Não trava a criação da camada por causa da cor.
            }
        }
    } catch (layerErr) {
        alert("Erro em Texture (Clone Stamp Hard) ao criar camada: " + layerErr.message + " (linha " + layerErr.line + ")");
        return "false";
    }

    try {
        tx_selectToolClassic("cloneStampTool");
    } catch (toolErr) {
        alert("Texture (Clone Stamp Hard): não consegui trocar pra ferramenta Carimbo (" + toolErr.message + "). A camada foi criada mesmo assim — selecione a ferramenta manualmente.");
        return "true";
    }

    try {
        tx_setSpotHealingBrushOptions(30, 58, 25, 46, 43);
    } catch (brushErr) {
        // Não deixa a camada/ferramenta já configuradas travarem se o
        // "setd" do pincel falhar por algum motivo de versão/estado.
    }

    return "true";
}
