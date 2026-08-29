# Savior Jordani Studio: Plugin Photoshop (CEP)

Plugin de retoque pra Photoshop, com um fluxo de trabalho de retoque de
pele/beleza guiado por accordions (Texture, Frequency Separation, Dodge
& Burn, Quick Select, Color Correction, Details, Skin Texture) e modais
de suporte no menu hambúrguer (Settings, About e Ajuda/FAQ).
Arquitetura CEP (Common Extensibility Platform, a plataforma "clássica"
de extensões da Adobe, baseada em ExtendScript), não UXP.

A referência operacional resumida está em [docs/README.md](docs/README.md).
Os roteiros técnicos de cada ferramenta ficam em
[docs/scripts/README.md](docs/scripts/README.md).

## Licenciamento

Ao abrir, o painel exige e-mail, senha e key de ativação emitidos pelo painel
administrativo em `https://painelsaviorjordanistudio.devhextar.site`. O primeiro
login vincula a conta a um identificador aleatório do dispositivo persistido em
`ProgramData/SaviorJordaniStudio/Auth`. Depois disso só a sessão de sete dias
fica nesse diretório; senha e key não são guardadas pelo plugin. Sem uma
validação online válida, os controles do painel ficam bloqueados.

Essa pasta (`-dev`) é onde você **edita** o código. Ela nunca é carregada
direto pelo Photoshop: o build gera uma pasta irmã `-oficial` com tudo
concatenado (e minificado/ofuscado), que é a que de fato entra em
`%APPDATA%\Adobe\CEP\extensions\` no Windows.

## Por que duas "linguagens", dois mundos

Um plugin CEP roda em dois processos separados que só se falam por
mensagem de texto:

- **Painel (webview/Chromium)**: o HTML/CSS/JS normal que você vê na UI.
  Roda em JavaScript moderno, mas **não tem acesso direto ao Photoshop**.
- **Host (Photoshop)**: roda **ExtendScript** (`.jsx`), a linguagem de
  automação clássica do Photoshop (`app.activeDocument`,
  `ActionDescriptor`, etc). É quem de fato cria camada, aplica curva, muda
  ferramenta.

O painel manda comando pro host via `csInterface.evalScript('minhaFuncao()', callback)`.
O host executa e devolve uma string como resultado. Por isso toda função
"de verdade" tem sempre **dois arquivos**: um no painel (`functions/`) que
só empacota a chamada, e um no host (`functions-jsx/`) que faz o trabalho.

## Estrutura de arquivos

```
savior-jordani-studio-ps-plugin-1.0-dev/
├── CSXS/
│   └── manifest.xml          Manifesto da extensão CEP (id, nome, tamanho
│                              do painel, ScriptPath único: jsx/hostscript.jsx)
├── .debug                    Habilita DevTools remoto (porta 8092) pra
│                              inspecionar o painel via Chrome/CEF
├── index.html                Markup do painel inteiro: header, botão
│                              Helping Layers, os 7 accordions (Texture,
│                              Frequency Separation, Dodge & Burn, Quick
│                              Select, Color Correction, Details, Skin
│                              Texture), modais e footer
│
├── css/
│   ├── vars.css               Variáveis de cor (--saviz-dark, --saviz-green
│                               #00e24b, --saviz-gray, etc)
│   └── style.css               Todo o estilo: reset de aparência nativa dos
│                               inputs/botões, accordions, scrollbar fina,
│                               dial de ângulo do Skin Texture, etc
│
├── assets/                    Ícones SVG usados no HTML (chevron do
│                              accordion, ícone de camadas, etc)
├── icons/                     Ícone do plugin (painel/barra de extensões
│                              do Photoshop), @1x e @2x
├── design-source/             Imagem-fonte original do ícone (referência,
│                              não é usada em runtime)
│
├── js/
│   ├── CSInterface.js         Biblioteca oficial da Adobe (não editar).
│                              É a ponte pra evalScript, flyout menu, etc
│   └── main.js                Liga a UI aos botões: pega cada elemento por
│                              id, registra listeners de clique, chama
│                              window.SavizFunctions.*, controla accordions,
│                              modais, FAQ, inputs numéricos dos sliders,
│                              o dial de ângulo e o menu hambúrguer
│
├── jsx/
│   └── hostscript.jsx          Placeholder, é SOBRESCRITO no build.
│                              Nunca editar aqui, ver functions-jsx/
│
├── functions/                  ⭐ Lado do painel, UM ARQUIVO POR FUNÇÃO,
│   │                            organizado em UMA SUBPASTA POR ACCORDION
│   ├── helping-layers/
│   │   └── helpingLayers.js
│   ├── texture/
│   │   ├── textureSpotHealing.js
│   │   ├── textureMagicStamp.js
│   │   └── textureCloneStamp.js
│   ├── frequency-separation/
│   │   └── frequencySeparation.js
│   ├── dodge-and-burn/
│   │   ├── dodgeAndBurnGlobal.js
│   │   ├── dodgeAndBurnMacro.js
│   │   └── dodgeAndBurnGrey.js
│   └── quick-select/
│       ├── quickSelectSkin.js
│       ├── quickSelectHighlights.js
│       └── quickSelectShadows.js
│   Cada arquivo só empacota um csInterface.evalScript(...) numa Promise e
│   expõe em window.SavizFunctions.<nomeDaFuncao>. Não tem lógica de
│   Photoshop nenhuma aqui, é só o "controle remoto".
│
├── functions-jsx/               ⭐ Lado do host, UM ARQUIVO POR FUNÇÃO,
│   │                            mesma organização em subpastas por accordion
│   ├── helping-layers/
│   │   └── helpingLayers.jsx
│   ├── texture/
│   │   ├── textureSpotHealing.jsx
│   │   ├── textureMagicStamp.jsx
│   │   └── textureCloneStamp.jsx
│   ├── frequency-separation/
│   │   └── frequencySeparation.jsx
│   ├── dodge-and-burn/
│   │   ├── dodgeAndBurnGlobal.jsx
│   │   ├── dodgeAndBurnMacro.jsx
│   │   └── dodgeAndBurnGrey.jsx
│   └── quick-select/
│       ├── quickSelectSkin.jsx
│       ├── quickSelectHighlights.jsx
│       └── quickSelectShadows.jsx
│   Aqui mora a lógica de verdade: ExtendScript puro (Action Manager +
│   DOM do Photoshop) que cria grupo, camada de ajuste, preenche máscara,
│   aplica filtro, etc. Funções utilitárias (ex: shl_makeCurvesLayer em
│   helping-layers/helpingLayers.jsx, fs_newEmptyLayer em
│   frequency-separation/frequencySeparation.jsx) são reaproveitadas por
│   arquivos de outras subpastas sem problema. Tudo cai no mesmo escopo
│   global depois de concatenado (funções são hoisted em ExtendScript,
│   então a ordem dos arquivos não importa), então não precisa reexportar
│   nada.
│
├── scripts/
│   └── package-test.js         Script de build: concatena
│                              functions/**/*.js → js/functions.js e
│                              functions-jsx/**/*.jsx → js/hostscript.jsx
│                              (busca recursiva dentro das subpastas),
│                              minifica/ofusca tudo (ver "Como rodar o
│                              build" abaixo), copia o resto
│                              (icons/actions/index.html) pra uma pasta
│                              irmã "-oficial", e reescreve os ids do
│                              manifest.xml/.debug de ".dev"/"(CEP DEV)"
│                              pra ".test"/"(CEP TEST)". Assim dá pra ter
│                              as duas extensões instaladas ao mesmo tempo
│                              sem conflito
│
├── docs/scripts/                Pesquisa e documentação de cada função do
│                              painel, uma doc por seção do accordion,
│                              com nível de confiança 🟢/🟡/🔴 (ver
│                              docs/scripts/README.md e
│                              00-fontes-e-metodologia.md)
│
└── package.json                 Script "build:test" (node
                               scripts/package-test.js) e as
                               devDependencies do build (terser,
                               javascript-obfuscator, clean-css,
                               html-minifier-terser) — nenhuma delas vai
                               pro plugin em si, só são usadas aqui
```

## Como rodar o build

```bash
npm install    # só na primeira vez
npm run build:test
```

Isso gera/atualiza a pasta irmã `savior-jordani-studio-ps-plugin-1.0-oficial`
(mesmo nível de pasta, fora do `-dev`), já minificada/ofuscada e sem
comentários: `css/*.css` é minificado, `js/main.js` e `js/functions.js`
(gerado) são ofuscados de verdade (nomes de variável trocados, strings
em base64), `js/hostscript.jsx` (gerado, único ScriptPath do manifest,
concatenado a partir de functions-jsx/**/*.jsx) é só minificado — sem
ofuscação pesada, porque roda no motor ExtendScript do Photoshop (JS
antigo) e um obfuscador moderno pode gerar sintaxe incompatível — e os
ícones `.svg` ficam embutidos como data URI direto no `index.html` (a
pasta `assets/` não vai pra `-oficial`). A pasta `-dev` nunca é tocada
por esse processo. No fluxo deste projeto (agente rodando numa VPS,
Photoshop rodando no Windows do cliente), isso é feito por dois
scripts:

- `vps-build-cep.sh`: roda esse `npm run build:test` (lado da VPS)
- `windows-pull-cep.bat`: puxa a pasta `-oficial` via `scp` pra
  `%APPDATA%\Adobe\CEP\extensions\SaviorJordaniStudio-Photoshop-1.0` (lado do
  Windows), remove instalações antigas do Saviz Studio se existirem e mostra
  no final o marcador `ALTERACAO XXX` do build baixado.

## Fluxo de uma função nova, passo a passo

1. Crie `functions-jsx/<accordion>/minhaFuncao.jsx` com a lógica em
   ExtendScript (função `runMinhaFuncao()` ou parecido), dentro da
   subpasta do accordion correspondente (`helping-layers/`, `texture/`,
   `frequency-separation/`, `dodge-and-burn/`, `quick-select/`, ou uma
   nova subpasta se for um accordion ainda sem nenhuma função).
2. Crie `functions/<mesmo-accordion>/minhaFuncao.js` que só chama
   `csInterface.evalScript('runMinhaFuncao()', callback)` numa Promise e
   expõe em `window.SavizFunctions.runMinhaFuncao`.
3. Adicione o botão/elemento em `index.html` com um `id`.
4. Ligue o clique em `js/main.js` chamando
   `window.SavizFunctions.runMinhaFuncao()`.
5. Rode `npm run build:test` e reinstale/recarregue no Photoshop.

**Importante:** mudanças em `functions-jsx/**/*.jsx` só valem depois de
**reiniciar o Photoshop inteiro** (o ExtendScript só é carregado uma vez
por sessão). Mudanças em `functions/**/*.js`, `js/main.js`, `index.html`
e `css/*` valem só recarregando o painel (menu hambúrguer → "Recarregar").
