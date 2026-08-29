/**
 * Color Correction — botão "Blush" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/color-correction/colorCorrectionBlush.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runColorCorrectionBlush() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runColorCorrectionBlush()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runColorCorrectionBlush = runColorCorrectionBlush;
})();
