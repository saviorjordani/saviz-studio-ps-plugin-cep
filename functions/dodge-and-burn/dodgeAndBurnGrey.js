/**
 * Dodge & Burn — botão "50% Grey" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/dodgeAndBurnGrey.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    /**
     * Retorna uma Promise que resolve pra true/false (camada visível ou não).
     */
    function runDodgeAndBurnGrey() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runDodgeAndBurnGrey()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runDodgeAndBurnGrey = runDodgeAndBurnGrey;
})();
