# Fontes e metodologia dessa pesquisa

## Por que esses docs existem

O painel Saviz Studio replica a mesma taxonomia de botões/seções do painel da
**Tamara Williams Academy** (produto real, comercial, site
[tamarawilliams.net](https://www.tamarawilliams.net/en-us)): Helping Layers,
Texture, Frequency Separation, Dodge & Burn, Quick Select, Color Correction,
Details, Skin Texture. Antes de implementar a lógica de retoque de verdade
(fase que vem depois da UI estar pronta), pesquisei na web o que dá pra
confirmar sobre como cada uma dessas funções normalmente funciona.

**Importante:** existia uma pasta `Scripts/` em `WAGNER/` com código
ExtendScript/UXP e docs em markdown, mas o próprio cliente confirmou que
**não é código real da Williams Academy** — é material especulativo que nunca
foi testado. Não usei nada de lá como fonte. Tudo neste `docs/scripts/` vem de
pesquisa nova, com link de origem.

## Nível de confiança de cada informação

Como a Williams Academy é um produto pago e fechado (não expõe o código do
plugin nem documentação técnica pública dos algoritmos exatos), separei cada
achado em três categorias, marcadas explicitamente em cada doc:

- **🟢 CONFIRMADO (site/blog oficial da Williams Academy)** — veio
  diretamente do site oficial ou do blog deles. Ainda assim é descrição de
  marketing/tutorial, não o código-fonte do plugin, então "confirmado" aqui
  significa "a Williams Academy afirma isso publicamente", não "eu vi o
  código".
- **🟡 TÉCNICA PADRÃO DE MERCADO (bem documentada, provável match)** — é a
  forma amplamente ensinada/documentada de implementar aquele efeito no
  Photoshop (tutoriais de referência, PHLEARN, Adobe, etc.), e bate com o
  nome do botão. Alta probabilidade de ser exatamente isso, mas não é uma
  confirmação direta da Williams Academy.
- **🔴 NÃO CONFIRMADO / PENDENTE** — não achei nada específico o suficiente
  pra documentar com confiança. Fica marcado como pendência real.

## Fontes usadas

- [tamarawilliams.net](https://www.tamarawilliams.net/en-us) — site oficial,
  listagem de produtos
- [Blog: What's the Difference Between Frequency Separation and Dodge & Burn?](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/what-s-the-difference-between-frequency-separation-and-dodge-burn)
- [Blog: How to Get Perfect Skin Texture in Photoshop?](https://www.tamarawilliams.net/en-us/blogs/retouching-blog/how-to-get-perfect-skin-texture-in-photoshop)
- [Produto: Skintexture Photoshop DESKTOP](https://www.tamarawilliams.net/en-us/products/skintexture-actions)
- [Produto: Williams Academy AI Retouch Panel](https://www.tamarawilliams.net/en-us/products/williams-academy-ai-retouch-panel)
- Fontes gerais de técnica (citadas em cada doc onde usadas): PHLEARN,
  Adobe Help, Retouching Academy, Fstoppers, Creative Bloq, entre outras.

## Estrutura dos docs

Um arquivo por seção do painel, na mesma ordem que aparecem no
`savizstudio-ps-plugin-1.0-dev/index.html`:

1. `01-helping-layers.md`
2. `02-texture-pendente.md`
3. `03-frequency-separation.md`
4. `04-dodge-and-burn.md`
5. `05-quick-select.md`
6. `06-color-correction.md`
7. `07-details.md`
8. `08-skin-texture.md`

Cada doc traz: o que a função faz, valores/parâmetros específicos quando
existem, e uma sugestão de implementação em `batchPlay` (UXP) ou ExtendScript
clássico — mas sempre deixando claro que é uma **proposta de implementação
baseada na técnica documentada**, não uma cópia do algoritmo exato da
Williams Academy (que não é público).
