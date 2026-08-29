/**
 * Texture — 6º slot: "AI Edit" (lado do painel)
 * Empacota as chamadas pro ExtendScript (functions-jsx/texture/textureAiEdit.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    function runTextureAiEdit() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureAiEdit()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    function runTextureAiEditApply() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureAiEditApply()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    function runTextureAiEditCancel() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runTextureAiEditCancel()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runTextureAiEdit = runTextureAiEdit;
    window.SavizFunctions.runTextureAiEditApply = runTextureAiEditApply;
    window.SavizFunctions.runTextureAiEditCancel = runTextureAiEditCancel;
})();
