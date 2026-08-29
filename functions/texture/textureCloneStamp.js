/**
 * Texture — 3º slot: "Clone Stamp Soft" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/textureCloneStamp.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runTextureCloneStamp() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureCloneStamp()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runTextureCloneStamp = runTextureCloneStamp;
})();
