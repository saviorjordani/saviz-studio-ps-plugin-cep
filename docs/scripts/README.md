# Pesquisa: funções do plugin Williams Academy → Saviz Studio

Índice dos docs desta pasta. Leia `00-fontes-e-metodologia.md` primeiro —
explica a legenda 🟢/🟡/🔴 usada em todos os arquivos.

| Doc | Seção do painel | Confiança geral |
|---|---|---|
| `01-helping-layers.md` | Botão Helping Layers (topo) | 🟢 **implementado**, valores reais extraídos dos `.acv`/`.blw` do cliente |
| `02-texture-pendente.md` | Accordion Texture (6 slots) | 🟢 **implementado** (Spot Healing Brush, Magic Stamp, Clone Stamp Soft/Hard, Remove Tool, AI Edit com geração automática) |
| `03-frequency-separation.md` | Accordion Frequency Separation | 🟢 **implementado**, estrutura confirmada por print real (Smart Object + Smart Filter) |
| `04-dodge-and-burn.md` | Accordion Dodge & Burn | 🟢 **implementado** (Global, Macro, 50% Grey) |
| `05-quick-select.md` | Accordion Quick Select | 🟢 **implementado e confirmado** (Skin, Highlights, Shadows) |
| `06-color-correction.md` | Accordion Color Correction | 🟢 **implementado e confirmado ao vivo** (Skin tone, Eyes, Glow, Teeth, Blush, Lips) — accordion completo |
| `07-details.md` | Accordion Details | 🟡 **implementado, todos os 7 botões** (pincéis reais no R2, cache local, tamanho padrão 250) |
| `08-skin-texture.md` | Accordion Skin Texture | 🟢 **implementado** (texturas criadas por Action Manager, `.pat` instalado uma vez, defaults por textura e controles sincronizados) |

## Resumo das pendências (preciso de você pra fechar 100%)

1. **Texture** (6 botões circulares): não sei o que cada um faz. Preciso
   de print/descrição da Williams Academy real.
2. **Dodge & Burn** — Global vs Macro: hipótese razoável (escala
   geral vs. detalhe fino), não confirmada.
3. **Color Correction** (Skin tone/Eyes/Glow/Teeth/Blush/Lips): zero fonte
   específica da Williams, tudo é técnica de mercado genérica.
4. **Details** — Freckles e Hair: nenhuma fonte específica achada.
5. **Quick Select**: enums exatos do `colorRange` no batchPlay precisam
   validação (gravando Action real e inspecionando o log).

## Como validar o que está pendente

A forma mais confiável de fechar essas pendências sem depender só de
pesquisa na web:

1. **Comprar/obter acesso à Williams Academy AI Retouch Panel** e ver o
   painel real rodando — nome exato de cada botão, o que cada um cria no
   painel de camadas.
2. **Gravar uma Action manual** no Photoshop fazendo cada efeito na mão
   (Bevel & Emboss, Color Range, etc.) e inspecionar os parâmetros reais
   via Editar → Preferências → Plug-ins → Gerar Log de Eventos de Script,
   ou simplesmente reproduzir a Action gravada e olhar o descriptor.
3. Me mandar prints/vídeos do plugin da Williams Academy sendo usado (se
   você tiver acesso), especialmente pra Texture, Color Correction e
   Details, que são as seções sem fonte pública boa.

## Próximo passo combinado

Essa pesquisa fica pronta pra consulta assim que a UI do painel estiver
100% fechada. Cada doc já traz uma sugestão de implementação em UXP
(`batchPlay`) pronta pra servir de ponto de partida — mas nenhuma delas
deve ser tratada como "copia e cola funciona", já que os pontos marcados
como pendência ainda precisam de validação real antes de virar código de
produção.
