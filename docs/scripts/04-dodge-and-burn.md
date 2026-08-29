# Dodge & Burn

Botões: **Global**, **Macro**, **50% Grey**.

## 🟢 Global — implementado (confirmado via print real + .acv reais do cliente)

Print real do painel (grupo "Global" no painel de camadas) mostrou 4
camadas de ajuste **Curves**, todas com **máscara preta** (efeito escondido
por padrão, revelado pintando de branco por cima — dodge & burn clássico
"por pintura em camada de ajuste" em vez de pincel Dodge/Burn direto),
etiqueta de cor amarela, de cima pra baixo:

1. `strong brightening ++++`
2. `mild brightening`
3. `strong darkening ++++`
4. `mild darkening`

Valores das curvas extraídos dos `.acv` reais do cliente
(`IMPLEMENTAR/Dodge&Burn/Global/`), parseados manualmente (mesmo processo
usado em Helping Layers):

| Camada | Pontos (input, output) |
|---|---|
| `strong brightening ++++` | `[0,0] [102,163] [255,255]` |
| `mild brightening` | `[0,0] [112,149] [255,255]` |
| `strong darkening ++++` | `[0,0] [143,114] [255,255]` |
| `mild darkening` | `[0,0] [154,103] [255,255]` |

Implementado em `functions-jsx/dodge-and-burn/dodgeAndBurnGlobal.jsx` (reaproveita
`shl_makeCurvesLayer` de `helpingLayers.jsx`), clique alterna
visibilidade do grupo se ele já existir (mesmo padrão do Helping Layers).

## 🟢 Macro — implementado (confirmado via print real + .acv reais do cliente)

Print real do painel mostrou grupo "Macro" com 2 camadas de ajuste
**Curves**, mesmo padrão do Global (máscara preta, etiqueta amarela),
de cima pra baixo:

1. `fix for brightening`
2. `pores`

Valores das curvas extraídos dos `.acv` reais do cliente
(`IMPLEMENTAR/Dodge&Burn/Macro/`):

| Camada | Pontos (input, output) |
|---|---|
| `fix for brightening` | `[0,0] [152,108] [255,255]` |
| `pores` | `[0,178] [255,255]` (reta, levanta os pretos — clareia sombras de poro) |

Implementado em `functions-jsx/dodge-and-burn/dodgeAndBurnMacro.jsx`, reaproveitando
`shl_makeCurvesLayer` e `db_fillActiveLayerMaskBlack`.

## 🟢 50% Grey — implementado (descrito pelo cliente comparando com o painel real)

Cria uma camada rasterizada preenchida com **#808080** (cinza 50%), modo
de mesclagem **Sobrepor (Overlay)**, e muda a ferramenta ativa pra
**Pincel** com cor de frente branca, tamanho 50, dureza 0 — dodge & burn
manual clássico: pinta de branco pra clarear, preto (X pra trocar a cor)
pra escurecer.

Implementado em `functions-jsx/dodge-and-burn/dodgeAndBurnGrey.jsx`. O tamanho/dureza do
pincel usa um idioma de Action Manager (`setd` na propriedade `Brsh` da
ferramenta atual) que não tinha sido testado ainda nesse projeto — se
falhar, a camada cinza + pincel branco já ficam configurados mesmo assim
(erro isolado num try/catch que não trava o resto).

## 🟢 Confirmado (blog oficial da Williams Academy)

> "Dodge & Burn is a classic technique in photo editing used to enhance the
> light and shadow areas of an image. By selectively brightening (dodging)
> or darkening (burning) specific areas, you can add depth and dimension to
> your photos, creating a more dynamic and visually appealing image."
> — [What's the Difference Between Frequency Separation and Dodge & Burn? – Williams Academy](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/what-s-the-difference-between-frequency-separation-and-dodge-burn)

O mesmo blog recomenda Dodge & Burn especificamente pra **realce de
profundidade/estrutura facial** e efeitos de iluminação dramática, em
contraste com Frequency Separation (que é pra textura/cor sem alterar
tonalidade).

O artigo de skin texture (mesmo blog) também menciona, como parte do fluxo
deles: "Dodge and Burn on a new layer set to Soft Light blending mode and
fill it with 50% gray."

Fonte: [How to Get Perfect Skin Texture in Photoshop? – Williams Academy](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/how-to-get-perfect-skin-texture-in-photoshop) 🟢

## 🟡 Os três botões: hipótese de mapeamento

Isso **não veio confirmado da Williams Academy** (eles não documentam
publicamente "Global" vs "Macro" vs "50% Grey" como opções distintas), mas
é uma hipótese razoável baseada em como esses termos são usados na
indústria de retoque:

- **50% Grey** — bate 1:1 com o que o próprio blog da Williams Academy
  descreve: uma camada cinza 50% em Soft Light (ou Overlay), pintada com
  branco/preto pra clarear/escurecer (dodge/burn "manual" com pincel).
- **Global** — dodge & burn de larga escala, pra estrutura geral do rosto
  (contorno, luz macro), normalmente feito com Curves em vez de pincel —
  técnica mais suave, controlada por camadas de ajuste, não por pintura
  direta.
- **Macro** — dodge & burn de detalhe fino (poros, microtransições,
  pequenas sombras), geralmente combinado com Frequency Separation ou uma
  segunda camada de gray mais sutil/opacidade menor.

Essa distinção Global/Macro é conceito conhecido em cursos de retoque
avançado (ex: "Dodge and Burn: Working with Micro Transitions" —
Retouching Academy, fonte independente da Williams), mas não achei a
Williams Academy usando exatamente esses dois nomes.

Fonte: [Dodge and Burn: Working with Micro Transitions – Retouching Academy](https://retouchingacademy.com/dodge-burn-working-with-micro-transitions/) 🟡

## 🟡 Ferramenta/pincel (técnica padrão, geral)

Iris (via pesquisa sobre olhos, mesma lógica se aplica a D&B geral):
Dodge tool com **Range: Midtones, Exposure: ~20%**; Burn tool pra escurecer
pupila/bordas.

Fonte: [How to Create Captivating Eyes and Catchlights Using Photoshop – Fstoppers](https://fstoppers.com/education/how-create-captivating-eyes-and-catchlights-using-photoshop-277298) 🟡

## Sugestão de implementação (UXP / batchPlay)

### 50% Grey (D&B manual com pincel)

```js
async function createGreyDodgeBurnLayer() {
    const doc = app.activeDocument;
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'layer' }],
        using: {
            _obj: 'layer',
            name: 'Dodge & Burn (50% Grey)',
            mode: { _enum: 'blendMode', _value: 'softLight' },
            opacity: { _unit: 'percentUnit', _value: 100 }
        }
    }], {});
    await batchPlay([{
        _obj: 'fill',
        using: { _enum: 'fillContents', _value: 'gray50' },
        opacity: { _unit: 'percentUnit', _value: 100 },
        mode: { _enum: 'blendMode', _value: 'normal' }
    }], {});
    // Selecionar Brush + branco/preto fica a cargo do usuário (ou
    // pré-selecionar pincel macio, opacidade baixa, flow baixo).
}
```

### Global (Curves suave, estrutura geral)

```js
async function createGlobalDodgeBurn() {
    // Curva leve clareando/escurecendo midtones — valores de exemplo,
    // ajustar visualmente, não são "oficiais" da Williams Academy.
    await createCurvesLayer('Dodge & Burn (Global - Light)', [[0,0],[128,145],[255,255]], 'luminosity');
    await createCurvesLayer('Dodge & Burn (Global - Dark)', [[0,0],[128,110],[255,255]], 'luminosity');
}
```

### Macro (detalhe fino, opacidade mais baixa)

Mesma estrutura do 50% Grey, mas com opacidade da camada mais baixa
(ex: 30-50%) e pincel com flow ainda menor (1-3%), pensado pra
microtransições em vez de blocos grandes de luz/sombra.

## Fontes

- [What's the Difference Between Frequency Separation and Dodge & Burn? – Williams Academy](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/what-s-the-difference-between-frequency-separation-and-dodge-burn) 🟢
- [How to Get Perfect Skin Texture in Photoshop? – Williams Academy](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/how-to-get-perfect-skin-texture-in-photoshop) 🟢
- [Dodge and Burn: Working with Micro Transitions – Retouching Academy](https://retouchingacademy.com/dodge-burn-working-with-micro-transitions/) 🟡
- [How to Create Captivating Eyes and Catchlights Using Photoshop – Fstoppers](https://fstoppers.com/education/how-create-captivating-eyes-and-catchlights-using-photoshop-277298) 🟡

## Pendência

- Confirmar com o cliente se "Global" e "Macro" são realmente sobre
  escala (geral vs. detalhe), ou outra coisa (poderia ser nome de preset,
  não de técnica).
