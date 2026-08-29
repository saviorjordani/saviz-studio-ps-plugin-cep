// Quick Select — botão "Shadows" (lado do host — ExtendScript / Action Manager clássico)
//
// Confirmado FUNCIONANDO pelo próprio cliente com um script já testado
// (Scripts/jsx/quickSelectShadowsClean.jsx) — mesma técnica que resolveu
// o botão Skin: Color Range com a chave "colors" (enumerada), valor
// "shadows".
//
// Chamado do painel via csInterface.evalScript('runQuickSelectShadows()').

function runQuickSelectShadows() {
    if (app.documents.length === 0) return "false";

    try {
        var desc = new ActionDescriptor();
        desc.putEnumerated(stringIDToTypeID("colors"), stringIDToTypeID("colors"), stringIDToTypeID("shadows"));
        executeAction(stringIDToTypeID("colorRange"), desc, DialogModes.NO);
        return "true";
    } catch (e) {
        alert("Erro em Quick Select (Shadows): " + e.message + " (linha " + e.line + ")");
        return "false";
    }
}
