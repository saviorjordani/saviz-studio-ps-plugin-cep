# Frequency Separation

Botões: **Gaussian Blur** e **Median** (os dois métodos de gerar a camada
de baixa frequência).

**Status: ✅ implementado** — ver `functions/frequencySeparation.js`
(painel) + `functions-jsx/frequency-separation/frequencySeparation.jsx` (ExtendScript).

## 🟢 Confirmado (print real do painel, estrutura de camadas exata)

Print do resultado do botão "Gaussian Blur" no painel real mostrou uma
estrutura bem diferente do que a pesquisa em blogs/tutoriais genéricos
sugeria (ver seção abaixo pra isso). A estrutura real:

```
[📂 Group] "Gaussian Blur"  (o NOME do grupo é o método escolhido —
                              "Median" se for esse o botão clicado)
  ├─ HIGH - Texture copiar   (CÓPIA de "HIGH - Texture", blend Normal,
                               clipping mask sobre ela — NÃO é vazia)
  ├─ HIGH - Texture          (Apply Image, blend mode Linear Light)
  ├─ Correct Colors          (camada vazia normal)
  └─ LOW - Base/Colors       (OBJETO INTELIGENTE — o blur é aplicado como
                               FILTRO INTELIGENTE, não destrutivo)
Camada 0                     (imagem original, fora do grupo)
```

> Correção: a "HIGH - Texture copiar" **não é uma camada vazia** (erro da
> minha primeira implementação) — o nome já entrega: é uma **cópia**
> (duplicata) da "HIGH - Texture" já processada, só que em blend mode
> Normal em vez de Linear Light, configurada como clipping mask sobre a
> original.

A diferença mais importante em relação à minha primeira tentativa (baseada
só em tutoriais): a camada **LOW não recebe o blur direto/destrutivo** —
primeiro é convertida em **Objeto Inteligente** (`Filter > Convert for
Smart Filters`, ou o menu "Converter para Objeto Inteligente"), e só
depois o Gaussian Blur ou Median é aplicado — nesse contexto o Photoshop
automaticamente aplica como **Filtro Inteligente**, editável depois com
duplo clique sem perder qualidade.

Nomenclatura real (não é "Low Frequency"/"High Frequency"/"Low
Retouch"/"High Retouch" como os tutoriais genéricos chamam):
- `LOW - Base/Colors` (baixa frequência, agora Objeto Inteligente)
- `Correct Colors` (camada de retoque de cor — equivalente ao "Low
  Retouch")

### 🟢 Confirmado também: botão Median e raio default

Print do resultado do botão **Median** mostra a **mesma estrutura exata**
(só o grupo se chama "Median" em vez de "Gaussian Blur", e o Filtro
Inteligente aplicado é "Mediana" em vez de "Desfoque Gaussiano") — bate
1:1 com o que já estava implementado. O cliente conferiu o valor do
filtro Mediana direto no painel do Photoshop: **raio = 7**, que já era o
default usado no código (`radius = method === "median" ? 7 : 6`), então
não precisou de ajuste.

O cliente também exportou uma imagem real de uma camada `HIGH - Texture`
finalizada (`IMPLEMENTAR/HIGH - Texture.png`) — cinza neutro quase
uniforme com relevo/textura sutil visível (poros, fios de cabelo,
contornos), exatamente o resultado esperado da fórmula Apply Image
(Subtract, Scale 2, Offset 128 em 8-bit).

### 🐛 Bug real encontrado e corrigido: parâmetros do Apply Image no lugar errado

Rodando de verdade, o resultado saía com cores estouradas/saturação
extrema (sintoma clássico de "Linear Light aplicado sobre uma camada que
NÃO recebeu o Apply Image" — ou seja, a camada High ficava com o
conteúdo original de cor cheia por baixo do blend mode). Causa: no
descriptor do Action Manager, os campos `Md` (modo de mesclagem), `Scl`
(escala) e `Ofst` (offset) estavam no objeto **de fora** (`desc`), mas o
Photoshop exige que fiquem **dentro** do objeto `With`/`calculation`
(junto com a referência da camada fonte e o `Invr`), senão o cálculo é
ignorado silenciosamente (sem erro, só não aplica). Faltava também o
campo `Opacity: 100%` explícito. Corrigido comparando com a estrutura já
validada da versão UXP anterior do plugin (que usa o mesmo formato via
`batchPlay`, só que em JSON em vez de `ActionDescriptor`).

### 🔴 Pendência: mesmo depois da correção acima, `HIGH - Texture` ainda não saiu cinza neutro

Depois da correção de posição dos parâmetros, o cliente testou de novo e
o resultado ainda não bateu com a referência (`HIGH - Texture.png`, cinza
neutro) — a camada continuava parecendo a foto original em cor. Segunda
rodada de correção, dessa vez trocando `charIDToTypeID("T   ")` por
`stringIDToTypeID("to")` e `"Md"/"BlnM"` por `stringIDToTypeID("blendMode")`
duas vezes — alinhando as chaves com os nomes de propriedade exatos que a
versão UXP (`batchPlay`) usava (`to`, `blendMode`, `opacity`, `scale`,
`offset`), em vez dos codes de 4 caracteres que eu tinha herdado do doc
de pesquisa não confiável. **Também não resolveu** — confirmado com um
`alert()` de diagnóstico mostrando a cor real de um pixel da camada
(R=213 G=161 B=130, tom de pele normal, longe do cinza 128/128/128
esperado): o Apply Image simplesmente não fazia efeito nenhum, nas duas
tentativas.

### 🔄 Mudança de estratégia: Apply Image trocado por Inverter+Fundir

Depois de duas tentativas falhas de acertar a estrutura exata do
`applyImageEvent` via Action Manager (sem conseguir testar ao vivo no
Photoshop pra confirmar cada ajuste), abandonei o Apply Image inteiramente
e troquei por uma técnica matematicamente equivalente usando só comandos
simples de parâmetro único — bem mais difíceis de errar que um descriptor
complexo com dezenas de chaves aninhadas:

1. Duplica a `LOW - Base/Colors` (já borrada) por cima da `HIGH - Texture`
   (original, sem blur).
2. Rasteriza a cópia — **não** via Action Manager (`stringIDToTypeID
   ("rasterizeLayer")` deu erro real em teste: "comando Rasterizar não
   está disponível no momento" ao tentar rasterizar um Objeto Inteligente).
   Resolvido com o método nativo do DOM: `layer.rasterize
   (RasterizeType.ENTIRELAYER)`.
3. Inverte a cópia — também precisou de duas trocas até funcionar:
   `charIDToTypeID("Invt")` via Action Manager deu "comando desconhecido
   não está disponível" logo após o rasterize; a alternativa
   `ArtLayer.applyInvert()` nem existe no DOM (só há `apply*` de filtro,
   Invert não é filtro). Resolvido com `layer.adjustCurves([[0,255],
   [255,0]])` — uma curva reta invertida, mesmo método já usado e
   validado em `helpingLayers.jsx`, dá o resultado idêntico ao Invert.
4. Opacidade 50%, blend mode Normal.
5. Funde ("Merge Down", `charIDToTypeID("Mrg2")`) essa camada invertida
   com a HIGH original abaixo dela — esse comando funcionou sem
   problemas.

Matemática (Normal blend com opacidade 50%: `resultado = 0.5*topo +
0.5*base`): com topo = inverso(LOW) = 255-LOW e base = HIGH original:

```
resultado = 0.5*(255-LOW) + 0.5*HIGH = (HIGH-LOW)/2 + 127.5
```

Praticamente idêntico à fórmula clássica do Apply Image
(`(HIGH-LOW)/2 + 128`, diferença de 0.5 sem efeito visual perceptível).

**🟢 Confirmado pelo usuário em teste real — funcionando.** O `alert()`
de diagnóstico foi removido do código (só ficou o `alert()` de erro no
`catch`, pra qualquer problema futuro aparecer visível na hora).

## 🟢 Confirmado (blog oficial da Williams Academy) — conceito geral

O blog da própria Williams Academy explica o conceito:

> "Frequency Separation is a powerful technique used to separate an image
> into two layers: texture (high frequency) and color/tone (low frequency).
> This separation allows you to edit these aspects independently, making it
> easier to correct imperfections without affecting the image's overall
> quality." — [What's the Difference Between Frequency Separation and
> Dodge & Burn?](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/what-s-the-difference-between-frequency-separation-and-dodge-burn)

E o artigo *"How to Get Perfect Skin Texture in Photoshop"* (mesmo blog)
descreve o passo a passo que eles ensinam:

> "Create Two Duplicate Layers: Name them 'High Frequency' and 'Low
> Frequency'"
> — Low Frequency: Gaussian Blur até as imperfeições sumirem mas a
> estrutura facial continuar visível
> — High Frequency: **High Pass Filter**, raio "usually around 2-3 pixels"
> — High Frequency em blend mode **Linear Light**
> — Mixer Brush com wetness ~20% na Low Frequency; Healing Brush (J) na
> High Frequency pra limpar imperfeições

Fonte: [How to Get Perfect Skin Texture in Photoshop? – Williams Academy](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/how-to-get-perfect-skin-texture-in-photoshop)

### ⚠️ Ponto de atenção: método usado no artigo é High Pass, não Apply Image

O artigo da Williams Academy descreve o método **High Pass Filter**
(mais simples/comum em tutoriais consumer-facing), não o método
**Apply Image** (mais técnico, usado em fluxos profissionais de estúdio,
sem os artefatos de contraste que o High Pass pode introduzir em bordas
de alto contraste). Os dois chegam a um resultado funcionalmente
parecido (camada de textura em Linear Light), mas o cálculo interno é
diferente. Como o botão da UI é literalmente **"Gaussian Blur" e
"Median"** — que são as opções de filtro pra gerar a camada de **baixa**
frequência, não a de alta — isso sugere que o painel da Williams Academy
usa Apply Image (método profissional) pra gerar a High Frequency a partir
da Low, e dá ao usuário a escolha de blur (Gaussian, mais suave) ou
Median (preserva melhor bordas/preserva menos ruído) pra gerar a Low
Frequency. Ver `04_dodge_burn.md`... (não, ver seção "Gaussian Blur vs
Median" abaixo.)

## 🟡 Gaussian Blur vs Median — por que dois botões

Pesquisa geral (não Williams-específica, mas diretamente relevante pro
motivo de existirem os dois botões): o filtro **Median** é uma alternativa
ao Gaussian Blur pra gerar a Low Frequency que **preserva melhor bordas
duras** (como a linha entre lábio e pele, ou a borda do olho) enquanto
ainda remove textura fina — o Gaussian Blur borra bordas igualmente em
todas as direções, enquanto o Median pega o valor "mediano" da vizinhança
de pixels, o que tende a manter contornos mais nítidos.

Fonte: [Frequency Separation: Gaussian Blur vs Median – Retouching Academy](https://retouchingacademy.com/frequency-separation-gaussian-blur-vs-median/)
(nota: "Retouching Academy" é um site/comunidade diferente da "Tamara
Williams Academy" — mesmo tema, fonte independente, não confundir.)

## 🟡 Estrutura de camadas (técnica padrão de mercado, amplamente documentada)

```
[📂 Group] Frequency Separation
  ├─ High Retouch (clipping mask, vazia, Normal)
  ├─ High Frequency (Linear Light)
  ├─ Low Retouch (vazia, Normal)
  └─ Low Frequency (Normal)
```

- **Low Retouch**: Mixer Brush com "Sample All Layers" **desmarcado**
  (senão contamina com o cinza da High Frequency).
- **High Retouch**: Clone Stamp com "Sample: Current Layer" (senão pega
  cor borrada da Low Frequency e gera manchas cinzas).

### Matemática do Apply Image (8-bit vs 16-bit)

- **8-bit**: `Blend: Subtract, Scale: 2, Offset: 128`
- **16-bit**: `Blend: Add, Invert: true, Scale: 2, Offset: 0` (necessário
  porque o campo Offset do Apply Image é limitado a 255, e o cinza médio
  de 16-bit é 16384 — dá pra contornar com Add+Invert)

Essa parte (limitação do Offset em 16-bit e a solução Add+Invert) é
comportamento documentado e verificável **do próprio Photoshop** (não é
"segredo" de nenhum plugin) — qualquer imagem 16-bit no Apply Image tem
essa limitação, é matemática de precisão de bits, não uma técnica
proprietária.

## Sugestão de implementação (UXP / batchPlay)

```js
async function runFrequencySeparation(method, radius) {
    // method: 'gaussian' | 'median'
    const doc = app.activeDocument;
    const is16Bit = doc.bitsPerChannel === 16;

    const group = await doc.createLayerGroup({ name: 'Frequency Separation' });

    const lowLayer = await doc.activeLayer.duplicate();
    lowLayer.name = 'Low Frequency';
    await lowLayer.move(group, 'inside');

    const highLayer = await doc.activeLayer.duplicate();
    highLayer.name = 'High Frequency';
    await highLayer.move(group, 'inside');

    doc.activeLayer = lowLayer;
    await batchPlay([{
        _obj: method === 'median' ? 'median' : 'gaussianBlur',
        radius: { _unit: 'pixelsUnit', _value: radius || 6 },
        _options: { dialogOptions: 'dontDisplay' }
    }], {});

    const lowRetouch = await doc.createLayer({ name: 'Low Retouch' });
    await lowRetouch.move(lowLayer, 'placeBefore');

    doc.activeLayer = highLayer;
    await batchPlay([{
        _obj: 'applyImageEvent',
        with: {
            _obj: 'calculation',
            to: { _ref: 'channel', _enum: 'channel', _value: 'RGB', layer: { _ref: 'layer', _name: 'Low Frequency' } },
            invert: is16Bit
        },
        blend: { _enum: 'blendMode', _value: is16Bit ? 'add' : 'subtract' },
        scale: 2,
        offset: is16Bit ? 0 : 128,
        _options: { dialogOptions: 'dontDisplay' }
    }], {});

    highLayer.blendMode = 'linearLight';

    const highRetouch = await doc.createLayer({ name: 'High Retouch' });
    await highRetouch.move(highLayer, 'placeBefore');
    doc.activeLayer = highRetouch;
    await batchPlay([{ _obj: 'groupEvent', _target: [{ _ref: 'layer', _enum: 'ordinal', _value: 'targetEnum' }] }], {});
}
```

## Fontes

- [What's the Difference Between Frequency Separation and Dodge & Burn? – Williams Academy](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/what-s-the-difference-between-frequency-separation-and-dodge-burn) 🟢
- [How to Get Perfect Skin Texture in Photoshop? – Williams Academy](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/how-to-get-perfect-skin-texture-in-photoshop) 🟢
- [Frequency Separation: Gaussian Blur vs Median – Retouching Academy](https://retouchingacademy.com/frequency-separation-gaussian-blur-vs-median/) 🟡
