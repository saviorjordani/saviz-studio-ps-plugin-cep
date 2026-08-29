/**
 * Quick Select — botão "Shadows" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/quickSelectShadows.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runQuickSelectShadows() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runQuickSelectShadows()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runQuickSelectShadows = runQuickSelectShadows;
})();
