/**
 * Texture — 5º slot: "Remove Tool" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/texture/textureRemoveTool.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runTextureRemoveTool() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureRemoveTool()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runTextureRemoveTool = runTextureRemoveTool;
})();
