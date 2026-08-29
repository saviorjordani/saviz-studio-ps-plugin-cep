// Texture — 5º slot: "Remove Tool" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real: cria uma camada vazia chamada
// "Texture: Remove Tool", mostra um aviso pedindo pra marcar "Obter
// amostra de todas as camadas" (Sample All Layers) e muda a ferramenta
// ativa pra Ferramenta Remover (Remove Tool — IA generativa de remoção
// de objetos, adicionada no Photoshop 2024).
//
// Identificador da ferramenta ("removeTool") confirmado via log real do
// ScriptListener (mesmo log usado pro slot 2 — Magic Stamp).
//
// O aviso de "Sample All Layers" é a mesma pendência dos slots 1/2 (não
// achei ainda a chave de Action Manager certa pra ligar essa opção
// automaticamente). Em vez de um alert() nativo do Photoshop (trava a
// UI e destoa do resto do painel), o aviso é mostrado como modal do
// próprio painel — ver js/main.js, showPanelModal() chamada depois que
// essa função devolve "true".
//
// Reaproveita fs_newEmptyLayer (frequency-separation/frequencySeparation.jsx),
// shl_findLayerByName (helping-layers/helpingLayers.jsx) e
// tx_selectToolClassic (texture/textureMagicStamp.jsx) — concatenados no
// mesmo hostscript.jsx (ver scripts/package-test.js).
//
// Chamado do painel via csInterface.evalScript('runTextureRemoveTool()').

var TEXTURE_REMOVE_TOOL_LAYER = "Texture: Remove Tool";

function runTextureRemoveTool() {
    if (app.documents.length === 0) return "false";
    var doc = app.activeDocument;

    var existing = shl_findLayerByName(doc.layers, TEXTURE_REMOVE_TOOL_LAYER);

    try {
        if (!existing) {
            var layer = fs_newEmptyLayer(TEXTURE_REMOVE_TOOL_LAYER);
            try {
                db_setLayerColorLabel(layer, "Rd  ");
            } catch (colorErr) {
                // Não trava a criação da camada por causa da cor.
            }
        }
    } catch (layerErr) {
        alert("Erro em Texture (Remove Tool) ao criar camada: " + layerErr.message + " (linha " + layerErr.line + ")");
        return "false";
    }

    try {
        tx_selectToolClassic("removeTool");
    } catch (toolErr) {
        alert("Texture (Remove Tool): não consegui trocar pra Ferramenta Remover (" + toolErr.message + "). A camada foi criada mesmo assim — selecione a ferramenta manualmente.");
        return "true";
    }

    return "true";
}
