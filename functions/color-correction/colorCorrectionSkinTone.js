/**
 * Color Correction — botão "Skin tone" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/color-correction/colorCorrectionSkinTone.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runColorCorrectionSkinTone() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runColorCorrectionSkinTone()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runColorCorrectionSkinTone = runColorCorrectionSkinTone;
})();
