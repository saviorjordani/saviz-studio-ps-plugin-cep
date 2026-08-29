# Plugin CEP: desenvolvimento e distribuição

Este diretório documenta o plugin Photoshop CEP do Savior Jordani Studio. O
projeto editável é `savior-jordani-studio-ps-plugin-1.0-dev`; a pasta irmã
`savior-jordani-studio-ps-plugin-1.0-oficial` é gerada pelo build e é a versão
instalada no Photoshop.

## Arquitetura

| Camada | Arquivos | Responsabilidade |
| --- | --- | --- |
| Painel CEP | `index.html`, `css/`, `js/main.js` | Interface, accordions, modais e bloqueio de acesso. |
| Ponte Adobe | `functions/**/*.js` | Chama ExtendScript por `csInterface.evalScript`. |
| Host Photoshop | `functions-jsx/**/*.jsx` | Executa automações no Photoshop. |
| Autenticação | `functions/auth/pluginAuth.js` | Login, validação periódica e cache local de sessão. |
| Empacotamento | `scripts/package-test.js` | Concatena, minifica/ofusca e gera a distribuição oficial. |

O manifesto em `CSXS/manifest.xml` define a extensão CEP para Photoshop 24 ou
superior. Não é um plugin UXP.

## Licenciamento

Ao abrir, o painel exige e-mail, senha e key de ativação. Ele chama o Worker em
`https://painelsaviorjordanistudio.devhextar.site` pelas rotas
`POST /v1/plugin/login` e `POST /v1/plugin/validate`.

O plugin persiste em `ProgramData/SaviorJordaniStudio/Auth` somente:

- `device.json`: identificador aleatório do computador;
- `session.json`: token opaco e expiração da sessão.

Senha e key não são persistidas pelo plugin. Sem validação online válida, os
controles permanecem bloqueados.

## Build de distribuição & Deploy R2

```bash
npm install
npm run build:test
```

O build (`vps-build-cep.sh` / `scripts/package-test.js`) recria a pasta oficial (`savior-jordani-studio-ps-plugin-1.0-oficial`), gera o manifesto **`version.json`** com o número de build incrementado, concatena as pontes JS e scripts JSX, minifica CSS/HTML e ofusca o JavaScript do painel (`CSInterface.js` permanece intacto).

Para publicar a nova versão para o instalador nativo dos clientes:
1. Gerar o pacote `.zxp` uncompressed (`zip -r0`) a partir de `savior-jordani-studio-ps-plugin-1.0-oficial`.
2. Fazer upload de `savizstudio-ps-plugin-1.0.zxp` e `latest.json` para o bucket R2 público (`r2-storage-savizstudio` / `r2savizstudio.devhextar.site`).

## Desenvolvimento seguro

- Edite o código apenas nesta pasta `-dev`.
- Reinicie o Photoshop após alterações em `functions-jsx/**/*.jsx`.
- Para HTML, CSS, `js/main.js` ou `functions/**/*.js`, recarregue o painel.
- Não adicione segredos, senha, key de ativação ou token de sessão ao bundle ou
  aos documentos.

## Guias de automação

Os roteiros técnicos de cada ferramenta ficam em [scripts](scripts/README.md).
