/**
 * Licenciamento online do painel CEP.
 *
 * O login exige e-mail, senha e key de ativação. Depois disso, o painel
 * guarda localmente apenas a sessão de curta duração e um identificador
 * aleatório do dispositivo em ProgramData/SaviorJordaniStudio/Auth.
 */
window.SavizFunctions = window.SavizFunctions || {};

(function () {
    var AUTH_HOST = 'api.saviz.com.br';
    var AUTH_ORIGIN = 'https://' + AUTH_HOST;
    var REQUEST_TIMEOUT_MS = 15000;
    var MAX_RESPONSE_BYTES = 64 * 1024;
    var nodeAvailable = typeof require === 'function';
    var https, fs, path, crypto, BufferClass;

    if (nodeAvailable) {
        try {
            https = require('https');
            fs = require('fs');
            path = require('path');
            crypto = require('crypto');
            BufferClass = require('buffer').Buffer;
        } catch (error) {
            nodeAvailable = false;
        }
    }

    function nodeError() {
        return new Error('Node.js não está habilitado neste painel. Reinstale a versão atual do plugin e reinicie o Photoshop.');
    }

    function authDir() {
        if (!nodeAvailable) throw nodeError();
        var base = process.env.ProgramData || process.env.APPDATA || (process.env.HOME + '/.config');
        var dir = path.join(base, 'SaviorJordaniStudio', 'Auth');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        return dir;
    }

    function readJson(fileName) {
        try {
            var filePath = path.join(authDir(), fileName);
            if (!fs.existsSync(filePath)) return null;
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        } catch (error) {
            return null;
        }
    }

    function writeJson(fileName, value) {
        var filePath = path.join(authDir(), fileName);
        fs.writeFileSync(filePath, JSON.stringify(value), { encoding: 'utf8', mode: 384 });
    }

    function removeFile(fileName) {
        try {
            var filePath = path.join(authDir(), fileName);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (error) { /* não bloqueia o fluxo por falha ao limpar cache */ }
    }

    function deviceId() {
        var saved = readJson('device.json');
        if (saved && typeof saved.id === 'string' && /^[A-Za-z0-9._:-]{8,128}$/.test(saved.id)) return saved.id;
        var generated = 'sjs-' + crypto.randomBytes(20).toString('hex');
        writeJson('device.json', { id: generated });
        return generated;
    }

    function session() {
        var saved = readJson('session.json');
        if (!saved || typeof saved.accessToken !== 'string' || !saved.accessToken || typeof saved.expiresAt !== 'string') return null;
        return saved;
    }

    function saveSession(result) {
        if (!result || typeof result.accessToken !== 'string' || typeof result.expiresAt !== 'string') throw new Error('Resposta de licença inválida.');
        writeJson('session.json', { accessToken: result.accessToken, expiresAt: result.expiresAt });
    }

    function request(method, requestPath, data, token) {
        if (!nodeAvailable) return Promise.reject(nodeError());
        var body = data ? JSON.stringify(data) : '';
        return new Promise(function (resolve, reject) {
            var settled = false;
            function finish(callback, value) {
                if (settled) return;
                settled = true;
                callback(value);
            }
            var headers = { 'Accept': 'application/json' };
            if (body) {
                headers['Content-Type'] = 'application/json';
                headers['Content-Length'] = BufferClass.byteLength(body);
            }
            if (token) headers.Authorization = 'Bearer ' + token;
            var req = https.request({ hostname: AUTH_HOST, port: 443, path: requestPath, method: method, headers: headers }, function (response) {
                var chunks = [];
                var size = 0;
                response.on('data', function (chunk) {
                    size += chunk.length;
                    if (size > MAX_RESPONSE_BYTES) {
                        req.destroy();
                        finish(reject, new Error('Resposta do serviço de licença é grande demais.'));
                        return;
                    }
                    chunks.push(chunk);
                });
                response.on('end', function () {
                    if (settled) return;
                    var payload;
                    try {
                        payload = JSON.parse(BufferClass.concat(chunks).toString('utf8'));
                    } catch (error) {
                        finish(reject, new Error('Resposta inválida do serviço de licença.'));
                        return;
                    }
                    if (response.statusCode < 200 || response.statusCode >= 300) {
                        var message = payload && typeof payload.error === 'string' ? payload.error : 'Não foi possível validar a licença.';
                        var apiError = new Error(message);
                        apiError.statusCode = response.statusCode;
                        finish(reject, apiError);
                        return;
                    }
                    finish(resolve, payload);
                });
            });
            req.setTimeout(REQUEST_TIMEOUT_MS, function () {
                req.destroy();
                finish(reject, new Error('Tempo esgotado ao conectar ao serviço de licença.'));
            });
            req.on('error', function (error) {
                finish(reject, new Error('Não foi possível conectar ao serviço de licença. Verifique a internet e tente novamente.'));
            });
            if (body) req.write(body);
            req.end();
        });
    }

    function loginPluginUser(email, password, activationKey) {
        var accountEmail = String(email || '').trim().toLowerCase();
        var accountPassword = String(password || '');
        var normalizedKey = String(activationKey || '').trim().toUpperCase();
        if (!accountEmail || !accountPassword || !normalizedKey) return Promise.reject(new Error('Informe e-mail, senha e key de ativação.'));
        return request('POST', '/v1/plugin/login', { email: accountEmail, password: accountPassword, activationKey: normalizedKey, deviceId: deviceId() }).then(function (result) {
            saveSession(result);
            return { valid: true, user: result.user || null };
        });
    }

    function validatePluginLicense() {
        var saved = session();
        if (!saved) return Promise.resolve({ valid: false, reason: 'Entre com e-mail, senha e key de ativação.' });
        if (Date.parse(saved.expiresAt) <= Date.now()) {
            removeFile('session.json');
            return Promise.resolve({ valid: false, reason: 'Sua sessão expirou. Faça login novamente para continuar.' });
        }
        return request('POST', '/v1/plugin/validate', null, saved.accessToken).then(function (result) {
            return { valid: result && result.valid === true, user: result.user || null };
        }).catch(function (error) {
            if (error && error.statusCode === 401) removeFile('session.json');
            throw error;
        });
    }

    function clearPluginSession() {
        removeFile('session.json');
    }

    window.SavizFunctions.loginPluginUser = loginPluginUser;
    window.SavizFunctions.validatePluginLicense = validatePluginLicense;
    window.SavizFunctions.clearPluginSession = clearPluginSession;
    window.SavizFunctions.pluginAuthOrigin = AUTH_ORIGIN;
})();
