# Quick Select

Botões: **Skin**, **Highlights**, **Shadows**.

## 🟢 Skin — implementado e confirmado funcionando

Print real confirmou: o botão gera uma seleção em cima da pele do rosto +
pescoço, evitando cabelo/sobrancelha/olhos/boca/narina, e a pele em sombra
profunda do maxilar fica parcialmente de fora da seleção — isso bate com
a limitação **conhecida e documentada** do preset nativo `Color Range >
Skin Tones` (perde pele muito escura porque o algoritmo usa luminosidade),
não parece ser um segundo passo manual de "só realce".

Implementado em `functions-jsx/quick-select/quickSelectSkin.jsx` via Action Manager
(`colorRange`). Levou 3 tentativas até achar a chave certa:

1. `colorModel` como inteiro (`8`) — não deu erro, mas também não fez
   seleção nenhuma (no-op silencioso).
2. `colorModel` como enumerado (`"colorModel"` → `"skinTone"`) — deu erro
   genérico de Action Manager.
3. **Resolvido**: a chave certa é `"colors"` (não `"colorModel"`),
   confirmada porque o cliente já tinha um script próprio testado e
   funcionando pra Shadows usando exatamente essa chave
   (`Scripts/jsx/quickSelectShadowsClean.jsx`). Adaptado pra Skin Tones:
   `desc.putEnumerated(stringIDToTypeID("colors"), stringIDToTypeID("colors"), stringIDToTypeID("skinTone"))`
   + `desc.putBoolean(stringIDToTypeID("detectFaces"), true)`.

**Confirmado funcionando pelo cliente** — `alert()` de diagnóstico já
removido do código.

## 🟢 Highlights — implementado e confirmado funcionando

Print real mostrou uma seleção "pontilhada", concentrada nas partes mais
claras/brilhantes da pele (bem diferente da seleção lisa do botão Skin).

Primeira tentativa (adaptada de um script do cliente,
`Scripts/jsx/quickSelectHighlights.jsx`, nunca testado) tentava "carregar
o canal composto como seleção" via `executeAction(charIDToTypeID("set "), ...)`
— e falhou 3 vezes seguidas, cada vez por um motivo diferente:

1. `charIDToTypeID("set ")` (com espaço) não é um comando real — o certo
   é `"setd"` (sem espaço).
2. `charIDToTypeID("Fsel")` maiúsculo é inválido — o certo é `"fsel"`
   minúsculo (charID é sensível a maiúsculas/minúsculas).
3. Mesmo com os dois acima corrigidos, o enum do canal composto (tentei
   `"Ctrl"` e depois `"Mrgd"`) continuou dando "comando Definir não
   disponível" — não achei o valor certo.

**Resolvido abandonando essa técnica** e reaproveitando a mesma que já
funcionava pro Skin/Shadows: `colorRange` via Action Manager com a chave
`"colors"`, valor `"highlights"` (o Color Range nativo do Photoshop já
tem Highlights como preset próprio, junto de Shadows/Midtones). Muito
mais simples e consistente que a técnica de canal composto.

Implementado em `functions-jsx/quick-select/quickSelectHighlights.jsx`.

## 🟢 Shadows — implementado (confirmado funcionando pelo cliente)

Mesma técnica do Skin (Color Range, chave `"colors"`), só trocando o
valor do enum pra `"shadows"` — já era um script próprio do cliente,
testado e funcionando (`Scripts/jsx/quickSelectShadowsClean.jsx`).
Implementado em `functions-jsx/quick-select/quickSelectShadows.jsx`.

## 🟡 Técnica padrão de mercado (alta confiança de match)

Isso mapeia quase certamente pro recurso **nativo do Photoshop**
`Select > Color Range`, que tem justamente esses presets prontos:

- **Skin Tones** — com checkbox opcional **"Detect Faces"** pra melhorar a
  precisão usando reconhecimento facial.
- **Highlights** / **Midtones** / **Shadows** — seleção por faixa de
  luminosidade (divide o intervalo tonal 0–255 em três terços).

Não achei a Williams Academy descrevendo publicamente que usa exatamente
isso, mas como os nomes dos botões (Skin/Highlights/Shadows) **batem
literalmente** com os nomes dos presets nativos do Color Range, a
probabilidade de ser isso (ou uma camada fina de UI em cima disso) é alta.

Fontes:
- [Select color range in Photoshop – Adobe Help](https://helpx.adobe.com/photoshop/desktop/make-selections/freehand-selections/select-a-color-range-in-photoshop.html) 🟢 (documentação oficial Adobe do recurso nativo)
- [Mastering Color Range Tool in Photoshop – Breathing Color](https://www.breathingcolor.com/blogs/news/photoshop-color-range) 🟡
- [A Technical Approach to Better Automatic Skin Tone Selections – Rangefinder](https://rangefinderonline.com/news-features/tips-techniques/better-automatic-skin-tones-selections/) 🟡

### Limitação conhecida do Color Range "Skin Tones"

Uma fonte aponta um problema real e documentado: o Color Range pode
**perder pele em sombras profundas** porque a luminosidade baixa engana o
algoritmo (ele acha que tom muito escuro não é pele). Solução sugerida:
separar informação de croma (cor) e luma (brilho), extraindo o tom de pele
só do canal de croma, minimizando a influência de sombra/realce.

Fonte: [A Technical Approach to Better Automatic Skin Tone Selections – Rangefinder](https://rangefinderonline.com/news-features/tips-techniques/better-automatic-skin-tones-selections/) 🟡

## Sugestão de implementação (UXP / batchPlay)

```js
async function selectSkin() {
    await batchPlay([{
        _obj: 'colorRange',
        select: { _enum: 'colorSampler', _value: 'skinTones' },
        detectFaces: true,
        fuzziness: 40,
        _options: { dialogOptions: 'dontDisplay' }
    }], {});
}

async function selectHighlights() {
    await batchPlay([{
        _obj: 'colorRange',
        select: { _enum: 'colorSampler', _value: 'highlights' },
        fuzziness: 40,
        _options: { dialogOptions: 'dontDisplay' }
    }], {});
}

async function selectShadows() {
    await batchPlay([{
        _obj: 'colorRange',
        select: { _enum: 'colorSampler', _value: 'shadows' },
        fuzziness: 40,
        _options: { dialogOptions: 'dontDisplay' }
    }], {});
}
```

> Os nomes exatos dos enums (`skinTones`, `highlights`, `shadows`, campo
> `fuzziness`) precisam ser validados rodando `batchPlay` com
> `dialogOptions: 'display'` uma vez e inspecionando o log de eventos do
> Photoshop (Editar > Preferências > Plug-ins > Gerar Log de Eventos, ou
> gravar como Action e inspecionar) — isso é o jeito confiável de pegar a
> sintaxe exata que o Photoshop realmente espera, em vez de assumir.

Depois de gerar a seleção, o fluxo comum é criar uma Adjustment Layer
(Curves/Levels/Hue-Sat) com a seleção virando a máscara automaticamente:

```js
async function selectionToAdjustmentMask(adjustmentType, layerName) {
    await batchPlay([{
        _obj: 'make',
        _target: [{ _ref: 'adjustmentLayer' }],
        using: {
            _obj: 'adjustmentLayer',
            name: layerName,
            type: { _obj: adjustmentType, presetKind: { _enum: 'presetKindType', _value: 'presetKindDefault' } }
        }
        // A seleção ativa vira a máscara da layer automaticamente
        // quando existe seleção no momento do 'make'.
    }], {});
}
```

## Fontes

- [Select color range in Photoshop – Adobe Help](https://helpx.adobe.com/photoshop/desktop/make-selections/freehand-selections/select-a-color-range-in-photoshop.html) 🟢
- [Mastering Color Range Tool in Photoshop – Breathing Color](https://www.breathingcolor.com/blogs/news/photoshop-color-range) 🟡
- [A Technical Approach to Better Automatic Skin Tone Selections – Rangefinder](https://rangefinderonline.com/news-features/tips-techniques/better-automatic-skin-tones-selections/) 🟡

## Pendência

- Validar os enums exatos do `colorRange` via log de eventos real (não
  confirmados 100%, montados por analogia com a UI do Color Range).
