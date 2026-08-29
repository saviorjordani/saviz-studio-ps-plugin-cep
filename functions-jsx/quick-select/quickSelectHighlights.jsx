// Quick Select — botão "Highlights" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real do painel Williams Academy: o botão gera uma
// seleção "pontilhada", concentrada nas áreas mais claras/brilhantes da
// pele (não é um bloco liso e contínuo como o botão Skin).
//
// 🔄 Mudança de estratégia: a técnica de "carregar o canal composto como
// seleção" (executeAction("setd") com referência de canal "Ctrl"/"Mrgd")
// falhou 3 vezes seguidas com "comando Definir não disponível", mesmo
// corrigindo os bugs reais que achei no meio do caminho (charID "set "
// sem "d", "Fsel" maiúsculo errado). Em vez de continuar chutando o enum
// do canal, troquei pra reaproveitar a MESMA técnica já confirmada
// funcionando nos botões Skin e Shadows: `colorRange` via Action Manager
// com a chave `"colors"` — o Color Range nativo do Photoshop já tem
// "Highlights" como preset próprio (junto de Shadows/Midtones), então é
// só trocar o valor do enum.
//
// Chamado do painel via csInterface.evalScript('runQuickSelectHighlights()').

function runQuickSelectHighlights() {
    if (app.documents.length === 0) return "false";

    try {
        var desc = new ActionDescriptor();
        desc.putEnumerated(stringIDToTypeID("colors"), stringIDToTypeID("colors"), stringIDToTypeID("highlights"));
        executeAction(stringIDToTypeID("colorRange"), desc, DialogModes.NO);
        return "true";
    } catch (e) {
        alert("Erro em Quick Select (Highlights): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
