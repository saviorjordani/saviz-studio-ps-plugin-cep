# Color Correction

Botões: **Skin tone**, **Eyes**, **Glow**, **Teeth**, **Blush**, **Lips**.

## 🟢 Skin tone — implementado (confirmado com um .psd real do cliente via psd-tools)

A 1ª versão foi baseada em 5 prints + arquivos de preset avulsos
(`.asv`/`.blw`/`.ahu`) e tinha vários detalhes errados (estrutura de
grupo, blend mode, opacidade, cores dos gradientes). Corrigido depois
que o cliente mandou um **.psd real exportado do Photoshop** com as
camadas de verdade — lido programaticamente com a biblioteca Python
`psd-tools`, que consegue extrair valores exatos de Curves, Hue/Sat,
Selective Color, Gradient Map, Black & White, máscaras etc. direto do
arquivo (bem mais confiável que estimar por print).

Estrutura confirmada:

```
[Group] "Skin Tone" (PASS_THROUGH)
  ├─ [Group] "Manual Color Correction"
  │    └─ Manual Color Patch Correction  (Hue/Saturation, neutro)
  ├─ [Group] "Paint to Unify Skin Tone here" (máscara de GRUPO preta)
  │    ├─ Adjust Brightness Reds/Yellows   (Black & White, blend
  │    │    LUMINOSITY, oculta, máscara = seleção de pele)
  │    └─ Adjust SkinTone                  (Selective Color, Normal,
  │         máscara = seleção de pele)
  └─ [Group] "Pick Skin Tone"
       ├─ Tone 1  (Gradient Map, oculta, blend Color, opacidade 30%,
       │            método Percepção, máscara = seleção de pele)
       ├─ Tone 2  (idem)
       ├─ Tone 3  (idem, VISÍVEL — tom escolhido nesse documento)
       └─ Tone 4  (idem)
```

Valores exatos extraídos do `.psd`:

| Camada | Valor |
|---|---|
| Tone 1 | `#DEBD9E @87%` → `#FFFFEF @100%` |
| Tone 2 | `#CF9F7F @81%` → `#FFEFDF @100%` |
| Tone 3 | `#7F492D @50%` → `#FFEFDF @100%` |
| Tone 4 | `#7F5F4F @50%` → `#FFFFEF @100%` |
| Adjust Brightness Reds/Yellows | Red=40 Yellow=60 Green=40 Cyan=60 Blue=20 Magenta=80, blend Luminosity, máscara = seleção de pele |
| Adjust SkinTone | Selective Color, todos os canais zero |
| Manual Color Patch Correction | Hue/Sat, master (0,0,0) — totalmente neutro |

Correções feitas em relação à 1ª versão: "Manual Color Correction" fica
**dentro** de "Skin Tone" (não é grupo separado), os 4 Tones usam blend
**Color** + opacidade **30%** (não Normal/100%), "Adjust Brightness
Reds/Yellows" usa blend **Luminosity** (não Normal) e tem **máscara
própria** (a mesma seleção de pele das outras 5) além de estar dentro do
grupo mascarado, e "Manual Color
Patch Correction" é **totalmente neutro** (o "+25" que eu tinha lido
antes no `.ahu` bruto era o campo de Colorize, que está desligado nesse
documento — não o Master Lightness).

### 🐛 Bug encontrado e corrigido: máscara do grupo "Paint to Unify Skin Tone here"

2 tentativas erraram a estrutura do descriptor (chave de referência
errada — `ref.putClass("Chnl")` em vez de `ref.putEnumerated("Chnl",
"Chnl", "Msk ")` — e ordem/chaves erradas no resto). Resolvido com base
numa biblioteca open source testada (Lifter,
[github.com/fcamarlinghi/Lifter](https://github.com/fcamarlinghi/Lifter),
função `layers.masks.addLayerMask`): referência enumerada certa +
`"Nw  "→"Chnl"`, `"At  "→ref`, `"Usng"→"UsrM"→"HdAl"` (Hide All, preta).
**Confirmado funcionando pelo cliente** — máscara preta simples, sem
seleção nenhuma (diferente das 6 camadas individuais, que usam a seleção
de pele).

### 🐛 Bug encontrado e corrigido: ordem do grupo "Manual Color Correction"

Devia nascer no topo (acima de "Paint to Unify Skin Tone here", igual ao
`.psd` real), mas `skinToneGroup.layerSets.add()` criava ele embaixo na
prática. Corrigido reordenando explicitamente com
`manualGroup.move(paintGroup, ElementPlacement.PLACEBEFORE)` — mover
entre IRMÃOS já existentes no mesmo grupo pai funciona (diferente de
aninhar grupo dentro de grupo pela primeira vez, que dá "Argumento
ilegal").

### 🐛 Bug encontrado e corrigido: seleção de pele só pegava na 1ª camada

O Photoshop consome/limpa a seleção ativa depois de usá-la como máscara
ao criar a 1ª camada de ajuste — só "Tone 1" nascia com a máscara certa,
as outras 5 vinham com máscara branca lisa. Corrigido repetindo a
seleção de pele antes de CADA uma das 6 camadas (não só uma vez no
início). Também usei uma referência fixa da camada original
(`originalLayer`, guardada antes de criar qualquer grupo) em vez de
`doc.layers[0]` — que deixa de ser a foto assim que o grupo "Skin Tone"
nasce (grupo novo sempre vai pro topo da pilha).

### 🐛 Bug encontrado e corrigido: máscaras individuais das 6 camadas

Print real mostrou que as máscaras de "Adjust SkinTone", "Adjust
Brightness Reds/Yellows" e os 4 "Tone" **não são brancas lisas** — são
um recorte real de pele (rosto + pescoço, sem olho/cabelo/boca), igual
ao resultado do botão Quick Select "Skin". Corrigido rodando a mesma
seleção (`Color Range > Skin Tones + Detect Faces`, via
`cc_selectSkinTone()`) **antes** de criar essas 6 camadas — o Photoshop
converte a seleção ativa em máscara automaticamente ao criar uma
adjustment layer. A seleção é desfeita antes de criar "Manual Color
Patch Correction", que usa máscara branca padrão (confirmado no .psd).

### 🐛 Bug encontrado e corrigido: opacidade dos Gradient Map

`tone1.opacity = 77` (setado via DOM logo depois de criar a camada) deu
"comando Definir não disponível" — só nesse tipo específico de camada
recém-criada (Curves/B&W/duplicar camada sempre aceitaram `.opacity =`
sem problema). Resolvido colocando `opacity`/`blendMode` **dentro do
próprio descriptor de criação** (`Opct`/`Md `) em vez de setar depois via
DOM — `cc_makeGradientMapLayer` agora recebe `opacity` e
`blendModeCharID` como parâmetros. Correção fina: `Opct`/`Md ` precisam
ficar DENTRO do objeto "using" (`layerDesc`), não no descriptor externo —
colocado fora, a opacidade até pegava mas o blend mode era ignorado.

### 🐛 Bug encontrado e corrigido: método do gradiente (Clássico → Percepção)

Os 4 Tone precisam do método "Percepção" (confirmado no .psd real,
`GradientMap.interpolation = 1.0`), não "Clássico" (default). A chave
certa é `gradientsInterpolationMethod` (com "s" — não
`interpolationMethod`, que não faz nada), e ela fica um nível ACIMA do
que eu imaginei: junto de `dither`/`reverse` no objeto do Gradient Map,
não dentro do objeto do gradiente em si (paralelo a `colors`/
`gradientForm`). Confirmado com um script real publicado num fórum da
Adobe.

**✅ Confirmado funcionando pelo cliente — máscaras de pele (todas as 6
camadas), opacidade 30%, blend mode Color/Luminosity e método Percepção
dos gradientes, tudo certo.**

Pendência que continua em aberto: a máscara do GRUPO "Paint to Unify
Skin Tone here" (não as 6 individuais, que já funcionam) — ver abaixo.

Implementado em `functions-jsx/color-correction/colorCorrectionSkinTone.jsx`.

## 🟢 Eyes — implementado e confirmado funcionando

Confirmado via `IMPLEMENTAR/ColorCorrection/Eyes-button.psd` (mesmo
processo do Skin Tone, lido com `psd-tools`). Estrutura:

```
[Group] "Eye Color" (máscara de GRUPO preta)
  ├─ Curvas 1            (Curves, opacidade 50%, pontos [7,0] [96,160]
  │                        [230,255] — clareia tons médios, curva pra
  │                        cima)
  └─ Matiz/Saturação 2   (Hue/Sat, Colorize ligado: matiz=192°,
                           saturação=25, luz=0 — tinge a íris)

[Group] "Eye White" (máscara de GRUPO preta)
  ├─ Removing Blood Vessels (camada de PIXEL — duplicata cheia da foto,
  │                           não vazia, pra retocar com Carimbo/
  │                           Recuperação direto nela)
  ├─ Matiz/Saturação 1   (Hue/Sat multi-canal: Reds sat=-64 luz=+47,
  │                        Yellows sat=-10 luz=+8 — mata vermelho/
  │                        amarelado dos vasinhos)
  ├─ Níveis 1             (Levels, canal composto, gama=1.16)
  └─ Cor Seletiva 1       (Selective Color, canal Neutros, Preto=-45
                           relativo)
```

Diferente do Skin Tone: aqui as duas máscaras de grupo são **pretas
simples** (sem seleção automática) — é tudo manual, você pinta de branco
só onde quer aplicar (íris ou parte branca do olho).

### 🐛 Bugs encontrados e corrigidos

- **Curva invertida**: os pontos do `.psd` vêm como `(output, input)`,
  não `(input, output)` — mesma pegadinha já vista no Helping Layers
  (`.acv`). Corrigido invertendo os pares.
- **Matiz negativo zerado**: o `.psd` bruto trazia matiz `-168`, mas o
  Photoshop não aceita negativo nesse campo (zerava). `-168 + 360 = 192`,
  mesmo ângulo, positivo — usado assim.
- **Hue/Sat multi-canal vazando pro Master**: 2 tentativas com chaves
  modernas (stringIDs tipo `"channel"`/`"hueSatAdjustmentV2"`/
  `"adjustment"`, baseadas num script de fórum) faziam o valor do último
  canal (Yellows) vazar pro canal Master. Resolvido com a estrutura REAL
  confirmada num log do ScriptListener: charIDs clássicos (`"H   "`,
  `"Strt"`, `"Lght"`, `"Hst2"`, `"Adjs"`, `"LclR"`) e cada entrada da
  lista precisa também dos limites de faixa (`BgnR`/`BgnS`/`EndS`/
  `EndR`) e do índice do canal (`LclR`: 1=Reds, 2=Yellows, 3=Greens,
  4=Cyans, 5=Blues, 6=Magentas) — sem isso o Photoshop não sabe a qual
  canal aquela entrada pertence, e todas as entradas da lista precisam
  ir juntas na MESMA chamada `setd` (confirmado no log: ao editar
  Yellows depois de Reds, o log reenvia os dois juntos).

**✅ Confirmado funcionando pelo cliente.**

A faixa customizada do canal Reds do "Matiz/Saturação 1" no `.psd`
original era ligeiramente diferente da faixa padrão do Photoshop —
implementado com a faixa padrão mesmo assim (diferença visual pequena).

Implementado em `functions-jsx/color-correction/colorCorrectionEyes.jsx`.

## 🟢 Glow / Teeth / Blush / Lips — implementados e confirmados ao vivo

Confirmado via `IMPLEMENTAR/ColorCorrection/funções-colorcorrection-lips-blush-teeth-glow.psd`
(mesmo processo, `psd-tools`). Estruturas:

```
[Group] "Glow" (máscara de GRUPO preta)
  ├─ Curvas 2            (Curves, opacidade 100%, máscara PRÓPRIA preta,
  │                        pontos [16,0] [88,152] [234,255])
  └─ [Group] "Highlights" (máscara de GRUPO preta)
       ├─ Curvas 1        (Curves, pontos [0,0] [119,131] [226,255],
       │                    máscara = SELEÇÃO DE REALCE, Color Range
       │                    "Highlights" — igual ao Quick Select)
       └─ Matiz/Saturação 1 (Hue/Sat, EM BRANCO/neutro)

[Group] "Draw for white teeth" (botão "Teeth", máscara de GRUPO preta)
  ├─ Misturador de Canais 1 (Channel Mixer, MONOCROMÁTICO, Red=-126%
  │                           Green=146% Blue=66% Constante=0%,
  │                           opacidade 59%, blend Screen)
  └─ Matiz/Saturação 2      (Hue/Sat, canal Yellows: sat=-62 luz=+95,
                              opacidade 87%, Normal)

Blush   (Preenchimento de Cor Sólida #FF0770, opacidade 13%, blend
         Color, máscara PRÓPRIA preta — camada solta, sem grupo)

[Group] "Lips" (máscara de GRUPO preta)
  ├─ Darker Lips     (Preenchimento de Cor Sólida #F42A42, opacidade
  │                    80%, blend Multiply, VISÍVEL)
  └─ Colorful Lips   (mesma cor #F42A42, opacidade 46%, blend Color,
                       OCULTA por padrão)
```

Cuidados tomados na leitura (aprendidos nas rodadas anteriores):
- Pontos de Curves invertidos corretamente `(output, input)` → `(input,
  output)` antes de usar.
- Opacidade/blend mode sempre embutidos no descriptor de CRIAÇÃO (nunca
  `.opacity =`/`.blendMode =` via DOM depois — aprendido com o bug do
  Gradient Map do Skin Tone).
- Hue/Sat de canal único (Teeth) já usa a estrutura correta confirmada
  por log real (`cc_setHueSatChannels`), sem repetir o bug de vazar pro
  Master.

🟢 Partes que eram novas nesse projeto, já testadas ao vivo e confirmadas
funcionando:
- Channel Mixer (`cc_makeBlankChannelMixerLayer`/
  `cc_setChannelMixerMonochrome`) — baseado num script real de fórum,
  usado pela primeira vez aqui (Teeth).
- Preenchimento de Cor Sólida (`cc_makeSolidColorFillLayer`) — usado
  pela primeira vez aqui (Blush e Lips).
- Seleção de Realces reaproveitada do Quick Select pra virar máscara
  (`cc_selectHighlights`) — a técnica em si já era confirmada, mas
  nunca tinha sido usada pra virar máscara de uma camada de ajuste (só
  pra seleção pura, como no Quick Select).

Implementados em `functions-jsx/color-correction/colorCorrectionGlow.jsx`,
`colorCorrectionTeeth.jsx`, `colorCorrectionBlush.jsx`,
`colorCorrectionLips.jsx`.

## 🔴 Williams Academy especificamente

Não achei artigo/produto da Williams Academy detalhando esses 6 botões
individualmente. O que segue é **técnica padrão de mercado** por botão,
pesquisada separadamente.

## 🟡 Skin Tone

**Selective Color** (ajustar canais individuais sem afetar o resto) ou
**Color Balance** são as duas ferramentas mais citadas pra corrigir tom de
pele de forma natural — reduzir vermelhos/aumentar amarelos (ou o
contrário) dependendo se a pele está avermelhada ou amarelada demais.

Fonte: [How to Correct Skin Tone in Photoshop – Evoto](https://blog.evoto.ai/how-to-correct-skin-tone-in-photoshop/) 🟡

## 🟡 Eyes / Glow

Ambos aparecem ligados a **Dodge Tool** (clarear com toque suave) e/ou
**Frequency Separation** aplicada localmente pra suavizar tom sem perder
brilho natural da pele ("glow"). Pra olhos especificamente, ver também
`07-details.md` (Iris/Catchlight se sobrepõe com isso).

Fonte: [Expert Portrait Retouching Guide – Pixelphant](https://pixelphant.com/blog/expert-portrait-retouching-guide) 🟡

## 🟡 Teeth

Técnica mais citada, em ordem de simplicidade:
1. Reduzir vibrance/saturação nos dentes (dessatura o amarelo).
2. Hue/Saturation focado na faixa de amarelos, reduzindo saturação e
   aumentando brilho levemente.
3. Alguns tutoriais usam Curves pra clarear depois de dessaturar.

Fontes:
- [How to Retouch Teeth Quickly in Photoshop – MakeUseOf](https://www.makeuseof.com/tag/retouch-teeth-quickly-photoshop-brighter-smile/) 🟡
- [How to Whiten Teeth in Photoshop – SLR Lounge](https://www.slrlounge.com/2-second-technique-whiten-teeth-photoshop-plus-free-action/) 🟡

## 🟡 Blush / Lips

Camada de cor (fill sólido rosa/vermelho) em blend mode **Soft Light** ou
**Color**, com máscara pintada só nas regiões de bochecha/lábio.

Fonte: técnica geral, citada em múltiplos guias de retoque profissional
(ex: Pixelphant, acima) sem uma fonte única definitiva.

## Sugestão de implementação (UXP / batchPlay)

Padrão comum pras 6: Adjustment Layer + máscara invertida (preta = escondida
por padrão), usuário pinta com branco nas áreas desejadas.

```js
async function createMaskedAdjustment(type, name, adjustmentData) {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'adjustmentLayer' }],
        using: {
            _obj: 'adjustmentLayer',
            name,
            type: { _obj: type, ...adjustmentData }
        }
    }], {});
    // Inverte a máscara (fica preta = oculta) pra pintar manualmente onde aplicar
    await batchPlay([{
        _obj: 'invert',
        _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }]
    }], {});
}

// Exemplos de uso:
await createMaskedAdjustment('hueSaturation', 'Teeth', {
    adjustment: [{ _obj: 'hueSatAdjustmentV2', hue: 0, saturation: -40, lightness: 10 }]
});

await createMaskedAdjustment('selectiveColor', 'Skin Tone', {
    adjustment: []  // presets específicos ficam a definir
});
```

Blush/Lips (fill de cor sólida em vez de adjustment layer):

```js
async function createColorFillLayer(name, r, g, b, blendMode) {
    await batchPlay([{ _obj: 'make', _target: [{ _ref: 'layer' }], using: { _obj: 'layer', name, mode: { _enum: 'blendMode', _value: blendMode || 'softLight' } } }], {});
    await batchPlay([{
        _obj: 'fill',
        using: { _obj: 'RGBColor', red: r, green: g, blue: b },
        opacity: { _unit: 'percentUnit', _value: 100 },
        mode: { _enum: 'blendMode', _value: 'normal' }
    }], {});
    await batchPlay([{ _obj: 'invert', _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }] }], {});
}
```

## Fontes

- [How to Correct Skin Tone in Photoshop – Evoto](https://blog.evoto.ai/how-to-correct-skin-tone-in-photoshop/) 🟡
- [Expert Portrait Retouching Guide – Pixelphant](https://pixelphant.com/blog/expert-portrait-retouching-guide) 🟡
- [How to Retouch Teeth Quickly in Photoshop – MakeUseOf](https://www.makeuseof.com/tag/retouch-teeth-quickly-photoshop-brighter-smile/) 🟡
- [How to Whiten Teeth in Photoshop – SLR Lounge](https://www.slrlounge.com/2-second-technique-whiten-teeth-photoshop-plus-free-action/) 🟡

## Pendência

- Nenhuma fonte da Williams Academy especificamente sobre esses 6 botões —
  tudo aqui é técnica de mercado, precisa validação com o cliente ou com
  acesso real ao plugin deles.
