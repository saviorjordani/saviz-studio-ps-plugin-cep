# Texture (accordion)

No painel são 6 botões circulares. Um já está implementado, os outros 5
seguem sem função atribuída (ver `index.html`, `.texture-slot` × 6 dentro
de `#textureAccordionContent`).

## 🟢 Slot 1 — Spot Healing Brush — implementado (confirmado via print real)

Cria uma camada vazia chamada **"Texture: Spot Healing Brush"** e muda a
ferramenta ativa pro **Pincel de Recuperação Pontual** (Spot Healing
Brush) com:

| Opção | Valor |
|---|---|
| Tamanho | 20px |
| Rigidez | 65% |
| Espaçamento | 25% |
| Ângulo | 46° |
| Circularidade | 47% |
| Tamanho controlado por | Pressão da Caneta |

Implementado em `functions-jsx/texture/textureSpotHealing.jsx`, reaproveitando
`fs_newEmptyLayer` (frequencySeparation.jsx) e o mesmo idioma de Action
Manager (`setd` na propriedade `Brsh`) já usado em `dodgeAndBurnGrey.jsx`
pra tamanho/dureza — estendido aqui com espaçamento/ângulo/circularidade.

**Pendência dentro desse slot:** não implementei ainda a opção "Sample:
All Layers" (Amostrar: Todas as Camadas) do Spot Healing Brush — sem ela
ligada, pintar na camada vazia não retoca nada (não tem pixel pra
amostrar na própria camada). É uma chave de Action Manager diferente
(opção da ferramenta, não do formato do pincel) que ainda não testei; por
enquanto o usuário precisa ligar isso manualmente na barra de opções
depois de clicar no botão.

## 🟢 Slot 2 — Magic Stamp — implementado (confirmado via print real)

Cria uma camada vazia chamada **"Texture: Magic Stamp"** e muda a
ferramenta ativa pro **Pincel de Recuperação** (Healing Brush — diferente
do slot 1, que usa o Spot Healing Brush) com:

| Opção | Valor |
|---|---|
| Tamanho | 20px |
| Rigidez | 70% |
| Espaçamento | 25% |
| Ângulo | 42° |
| Circularidade | 47% |
| Tamanho controlado por | Pressão da Caneta |

Implementado em `functions-jsx/texture/textureMagicStamp.jsx`, reaproveitando
`fs_newEmptyLayer` e a mesma função `tx_setSpotHealingBrushOptions`
(definida em `textureSpotHealing.jsx` — apesar do nome, é genérica pra
qualquer pincel). Mesma pendência do "Sample: All Layers" do slot 1
também se aplica aqui.

**Troca de ferramenta — 3 erros até acertar:** `app.currentTool =
"healingBrushTool"` e depois a versão via Action Manager com o mesmo
nome deram "comando Selecionar não disponível" (e na 1ª vez deixaram o
Photoshop num estado quebrado, travando até a criação de camada
seguinte). Resolvido só depois de instalar o **ScriptListener** (plugin
oficial da Adobe) e capturar o log real: o identificador certo dessa
ferramenta é **`"magicStampTool"`**, não `"healingBrushTool"` — mesmo
sendo "Ferramenta Pincel de Recuperação" na interface. Ficou uma função
`tx_selectToolClassic(toolStringID)` reaproveitável nesse arquivo pra
trocar ferramenta via Action Manager (idioma clássico de ScriptListener,
mais robusto que `app.currentTool`), usada também no slot 3.

## 🟢 Slot 3 — Clone Stamp Soft — implementado (confirmado via print real)

Cria uma camada vazia chamada **"Texture: Clone Stamp Soft"** e muda a
ferramenta ativa pro **Carimbo** (Clone Stamp) com um pincel específico
do cliente (`IMPLEMENTAR/Texture/texture-clone-stamp-soft.abr`).

O `.abr` é um preset "computado" (só parâmetros de forma, sem textura de
imagem própria) — parseado manualmente (mesmo processo dos `.acv`/`.blw`)
em vez de importar o arquivo `.abr` dentro do Photoshop via script:

| Opção | Valor |
|---|---|
| Tamanho | 20px |
| Rigidez | 42% |
| Espaçamento | 25% |
| Ângulo | 37° |
| Circularidade | 35% |

Identificador da ferramenta (`"cloneStampTool"`) confirmado pelo mesmo
log do ScriptListener usado pro slot 2 — dessa vez o nome óbvio bateu
certo. Implementado em `functions-jsx/texture/textureCloneStamp.jsx`,
reaproveita `tx_selectToolClassic` e `tx_setSpotHealingBrushOptions`.

## 🟢 Slot 4 — Clone Stamp Hard — implementado (confirmado via print real)

Mesma ideia do slot 3, só que com um pincel mais "duro" (maior, mais
rígido). Cria uma camada vazia chamada **"Texture: Clone Stamp Hard"** e
usa a mesma ferramenta Carimbo, com valores parseados do
`.abr` correspondente (`IMPLEMENTAR/Texture/texture-clone-stamp-hard.abr`):

| Opção | Valor |
|---|---|
| Tamanho | 30px |
| Rigidez | 58% |
| Espaçamento | 25% |
| Ângulo | 46° |
| Circularidade | 43% |

Implementado em `functions-jsx/texture/textureCloneStampHard.jsx`,
idêntico ao slot 3 exceto pelos valores do pincel.

## 🟢 Slot 5 — Remove Tool — implementado (confirmado via print real)

Cria uma camada vazia chamada **"Texture: Remove Tool"**, mostra um aviso
pedindo pra marcar **"Obter amostra de todas as camadas"** (Sample All
Layers) na barra de opções, e muda a ferramenta ativa pra **Ferramenta
Remover** (Remove Tool — remoção de objetos por IA generativa, adicionada
no Photoshop 2024).

Diferente dos slots 1/2 (onde essa mesma pendência ficou silenciosa),
aqui optei por avisar o usuário, já que sem "Sample All Layers" ligado a
ferramenta não teria o que amostrar numa camada vazia — e ainda não achei
a chave de Action Manager certa pra ligar isso via script. O aviso é um
**modal do próprio painel** (não o `alert()` nativo do Photoshop): o
`.jsx` só devolve sucesso/falha, e `js/main.js` mostra o modal
(`showPanelModal`, reutilizável pra qualquer aviso futuro que não seja
erro de script).

Identificador da ferramenta (`"removeTool"`) confirmado pelo mesmo log
do ScriptListener usado pro slot 2. Implementado em
`functions-jsx/texture/textureRemoveTool.jsx`.

## 🟢 Slot 6 — AI Edit — implementado (confirmado via prints reais + log real do Preenchimento Generativo)

Cria uma camada vazia chamada **"Paint over areas to edit"** e muda a
ferramenta ativa pro **Pincel**, tamanho 50px, dureza 0, cor de frente
**vermelha** — o usuário pinta por cima da área que quer editar.

**Correção importante:** os botões "Apply"/"Cancel" NÃO são a Barra de
Tarefas Contextual nativa do Photoshop, como eu tinha assumido antes —
são **UI própria do painel da Williams Academy**, aparecem dentro do
próprio accordion Texture (print real confirma: título "TEXTURE", texto
"Paint over areas to edit", botões Apply/Cancel, no mesmo estilo do resto
do painel deles). Depois de "Apply", a camada resultante vira
**"Texture: AI"** (com máscara, etiqueta vermelha) — resultado de um
Preenchimento Generativo.

Implementado: uma barrinha equivalente no nosso painel
(`#aiEditApplyBar` em `index.html`) que aparece depois de clicar em "AI
Edit" e pintar. Botão **Apply** (`runTextureAiEditApply`) carrega a
pintura vermelha como seleção (transparência da camada, mesmo idioma de
Action Manager confirmado em Highlights: `"fsel"` minúsculo + `"setd"`,
canal `"Trsp"`) e apaga a camada de pintura. Botão **Cancel**
(`runTextureAiEditCancel`) só apaga a camada de pintura sem gerar nada.

**Geração automática confirmada**: o cliente gerou uma vez manualmente
com o ScriptListener ativo e capturou o comando real — `stringIDToTypeID
("syntheticFill")`, com `serviceID: "clio"` (nome interno do Firefly
dentro do Photoshop), `workflowType: "in_painting"`, prompt vazio (`""`),
e um bloco `serviceOptionsList.clio` com vários parâmetros fixos
(`gi_MODE: "ginp"`, `gi_SEED: -1`, `gi_GUIDANCE: 6`, etc — copiados
literalmente do log, sem tentar entender/ajustar cada um). Implementado
em `tx_generativeFill(prompt)`, chamado automaticamente no fim do
`runTextureAiEditApply()` depois de carregar a seleção e apagar a camada
de pintura — clicar em "Apply" já dispara a geração inteira, sem prompt,
sem precisar de mais nenhum clique.

Os campos `DocI`/`LyrI` no log eram fixos da sessão gravada (número do
documento/camada específicos); na implementação usei `doc.id` e
`doc.activeLayer.id` dinâmicos, calculados no momento da chamada.

Reaproveita `db_selectBrushTool`/`db_setBrushSizeAndHardness` (já usadas
no Dodge & Burn 50% Grey) e adiciona `tx_setForegroundColor(hex)`, versão
genérica pra qualquer cor (o Dodge & Burn só tinha branco fixo).
Implementado em `functions-jsx/texture/textureAiEdit.jsx`.

Com esse slot, os 6 botões do accordion Texture estão implementados.

Não consegui achar nada específico o suficiente pra dizer com confiança
"esses são os 6 botões de Texture da Williams Academy". O que existe de
sobra é o conceito geral do que uma seção "Texture" costuma conter num
painel de retoque: ferramentas de limpeza/textura de pele não-destrutivas
(Spot Healing, Clone Stamp, Patch Tool, Healing Brush, variações de
dureza/soft-edge do pincel), ver `guia-plugin-retouch.md` seção 3 (que é do
material especulativo, não confio nos nomes exatos, só no *conceito*).

## O que da UI já existente dá pra inferir

Olhando pro export de Figma que originou os primeiros protótipos (antes da
reescrita atual), os ícones de textura tinham nomes de arquivo sugestivos:
"Texture Dashed", "Texture Eraser", "Soft Clone", "Edge Clone", "Texture
Sparkle", "AI Texture" — mas **isso também não é confirmado como sendo
fiel à Williams Academy**, era só o nome que o designer deu aos ícones no
Figma.

## Próximo passo

**Preciso que você confirme/mande print** de como são esses 6 (ou mais)
botões na Williams Academy real — nome de cada ferramenta e, se possível,
o que cada uma faz quando clicada (cria que tipo de camada, ativa qual
ferramenta do Photoshop, com quais configurações de pincel). Sem isso, "1:1
ou o mais fiel possível" não é possível cumprir pra essa seção específica —
seria eu inventando função pra um botão sem saber o que ele realmente é.

Até lá, os slots ficam só visuais (não clicáveis / sem `onRun`), como já
estão hoje.
