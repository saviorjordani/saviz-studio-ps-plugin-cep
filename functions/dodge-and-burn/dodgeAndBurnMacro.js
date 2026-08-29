/**
 * Dodge & Burn — botão "Macro" (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/dodgeAndBurnMacro.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    /**
     * Retorna uma Promise que resolve pra true/false (grupo visível ou não).
     */
    function runDodgeAndBurnMacro() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runDodgeAndBurnMacro()', function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runDodgeAndBurnMacro = runDodgeAndBurnMacro;
})();
