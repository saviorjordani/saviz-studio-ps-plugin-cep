/**
 * Color Correction — botão "Lips" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/color-correction/colorCorrectionLips.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runColorCorrectionLips() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runColorCorrectionLips()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runColorCorrectionLips = runColorCorrectionLips;
})();
