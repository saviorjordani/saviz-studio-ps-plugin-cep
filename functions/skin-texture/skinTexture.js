/**
 * Skin Texture — lado do painel
 *
 * Cada textura cria a camada inteira via Action Manager, sem depender
 * de nenhuma .atn (ver runSkinTextureAddTexture no host). O pattern
 * real (SAVIZTEXTURES.pat, todas as 9 texturas num arquivo só) vem de
 * um bucket R2 (mesma ideia dos pincéis do Details), baixado uma vez e
 * cacheado localmente em %APPDATA%\SavizStudio\Patterns\.
 *
 * A instalação (Append do .pat nos presets do Photoshop) é feita por
 * um botão dedicado e obrigatório ("Instalar Texturas"), não mais
 * dentro do fluxo de Add de cada textura — duas tentativas anteriores
 * de decidir "já tá instalado?" automaticamente (cache na memória do
 * painel, depois um check do lado do host via executeActionGet) não
 * seguraram na prática e o Append continuava rodando de novo a cada
 * uso, criando grupos duplicados no painel de Patterns do Photoshop
 * ("SAVIZTEXTURES", "SAVIZTEXTURES 2", ...). Uma flag persistida em
 * localStorage, setada só depois de uma instalação bem-sucedida via
 * clique explícito do usuário, é a única fonte da verdade agora.
 *
 * Concatenado dentro de js/functions.js no build (ver scripts/package-test.js).
 * Não usa import/export: expõe tudo em window.SavizFunctions.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    var PATTERN_BASE_URL = 'https://r2savizstudio.devhextar.site/patterns/';
    var PATTERNS_FILE = 'SAVIZTEXTURES.pat';
    var PATTERNS_INSTALLED_KEY = 'saviz.skinTexture.patternsInstalled';

    // require() só existe com --enable-nodejs/--mixed-context no
    // manifest.xml. Não deixa isso quebrar o resto do bundle se não
    // tiver disponível (mesma defesa usada no Details) — só falha
    // quando alguém realmente tentar instalar o pattern.
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

    function getPatternCacheDir() {
        // ProgramData (não APPDATA) de propósito: %APPDATA% embute o
        // nome do usuário do Windows no caminho, e um nome com acento
        // (confirmado com log real: "C:\Users\José Márcio\...") faz o
        // ExtendScript não achar o arquivo de verdade na hora do
        // Append, gerando "Definir não disponível" mesmo com o arquivo
        // existindo. ProgramData é fixo, sem acento, sem depender de
        // usuário.
        var base = process.env.ProgramData || process.env.APPDATA || (process.env.HOME + '/.config');
        var dir = path.join(base, 'SavizStudio', 'Patterns');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    /**
     * Baixa o SAVIZTEXTURES.pat do R2 se ainda não estiver em cache
     * local, com progresso via callback(percent). Resolve com o
     * caminho local.
     */
    function ensurePatternFileCached(onProgress) {
        if (!nodeAvailable) {
            return Promise.reject(new Error('Node.js não está habilitado nesse painel (falta --enable-nodejs no manifest, ou o Photoshop precisa ser reiniciado depois de atualizar o plugin).'));
        }

        var localPath = path.join(getPatternCacheDir(), PATTERNS_FILE);

        return new Promise(function (resolve, reject) {
            if (fs.existsSync(localPath)) {
                resolve(localPath);
                return;
            }

            var tmpPath = localPath + '.download';
            var file = fs.createWriteStream(tmpPath);
            var url = PATTERN_BASE_URL + PATTERNS_FILE;

            https.get(url, function (response) {
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(tmpPath, function () {});
                    reject(new Error('HTTP ' + response.statusCode + ' ao baixar ' + PATTERNS_FILE));
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
     * true = usuário já clicou "Instalar Texturas" e a instalação
     * terminou com sucesso nessa máquina. Persistido em localStorage —
     * sobrevive a recarregar o painel e a reiniciar o Photoshop (bem
     * diferente da tentativa anterior, que vivia só na memória do
     * painel e se perdia a cada sessão nova).
     */
    function isPatternsInstalled() {
        try {
            return localStorage.getItem(PATTERNS_INSTALLED_KEY) === 'true';
        } catch (e) {
            return false;
        }
    }

    function setPatternsInstalled() {
        try {
            localStorage.setItem(PATTERNS_INSTALLED_KEY, 'true');
        } catch (e) { /* localStorage indisponível — só não persiste */ }
    }

    /**
     * Baixa (se preciso) e instala (Append) o SAVIZTEXTURES.pat nos
     * presets do Photoshop. Chamado só pelo botão "Instalar Texturas" —
     * uma única vez por máquina, nunca automaticamente dentro do fluxo
     * de Add.
     */
    function runSkinTextureInstallAllPatterns(onProgress) {
        return ensurePatternFileCached(onProgress).then(function (patternPath) {
            return new Promise(function (resolve, reject) {
                var script = 'runSkinTextureInstallPatterns(' + JSON.stringify(patternPath) + ')';
                csInterface.evalScript(script, function (result) {
                    if (result === 'true') {
                        setPatternsInstalled();
                        resolve(true);
                    } else if (typeof result === 'string' && result.indexOf('ERROR:') === 0) {
                        reject(new Error(result.slice(6)));
                    } else {
                        reject(new Error('Falha desconhecida ao instalar as texturas.'));
                    }
                });
            });
        });
    }

    // Nome da ação (dropdown) -> config completa de Bevel & Emboss +
    // Texture, confirmada via "Copiar como JavaScript" (batchPlay) de
    // cada ação real no Photoshop do cliente. A camada inteira é criada
    // por Action Manager, sem rodar app.doAction()/SKINTEXTURES.atn
    // (ver st_createTextureLayerScripted no host) — evita de vez o
    // "Definir não disponível", que vinha de a própria Action tentar
    // aplicar o pattern por um ID fixo da gravação original, que nunca
    // bate com o pattern recarregado aqui.
    var TEXTURE_CONFIGS = {
        'hand and skin': {
            patternName: 'handandskintexture.jpg',
            patternScale: 5, patternInvert: true, patternDepth: 150,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 63, shadowOpacity: 60,
            bevelDirection: 'Out ', blendMode: 'OVERLAY'
        },
        'Forehead skin': {
            patternName: 'foreheadskintexture.jpg',
            patternScale: 60, patternInvert: false, patternDepth: 103,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 72, shadowOpacity: 64,
            bevelDirection: 'In  ', blendMode: 'OVERLAY'
        },
        'Forehead pores': {
            patternName: 'foreheadskinwithporestexture.jpg',
            patternScale: 20, patternInvert: false, patternDepth: 103,
            angle: 90, altitude: 30, size: 3, highlightOpacity: 72, shadowOpacity: 64,
            bevelDirection: 'In  ', blendMode: 'SOFTLIGHT'
        },
        'forehead pores INDIVIDUAL': {
            patternName: 'foreheadskinwithporesindividualtexture.jpg',
            patternScale: 10, patternInvert: false, patternDepth: -50,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 63, shadowOpacity: 60,
            bevelDirection: 'Out ', blendMode: 'OVERLAY'
        },
        'Highlight texture': {
            patternName: 'highlightskintexture.jpg',
            patternScale: 5, patternInvert: false, patternDepth: 65,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 89, shadowOpacity: 69,
            bevelDirection: 'In  ', blendMode: 'OVERLAY'
        },
        'skin highlight texture': {
            patternName: 'highlightskintexture.jpg',
            patternScale: 5, patternInvert: true, patternDepth: 87,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 63, shadowOpacity: 60,
            bevelDirection: 'Out ', blendMode: 'OVERLAY'
        },
        'cheek': {
            patternName: 'sidecheekskintexture.jpg',
            patternScale: 12, patternInvert: false, patternDepth: 120,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 63, shadowOpacity: 60,
            bevelDirection: 'Out ', blendMode: 'OVERLAY'
        },
        'cheeks highlight': {
            patternName: 'cheekhightlightskintexture.jpg',
            patternScale: 5, patternInvert: true, patternDepth: 87,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 63, shadowOpacity: 60,
            bevelDirection: 'Out ', blendMode: 'OVERLAY'
        },
        'cheek individual pores': {
            patternName: 'cheeksindividualporesskintexture.jpg',
            patternScale: 5, patternInvert: true, patternDepth: 87,
            angle: 90, altitude: 32, size: 3, highlightOpacity: 63, shadowOpacity: 60,
            bevelDirection: 'Out ', blendMode: 'OVERLAY'
        }
    };

    /**
     * Pra popular o check/X do dropdown: true = pattern instalado e
     * pronto, false = falta clicar "Instalar Texturas", null = essa
     * textura não tem config mapeada.
     */
    function isTextureReady(actionName) {
        if (!TEXTURE_CONFIGS[actionName]) return null;
        return isPatternsInstalled();
    }

    function getSkinTextureDefaultConfig(actionName) {
        var cfg = TEXTURE_CONFIGS[actionName];
        if (!cfg) return null;
        return {
            angle: cfg.angle,
            altitude: cfg.altitude,
            useGlobalLight: true,
            size: cfg.size,
            scale: cfg.patternScale,
            textureDepth: cfg.patternDepth,
            highlightOpacity: cfg.highlightOpacity,
            shadowOpacity: cfg.shadowOpacity
        };
    }

    /**
     * actionName: nome exato da textura (ex: "hand and skin"), escolhida
     * no dropdown do painel. Não baixa nem instala nada aqui — exige que
     * "Instalar Texturas" já tenha rodado antes (o botão Add fica
     * desabilitado até lá no painel, isso aqui é só uma segunda trava de
     * segurança).
     */
    function runSkinTextureAddTexture(actionName) {
        var cfg = TEXTURE_CONFIGS[actionName];
        if (!isPatternsInstalled()) {
            return Promise.reject(new Error('Clique em "Instalar Texturas" antes de adicionar uma textura.'));
        }

        return new Promise(function (resolve, reject) {
            var script = 'runSkinTextureAddTexture(' +
                JSON.stringify(actionName) + ', ' +
                JSON.stringify(JSON.stringify(cfg)) + ')';
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
    }

    function runSkinTextureListLayers() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runSkinTextureListLayers()', function (result) {
                try {
                    resolve(JSON.parse(result));
                } catch (e) {
                    resolve([]);
                }
            });
        });
    }

    function runSkinTextureSelectLayer(layerName) {
        return new Promise(function (resolve, reject) {
            var script = 'runSkinTextureSelectLayer(' + JSON.stringify(layerName) + ')';
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
    }

    function runSkinTextureGetBevelEmboss() {
        return new Promise(function (resolve) {
            csInterface.evalScript('runSkinTextureGetBevelEmboss()', function (result) {
                try {
                    resolve(JSON.parse(result));
                } catch (e) {
                    resolve(null);
                }
            });
        });
    }

    function runSkinTextureSetBevelEmboss(params) {
        return new Promise(function (resolve, reject) {
            var script = 'runSkinTextureSetBevelEmboss(' + JSON.stringify(JSON.stringify(params)) + ')';
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
    }

    window.SavizFunctions.isPatternsInstalled = isPatternsInstalled;
    window.SavizFunctions.runSkinTextureInstallAllPatterns = runSkinTextureInstallAllPatterns;
    window.SavizFunctions.isTextureReady = isTextureReady;
    window.SavizFunctions.getSkinTextureDefaultConfig = getSkinTextureDefaultConfig;
    window.SavizFunctions.runSkinTextureAddTexture = runSkinTextureAddTexture;
    window.SavizFunctions.runSkinTextureListLayers = runSkinTextureListLayers;
    window.SavizFunctions.runSkinTextureSelectLayer = runSkinTextureSelectLayer;
    window.SavizFunctions.runSkinTextureGetBevelEmboss = runSkinTextureGetBevelEmboss;
    window.SavizFunctions.runSkinTextureSetBevelEmboss = runSkinTextureSetBevelEmboss;
})();
