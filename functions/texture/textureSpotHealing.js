/**
 * Texture — 1º slot: "Spot Healing Brush" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/textureSpotHealing.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runTextureSpotHealing() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureSpotHealing()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runTextureSpotHealing = runTextureSpotHealing;
})();
