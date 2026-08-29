/**
 * Color Correction — botão "Glow" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/color-correction/colorCorrectionGlow.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runColorCorrectionGlow() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runColorCorrectionGlow()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runColorCorrectionGlow = runColorCorrectionGlow;
})();
