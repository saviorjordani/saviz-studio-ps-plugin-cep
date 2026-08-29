/**
 * Quick Select — botão "Highlights" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/quickSelectHighlights.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runQuickSelectHighlights() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runQuickSelectHighlights()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runQuickSelectHighlights = runQuickSelectHighlights;
})();
