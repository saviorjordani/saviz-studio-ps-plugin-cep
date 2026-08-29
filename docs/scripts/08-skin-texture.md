# Skin Texture

Accordion de texturas de pele. Tem botão **Instalar Texturas**, seletor
de textura, botão **Add**, dial de **Ângulo**, campo **Altitude**,
checkbox **Luz Global** e controles de **Tamanho**, **Escala**,
**Profundidade**, **Realces** e **Sombras**.

Os controles de Tamanho/Escala/Profundidade/Realces/Sombras aceitam dois
modos de entrada: arrastar o slider ou digitar o valor numérico no campo
ao lado.

## 🟢 Implementado — fluxo atual

O fluxo atual **não depende mais de rodar ações `.atn` para criar cada
camada**. As texturas são criadas por Action Manager no host
(`functions-jsx/skin-texture/skinTexture.jsx`) a partir de configs
explícitas mantidas no painel
(`functions/skin-texture/skinTexture.js`).

1. O usuário clica **Instalar Texturas**.
2. O painel baixa `SAVIZTEXTURES.pat` do R2, se ainda não estiver em
   cache.
3. O arquivo fica salvo em `%ProgramData%\SavizStudio\Patterns\`.
4. O host faz Append do `.pat` nos presets do Photoshop.
5. O plugin grava em `localStorage` que a instalação terminou com
   sucesso.
6. Depois disso, o botão **Add** cria a textura escolhida usando a config
   correspondente, sem reinstalar o `.pat` automaticamente.

Essa separação é intencional: tentativas anteriores de detectar
automaticamente se o pattern já estava instalado causavam Append repetido
e duplicavam grupos de patterns no Photoshop.

## Texturas mapeadas

As texturas disponíveis no seletor usam estes nomes internos:

- `hand and skin`
- `Forehead skin`
- `Forehead pores`
- `Highlight texture`
- `skin highlight texture`
- `cheek`
- `cheeks highlight`
- `forehead pores INDIVIDUAL`
- `cheek individual pores`

Cada textura nasce com máscara preta, para o usuário pintar de branco só
onde quiser revelar o efeito.

## Defaults por textura

Os valores abaixo são os defaults usados ao clicar **Add**. Eles também
alimentam os sliders/campos numéricos, evitando que um controle reaplique
valores genéricos por cima da textura recém-criada.

| Textura | Tamanho | Escala | Profundidade | Realces | Sombras |
|---|---:|---:|---:|---:|---:|
| hand and skin | 3 | 5 | 150 | 63 | 60 |
| Forehead skin | 3 | 60 | 103 | 72 | 64 |
| Forehead pores | 3 | 20 | 103 | 72 | 64 |
| forehead pores INDIVIDUAL | 3 | 10 | -50 | 63 | 60 |
| Highlight texture | 3 | 5 | 65 | 89 | 69 |
| skin highlight texture | 3 | 5 | 87 | 63 | 60 |
| cheek / Side Cheek | 3 | 12 | 120 | 63 | 60 |
| cheeks highlight | 3 | 5 | 87 | 63 | 60 |
| cheek individual pores | 3 | 5 | 87 | 63 | 60 |

Ângulo padrão: **90**. Altitude padrão: **32**, exceto
`Forehead pores`, que usa **30**.

## Bevel & Emboss / Texture

O efeito principal vem de **Bevel & Emboss** com a subseção **Texture**.
Campos importantes no Action Manager:

- Bevel & Emboss: `ebbl`
- Size: `blur`
- Pattern Scale: `Scl `
- Texture Depth: `textureDepth`
- Highlights: opacidade de highlight dentro do layer style
- Shadows: opacidade de shadow dentro do layer style
- Angle/Altitude: direção da luz do Bevel & Emboss

O dial de ângulo atualiza o ângulo real do layer style. Quando necessário,
o plugin desliga **Global Light** para o ajuste não afetar outras camadas
do documento.

## Highlight Texture

`Highlight texture` tem tratamento especial:

- cria a camada de textura;
- cria uma camada de cor sólida branca chamada **Adjust here**;
- a camada de cor sólida usa blend mode **Hard Mix** e preenchimento
  (**Fill**) de **18%**;
- textura e cor sólida ficam dentro de um grupo chamado **Paint Here**;
- as duas camadas internas têm máscara branca;
- o grupo tem máscara preta, para pintar no grupo e revelar os dois
  efeitos ao mesmo tempo.

Esse fluxo evita máscara de recorte na camada de cor sólida e depende de
seleção por `layer.id` antes de criar máscaras, porque o Photoshop pode
falhar com o comando `Criar` se a camada/grupo correto não estiver ativo.

## UX atual

- O seletor de texturas é responsivo e não deve vazar para fora do painel
  na largura mínima do plugin.
- Os sliders carregam os valores padrão da textura escolhida ao adicionar
  a camada.
- Se o usuário selecionar uma camada de textura existente, o painel tenta
  ler o Bevel & Emboss ativo e sincronizar os controles.
- O controle **Profundidade** é slider e input numérico, assim como os
  demais controles principais.

## Fontes

- PSD real gerado rodando cada ação manualmente + `psd-tools` 🟢
- Logs reais do ScriptListener para Bevel & Emboss, Texture e criação de
  máscaras 🟢
- Configs extraídas do Photoshop do cliente via copiar/inspecionar
  descriptors reais 🟢
