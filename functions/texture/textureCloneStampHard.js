/**
 * Texture — 4º slot: "Clone Stamp Hard" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/texture/textureCloneStampHard.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runTextureCloneStampHard() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureCloneStampHard()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runTextureCloneStampHard = runTextureCloneStampHard;
})();
