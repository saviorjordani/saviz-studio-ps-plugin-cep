/**
 * Quick Select — botão "Skin" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/quickSelectSkin.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    /**
     * Retorna uma Promise que resolve pra true/false (sucesso).
     */
    function runQuickSelectSkin() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runQuickSelectSkin()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runQuickSelectSkin = runQuickSelectSkin;
})();
