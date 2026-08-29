/**
 * Frequency Separation (lado do painel)
 * Empacota a chamada pro ExtendScript (functions-jsx/frequencySeparation.jsx).
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    /**
     * method: 'gaussian' | 'median'
     * Retorna uma Promise que resolve pra true/false (sucesso).
     */
    function runFrequencySeparation(method, radius) {
        var script = 'runFrequencySeparation(' + JSON.stringify(method) + ', ' + (radius || 'undefined') + ')';
        return new Promise(function (resolve) {
            csInterface.evalScript(script, function (result) {
                resolve(result === 'true');
            });
        });
    }

    window.SavizFunctions.runFrequencySeparation = runFrequencySeparation;
})();
