/**
 * Texture — 2º slot: "Magic Stamp" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/textureMagicStamp.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runTextureMagicStamp() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureMagicStamp()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runTextureMagicStamp = runTextureMagicStamp;
})();
