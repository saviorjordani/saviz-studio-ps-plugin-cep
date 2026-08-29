/**
 * Color Correction — botão "Eyes" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/color-correction/colorCorrectionEyes.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runColorCorrectionEyes() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runColorCorrectionEyes()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runColorCorrectionEyes = runColorCorrectionEyes;
})();
