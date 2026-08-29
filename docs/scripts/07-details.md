# Details

Botões: **Iris**, **Catchlight**, **Brows**, **Eyeliner**, **Freckles**,
**Lashes**, **Hair**.

## 🟡 Implementado (7 botões)

Confirmado pelo cliente: cada botão é um **pincel real** (forma própria,
não um pincel redondo com parâmetros como Texture) dentro de um pacote
de pincéis (`BRUSHBUNDLE 2024`). Mapeamento botão → arquivo → nome do
preset dentro dele:

| Botão | Arquivo | Nome do preset |
|---|---|---|
| Iris | `Iris.abr` | `IRIS 2 - R` (confirmado via ScriptListener real — o verbal "IRIS R" estava incompleto) |
| Catchlight | `Catchlight.abr` | `REFLECTION 1 - RIGHT` (confirmado pelo cliente) |
| Brows | `Eyebrows.abr` | `BROW 1 - RIGHT` (confirmado pelo cliente) |
| Eyeliner | `Eyeliner.abr` | `EYELINER 6 - RIGHT` (confirmado pelo cliente) |
| Freckles | `Freckles.abr` | `FULL NOSE CHEEKS 1` (confirmado pelo cliente) |
| Lashes | `Lashes.abr` | `NATURAL 2 - R` (confirmado pelo cliente) |
| Hair | `Hair.abr` | `stray 2` (confirmado pelo cliente) |

### Arquitetura: pincéis grandes hospedados no Cloudflare R2

Os `.abr` são enormes (15MB–470MB, ~700MB no total) — pesado demais pra
empacotar dentro do plugin. Hospedados num bucket **Cloudflare R2**
(`r2-storage-savizstudio`, domínio público
`r2savizstudio.devhextar.site`), subidos via API (multipart pro Iris.abr,
que passa do limite de upload direto de ~300MB).

O painel (`functions/details/detailsBrush.js`) baixa o `.abr` **uma
única vez** por PC (usando `require('https')`/`require('fs')` — Node.js,
disponível por padrão em painéis CEP) pra
`%APPDATA%\SavizStudio\Brushes\`, mostrando progresso no modal do
painel. Da 2ª vez em diante, usa o arquivo já em cache, sem baixar de
novo. Só depois disso chama o ExtendScript
(`functions-jsx/details/detailsBrush.jsx`) passando o caminho local.

No lado do Photoshop: seleciona um pincel específico **pelo nome exato**
(`ref.putName(stringIDToTypeID("brush"), presetName)`, sem precisar
saber a posição dele na lista) — se ainda não estiver carregado nessa
sessão, carrega (Append) o `.abr` inteiro nos presets primeiro e tenta
de novo. Estrutura confirmada num script real publicado num fórum da
Adobe.

🟡 Pontos sensíveis desse fluxo: (1) baixa arquivo externo via Node no
painel, (2) seleciona pincel por nome, (3) carrega um `.abr` externo via
Action Manager.

Implementado em `functions-jsx/details/detailsBrush.jsx` e
`functions/details/detailsBrush.js`.

## Comportamento atual no plugin Saviz Studio

- Cada botão baixa o `.abr` correspondente só se ele ainda não existir no
  cache local.
- Depois de carregar/selecionar o preset, o Photoshop fica com a
  ferramenta Brush ativa.
- O tamanho inicial dos pincéis de Details é **250 px** por padrão. O
  usuário ainda pode ajustar o tamanho manualmente no Photoshop depois.

## 🔴 Williams Academy especificamente (pesquisa original, pré-confirmação)

Não achei confirmação direta da Williams Academy pra cada um. Pesquisa por
botão, técnica de mercado.

## 🟡 Iris

Aumentar saturação/clareza da cor da íris + contraste local. Dodge Tool
(Range: Midtones, Exposure ~20%) pra clarear, Burn Tool pra escurecer
borda da íris e pupila.

Fonte: [How to Create Captivating Eyes and Catchlights Using Photoshop – Fstoppers](https://fstoppers.com/education/how-create-captivating-eyes-and-catchlights-using-photoshop-277298) 🟡

## 🟡 Catchlight

Reflexo de luz no olho — "small details that make a tremendous difference
in a portrait, as they bring the eyes to life." Adicionado com um pincel
pequeno branco em blend mode **Screen** (ou Soft Light), num ponto que
simule a posição real da fonte de luz.

> Aviso da própria fonte: fácil de exagerar — depois de aplicar, olhar em
> zoom reduzido e ajustar opacidade, "less is more".

Fonte: [How to Create Captivating Eyes and Catchlights Using Photoshop – Fstoppers](https://fstoppers.com/education/how-create-captivating-eyes-and-catchlights-using-photoshop-277298) 🟡

## 🟡 Brows / Eyeliner / Lashes

Camada em **Multiply** ou **Soft Light**, pincel escuro reforçando a forma
existente (não desenha do zero, intensifica o que já está lá). Para
Lashes especificamente, uma técnica citada usa o **Sharpen Tool** numa
camada com "Sample All Layers" ligado, Strength ~20, pra dar nitidez
seletiva nos cílios sem afetar o resto.

Fonte: [How to Create Captivating Eyes and Catchlights Using Photoshop – Fstoppers](https://fstoppers.com/education/how-create-captivating-eyes-and-catchlights-using-photoshop-277298) 🟡

## 🔴 Freckles

Não achei fonte específica de mercado documentando "adicionar sardas" como
função de painel de retoque (o mais comum é o oposto — *remover* sardas
via Frequency Separation/clone stamp). Hipótese: camada de textura (noise +
blur) em Overlay, pintada seletivamente — mesma lógica de Skin Texture
(ver `08-skin-texture.md`), mas aplicada como pontos/pincel em vez de
overlay geral. **Não confirmado.**

## 🔴 Hair

Não achei fonte específica. Hipótese: Curves pra escurecer/clarear +
Hue/Saturation pra ajustar tom, máscara pintada só no cabelo. Técnica
genérica de qualquer ajuste de cor localizado, sem particularidade
conhecida pra "hair" especificamente.

## Sugestão de implementação (UXP / batchPlay)

Catchlight (camada + brush, sem adjustment layer):

```js
async function prepareCatchlightLayer() {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'layer' }],
        using: { _obj: 'layer', name: 'Catchlight', mode: { _enum: 'blendMode', _value: 'screen' } }
    }], {});
    // Usuário pinta manualmente com pincel branco pequeno + baixa opacidade
}
```

Iris (curva de contraste local + máscara):

```js
async function prepareIrisContrast() {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'adjustmentLayer' }],
        using: {
            _obj: 'adjustmentLayer',
            name: 'Iris Contrast',
            type: {
                _obj: 'curves',
                adjustment: [{
                    _obj: 'curvesAdjustment',
                    channel: { _ref: 'channel', _enum: 'channel', _value: 'composite' },
                    curve: [{ _obj: 'point', horizontal: 0, vertical: 0 }, { _obj: 'point', horizontal: 128, vertical: 150 }, { _obj: 'point', horizontal: 255, vertical: 255 }]
                }]
            }
        }
    }], {});
    await batchPlay([{ _obj: 'invert', _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }] }], {});
}
```

Brows/Eyeliner/Lashes (camada escura em Multiply, máscara invertida):

```js
async function prepareDarkDetailLayer(name) {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'layer' }],
        using: { _obj: 'layer', name, mode: { _enum: 'blendMode', _value: 'multiply' } }
    }], {});
    await batchPlay([{ _obj: 'invert', _target: [{ _ref: 'channel', _enum: 'channel', _value: 'mask' }] }], {});
}
```

## Fontes

- [How to Create Captivating Eyes and Catchlights Using Photoshop – Fstoppers](https://fstoppers.com/education/how-create-captivating-eyes-and-catchlights-using-photoshop-277298) 🟡

## Pendência

- **Freckles** e **Hair**: nenhuma fonte específica achada, implementação
  é só hipótese. Precisa validação com o cliente ou acesso a
  tutorial/print real da Williams Academy mostrando esses botões em uso.
