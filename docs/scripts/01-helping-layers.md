# Helping Layers

Botão no topo do painel (fora dos accordions), texto alterna
`HIDE HELP LAYERS` / `SHOW HELP LAYERS`.

**Status: ✅ implementado** — ver `functions/helpingLayers.js` (painel) +
`functions-jsx/helping-layers/helpingLayers.jsx` (ExtendScript, roda no host).

## 🟢 Confirmado (print real do painel + arquivos de predefinição reais)

O print do painel Williams Academy (mandado pelo cliente) mostra um grupo
**"Helping Layers"** no topo da pilha, contendo 3 camadas de ajuste, nessa
ordem:

1. **Solar Curve** — Curves
2. **D&B Help B/W** — Black & White
3. **D&B Help** — Curves

O cliente também exportou os arquivos de predefinição **reais** da própria
Williams Academy (`IMPLEMENTAR/`), parseados byte a byte (formato binário
`.acv`/`.blw` da Adobe):

| Arquivo | Camada | Conteúdo real extraído |
|---|---|---|
| `solarcurves-savizstudio.acv` | Solar Curve | pontos (input→output): `(0,0), (38,255), (98,0), (151,255), (209,0), (255,255)` |
| `p&b-help-savizstudio.acv` | D&B Help | pontos: `(0,0), (182,86), (255,255)` (curva pra baixo/escurecendo) |
| `p&b-savizstudio.blw` | D&B Help B/W | Red=40, Yellow=60, Green=40, Cyan=60, Blue=20, Magenta=80, useTint=false |

Isso **não é mais estimativa** — são os valores reais gravados nos arquivos
de preset da Williams Academy, extraídos com um parser Python dedicado
(formato `.acv`: header versão+contagem de curvas, cada curva com N pontos
de 2 shorts big-endian `(output, input)` — confirmado contra a spec oficial
da Adobe; formato `.blw`: descriptor binário do Photoshop, chaves ASCII de
4 caracteres tipo `Rd  `/`Yllw` seguidas do tipo `long` e um inteiro de 4
bytes).

> Nota de correção: na primeira versão desse doc o ponto do meio da curva
> D&B Help estava transcrito invertido (`86,182` em vez de `182,86`) — erro
> de transcrição minha ao resumir a saída do parser, não do parser em si.
> O cliente percebeu comparando visualmente o resultado (curva pra cima em
> vez de pra baixo) e a correção foi validada reconferindo o parser.

O grupo nasce com **as 3 camadas individualmente escondidas** (olho
apagado) e só o **grupo** com a visibilidade ligada — confirmado no
mesmo print.

## Implementação real (ExtendScript, `functions-jsx/helping-layers/helpingLayers.jsx`)

Como é CEP (não UXP), a lógica roda como ExtendScript clássico via Action
Manager (`executeAction`/`ActionDescriptor`/`ActionReference`), chamado do
painel via `csInterface.evalScript('toggleHelpingLayers()')`.

```jsx
function shl_makeCurvesLayer(layerName, points) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putClass(stringIDToTypeID("adjustmentLayer"));
    desc.putReference(stringIDToTypeID("null"), ref);

    var layerDesc = new ActionDescriptor();
    layerDesc.putString(stringIDToTypeID("name"), layerName);

    var curvesDesc = new ActionDescriptor();
    var curvesList = new ActionList();
    var channelDesc = new ActionDescriptor();
    var channelRef = new ActionReference();
    channelRef.putEnumerated(stringIDToTypeID("channel"), stringIDToTypeID("channel"), stringIDToTypeID("composite"));
    channelDesc.putReference(stringIDToTypeID("channel"), channelRef);

    var pointsList = new ActionList();
    for (var i = 0; i < points.length; i++) {
        var ptDesc = new ActionDescriptor();
        ptDesc.putDouble(stringIDToTypeID("horizontal"), points[i][0]);
        ptDesc.putDouble(stringIDToTypeID("vertical"), points[i][1]);
        pointsList.putObject(stringIDToTypeID("point"), ptDesc);
    }
    channelDesc.putList(stringIDToTypeID("curve"), pointsList);
    curvesList.putObject(stringIDToTypeID("curvesAdjustment"), channelDesc);
    curvesDesc.putList(stringIDToTypeID("adjustment"), curvesList);
    layerDesc.putObject(stringIDToTypeID("type"), stringIDToTypeID("curves"), curvesDesc);
    desc.putObject(stringIDToTypeID("using"), stringIDToTypeID("adjustmentLayer"), layerDesc);

    executeAction(stringIDToTypeID("make"), desc, DialogModes.NO);
}

// Uso com os valores reais extraídos:
shl_makeCurvesLayer("Solar Curve", [[0, 0], [38, 255], [98, 0], [151, 255], [209, 0], [255, 255]]);
shl_makeCurvesLayer("D&B Help", [[0, 0], [182, 86], [255, 255]]);
```

Toggle inteligente: procura o grupo pelo nome (busca recursiva, já que
pode estar dentro de outros grupos); se existe, só alterna `visible`; se
não existe, cria as 3 camadas (cada uma já nasce com `visible = false`),
agrupa, e deixa o grupo visível.

Código completo em `functions-jsx/helping-layers/helpingLayers.jsx`.

## Pendência

- Confirmar visualmente com o cliente se o resultado bate 100% com a
  Williams Academy real (extraí os valores corretamente do binário, mas
  ainda não testei rodando no Photoshop de verdade).
- Não achei um `.acv`/`.blw` pra um eventual 4º elemento — o grupo
  parece ter só esses 3, mas vale confirmar se não tem mais nada
  escondido fora do que aparece no print.
