/**
 * Helping Layers (lado do painel)
 *
 * Em CEP o JS do painel NÃO tem acesso direto ao Photoshop (diferente do
 * UXP, que tem require('photoshop')). Aqui só empacota a chamada pro
 * ExtendScript correspondente (functions-jsx/helpingLayers.jsx,
 * concatenado em jsx/hostscript.jsx no build) via csInterface.evalScript.
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    /**
     * Alterna a visibilidade do grupo "Helping Layers" no documento ativo
     * (cria o grupo com as 3 camadas na primeira vez). Retorna uma Promise
     * que resolve pra true (visível) ou false (escondido).
     */
    function toggleHelpingLayers() {
        return new Promise(function (resolve) {
            csInterface.evalScript('toggleHelpingLayers()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.toggleHelpingLayers = toggleHelpingLayers;
})();
