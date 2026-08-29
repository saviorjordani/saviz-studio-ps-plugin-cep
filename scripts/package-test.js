// Monta uma pasta irmã "-TEST" com os arquivos que o Photoshop carrega
// via CEP (manifest.xml, .debug, index.html, css/js/jsx/assets/icons).
// Copia e reescreve os ids do manifest/.debug de ".dev"/"(CEP DEV)" pra
// ".test"/"(CEP TEST)", pra poder ter as duas extensões instaladas ao
// mesmo tempo sem conflito, e minifica/obfusca o que vai pra -TEST (ver
// minifyCss/obfuscateJs/minifyJsxSafe abaixo) — a pasta -DEV nunca é
// tocada, só a -TEST é distribuída pro cliente.
const fs = require('fs');
const path = require('path');
const { minify: minifyJs } = require('terser');
const JavaScriptObfuscator = require('javascript-obfuscator');
const CleanCSS = require('clean-css');
const { minify: minifyHtmlTerser } = require('html-minifier-terser');

const projectDir = path.resolve(__dirname, '..');
const projectName = path.basename(projectDir);
const testName = projectName.endsWith('-dev')
    ? projectName.slice(0, -'-dev'.length) + '-oficial'
    : projectName + '-oficial';
const testDir = path.join(path.dirname(projectDir), testName);

// ── Helpers de minificação/ofuscação ────────────────────────────────

// manifest.xml e .debug são config declarativa que o próprio Photoshop
// lê pra carregar a extensão (id, tamanho do painel, ScriptPath,
// ícones) — não dá pra "ofuscar" isso de verdade, qualquer valor
// reescrito quebraria o carregamento, e o arquivo final sempre fica em
// texto puro em %APPDATA%\Adobe\CEP\extensions\ no PC do cliente de
// qualquer forma. Só minifica: tira comentário e espaço/indentação
// entre tags (preserva texto dentro de elementos, só colapsa o que é
// puramente espaço em branco entre um ">" e o "<" seguinte).
function minifyXml(content) {
    return content
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/\r?\n\s*/g, ' ')  // junta quebra de linha (inclusive DENTRO de uma tag com atributo espalhado em várias linhas) num espaço só
        .replace(/>\s+</g, '><')    // tira esse espaço quando é puramente entre duas tags
        .replace(/\s{2,}/g, ' ')    // sobra de espaço duplicado vira um só
        .trim();
}

function minifyHtml(content) {
    return minifyHtmlTerser(content, {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: false,
        removeEmptyAttributes: false,
        minifyCSS: false, // o <link> pro css já é minificado à parte
        minifyJS: false,  // idem pros <script src>, nada inline aqui
        caseSensitive: true,
        keepClosingSlash: true
    });
}

// Troca src="./assets/nome.svg" por um data URI base64 com o conteúdo
// real do SVG — o ícone fica embutido dentro do próprio index.html em
// vez de um arquivo solto em assets/ (os .svg soltos são removidos da
// pasta -TEST depois, ver main()). Lê sempre da pasta -DEV (fonte da
// verdade), não depende de já ter copiado assets/ pra -TEST antes.
function inlineSvgIcons(html) {
    return html.replace(/src="\.\/assets\/([^"]+\.svg)"/g, function (match, filename) {
        const svgPath = path.join(projectDir, 'assets', filename);
        if (!fs.existsSync(svgPath)) return match;
        const base64 = fs.readFileSync(svgPath).toString('base64');
        return 'src="data:image/svg+xml;base64,' + base64 + '"';
    });
}

function minifyCss(content) {
    return new CleanCSS({}).minify(content).styles;
}

// js/functions.js e js/main.js rodam num Chromium moderno (webview do
// CEP) — sem risco de sintaxe incompatível, então recebem ofuscação de
// verdade (nomes de identificador trocados, strings codificadas em
// base64, sem comentários). "csInterface" é reservado (nunca renomeado)
// porque é uma var global declarada em main.js e lida como global bruta
// por várias functions/*.js — como os dois arquivos são ofuscados em
// passadas SEPARADAS, se o nome mudasse em um mas não no outro a ponte
// entre painel e Photoshop quebraria silenciosamente. selfDefending e
// debugProtection ficam desligados de propósito: essa pasta -TEST ainda
// é inspecionada via Chrome DevTools (porta 8092, ver .debug) quando dá
// problema, e esses dois recursos existem justamente pra travar o
// código quando um debugger é anexado.
function obfuscateJs(code) {
    return JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        renameGlobals: false,
        reservedNames: ['^csInterface$'],
        selfDefending: false,
        simplify: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        rotateStringArray: true,
        target: 'browser'
    }).getObfuscatedCode();
}

// jsx/hostscript.jsx roda no motor ExtendScript do Photoshop (JS antigo,
// ES3) — um obfuscador "de verdade" (control flow flattening, etc) pode
// gerar sintaxe que o ExtendScript não entende e quebrar o plugin
// inteiro, só descobrindo ao reiniciar o Photoshop e testar cada
// função. Por segurança, o .jsx só passa pelo terser com compress e
// mangle DESLIGADOS — isso só reimprime a mesma AST sem comentários e
// sem quebra de linha, sem reescrever nada da lógica.
async function minifyJsxSafe(code) {
    // beautify:true de propósito (ao contrário do JS do painel) —
    // colapsar tudo numa linha só fazia qualquer erro real do
    // ExtendScript em runtime ser reportado como "linha 1" pro
    // Photoshop, o que é inútil pra diagnosticar. Ainda tira comentário
    // (pedido original), só preserva quebra de linha real.
    const result = await minifyJs(code, {
        compress: false,
        mangle: false,
        format: { comments: false, beautify: true }
    });
    if (result.error) throw result.error;
    return result.code;
}

// ── Build ────────────────────────────────────────────────────────────

async function main() {
    fs.rmSync(testDir, { recursive: true, force: true });
    fs.mkdirSync(testDir, { recursive: true });

    function rewriteIds(content) {
        return content
            .replace(/\.dev\.panel/g, '.oficial.panel')
            .replace(/ExtensionBundleId="([^"]+)\.dev"/, 'ExtensionBundleId="$1.oficial"')
            .replace(/\(CEP DEV\)/g, '(CEP OFICIAL)')
            // Na -oficial o hostscript.jsx vai junto de js/ (não tem
            // mais pasta jsx/ separada), então o ScriptPath do manifest
            // tem que apontar pro caminho novo.
            .replace(/\.\/jsx\/hostscript\.jsx/g, './js/hostscript.jsx');
    }

    fs.mkdirSync(path.join(testDir, 'CSXS'), { recursive: true });
    fs.writeFileSync(
        path.join(testDir, 'CSXS', 'manifest.xml'),
        minifyXml(rewriteIds(fs.readFileSync(path.join(projectDir, 'CSXS', 'manifest.xml'), 'utf8')))
    );
    fs.writeFileSync(
        path.join(testDir, '.debug'),
        minifyXml(rewriteIds(fs.readFileSync(path.join(projectDir, '.debug'), 'utf8')))
    );

    const minifiedHtml = await minifyHtml(fs.readFileSync(path.join(projectDir, 'index.html'), 'utf8'));
    const htmlWithIcons = inlineSvgIcons(minifiedHtml);
    fs.writeFileSync(path.join(testDir, 'index.html'), htmlWithIcons);

    // Binários estáticos: copia como estão, nada pra minificar aqui.
    // "assets" fica de fora de propósito — hoje só tem os .svg dos
    // ícones, que já foram embutidos no index.html acima (data URI
    // base64) por inlineSvgIcons. "patterns" também fica de fora: todo
    // pattern real hoje vem do R2 (SAVIZTEXTURES.pat, baixado sob
    // demanda e cacheado em %APPDATA%\SavizStudio\Patterns\), a pasta
    // local só tinha um .pat pequeno que já foi migrado pro R2 também.
    // "actions" também fica de fora: a criação de camada de textura é
    // 100% via Action Manager (ver functions-jsx/skin-texture), nenhum
    // .atn é mais lido em runtime.
    for (const dir of ['icons']) {
        const src = path.join(projectDir, dir);
        if (fs.existsSync(src)) fs.cpSync(src, path.join(testDir, dir), { recursive: true });
    }
    console.log('Ícones .svg embutidos no index.html — pasta assets/ não copiada pra -TEST');

    // CSS: minifica cada arquivo (remove comentário/espaço), sem ofuscar
    // (não existe "ofuscação" pra CSS, é só regra de estilo).
    const cssSrcDir = path.join(projectDir, 'css');
    if (fs.existsSync(cssSrcDir)) {
        fs.mkdirSync(path.join(testDir, 'css'), { recursive: true });
        for (const file of fs.readdirSync(cssSrcDir)) {
            if (!file.endsWith('.css')) continue;
            const content = fs.readFileSync(path.join(cssSrcDir, file), 'utf8');
            fs.writeFileSync(path.join(testDir, 'css', file), minifyCss(content));
        }
        console.log('CSS minificado');
    }

    // js/: CSInterface.js é biblioteca oficial da Adobe — copiada sem
    // tocar (nunca editar/ofuscar código de terceiro). main.js é
    // ofuscado. js/functions.js não existe na pasta -DEV (é gerado
    // abaixo, concatenando functions/**/*.js).
    const jsSrcDir = path.join(projectDir, 'js');
    if (fs.existsSync(jsSrcDir)) {
        fs.mkdirSync(path.join(testDir, 'js'), { recursive: true });
        for (const file of fs.readdirSync(jsSrcDir)) {
            const srcPath = path.join(jsSrcDir, file);
            if (fs.statSync(srcPath).isDirectory()) continue;
            if (file === 'CSInterface.js') {
                fs.copyFileSync(srcPath, path.join(testDir, 'js', file));
            } else if (file.endsWith('.js')) {
                const content = fs.readFileSync(srcPath, 'utf8');
                fs.writeFileSync(path.join(testDir, 'js', file), obfuscateJs(content));
            }
        }
        console.log('js/main.js ofuscado (CSInterface.js mantido intacto)');
    }

    // Acha todo arquivo com a extensão dada dentro de uma pasta, incluindo
    // subpastas (functions/ e functions-jsx/ são organizadas em uma
    // subpasta por accordion do painel — ex: functions/dodge-and-burn/,
    // functions-jsx/texture/ — só pra ficar mais fácil de achar cada
    // função, não afeta o build: tudo continua virando um arquivo só
    // concatenado).
    function findFilesRecursive(dir, extension) {
        const results = [];
        for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                results.push(...findFilesRecursive(fullPath, extension));
            } else if (entry.name.endsWith(extension)) {
                results.push(fullPath);
            }
        }
        return results;
    }

    // Cada função do plugin mora no seu próprio arquivo em functions/ (pra
    // dar pra mexer/testar uma de cada vez sem tocar nas outras). No
    // build, tudo isso vira um único js/functions.js concatenado e
    // ofuscado — carregado antes do main.js, que só chama
    // window.SavizFunctions.*.
    const functionsDir = path.join(projectDir, 'functions');
    if (fs.existsSync(functionsDir)) {
        const files = findFilesRecursive(functionsDir, '.js');
        const bundled = files.map(f => fs.readFileSync(f, 'utf8')).join('\n');

        fs.mkdirSync(path.join(testDir, 'js'), { recursive: true });
        fs.writeFileSync(path.join(testDir, 'js', 'functions.js'), obfuscateJs(bundled));
        console.log(`Concatenado e ofuscado ${files.length} arquivo(s) de functions/ em js/functions.js`);
    }

    // Mesma ideia do lado do host: cada função tem seu .jsx (ExtendScript)
    // em functions-jsx/, concatenados em hostscript.jsx. Na -TEST esse
    // arquivo vai junto de js/ (não tem pasta jsx/ separada) — o
    // ScriptPath do manifest já é reescrito pra "./js/hostscript.jsx"
    // em rewriteIds. Só minificado (comentário/espaço fora), não
    // ofuscado de verdade — ver minifyJsxSafe.
    const functionsJsxDir = path.join(projectDir, 'functions-jsx');
    if (fs.existsSync(functionsJsxDir)) {
        const jsxFiles = findFilesRecursive(functionsJsxDir, '.jsx');
        const bundledJsx = jsxFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

        fs.mkdirSync(path.join(testDir, 'js'), { recursive: true });
        fs.writeFileSync(path.join(testDir, 'js', 'hostscript.jsx'), await minifyJsxSafe(bundledJsx));
        console.log(`Concatenado e minificado ${jsxFiles.length} arquivo(s) de functions-jsx/ em js/hostscript.jsx`);
    }

    // Marcador de versão oficial em JSON (version.json)
    const counterFile = path.join(projectDir, '.build-counter');
    let buildNumber = 100;
    if (fs.existsSync(counterFile)) {
        buildNumber = parseInt(fs.readFileSync(counterFile, 'utf8'), 10) || 100;
    }
    fs.writeFileSync(counterFile, String(buildNumber));

    const versionObj = {
        build: buildNumber,
        version: "1.0.0",
        date: new Date().toISOString().slice(0, 10)
    };
    fs.writeFileSync(path.join(projectDir, 'version.json'), JSON.stringify(versionObj, null, 2));
    fs.writeFileSync(path.join(testDir, 'version.json'), JSON.stringify(versionObj, null, 2));
    console.log(`Marcador de versão oficial: version.json (build ${buildNumber})`);

    console.log(`Pasta de teste gerada em: ${testDir}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
