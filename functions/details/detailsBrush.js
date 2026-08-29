/**
 * Details (Iris/Catchlight/Freckles/Brows/Eyeliner/Lashes) — lado do painel
 *
 * Cada pincel real (.abr) é grande (15MB–470MB), hospedado num bucket
 * R2 público (Cloudflare) — baixado uma vez e cacheado localmente em
 * %APPDATA%\SavizStudio\Brushes\ (Node.js, disponível no painel CEP)
 * antes de chamar o ExtendScript (functions-jsx/details/detailsBrush.jsx),
 * que recebe o caminho local já baixado.
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    var BRUSH_BASE_URL = 'https://r2savizstudio.devhextar.site/brushes/';

    // require() só existe se o manifest.xml tiver --enable-nodejs /
    // --mixed-context no CEFCommandLine. Se não tiver (ou o painel
    // ainda não foi reiniciado depois de habilitar), NÃO deixa isso
    // lançar um erro não-capturado aqui: como esse arquivo é
    // concatenado ANTES de dodge-and-burn/quick-select/texture/etc no
    // bundle final (js/functions.js), uma exceção neste ponto para a
    // execução do resto do arquivo inteiro e quebra todos os outros
    // botões junto. Em vez disso, guarda o motivo e falha só quando
    // alguém realmente tentar usar um pincel.
    var nodeAvailable = typeof require === 'function';
    var https, fs, path;
    if (nodeAvailable) {
        try {
            https = require('https');
            fs = require('fs');
            path = require('path');
        } catch (e) {
            nodeAvailable = false;
        }
    }

    function getCacheDir() {
        // ProgramData (não APPDATA) de propósito: %APPDATA% embute o
        // nome do usuário do Windows no caminho, e um nome com acento
        // faz o ExtendScript não achar o arquivo de verdade na hora do
        // Append (mesmo bug confirmado com log real no Skin Texture,
        // "Definir não disponível" mesmo com o arquivo existindo).
        // ProgramData é fixo, sem acento, sem depender de usuário.
        var base = process.env.ProgramData || process.env.APPDATA || (process.env.HOME + '/.config');
        var dir = path.join(base, 'SavizStudio', 'Brushes');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Baixa o .abr do R2 se ainda não estiver em cache local, com
     * progresso reportado via callback(percent). Resolve com o caminho
     * local do arquivo.
     */
    function ensureBrushCached(fileName, onProgress) {
        if (!nodeAvailable) {
            return Promise.reject(new Error('Node.js não está habilitado nesse painel (falta --enable-nodejs no manifest, ou o Photoshop precisa ser reiniciado depois de atualizar o plugin).'));
        }

        var localPath = path.join(getCacheDir(), fileName);

        return new Promise(function (resolve, reject) {
            if (fs.existsSync(localPath)) {
                resolve(localPath);
                return;
            }

            var tmpPath = localPath + '.download';
            var file = fs.createWriteStream(tmpPath);
            var url = BRUSH_BASE_URL + fileName;

            https.get(url, function (response) {
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(tmpPath, function () {});
                    reject(new Error('HTTP ' + response.statusCode + ' ao baixar ' + fileName));
                    return;
                }

                var total = parseInt(response.headers['content-length'], 10) || 0;
                var downloaded = 0;

                response.on('data', function (chunk) {
                    downloaded += chunk.length;
                    if (onProgress && total) {
                        onProgress(Math.round((downloaded / total) * 100));
                    }
                });

                response.pipe(file);

                file.on('finish', function () {
                    file.close(function () {
                        fs.rename(tmpPath, localPath, function (err) {
                            if (err) reject(err);
                            else resolve(localPath);
                        });
                    });
                });
            }).on('error', function (err) {
                file.close();
                fs.unlink(tmpPath, function () {});
                reject(err);
            });
        });
    }

    /**
     * Checagem síncrona local (sem rede) — usada só pra mostrar o
     * check/X de status no botão, não pro fluxo de baixar/aplicar.
     */
    function isBrushCached(fileName) {
        if (!nodeAvailable) return false;
        var localPath = path.join(getCacheDir(), fileName);
        return fs.existsSync(localPath);
    }

    window.SavizFunctions.isBrushCached = isBrushCached;

    /**
     * fileName: nome do .abr no bucket (ex: "Iris.abr").
     * presetName: nome exato do pincel dentro do arquivo (ex: "IRIS R").
     * onProgress: opcional, recebe 0-100 durante o download.
     */
    function runDetailsBrush(fileName, presetName, onProgress) {
        return ensureBrushCached(fileName, onProgress).then(function (localPath) {
            return new Promise(function (resolve, reject) {
                var script = 'runDetailsBrush(' + JSON.stringify(presetName) + ', ' + JSON.stringify(localPath) + ')';
                csInterface.evalScript(script, function (result) {
                    if (result === 'true') {
                        resolve(true);
                    } else if (typeof result === 'string' && result.indexOf('ERROR:') === 0) {
                        reject(new Error(result.slice(6)));
                    } else {
                        resolve(false);
                    }
                });
            });
        });
    }

    window.SavizFunctions.runDetailsBrush = runDetailsBrush;
})();
