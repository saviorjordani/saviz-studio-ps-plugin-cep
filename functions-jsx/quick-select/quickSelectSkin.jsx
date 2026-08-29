// Quick Select — botão "Skin" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado via print real: o botão cria uma seleção (marching ants) em
// cima da pele do rosto + pescoço, evitando cabelo, sobrancelha, olhos,
// boca/lábios e narinas, e favorecendo a pele que está recebendo luz
// (o lado em sombra profunda do maxilar/pescoço fica parcialmente de
// fora da seleção).
//
// Confirmado: bate com o recurso NATIVO do Photoshop Select > Color
// Range, preset "Skin Tones" com "Detect Faces" ligado — inclusive a
// limitação de "perder pele em sombra profunda" é um comportamento
// CONHECIDO e documentado desse preset nativo (não é um segundo passo de
// "selecionar só realce", é assim que o algoritmo de skin tone do
// próprio Photoshop se comporta). Ver docs/scripts/05-quick-select.md.
//
// Chave certa do descriptor: "colors" (não "colorModel", que foi minha
// primeira tentativa errada) — mesma chave usada nos botões Highlights e
// Shadows.
//
// Chamado do painel via csInterface.evalScript('runQuickSelectSkin()').

function runQuickSelectSkin() {
    if (app.documents.length === 0) return "false";

    try {
        var desc = new ActionDescriptor();
        desc.putEnumerated(stringIDToTypeID("colors"), stringIDToTypeID("colors"), stringIDToTypeID("skinTone"));
        desc.putBoolean(stringIDToTypeID("detectFaces"), true);
        executeAction(stringIDToTypeID("colorRange"), desc, DialogModes.NO);

        return "true";
    } catch (e) {
        alert("Erro em Quick Select (Skin): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
