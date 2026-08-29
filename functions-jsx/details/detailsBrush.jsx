// Details (Iris/Catchlight/Freckles/Brows/Eyeliner/Lashes/Hair) — lado do
// host (ExtendScript / Action Manager clássico)
//
// Confirmado pelo cliente: cada botão desse accordion é um PINCEL
// específico (com forma própria, não um pincel redondo parametrizável)
// dentro de um pacote de pincéis reais (BRUSHBUNDLE 2024). Os arquivos
// .abr são grandes (15MB a 470MB) — hospedados num bucket R2
// (Cloudflare) e baixados/cacheados pelo lado do painel (js/main.js,
// via Node.js) antes de chamar essa função com o caminho local.
//
// Técnica confirmada via script real publicado num fórum da Adobe: dá
// pra SELECIONAR um pincel pelo NOME EXATO (sem precisar saber a
// posição/índice dele na lista), e CARREGAR (Append) um arquivo .abr
// inteiro nos presets de pincel atuais via Action Manager.
//
// Chamado do painel via
// csInterface.evalScript('runDetailsBrush("<nome do preset>", "<caminho local do .abr>")').

function dt_selectBrushByName(presetName) {
    // Classe da referência é "Brsh" (charID clássico), não a stringID
    // "brush" — essa era a causa do erro "comando Selecionar não
    // disponível" mesmo com o preset já carregado.
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putName(charIDToTypeID("Brsh"), presetName);
    desc.putReference(charIDToTypeID("null"), ref);
    executeAction(charIDToTypeID("slct"), desc, DialogModes.NO);
}

function dt_loadBrushFile(filePath) {
    // Mesmo idioma de "setd" na propriedade "brush" da ferramenta atual
    // já usado pra tamanho/dureza (db_setBrushSizeAndHardness) — aqui
    // trocando o valor por um CAMINHO DE ARQUIVO + "Appe" (Append) pra
    // carregar/anexar o .abr inteiro nos presets em vez de definir só
    // tamanho/dureza.
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), stringIDToTypeID("brush"));
    ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);
    desc.putPath(charIDToTypeID("T   "), new File(filePath));
    desc.putBoolean(charIDToTypeID("Appe"), true);
    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

function dt_setBrushDiameter(diameter) {
    // Depois de selecionar o preset real, ajusta só o tamanho do brush
    // ativo. Não mexe em hardness/spacing/shape para preservar a forma
    // própria de cada pincel do pacote Details.
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Prpr"), charIDToTypeID("Brsh"));
    ref.putEnumerated(charIDToTypeID("capp"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
    desc.putReference(charIDToTypeID("null"), ref);

    var brushDesc = new ActionDescriptor();
    brushDesc.putUnitDouble(charIDToTypeID("Dmtr"), charIDToTypeID("#Pxl"), diameter);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Brsh"), brushDesc);

    executeAction(charIDToTypeID("setd"), desc, DialogModes.NO);
}

/**
 * presetName: nome exato do pincel dentro do .abr (ex: "IRIS R").
 * localAbrPath: caminho local (no PC do usuário, já baixado do R2 pelo
 * painel) do arquivo .abr que contém esse pincel.
 */
function runDetailsBrush(presetName, localAbrPath) {
    // Nunca usar alert() aqui: um alert nativo do Photoshop TRAVA o
    // ExtendScript esperando clique em OK, e o evalScript do painel
    // fica pendurado esperando o retorno — pro usuário parece que o
    // modal "Baixando pincel..." travou pra sempre. Erros voltam como
    // string prefixada "ERROR:" pro painel mostrar no próprio modal.
    if (app.documents.length === 0) return "ERROR:Abra um documento antes de usar o pincel.";

    try {
        db_selectBrushTool();

        try {
            dt_selectBrushByName(presetName);
        } catch (notFoundErr) {
            // Pincel ainda não carregado nessa sessão — carrega o .abr
            // (Append, não substitui os presets existentes) e tenta de
            // novo.
            dt_loadBrushFile(localAbrPath);
            dt_selectBrushByName(presetName);
        }

        // O Photoshop 2026 (27.4.0) quebrou o "setd" de diametro do
        // brush por Action Manager (funciona liso no 2025) — confirmado
        // via log real do cliente, erro sempre nessa linha. A seleção e
        // o carregamento do pincel acontecem ANTES e continuam
        // funcionando normalmente nessa versão; só o ajuste de tamanho
        // pra 250 que falha. Isolado num try/catch próprio pra não
        // derrubar o pincel inteiro por causa só do tamanho padrão —
        // pior caso o usuário ajusta o tamanho manualmente (colchetes /
        // barra de opções), mas o pincel certo já fica selecionado.
        try {
            dt_setBrushDiameter(250);
        } catch (sizeErr) {
            // silencioso de propósito: falha aqui não é motivo pra
            // reportar erro pro usuário, o pincel já foi aplicado.
        }

        return "true";
    } catch (e) {
        return "ERROR:" + e.message + " (linha " + e.line + ")";
    }
}
