/**
 * Savior Jordani Studio - Retouch Panel (CEP)
 * main.js só liga a UI aos botões — a lógica de cada função mora em
 * js/functions.js (gerado a partir de functions/*.js + functions-jsx/*.jsx,
 * ver scripts/package-test.js), acessível via window.SavizFunctions.
 */
var csInterface = new CSInterface();

// ─── Log de erros remoto (debug) ────────────────────────────────────
// Manda uma cópia de todo erro real (o mesmo que já ia só pro
// console.error) pra um servidorzinho na VPS — assim dá pra ver o que
// está dando errado no Photoshop do cliente sem depender de print
// manual. Nunca trava o painel se a rede falhar (try/catch mudo) nem
// se o Node não estiver disponível (mesma defesa usada no resto do
// projeto pra --enable-nodejs).
var SAVIZ_LOG_ENDPOINT_HOST = 'saviz-logs.devhextar.site';
var SAVIZ_LOG_ENDPOINT_PATH = '/log';
var SAVIZ_LOG_TOKEN = '3f65952e9d090a9151cf0b76b79955a35e49350bd46d72f6';

function reportErrorToVps(source, err) {
    try {
        if (typeof require !== 'function') return;
        var https = require('https');
        var payload = JSON.stringify({
            source: String(source || ''),
            message: (err && err.message) ? err.message : String(err),
            context: { ua: (typeof navigator !== 'undefined' && navigator.userAgent) || '' }
        });
        var req = https.request({
            hostname: SAVIZ_LOG_ENDPOINT_HOST,
            path: SAVIZ_LOG_ENDPOINT_PATH,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'x-saviz-token': SAVIZ_LOG_TOKEN
            }
        });
        req.on('error', function () { /* offline ou VPS fora — ignora */ });
        req.write(payload);
        req.end();
    } catch (e) { /* nunca deixa o log quebrar o painel */ }
}

// Substitui console.error(label, err) nos handlers de erro — mesma
// saída no console de sempre, mais o envio remoto.
function logErr(label, err) {
    console.error(label, err);
    reportErrorToVps(label, err);
}

// ─── Dicionário de Idiomas (i18n) ───────────────────────────────────
var translations = {
    en: {
        retouch_modes: "Retouch modes",
        acc_texture_title: "Texture",
        acc_texture_sub: "Enhance skin texture and fine details",
        acc_frequency_title: "Frequency Separation",
        acc_frequency_sub: "Separate tone and texture into layers",
        acc_dodgeburn_title: "Dodge & Burn",
        acc_dodgeburn_sub: "Build neutral layers for light sculpting",
        acc_quickselect_title: "Quick Select",
        acc_quickselect_sub: "Select skin, highlights and shadows fast",
        acc_colorcorrection_title: "Color Correction",
        acc_colorcorrection_sub: "Balance skin tone, eyes, teeth and lips",
        acc_details_title: "Details",
        acc_details_sub: "Apply real brushes for eyes, brows and hair",
        acc_skintexture_title: "Skin Texture",
        acc_skintexture_sub: "Add realistic pore and skin patterns",
        
        btn_gaussian: "Gaussian Blur",
        btn_median: "Median",
        btn_global: "Global",
        btn_macro: "Macro",
        btn_grey: "50% Grey",
        btn_skin: "Skin",
        btn_highlights: "Highlights",
        btn_shadows: "Shadows",
        btn_skintone: "Skin tone",
        btn_eyes: "Eyes",
        btn_glow: "Glow",
        btn_teeth: "Teeth",
        btn_blush: "Blush",
        btn_lips: "Lips",
        
        btn_install_brushes: "Install Brushes",
        btn_install_brushes_done: "Brushes Installed",
        btn_install_textures: "Install Textures",
        btn_install_textures_done: "Reinstall Textures",
        btn_finish: "Finish",
        
        label_angle: "Angle",
        label_altitude: "Altitude",
        label_global_light: " Global Light",
        label_size: "Size",
        label_scale: "Scale",
        label_depth: "Depth",
        label_highlights: " Highlights",
        label_shadows: " Shadows",
        label_add: "Add",
        help_title: "Help",
        account_title: "Account",
        about_title: "About the plugin",
        logout_title: "Sign out",
        account_modal_title: "My Account",
        account_sub_active: "Active Subscription",
        account_expires_label: "License Expiration:",
        account_close_btn: "Close",
        account_logout_btn: "Sign out",
        
        settings_title: "Settings",
        settings_lang: "Language / Idioma",
        settings_close: "Save & Close",
        
        help_layers_hidden: "Helping Layers Hidden",
        help_layers_visible: "Helping Layers Visible",
        help_layers_show_sub: "Show guides, markers, and helper masks",
        help_layers_hide_sub: "Hide guides, markers, and helper masks",
        help_layers_show_btn: "Show",
        help_layers_hide_btn: "Hide",
        
        tt_iris: "Click to load\nIris Brush",
        tt_catchlight: "Click to load\nCatchlight Brush",
        tt_brows: "Click to load\nBrows Brush",
        tt_eyeliner: "Click to load\nEyeliner Brush",
        tt_freckles: "Click to load\nFreckles Brush",
        tt_lashes: "Click to load\nLashes Brush",
        tt_hair: "Click to load\nHair Brush",
        
        tt_spot_healing: "Spot Healing Brush\nAutomatically removes small spots and blemishes",
        tt_magic_stamp: "Magic Stamp\nClones texture from an area to fix larger imperfections",
        tt_clone_soft: "Clone Stamp Soft\nClones texture from an area with a softer brush",
        tt_clone_hard: "Clone Stamp Hard\nClones texture from an area with a firmer brush",
        tt_remove_tool: "Remove Tool\nRemoves objects/blemishes using generative AI",
        tt_ai_edit: "AI Edit\nPaint the area and use Generative Fill to edit with AI",
        
        opt_hand_skin: "Hand & Skin",
        opt_forehead_skin: "Forehead Skin",
        opt_forehead_pores: "Forehead Pores",
        opt_highlight_texture: "Highlight Texture",
        opt_skin_highlight: "Skin Highlight Texture",
        opt_side_cheek: "Side Cheek",
        opt_cheeks_highlight: "Cheeks Highlight",
        opt_forehead_pores_ind: "Forehead Pores (Individual)",
        opt_cheek_pores_ind: "Cheek Pores (Individual)",
        
        confirm_reinstall: "Textures are already marked as installed. Only reinstall if you manually deleted the pattern group in Photoshop. Reinstall anyway?",
        msg_installing: "Installing textures...",
        msg_downloading: "Downloading texture pack (percent%)... only on the first run.",
        msg_installed_success: "Textures installed! Now choose one from the selector and click Add.",
        msg_error_install: "Error installing textures: ",
        msg_preparing: "Preparing...",
        msg_installing_brush: "Installing name (step/total)...",
        msg_installing_brush_pct: "Installing name (step/total)... percent%",
        msg_all_brushes_installed: "All brushes have been installed.",
        msg_error_install_brushes: "Error installing brushes: ",
        faq_install_q: "Do I need to install textures and brushes every time?",
        faq_install_a: "No. Install them once per machine. Reinstall only if you manually deleted the presets in Photoshop.",
        faq_texture_q: "How do I reveal an added texture?",
        faq_texture_a: "After clicking Add, paint white on the mask of the created layer or group.",
        faq_skin_sliders_q: "What do the Skin Texture sliders do?",
        faq_skin_sliders_a: "They adjust the active texture Bevel & Emboss: size, scale, depth, highlights, shadows, angle and altitude.",
        faq_highlight_q: "How does Highlight Texture work?",
        faq_highlight_a: "It creates the Paint Here group with the texture and the Adjust here layer. Paint on the group black mask to reveal the effect.",
        faq_details_q: "Why do Details buttons download files?",
        faq_details_a: "The real brushes are downloaded and cached locally. After that, the plugin uses the file saved on the machine.",
        faq_errors_q: "What should I do if Photoshop shows an error?",
        faq_errors_a: "Check that a document is open, the correct layer is active, and try reloading the plugin from the Photoshop menu.",
        faq_active_layer_q: "Which layer should be selected?",
        faq_active_layer_a: "To adjust a texture, select the layer or group created by it before changing the controls.",
        faq_numeric_q: "Can I type values into the sliders?",
        faq_numeric_a: "Yes. Use the numeric field beside the slider for exact values, or drag the slider for quick adjustments.",
        faq_angle_q: "Why does changing the angle affect the light?",
        faq_angle_a: "Angle controls the direction of the active texture Bevel & Emboss. Turn Global Light off to keep the adjustment independent.",
        faq_masks_q: "Why are some layers created hidden?",
        faq_masks_a: "Black masks hide the effect so you can paint only where needed while keeping the adjustment non-destructive.",
        faq_strength_q: "How do I reduce a texture strength?",
        faq_strength_a: "Lower Depth, Highlights, Shadows or the layer opacity/fill depending on the texture type.",
        faq_reload_q: "When should I reload the plugin?",
        faq_reload_a: "Reload it if Photoshop blocks a command, a button stops responding, or after updating the plugin folder."
    },
    pt: {
        retouch_modes: "Modos de retoque",
        acc_texture_title: "Textura",
        acc_texture_sub: "Melhore a textura da pele e detalhes finos",
        acc_frequency_title: "Separação de Frequência",
        acc_frequency_sub: "Separe o tom e a textura em camadas",
        acc_dodgeburn_title: "Dodge & Burn",
        acc_dodgeburn_sub: "Crie camadas neutras para esculpir a luz",
        acc_quickselect_title: "Seleção Rápida",
        acc_quickselect_sub: "Selecione pele, realces e sombras rapidamente",
        acc_colorcorrection_title: "Correção de Cor",
        acc_colorcorrection_sub: "Equilibre o tom de pele, olhos, dentes e lábios",
        acc_details_title: "Detalhes",
        acc_details_sub: "Pincéis para olhos, sobrancelhas e cabelos",
        acc_skintexture_title: "Textura de Pele",
        acc_skintexture_sub: "Adicione poros e padrões de pele realistas",
        
        btn_gaussian: "Desfoque Gaussiano",
        btn_median: "Mediana",
        btn_global: "Global",
        btn_macro: "Macro",
        btn_grey: "50% Cinza",
        btn_skin: "Pele",
        btn_highlights: "Realces",
        btn_shadows: "Sombras",
        btn_skintone: "Tom de pele",
        btn_eyes: "Olhos",
        btn_glow: "Brilho",
        btn_teeth: "Dentes",
        btn_blush: "Blush",
        btn_lips: "Lábios",
        
        btn_install_brushes: "Instalar Pincéis",
        btn_install_brushes_done: "Pincéis Instalados",
        btn_install_textures: "Instalar Texturas",
        btn_install_textures_done: "Reinstalar Texturas",
        btn_finish: "Finalizar",
        
        label_angle: "Ângulo",
        label_altitude: "Altitude",
        label_global_light: " Luz Global",
        label_size: "Tamanho",
        label_scale: "Escala",
        label_depth: "Profundidade",
        label_highlights: " Realces",
        label_shadows: " Sombras",
        label_add: "Adicionar",
        help_title: "Ajuda",
        account_title: "Conta",
        about_title: "Sobre o plugin",
        logout_title: "Sair",
        account_modal_title: "Minha Conta",
        account_sub_active: "Assinatura Ativa",
        account_expires_label: "Validade da Licença:",
        account_close_btn: "Fechar",
        account_logout_btn: "Sair da Conta",
        
        settings_title: "Configurações",
        settings_lang: "Language / Idioma",
        settings_close: "Salvar & Fechar",
        
        help_layers_hidden: "Helping Layers Oculto",
        help_layers_visible: "Helping Layers Visível",
        help_layers_show_sub: "Mostrar guias, marcadores e máscaras de ajuda",
        help_layers_hide_sub: "Ocultar guias, marcadores e máscaras de ajuda",
        help_layers_show_btn: "Mostrar",
        help_layers_hide_btn: "Ocultar",
        
        tt_iris: "Clique para carregar\nPincel de Íris",
        tt_catchlight: "Clique para carregar\nPincel de Catchlight",
        tt_brows: "Clique para carregar\nPincel de Sobrancelhas",
        tt_eyeliner: "Clique para carregar\nPincel de Delineador",
        tt_freckles: "Clique para carregar\nPincel de Sardas",
        tt_lashes: "Clique para carregar\nPincel de Cílios",
        tt_hair: "Clique para carregar\nPincel de Cabelo",
        
        tt_spot_healing: "Pincel de Recuperação de Manchas\nRemove automaticamente pequenas manchas e imperfeições",
        tt_magic_stamp: "Carimbo Mágico\nClona a textura de uma área para corrigir imperfeições maiores",
        tt_clone_soft: "Carimbo de Clone Suave\nClona a textura de uma área com um pincel mais suave",
        tt_clone_hard: "Carimbo de Clone Firme\nClona a textura de uma área com um pincel mais firme",
        tt_remove_tool: "Ferramenta de Remoção\nRemove objetos/manchas usando inteligência artificial generativa",
        tt_ai_edit: "Edição com IA\nPinte a área e use o Preenchimento Generativo para editar com IA",
        
        opt_hand_skin: "Pele e Mãos",
        opt_forehead_skin: "Pele da Testa",
        opt_forehead_pores: "Poros da Testa",
        opt_highlight_texture: "Textura de Realce",
        opt_skin_highlight: "Textura Realce Pele",
        opt_side_cheek: "Bochecha Lateral",
        opt_cheeks_highlight: "Realce Bochechas",
        opt_forehead_pores_ind: "Poros da Testa (Individual)",
        opt_cheek_pores_ind: "Cheek Pores (Individual)",
        
        confirm_reinstall: "As texturas já estão marcadas como instaladas. Só reinstale se você apagou o grupo de patterns manualmente no Photoshop — reinstalar com as texturas ainda lá cria duplicata. Reinstalar mesmo assim?",
        msg_installing: "Instalando texturas...",
        msg_downloading: "Baixando pacote de texturas (percent%)... só na primeira vez.",
        msg_installed_success: "Texturas instaladas! Agora é só escolher uma no seletor e clicar em Add.",
        msg_error_install: "Erro ao instalar as texturas: ",
        msg_preparing: "Preparando...",
        msg_installing_brush: "Instalando name (step/total)...",
        msg_installing_brush_pct: "Instalando name (step/total)... percent%",
        msg_all_brushes_installed: "Todos os pincéis foram instalados.",
        msg_error_install_brushes: "Erro ao instalar pincéis: ",
        faq_install_q: "Preciso instalar texturas e pincéis toda vez?",
        faq_install_a: "Não. Instale uma vez por máquina. Reinstale só se apagar os presets manualmente no Photoshop.",
        faq_texture_q: "Como revelar uma textura adicionada?",
        faq_texture_a: "Depois de clicar Add, pinte de branco na máscara da camada ou do grupo criado.",
        faq_skin_sliders_q: "O que os sliders de Skin Texture fazem?",
        faq_skin_sliders_a: "Eles ajustam o Bevel & Emboss da textura ativa: tamanho, escala, profundidade, realces, sombras, ângulo e altitude.",
        faq_highlight_q: "Como funciona a Highlight Texture?",
        faq_highlight_a: "Ela cria o grupo Paint Here com a textura e a camada Adjust here. Pinte na máscara preta do grupo para revelar o efeito.",
        faq_details_q: "Por que o botão de Details baixa arquivos?",
        faq_details_a: "Os pincéis reais são baixados e cacheados localmente. Depois disso, o plugin usa o arquivo salvo na máquina.",
        faq_errors_q: "O que fazer se aparecer erro do Photoshop?",
        faq_errors_a: "Confira se há um documento aberto, se a camada correta está ativa e tente recarregar o plugin pelo menu do Photoshop.",
        faq_active_layer_q: "Qual camada precisa estar selecionada?",
        faq_active_layer_a: "Para ajustar uma textura, selecione a camada ou o grupo criado por ela antes de mexer nos controles.",
        faq_numeric_q: "Posso digitar valores nos sliders?",
        faq_numeric_a: "Sim. Use o campo numérico ao lado do slider para valores exatos, ou arraste o slider para ajuste rápido.",
        faq_angle_q: "Por que mudar o ângulo altera a luz?",
        faq_angle_a: "O ângulo controla a direção do Bevel & Emboss da textura ativa. Use Luz Global desligada para manter o ajuste independente.",
        faq_masks_q: "Por que algumas camadas nascem escondidas?",
        faq_masks_a: "As máscaras pretas escondem o efeito para você pintar só onde precisar, mantendo o ajuste não destrutivo.",
        faq_strength_q: "Como reduzo a força de uma textura?",
        faq_strength_a: "Reduza Profundidade, Realces, Sombras ou a opacidade/preenchimento da camada conforme o tipo de textura.",
        faq_reload_q: "Quando devo recarregar o plugin?",
        faq_reload_a: "Recarregue se o Photoshop bloquear um comando, se algum botão parar de responder ou depois de atualizar a pasta do plugin."
    }
};

function applyLanguage(lang) {
    if (!translations[lang]) lang = 'en';
    
    // Salva a preferência
    localStorage.setItem('saviz-lang', lang);
    
    // Atualiza os elementos com data-i18n
    var elements = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var key = el.getAttribute('data-i18n');
        if (translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    }
    
    // Atualiza elementos com data-i18n-title (tooltips)
    var titleElements = document.querySelectorAll('[data-i18n-title]');
    for (var i = 0; i < titleElements.length; i++) {
        var el = titleElements[i];
        var key = el.getAttribute('data-i18n-title');
        if (translations[lang][key]) {
            el.setAttribute('title', translations[lang][key]);
        }
    }
    
    // Dropdown options (data-label)
    var dropdownOptions = document.querySelectorAll('.skin-texture-select-option');
    for (var i = 0; i < dropdownOptions.length; i++) {
        var opt = dropdownOptions[i];
        var span = opt.querySelector('span[data-i18n]');
        if (span) {
            var key = span.getAttribute('data-i18n');
            if (translations[lang][key]) {
                opt.setAttribute('data-label', translations[lang][key]);
            }
        }
    }
    
    // Label selecionada do Skin Texture
    var activeOption = document.querySelector('.skin-texture-select-option.selected');
    if (activeOption && skinTextureSelectedLabel) {
        skinTextureSelectedLabel.textContent = activeOption.getAttribute('data-label');
    }
    
    // Sincroniza o seletor personalizado do modal
    var triggerText = lang === 'pt' ? 'Português' : 'English';
    var languageSelectedLabel = document.getElementById('languageSelectedLabel');
    if (languageSelectedLabel) languageSelectedLabel.textContent = triggerText;
    
    var options = document.querySelectorAll('.settings-select-option');
    for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        if (opt.getAttribute('data-value') === lang) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    }
    
    // Sincroniza labels dinâmicas dos botões de install
    if (typeof refreshSkinTextureInstallState === 'function') {
        refreshSkinTextureInstallState();
    }
    if (typeof refreshDetailsInstallAllState === 'function') {
        refreshDetailsInstallAllState();
    }
}

translations.en.msg_texture_added = '"name" added! Paint white on the mask to reveal the texture.';
translations.en.msg_error_add_texture = 'Error adding texture: ';
translations.pt.msg_texture_added = '"name" adicionada! Pinte de branco na máscara para revelar a textura.';
translations.pt.msg_error_add_texture = 'Erro ao adicionar a textura: ';

translations.en.about_title = 'About the plugin';
translations.en.about_version = 'Version 1.0.0';
translations.en.about_rights = 'All rights reserved.';
translations.en.about_close = 'Close';

translations.pt.about_title = 'Sobre o plugin';
translations.pt.about_version = 'Versão 1.0.0';
translations.pt.about_rights = 'Todos os direitos reservados.';
translations.pt.about_close = 'Fechar';

// ─── Modal do painel (substitui alert() nativo do Photoshop pra avisos
// que não são erro de script) ───────────────────────────────────────

var panelModalOverlay = document.getElementById('panelModalOverlay');
var panelModalIcon = document.getElementById('panelModalIcon');
var panelModalTitle = document.getElementById('panelModalTitle');
var panelModalMessage = document.getElementById('panelModalMessage');
var panelModalCloseBtn = document.getElementById('panelModalCloseBtn');

// icon: 'loading' | 'success' | 'error' | undefined (sem ícone)
function setPanelModalIcon(icon) {
    if (icon === 'loading') {
        panelModalIcon.innerHTML = '<div class="panel-modal-spinner"></div>';
        panelModalIcon.classList.remove('hidden');
    } else if (icon === 'success') {
        panelModalIcon.innerHTML = '<div class="panel-modal-check"></div>';
        panelModalIcon.classList.remove('hidden');
    } else if (icon === 'error') {
        panelModalIcon.innerHTML = '<div class="panel-modal-error"></div>';
        panelModalIcon.classList.remove('hidden');
    } else {
        panelModalIcon.innerHTML = '';
        panelModalIcon.classList.add('hidden');
    }
}

function showPanelModal(title, message, icon) {
    panelModalTitle.textContent = title;
    panelModalMessage.textContent = message;
    setPanelModalIcon(icon);
    panelModalOverlay.classList.add('open');
}

panelModalCloseBtn.addEventListener('click', function () {
    panelModalOverlay.classList.remove('open');
});

// ─── Licença do plugin ──────────────────────────────────────────────
// O Worker é a fonte de verdade. A chave nunca fica no HTML/localStorage:
// só a sessão curta e o id aleatório do dispositivo ficam no cache local.
var pluginAuthLoginModal = document.getElementById('pluginAuthLoginModal');
var pluginAuthActivateModal = document.getElementById('pluginAuthActivateModal');

var pluginAuthLoginForm = document.getElementById('pluginAuthLoginForm');
var pluginLoginEmail = document.getElementById('pluginLoginEmail');
var pluginLoginPassword = document.getElementById('pluginLoginPassword');
var pluginLoginSubmit = document.getElementById('pluginLoginSubmit');
var pluginLoginMessage = document.getElementById('pluginLoginMessage');

var pluginActivateForm = document.getElementById('pluginActivateForm');
var pluginActivateEmail = document.getElementById('pluginActivateEmail');
var pluginActivatePassword = document.getElementById('pluginActivatePassword');
var pluginActivationKey = document.getElementById('pluginActivationKey');
var pluginActivateSubmit = document.getElementById('pluginActivateSubmit');
var pluginActivateMessage = document.getElementById('pluginActivateMessage');

var pluginSwitchToActivateBtn = document.getElementById('pluginSwitchToActivateBtn');
var pluginSwitchToLoginBtn = document.getElementById('pluginSwitchToLoginBtn');

function setAuthMessage(el, message, state) {
    if (!el) return;
    el.textContent = message || '';
    el.classList.remove('error', 'success');
    if (state) el.classList.add(state);
}

function setPluginAuthBusy(busy) {
    if (pluginLoginSubmit) pluginLoginSubmit.disabled = !!busy;
    if (pluginLoginEmail) pluginLoginEmail.disabled = !!busy;
    if (pluginLoginPassword) pluginLoginPassword.disabled = !!busy;

    if (pluginActivateSubmit) pluginActivateSubmit.disabled = !!busy;
    if (pluginActivateEmail) pluginActivateEmail.disabled = !!busy;
    if (pluginActivatePassword) pluginActivatePassword.disabled = !!busy;
    if (pluginActivationKey) pluginActivationKey.disabled = !!busy;
}

function showLoginModal(message) {
    if (pluginAuthActivateModal) pluginAuthActivateModal.classList.remove('open');
    if (pluginAuthLoginModal) pluginAuthLoginModal.classList.add('open');
    if (message) setAuthMessage(pluginLoginMessage, message, 'error');
    if (pluginLoginEmail) pluginLoginEmail.focus();
}

function showActivateModal(message) {
    if (pluginAuthLoginModal) pluginAuthLoginModal.classList.remove('open');
    if (pluginAuthActivateModal) pluginAuthActivateModal.classList.add('open');
    if (message) setAuthMessage(pluginActivateMessage, message, 'error');
    if (pluginActivateEmail) pluginActivateEmail.focus();
}

var currentAuthUser = null;

function unlockPluginAuth(user) {
    if (user) currentAuthUser = user;
    var label = user && user.email ? 'Login realizado: ' + user.email : 'Login realizado.';
    setAuthMessage(pluginLoginMessage, label, 'success');
    setAuthMessage(pluginActivateMessage, label, 'success');
    if (pluginAuthLoginModal) pluginAuthLoginModal.classList.remove('open');
    if (pluginAuthActivateModal) pluginAuthActivateModal.classList.remove('open');
}

function openAccountModal() {
    var savizAccountModal = document.getElementById('savizAccountModal');
    var savizAccountEmail = document.getElementById('savizAccountEmail');
    var savizAccountStatus = document.getElementById('savizAccountStatus');
    var savizAccountExpires = document.getElementById('savizAccountExpires');

    if (savizAccountEmail) {
        savizAccountEmail.textContent = (currentAuthUser && currentAuthUser.email) ? currentAuthUser.email : 'Usuário Autenticado';
    }
    if (savizAccountStatus) {
        savizAccountStatus.textContent = 'Assinatura Ativa';
    }
    if (savizAccountExpires) {
        if (currentAuthUser && currentAuthUser.expiresAt) {
            var expDate = new Date(currentAuthUser.expiresAt);
            savizAccountExpires.textContent = !isNaN(expDate.getTime()) ? expDate.toLocaleDateString('pt-BR') : 'Ativa';
        } else {
            savizAccountExpires.textContent = 'Ativa (Anual)';
        }
    }
    if (savizAccountModal) savizAccountModal.classList.add('open');
}

function closeAccountModal() {
    var savizAccountModal = document.getElementById('savizAccountModal');
    if (savizAccountModal) savizAccountModal.classList.remove('open');
}

function logoutPluginUser() {
    if (window.SavizFunctions && typeof window.SavizFunctions.clearPluginSession === 'function') {
        window.SavizFunctions.clearPluginSession();
    }
    currentAuthUser = null;
    closeAccountModal();
    showLoginModal('Você saiu da sua conta.');
}

var savizAccountCloseX = document.getElementById('savizAccountCloseX');
var savizAccountCloseBtn = document.getElementById('savizAccountCloseBtn');
var savizAccountLogoutBtn = document.getElementById('savizAccountLogoutBtn');

if (savizAccountCloseX) savizAccountCloseX.addEventListener('click', closeAccountModal);
if (savizAccountCloseBtn) savizAccountCloseBtn.addEventListener('click', closeAccountModal);
if (savizAccountLogoutBtn) savizAccountLogoutBtn.addEventListener('click', logoutPluginUser);

function validatePluginAuth() {
    if (!window.SavizFunctions || typeof window.SavizFunctions.validatePluginLicense !== 'function') {
        showLoginModal('Não foi possível carregar o módulo de autenticação. Reinstale o plugin.');
        return;
    }
    setPluginAuthBusy(true);
    setAuthMessage(pluginLoginMessage, 'Verificando sua sessão...');
    window.SavizFunctions.validatePluginLicense().then(function (result) {
        if (result && result.valid) {
            unlockPluginAuth(result.user);
            return;
        }
        showLoginModal(result && result.reason ? result.reason : 'Entre com e-mail e senha.');
    }).catch(function (error) {
        showLoginModal(error && error.message ? error.message : 'Não foi possível validar sua sessão.');
        logErr('Erro na validação da sessão:', error);
    }).finally(function () {
        setPluginAuthBusy(false);
    });
}

if (pluginSwitchToActivateBtn) {
    pluginSwitchToActivateBtn.addEventListener('click', function () {
        showActivateModal();
    });
}

if (pluginSwitchToLoginBtn) {
    pluginSwitchToLoginBtn.addEventListener('click', function () {
        showLoginModal();
    });
}

if (pluginAuthLoginForm) {
    pluginAuthLoginForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!window.SavizFunctions || typeof window.SavizFunctions.loginPluginUser !== 'function') {
            setAuthMessage(pluginLoginMessage, 'Não foi possível carregar o módulo de autenticação.', 'error');
            return;
        }
        setPluginAuthBusy(true);
        setAuthMessage(pluginLoginMessage, 'Entrando...');
        window.SavizFunctions.loginPluginUser(pluginLoginEmail ? pluginLoginEmail.value : '', pluginLoginPassword ? pluginLoginPassword.value : '').then(function (result) {
            if (pluginLoginPassword) pluginLoginPassword.value = '';
            unlockPluginAuth(result.user);
        }).catch(function (error) {
            setAuthMessage(pluginLoginMessage, error && error.message ? error.message : 'Não foi possível entrar.', 'error');
            logErr('Erro no login do plugin:', error);
        }).finally(function () {
            setPluginAuthBusy(false);
        });
    });
}

if (pluginActivateForm) {
    pluginActivateForm.addEventListener('submit', function (event) {
        event.preventDefault();
        if (!window.SavizFunctions || typeof window.SavizFunctions.loginPluginUser !== 'function') {
            setAuthMessage(pluginActivateMessage, 'Não foi possível carregar o módulo de autenticação.', 'error');
            return;
        }
        setPluginAuthBusy(true);
        setAuthMessage(pluginActivateMessage, 'Ativando licença...');
        window.SavizFunctions.loginPluginUser(pluginActivateEmail ? pluginActivateEmail.value : '', pluginActivatePassword ? pluginActivatePassword.value : '', pluginActivationKey ? pluginActivationKey.value : '').then(function (result) {
            if (pluginActivatePassword) pluginActivatePassword.value = '';
            if (pluginActivationKey) pluginActivationKey.value = '';
            unlockPluginAuth(result.user);
        }).catch(function (error) {
            setAuthMessage(pluginActivateMessage, error && error.message ? error.message : 'Não foi possível ativar a licença.', 'error');
            logErr('Erro na ativação do plugin:', error);
        }).finally(function () {
            setPluginAuthBusy(false);
        });
    });
}

validatePluginAuth();

// ─── Menu hambúrguer do header (dropdown do painel, não o flyout do CEP) ──
var savizHeaderMenuTrigger = document.getElementById('savizHeaderMenuTrigger');
var savizHeaderMenuDropdown = document.getElementById('savizHeaderMenuDropdown');

if (savizHeaderMenuTrigger && savizHeaderMenuDropdown) {
    savizHeaderMenuTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        savizHeaderMenuDropdown.classList.toggle('hidden');
    });

    savizHeaderMenuDropdown.addEventListener('click', function (e) {
        var row = e.target.closest('.saviz-header-menu-option');
        if (!row) return;
        savizHeaderMenuDropdown.classList.add('hidden');
        
        var val = row.getAttribute('data-value');
        if (val === 'account') {
            if (currentAuthUser) {
                openAccountModal();
            } else {
                showLoginModal();
            }
        } else if (val === 'logout') {
            logoutPluginUser();
        } else if (val === 'help') {
            if (savizHelpModal) savizHelpModal.classList.add('open');
        } else if (val === 'settings') {
            if (savizSettingsModal) savizSettingsModal.classList.add('open');
        } else if (val === 'about') {
            if (savizAboutModal) savizAboutModal.classList.add('open');
        }
    });

    document.addEventListener('click', function (e) {
        if (!savizHeaderMenuDropdown.contains(e.target) && e.target !== savizHeaderMenuTrigger) {
            savizHeaderMenuDropdown.classList.add('hidden');
        }
    });
}

// ─── Modal de Configurações ──────────────────────────────────────────
var savizSettingsModal = document.getElementById('savizSettingsModal');
var languageSelectTrigger = document.getElementById('languageSelectTrigger');
var languageSelectDropdown = document.getElementById('languageSelectDropdown');
var savizSettingsCloseBtn = document.getElementById('savizSettingsCloseBtn');
var savizSettingsCloseX = document.getElementById('savizSettingsCloseX');

function closeSettingsModal() {
    if (savizSettingsModal) savizSettingsModal.classList.remove('open');
    if (languageSelectDropdown) languageSelectDropdown.classList.add('hidden');
    if (languageSelectTrigger) languageSelectTrigger.classList.remove('open');
}

if (savizSettingsCloseBtn) {
    savizSettingsCloseBtn.addEventListener('click', closeSettingsModal);
}

if (savizSettingsCloseX) {
    savizSettingsCloseX.addEventListener('click', closeSettingsModal);
}

if (languageSelectTrigger && languageSelectDropdown) {
    languageSelectTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = languageSelectDropdown.classList.toggle('hidden');
        languageSelectTrigger.classList.toggle('open', !open);
    });
    
    languageSelectDropdown.addEventListener('click', function (e) {
        var option = e.target.closest('.settings-select-option');
        if (!option) return;
        
        var val = option.getAttribute('data-value');
        applyLanguage(val);
        
        languageSelectDropdown.classList.add('hidden');
        languageSelectTrigger.classList.remove('open');
    });
    
    document.addEventListener('click', function (e) {
        if (!languageSelectDropdown.contains(e.target) && e.target !== languageSelectTrigger) {
            languageSelectDropdown.classList.add('hidden');
            languageSelectTrigger.classList.remove('open');
        }
    });
}

// ─── Modal Sobre o Plugin ────────────────────────────────────────────
var savizAboutModal = document.getElementById('savizAboutModal');
var savizAboutCloseBtn = document.getElementById('savizAboutCloseBtn');
var savizAboutCloseX = document.getElementById('savizAboutCloseX');

function closeAboutModal() {
    if (savizAboutModal) savizAboutModal.classList.remove('open');
}

if (savizAboutCloseBtn) {
    savizAboutCloseBtn.addEventListener('click', closeAboutModal);
}
if (savizAboutCloseX) {
    savizAboutCloseX.addEventListener('click', closeAboutModal);
}

// ─── Modal de Ajuda ────────────────────────────────────────────────────
var savizHelpModal = document.getElementById('savizHelpModal');
var savizHelpCloseBtn = document.getElementById('savizHelpCloseBtn');
var savizHelpCloseX = document.getElementById('savizHelpCloseX');
var helpFaqList = document.querySelector('.help-faq-list');

function closeHelpModal() {
    if (savizHelpModal) savizHelpModal.classList.remove('open');
}

if (savizHelpCloseBtn) {
    savizHelpCloseBtn.addEventListener('click', closeHelpModal);
}

if (savizHelpCloseX) {
    savizHelpCloseX.addEventListener('click', closeHelpModal);
}

if (helpFaqList) {
    helpFaqList.addEventListener('click', function (e) {
        var trigger = e.target.closest('.help-faq-question');
        if (!trigger) return;
        var item = trigger.closest('.help-faq-item');
        if (!item) return;
        item.classList.toggle('open');
    });
}

var helpingLayersBtn = document.getElementById('helpingLayersBtn');
var helpingLayersTitle = document.getElementById('helpingLayersTitle');
var helpingLayersToggleText = document.getElementById('helpingLayersToggleText');
var helpingLayersIconHide = document.getElementById('helpingLayersIconHide');
var helpingLayersIconShow = document.getElementById('helpingLayersIconShow');

helpingLayersBtn.addEventListener('click', function () {
    helpingLayersBtn.disabled = true;
    window.SavizFunctions.toggleHelpingLayers().then(function (visible) {
        var lang = localStorage.getItem('saviz-lang') || 'en';
        helpingLayersTitle.textContent = visible ? translations[lang].help_layers_visible : translations[lang].help_layers_hidden;
        helpingLayersToggleText.textContent = visible ? translations[lang].help_layers_hide_btn : translations[lang].help_layers_show_btn;
        // Os dois ícones (olho aberto/fechado) já vêm embutidos no HTML
        // no build (assets/ não é copiado pra -oficial, só inlineado) —
        // trocar "src" em runtime pra um caminho ./assets/... quebraria
        // nessa pasta, então só alterna qual dos dois fica visível.
        helpingLayersIconHide.classList.toggle('hidden', !visible);
        helpingLayersIconShow.classList.toggle('hidden', visible);
    }).catch(function (err) {
        logErr('Erro ao alternar Helping Layers:', err);
    }).finally(function () {
        helpingLayersBtn.disabled = false;
    });
});

// ─── Texture Finish (botão fixo acima do footer) ───────────────────
// Mescla tudo que está visível numa camada nova (equivalente a
// Ctrl+Alt+Shift+E), nomeada "<camada ativa no momento do clique>
// Finished" — ver runTextureFinish no host.
var textureFinishBtn = document.getElementById('textureFinishBtn');

if (textureFinishBtn) {
    textureFinishBtn.addEventListener('click', function () {
        textureFinishBtn.disabled = true;
        showPanelModal('Finish', 'Mesclando camadas...', 'loading');
        window.SavizFunctions.runTextureFinish().then(function () {
            setPanelModalIcon('success');
            panelModalMessage.textContent = 'Camada finalizada criada.';
        }).catch(function (err) {
            setPanelModalIcon('error');
            panelModalMessage.textContent = 'Erro ao finalizar: ' + (err && err.message ? err.message : err);
            logErr('Erro em Texture Finish:', err);
        }).finally(function () {
            textureFinishBtn.disabled = false;
        });
    });
}

// ─── Frequency Separation ───────────────────────────────────────────

function bindFrequencyButton(btnId, method) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    btn.addEventListener('click', function () {
        btn.disabled = true;
        window.SavizFunctions.runFrequencySeparation(method).catch(function (err) {
            logErr('Erro em Frequency Separation (' + method + '):', err);
        }).finally(function () {
            btn.disabled = false;
        });
    });
}
bindFrequencyButton('fsGaussianBtn', 'gaussian');
bindFrequencyButton('fsMedianBtn', 'median');

// ─── Dodge & Burn ───────────────────────────────────────────────────

var dbGlobalBtn = document.getElementById('dbGlobalBtn');
if (dbGlobalBtn) {
    dbGlobalBtn.addEventListener('click', function () {
        dbGlobalBtn.disabled = true;
        window.SavizFunctions.runDodgeAndBurnGlobal().catch(function (err) {
            logErr('Erro em Dodge & Burn (Global):', err);
        }).finally(function () {
            dbGlobalBtn.disabled = false;
        });
    });
}

var dbMacroBtn = document.getElementById('dbMacroBtn');
if (dbMacroBtn) {
    dbMacroBtn.addEventListener('click', function () {
        dbMacroBtn.disabled = true;
        window.SavizFunctions.runDodgeAndBurnMacro().catch(function (err) {
            logErr('Erro em Dodge & Burn (Macro):', err);
        }).finally(function () {
            dbMacroBtn.disabled = false;
        });
    });
}

var dbGreyBtn = document.getElementById('dbGreyBtn');
if (dbGreyBtn) {
    dbGreyBtn.addEventListener('click', function () {
        dbGreyBtn.disabled = true;
        window.SavizFunctions.runDodgeAndBurnGrey().catch(function (err) {
            logErr('Erro em Dodge & Burn (50% Grey):', err);
        }).finally(function () {
            dbGreyBtn.disabled = false;
        });
    });
}

// ─── Quick Select ───────────────────────────────────────────────────

var qsSkinBtn = document.getElementById('qsSkinBtn');
if (qsSkinBtn) {
    qsSkinBtn.addEventListener('click', function () {
        qsSkinBtn.disabled = true;
        window.SavizFunctions.runQuickSelectSkin().catch(function (err) {
            logErr('Erro em Quick Select (Skin):', err);
        }).finally(function () {
            qsSkinBtn.disabled = false;
        });
    });
}

var qsHighlightsBtn = document.getElementById('qsHighlightsBtn');
if (qsHighlightsBtn) {
    qsHighlightsBtn.addEventListener('click', function () {
        qsHighlightsBtn.disabled = true;
        window.SavizFunctions.runQuickSelectHighlights().catch(function (err) {
            logErr('Erro em Quick Select (Highlights):', err);
        }).finally(function () {
            qsHighlightsBtn.disabled = false;
        });
    });
}

var qsShadowsBtn = document.getElementById('qsShadowsBtn');
if (qsShadowsBtn) {
    qsShadowsBtn.addEventListener('click', function () {
        qsShadowsBtn.disabled = true;
        window.SavizFunctions.runQuickSelectShadows().catch(function (err) {
            logErr('Erro em Quick Select (Shadows):', err);
        }).finally(function () {
            qsShadowsBtn.disabled = false;
        });
    });
}

// ─── Texture ────────────────────────────────────────────────────────

var textureSpotHealingBtn = document.getElementById('textureSpotHealingBtn');
if (textureSpotHealingBtn) {
    textureSpotHealingBtn.addEventListener('click', function () {
        textureSpotHealingBtn.disabled = true;
        window.SavizFunctions.runTextureSpotHealing().catch(function (err) {
            logErr('Erro em Texture (Spot Healing Brush):', err);
        }).finally(function () {
            textureSpotHealingBtn.disabled = false;
        });
    });
}

var textureMagicStampBtn = document.getElementById('textureMagicStampBtn');
if (textureMagicStampBtn) {
    textureMagicStampBtn.addEventListener('click', function () {
        textureMagicStampBtn.disabled = true;
        window.SavizFunctions.runTextureMagicStamp().catch(function (err) {
            logErr('Erro em Texture (Magic Stamp):', err);
        }).finally(function () {
            textureMagicStampBtn.disabled = false;
        });
    });
}

var textureCloneStampBtn = document.getElementById('textureCloneStampBtn');
if (textureCloneStampBtn) {
    textureCloneStampBtn.addEventListener('click', function () {
        textureCloneStampBtn.disabled = true;
        window.SavizFunctions.runTextureCloneStamp().catch(function (err) {
            logErr('Erro em Texture (Clone Stamp Soft):', err);
        }).finally(function () {
            textureCloneStampBtn.disabled = false;
        });
    });
}

var textureCloneStampHardBtn = document.getElementById('textureCloneStampHardBtn');
if (textureCloneStampHardBtn) {
    textureCloneStampHardBtn.addEventListener('click', function () {
        textureCloneStampHardBtn.disabled = true;
        window.SavizFunctions.runTextureCloneStampHard().catch(function (err) {
            logErr('Erro em Texture (Clone Stamp Hard):', err);
        }).finally(function () {
            textureCloneStampHardBtn.disabled = false;
        });
    });
}

var textureRemoveToolBtn = document.getElementById('textureRemoveToolBtn');
if (textureRemoveToolBtn) {
    textureRemoveToolBtn.addEventListener('click', function () {
        textureRemoveToolBtn.disabled = true;
        window.SavizFunctions.runTextureRemoveTool().then(function (success) {
            if (success) {
                showPanelModal('Antes de usar', 'Marque a opção "Obter amostra de todas as camadas" na barra de opções superior para a ferramenta funcionar nessa camada vazia.');
            }
        }).catch(function (err) {
            logErr('Erro em Texture (Remove Tool):', err);
        }).finally(function () {
            textureRemoveToolBtn.disabled = false;
        });
    });
}

var textureAiEditBtn = document.getElementById('textureAiEditBtn');
var aiEditApplyBar = document.getElementById('aiEditApplyBar');
var aiEditApplyBtn = document.getElementById('aiEditApplyBtn');
var aiEditCancelBtn = document.getElementById('aiEditCancelBtn');

if (textureAiEditBtn) {
    textureAiEditBtn.addEventListener('click', function () {
        textureAiEditBtn.disabled = true;
        window.SavizFunctions.runTextureAiEdit().then(function (success) {
            if (success) aiEditApplyBar.classList.remove('hidden');
        }).catch(function (err) {
            logErr('Erro em Texture (AI Edit):', err);
        }).finally(function () {
            textureAiEditBtn.disabled = false;
        });
    });
}

if (aiEditApplyBtn) {
    aiEditApplyBtn.addEventListener('click', function () {
        aiEditApplyBtn.disabled = true;
        window.SavizFunctions.runTextureAiEditApply().then(function () {
            aiEditApplyBar.classList.add('hidden');
        }).catch(function (err) {
            logErr('Erro em Texture (AI Edit - Apply):', err);
        }).finally(function () {
            aiEditApplyBtn.disabled = false;
        });
    });
}

if (aiEditCancelBtn) {
    aiEditCancelBtn.addEventListener('click', function () {
        aiEditCancelBtn.disabled = true;
        window.SavizFunctions.runTextureAiEditCancel().then(function () {
            aiEditApplyBar.classList.add('hidden');
        }).catch(function (err) {
            logErr('Erro em Texture (AI Edit - Cancel):', err);
        }).finally(function () {
            aiEditCancelBtn.disabled = false;
        });
    });
}

var ccSkinToneBtn = document.getElementById('ccSkinToneBtn');
if (ccSkinToneBtn) {
    ccSkinToneBtn.addEventListener('click', function () {
        ccSkinToneBtn.disabled = true;
        window.SavizFunctions.runColorCorrectionSkinTone().catch(function (err) {
            logErr('Erro em Color Correction (Skin tone):', err);
        }).finally(function () {
            ccSkinToneBtn.disabled = false;
        });
    });
}

var ccEyesBtn = document.getElementById('ccEyesBtn');
if (ccEyesBtn) {
    ccEyesBtn.addEventListener('click', function () {
        ccEyesBtn.disabled = true;
        window.SavizFunctions.runColorCorrectionEyes().catch(function (err) {
            logErr('Erro em Color Correction (Eyes):', err);
        }).finally(function () {
            ccEyesBtn.disabled = false;
        });
    });
}

var ccGlowBtn = document.getElementById('ccGlowBtn');
if (ccGlowBtn) {
    ccGlowBtn.addEventListener('click', function () {
        ccGlowBtn.disabled = true;
        window.SavizFunctions.runColorCorrectionGlow().catch(function (err) {
            logErr('Erro em Color Correction (Glow):', err);
        }).finally(function () {
            ccGlowBtn.disabled = false;
        });
    });
}

var ccTeethBtn = document.getElementById('ccTeethBtn');
if (ccTeethBtn) {
    ccTeethBtn.addEventListener('click', function () {
        ccTeethBtn.disabled = true;
        window.SavizFunctions.runColorCorrectionTeeth().catch(function (err) {
            logErr('Erro em Color Correction (Teeth):', err);
        }).finally(function () {
            ccTeethBtn.disabled = false;
        });
    });
}

var ccBlushBtn = document.getElementById('ccBlushBtn');
if (ccBlushBtn) {
    ccBlushBtn.addEventListener('click', function () {
        ccBlushBtn.disabled = true;
        window.SavizFunctions.runColorCorrectionBlush().catch(function (err) {
            logErr('Erro em Color Correction (Blush):', err);
        }).finally(function () {
            ccBlushBtn.disabled = false;
        });
    });
}

var ccLipsBtn = document.getElementById('ccLipsBtn');
if (ccLipsBtn) {
    ccLipsBtn.addEventListener('click', function () {
        ccLipsBtn.disabled = true;
        window.SavizFunctions.runColorCorrectionLips().catch(function (err) {
            logErr('Erro em Color Correction (Lips):', err);
        }).finally(function () {
            ccLipsBtn.disabled = false;
        });
    });
}

// ─── Details (pincéis reais — Iris/Catchlight/Brows/Eyeliner/Freckles/Lashes) ──

// Badge de canto (✓ amarelo pastel = pincel já em cache local, ✕ vermelho = ainda
// não baixado). Puramente informativo, não bloqueia o clique.
function refreshDetailsBrushBadge(btnId, fileName) {
    var badge = document.getElementById(btnId.replace('Btn', 'Badge'));
    if (!badge || !window.SavizFunctions.isBrushCached) return;
    var cached = window.SavizFunctions.isBrushCached(fileName);
    badge.classList.remove('hidden');
    badge.classList.toggle('cached', cached);
    badge.classList.toggle('missing', !cached);
    badge.textContent = cached ? '✓' : '✕';
    badge.title = cached ? 'Disponível' : 'Não Disponível';
}

function bindDetailsBrushButton(btnId, fileName, presetName, labelName) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    refreshDetailsBrushBadge(btnId, fileName);
    btn.addEventListener('click', function () {
        btn.disabled = true;
        showPanelModal(labelName, 'Baixando pincel...', 'loading');
        window.SavizFunctions.runDetailsBrush(fileName, presetName, function (percent) {
            panelModalMessage.textContent = 'Baixando pincel (' + percent + '%)... só na primeira vez.';
        }).then(function (success) {
            if (success) {
                setPanelModalIcon('success');
                panelModalMessage.textContent = 'Pincel "' + presetName + '" Selecionado';
                refreshDetailsBrushBadge(btnId, fileName);
            } else {
                setPanelModalIcon('error');
                panelModalMessage.textContent = 'Não foi possível aplicar o pincel. Tente novamente.';
            }
        }).catch(function (err) {
            setPanelModalIcon('error');
            panelModalMessage.textContent = 'Erro ao preparar o pincel: ' + (err && err.message ? err.message : err);
            logErr('Erro em Details (' + labelName + '):', err);
        }).finally(function () {
            btn.disabled = false;
        });
    });
}

var DETAILS_BRUSHES = [
    { btnId: 'detailsIrisBtn', file: 'Iris.abr', preset: 'IRIS 2 - R', label: 'Iris' },
    { btnId: 'detailsCatchlightBtn', file: 'Catchlight.abr', preset: 'REFLECTION 1 - RIGHT', label: 'Catchlight' },
    { btnId: 'detailsFrecklesBtn', file: 'Freckles.abr', preset: 'FULL NOSE CHEEKS 1', label: 'Freckles' },
    { btnId: 'detailsBrowsBtn', file: 'Eyebrows.abr', preset: 'BROW 1 - RIGHT', label: 'Brows' },
    { btnId: 'detailsEyelinerBtn', file: 'Eyeliner.abr', preset: 'EYELINER 6 - RIGHT', label: 'Eyeliner' },
    { btnId: 'detailsLashesBtn', file: 'Lashes.abr', preset: 'NATURAL 2 - R', label: 'Lashes' },
    { btnId: 'detailsHairBtn', file: 'Hair.abr', preset: 'stray 2', label: 'Hair' }
];

DETAILS_BRUSHES.forEach(function (b) {
    bindDetailsBrushButton(b.btnId, b.file, b.preset, b.label);
});

// "Instalar Pincéis": baixa e carrega os 7 pincéis de uma vez, em vez
// de precisar clicar um por um. Reusa runDetailsBrush (mesma função
// dos botões individuais) pra cada item, em sequência — já resolve
// sozinho o "já carregado? só seleciona" (ver dt_selectBrushByName no
// host), então não corre o risco de duplicar preset no painel de
// pincéis do Photoshop.
var detailsInstallAllBtn = document.getElementById('detailsInstallAllBtn');
var detailsInstallAllLabel = document.getElementById('detailsInstallAllLabel');
var detailsInstallAllBadge = document.getElementById('detailsInstallAllBadge');

function refreshDetailsInstallAllState() {
    if (!detailsInstallAllBtn || !window.SavizFunctions.isBrushCached) return;
    var allCached = DETAILS_BRUSHES.every(function (b) {
        return window.SavizFunctions.isBrushCached(b.file);
    });
    detailsInstallAllBtn.classList.toggle('installed', allCached);
    
    var lang = localStorage.getItem('saviz-lang') || 'en';
    if (detailsInstallAllLabel) {
        detailsInstallAllLabel.textContent = allCached ? translations[lang].btn_install_brushes_done : translations[lang].btn_install_brushes;
    }
    
    if (detailsInstallAllBadge) {
        detailsInstallAllBadge.classList.remove('cached', 'missing');
        detailsInstallAllBadge.classList.add(allCached ? 'cached' : 'missing');
        detailsInstallAllBadge.textContent = allCached ? '✓' : '✕';
    }
}

if (detailsInstallAllBtn) {
    detailsInstallAllBtn.addEventListener('click', function () {
        var lang = localStorage.getItem('saviz-lang') || 'en';
        detailsInstallAllBtn.disabled = true;
        showPanelModal(translations[lang].btn_install_brushes, translations[lang].msg_preparing, 'loading');

        var chain = Promise.resolve();
        DETAILS_BRUSHES.forEach(function (b, index) {
            chain = chain.then(function () {
                var installingText = translations[lang].msg_installing_brush
                    .replace('name', b.label)
                    .replace('step', index + 1)
                    .replace('total', DETAILS_BRUSHES.length);
                panelModalMessage.textContent = installingText;
                
                return window.SavizFunctions.runDetailsBrush(b.file, b.preset, function (percent) {
                    var installingTextPct = translations[lang].msg_installing_brush_pct
                        .replace('name', b.label)
                        .replace('step', index + 1)
                        .replace('total', DETAILS_BRUSHES.length)
                        .replace('percent', percent);
                    panelModalMessage.textContent = installingTextPct;
                }).then(function () {
                    refreshDetailsBrushBadge(b.btnId, b.file);
                });
            });
        });

        chain.then(function () {
            setPanelModalIcon('success');
            panelModalMessage.textContent = translations[lang].msg_all_brushes_installed;
            refreshDetailsInstallAllState();
        }).catch(function (err) {
            setPanelModalIcon('error');
            panelModalMessage.textContent = translations[lang].msg_error_install_brushes + (err && err.message ? err.message : err);
            logErr('Erro ao instalar todos os pincéis:', err);
        }).finally(function () {
            detailsInstallAllBtn.disabled = false;
        });
    });
}

refreshDetailsInstallAllState();

// ─── Accordions ─────────────────────────────────────────────────────
// Estado aberto/fechado de cada accordion é lembrado entre sessões do
// painel via localStorage (senão todo recarregar/reabrir volta tudo
// fechado, independente do que o usuário deixou aberto).

var ACCORDION_STORAGE_KEY = 'saviz.accordionState';

function loadAccordionState() {
    try {
        return JSON.parse(localStorage.getItem(ACCORDION_STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function saveAccordionState(state) {
    try {
        localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* localStorage indisponível — só não persiste, não quebra o painel */ }
}

var accordionState = loadAccordionState();

document.querySelectorAll('.accordion-header').forEach(function (header) {
    var target = header.dataset.target;
    var content = document.getElementById(target);

    if (accordionState[target] !== false) {
        header.classList.add('open');
        if (content) content.classList.add('open');
    }

    header.addEventListener('click', function () {
        var open = header.classList.toggle('open');
        if (content) content.classList.toggle('open', open);
        accordionState[target] = open;
        saveAccordionState(accordionState);
    });
});

// ─── Menu hambúrguer do painel (flyout menu do CEP) ────────────────
// Diferente do UXP (entrypoints.setup), no CEP isso é
// csInterface.setPanelFlyoutMenu + o evento flyoutMenuClicked.

var RELOAD_MENU_ID = 'reloadPanel';

csInterface.setPanelFlyoutMenu(
    '<Menu>' +
    '  <MenuItem Id="' + RELOAD_MENU_ID + '" Label="Recarregar" Enabled="true" Checked="false"/>' +
    '</Menu>'
);

csInterface.addEventListener('com.adobe.csxs.events.flyoutMenuClicked', function (event) {
    if (event.data && event.data.menuId === RELOAD_MENU_ID) {
        location.reload();
    }
});

// ─── Skin Texture ───────────────────────────────────────────────────

var anglePointer = document.getElementById('anglePointer');
var angleInput = document.getElementById('angleInput');
var angleDial = document.getElementById('angleDial');
var altitudeInput = document.getElementById('altitudeInput');
var globalLightCheck = document.getElementById('globalLightCheck');
var sizeSlider = document.getElementById('sizeSlider');
var scaleSlider = document.getElementById('scaleSlider');
var depthSlider = document.getElementById('depthSlider');
var highlightsCheck = document.getElementById('highlightsCheck');
var highlightsSlider = document.getElementById('highlightsSlider');
var shadowsCheck = document.getElementById('shadowsCheck');
var shadowsSlider = document.getElementById('shadowsSlider');
var skinTextureAddBtn = document.getElementById('skinTextureAddBtn');
var skinTextureInstallBtn = document.getElementById('skinTextureInstallBtn');
var skinTextureInstallLabel = document.getElementById('skinTextureInstallLabel');
var skinTextureInstallBadge = document.getElementById('skinTextureInstallBadge');
var skinTextureSelectTrigger = document.getElementById('skinTextureSelectTrigger');
var skinTextureSelectDropdown = document.getElementById('skinTextureSelectDropdown');
var skinTextureSelectedLabel = document.getElementById('skinTextureSelectedLabel');
var skinTextureSelectedValue = 'hand and skin';

// Só manda os sliders pro Photoshop depois que uma camada de textura
// foi selecionada no dropdown (senão não tem em cima do que aplicar
// Bevel & Emboss).
var skinTextureLayerActive = false;

// Config (angle/altitude/size/scale/depth/highlight/shadow) lembrada POR
// TEXTURA no localStorage só para preencher a UI ao trocar o seletor.
// O botão Add sempre sincroniza os sliders a partir da camada recém-
// criada, porque cada textura tem seus próprios defaults reais.
var SKIN_TEXTURE_CONFIG_KEY = 'saviz.skinTexture.configs';
var SKIN_TEXTURE_DEFAULTS = { angle: 125, altitude: 30, useGlobalLight: false, size: 5, scale: 100, textureDepth: 100, highlightOpacity: 80, shadowOpacity: 80 };

function loadSkinTextureConfigs() {
    try {
        return JSON.parse(localStorage.getItem(SKIN_TEXTURE_CONFIG_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function saveSkinTextureConfig(actionName, params) {
    try {
        skinTextureConfigs[actionName] = params;
        localStorage.setItem(SKIN_TEXTURE_CONFIG_KEY, JSON.stringify(skinTextureConfigs));
    } catch (e) { /* localStorage indisponível — só não persiste */ }
}

var skinTextureConfigs = loadSkinTextureConfigs();

// Mostra nos sliders a config lembrada dessa textura (ou o padrão de
// fábrica se ainda não foi usada nenhuma vez) — só mexe na UI, não manda
// nada pro Photoshop (setar .value direto não dispara "input"/"change").
function applySkinTextureConfigToSliders(actionName) {
    var defaultConfig = window.SavizFunctions.getSkinTextureDefaultConfig
        ? window.SavizFunctions.getSkinTextureDefaultConfig(actionName)
        : null;
    syncSkinTextureSlidersFromLayer(defaultConfig || skinTextureConfigs[actionName] || SKIN_TEXTURE_DEFAULTS);
}

if (angleInput && anglePointer && angleDial) {
    var updateAnglePointer = function () {
        anglePointer.style.transform = 'rotate(' + (angleInput.value || 0) + 'deg)';
    };
    var disableGlobalLightForManualAngle = function () {
        if (globalLightCheck) globalLightCheck.checked = false;
    };
    angleInput.addEventListener('input', updateAnglePointer);
    updateAnglePointer();

    // Arrasta/clica no dial pra setar o ângulo direto pelo cursor, em
    // vez de só digitar no input.
    var draggingAngle = false;

    var setAngleFromEvent = function (e) {
        var rect = angleDial.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var deg = Math.atan2(dy, dx) * (180 / Math.PI);
        if (deg < 0) deg += 360;
        angleInput.value = Math.round(deg);
        updateAnglePointer();
        disableGlobalLightForManualAngle();
        pushSkinTextureBevelEmboss();
    };

    angleDial.addEventListener('mousedown', function (e) {
        draggingAngle = true;
        setAngleFromEvent(e);
        e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
        if (draggingAngle) setAngleFromEvent(e);
    });
    window.addEventListener('mouseup', function () {
        draggingAngle = false;
    });

    angleInput.addEventListener('change', function () {
        disableGlobalLightForManualAngle();
        pushSkinTextureBevelEmboss();
    });
}

function bindSlider(sliderId, valueId) {
    var slider = document.getElementById(sliderId);
    var value = document.getElementById(valueId);
    if (!slider || !value) return;

    var min = Number(slider.min);
    var max = Number(slider.max);

    function setNumericValue(nextValue) {
        if ('value' in value) value.value = String(nextValue);
        else value.textContent = String(nextValue);
    }

    function clampSliderValue(nextValue) {
        var numericValue = Number(nextValue);
        if (!isFinite(numericValue)) return null;
        if (isFinite(min)) numericValue = Math.max(min, numericValue);
        if (isFinite(max)) numericValue = Math.min(max, numericValue);
        return Math.round(numericValue);
    }

    slider.addEventListener('input', function () {
        setNumericValue(slider.value);
        pushSkinTextureBevelEmboss();
    });

    if ('value' in value) {
        value.min = slider.min;
        value.max = slider.max;
        value.addEventListener('change', function () {
            var numericValue = clampSliderValue(value.value);
            if (numericValue === null) {
                setNumericValue(slider.value);
                return;
            }
            slider.value = String(numericValue);
            setNumericValue(numericValue);
            pushSkinTextureBevelEmboss();
        });
    }
}
bindSlider('sizeSlider', 'sizeValue');
bindSlider('scaleSlider', 'scaleValue');
bindSlider('depthSlider', 'depthValue');
bindSlider('highlightsSlider', 'highlightsValue');
bindSlider('shadowsSlider', 'shadowsValue');

if (altitudeInput) altitudeInput.addEventListener('change', pushSkinTextureBevelEmboss);
if (globalLightCheck) globalLightCheck.addEventListener('change', pushSkinTextureBevelEmboss);
if (highlightsCheck) highlightsCheck.addEventListener('change', pushSkinTextureBevelEmboss);
if (shadowsCheck) shadowsCheck.addEventListener('change', pushSkinTextureBevelEmboss);

// Debounce simples: dial/sliders disparam muitos eventos seguidos
// enquanto o usuário arrasta, e cada chamada é uma ida real ao
// Photoshop via evalScript — não faz sentido mandar uma pra cada pixel
// de movimento.
var skinTexturePushTimer = null;
function pushSkinTextureBevelEmboss() {
    if (!skinTextureLayerActive) return;

    var params = {
        angle: Number(angleInput.value) || 0,
        altitude: Number(altitudeInput.value) || 0,
        useGlobalLight: !!(globalLightCheck && globalLightCheck.checked),
        size: Number(sizeSlider.value) || 0,
        scale: Number(scaleSlider.value) || 100,
        textureDepth: Number(depthSlider.value) || 0,
        highlightOpacity: highlightsCheck.checked ? Number(highlightsSlider.value) : 0,
        shadowOpacity: shadowsCheck.checked ? Number(shadowsSlider.value) : 0
    };
    saveSkinTextureConfig(skinTextureSelectedValue, params);

    clearTimeout(skinTexturePushTimer);
    skinTexturePushTimer = setTimeout(function () {
        window.SavizFunctions.runSkinTextureSetBevelEmboss(params).catch(function (err) {
            logErr('Erro em Skin Texture (Bevel & Emboss):', err);
        });
    }, 120);
}

function syncSkinTextureSlidersFromLayer(values) {
    if (!values) return;
    var setSliderValue = function (slider, valueId, nextValue) {
        var roundedValue = Math.round(nextValue);
        var display = document.getElementById(valueId);
        slider.value = roundedValue;
        if (display) {
            if ('value' in display) display.value = roundedValue;
            else display.textContent = slider.value;
        }
    };

    angleInput.value = Math.round(values.angle);
    updateAnglePointer();
    altitudeInput.value = Math.round(values.altitude);
    if (globalLightCheck) globalLightCheck.checked = !!values.useGlobalLight;
    setSliderValue(sizeSlider, 'sizeValue', values.size);
    setSliderValue(scaleSlider, 'scaleValue', values.scale);
    setSliderValue(depthSlider, 'depthValue', values.textureDepth !== undefined ? values.textureDepth : SKIN_TEXTURE_DEFAULTS.textureDepth);
    setSliderValue(highlightsSlider, 'highlightsValue', values.highlightOpacity);
    setSliderValue(shadowsSlider, 'shadowsValue', values.shadowOpacity);
}

// Cada opção do dropdown é o nome exato de uma ação dentro do Action
// Set SKINTEXTURES (confirmado com um PSD real gerado rodando cada
// ação manualmente no plugin original) — o usuário escolhe a textura
// ANTES de clicar Add, e cada clique roda só aquela ação específica,
// criando uma única camada nova (não as 9 de uma vez).

// Dropdown customizado (não dá pra ter bolinha colorida dentro de um
// <option> nativo — sempre renderiza como texto puro em qualquer
// engine). ✓ amarelo pastel = texturas instaladas, ✗ vermelho = falta clicar em
// "Instalar Texturas", badge oculta = essa textura não tem pattern
// mapeado. Reflete o mesmo estado global do botão de instalar (todas
// as texturas vêm do mesmo SAVIZTEXTURES.pat).
function refreshSkinTextureBadges() {
    if (!skinTextureSelectDropdown || !window.SavizFunctions.isTextureReady) return;
    var options = skinTextureSelectDropdown.querySelectorAll('.skin-texture-select-option');
    for (var i = 0; i < options.length; i++) {
        var opt = options[i];
        var badge = opt.querySelector('.skin-texture-option-badge');
        var ready = window.SavizFunctions.isTextureReady(opt.dataset.value);
        badge.classList.remove('cached', 'missing');
        if (ready === true) {
            badge.classList.add('cached');
            badge.textContent = '✓';
        } else if (ready === false) {
            badge.classList.add('missing');
            badge.textContent = '✕';
        } else {
            badge.textContent = '';
        }
    }
}

// Botão obrigatório: instala (Append) o SAVIZTEXTURES.pat nos presets
// do Photoshop uma única vez por máquina. O Add fica desabilitado até
// isso acontecer — é o que garante que o Append nunca roda mais de uma
// vez (era isso que criava "SAVIZTEXTURES", "SAVIZTEXTURES 2", etc).
function refreshSkinTextureInstallState() {
    var installed = !!(window.SavizFunctions.isPatternsInstalled && window.SavizFunctions.isPatternsInstalled());
    if (skinTextureInstallBtn) skinTextureInstallBtn.classList.toggle('installed', installed);
    
    var lang = localStorage.getItem('saviz-lang') || 'en';
    if (skinTextureInstallLabel) {
        skinTextureInstallLabel.textContent = installed ? translations[lang].btn_install_textures_done : translations[lang].btn_install_textures;
    }
    
    if (skinTextureInstallBadge) {
        skinTextureInstallBadge.classList.remove('cached', 'missing');
        skinTextureInstallBadge.classList.add(installed ? 'cached' : 'missing');
        skinTextureInstallBadge.textContent = installed ? '✓' : '✕';
    }
    if (skinTextureAddBtn) skinTextureAddBtn.disabled = !installed;
    refreshSkinTextureBadges();
}

if (skinTextureInstallBtn) {
    skinTextureInstallBtn.addEventListener('click', function () {
        var lang = localStorage.getItem('saviz-lang') || 'en';
        var alreadyInstalled = !!(window.SavizFunctions.isPatternsInstalled && window.SavizFunctions.isPatternsInstalled());
        if (alreadyInstalled && !confirm(translations[lang].confirm_reinstall)) {
            return;
        }
        skinTextureInstallBtn.disabled = true;
        showPanelModal('Skin Texture', translations[lang].msg_installing, 'loading');
        window.SavizFunctions.runSkinTextureInstallAllPatterns(function (percent) {
            panelModalMessage.textContent = translations[lang].msg_downloading.replace('percent', percent);
        }).then(function () {
            setPanelModalIcon('success');
            panelModalMessage.textContent = translations[lang].msg_installed_success;
            refreshSkinTextureInstallState();
        }).catch(function (err) {
            setPanelModalIcon('error');
            panelModalMessage.textContent = translations[lang].msg_error_install + (err && err.message ? err.message : err);
            logErr('Erro em Skin Texture (Install):', err);
        }).finally(function () {
            skinTextureInstallBtn.disabled = false;
        });
    });
}
refreshSkinTextureInstallState();

// Ao abrir o painel, já mostra nos sliders a config lembrada da textura
// selecionada por padrão (em vez dos valores fixos do HTML).
applySkinTextureConfigToSliders(skinTextureSelectedValue);

if (skinTextureSelectTrigger && skinTextureSelectDropdown) {
    skinTextureSelectTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        skinTextureSelectDropdown.classList.toggle('hidden');
    });

    skinTextureSelectDropdown.addEventListener('click', function (e) {
        var row = e.target.closest('.skin-texture-select-option');
        if (!row) return;
        skinTextureSelectedValue = row.dataset.value;
        skinTextureSelectedLabel.textContent = row.dataset.label;
        skinTextureLayerActive = false;
        clearTimeout(skinTexturePushTimer);
        skinTextureSelectDropdown.classList.add('hidden');
        // Mostra a config lembrada dessa textura (ou o padrão de
        // fábrica) nos sliders — troca só a exibição, não manda nada
        // pro Photoshop ainda (só o Add/os sliders depois disso fazem
        // isso).
        applySkinTextureConfigToSliders(skinTextureSelectedValue);
    });

    document.addEventListener('click', function (e) {
        if (!skinTextureSelectDropdown.contains(e.target) && e.target !== skinTextureSelectTrigger) {
            skinTextureSelectDropdown.classList.add('hidden');
        }
    });
}

if (skinTextureAddBtn) {
    skinTextureAddBtn.addEventListener('click', function () {
        var actionName = skinTextureSelectedValue;
        var label = skinTextureSelectedLabel.textContent;
        skinTextureAddBtn.disabled = true;
        skinTextureLayerActive = false;
        clearTimeout(skinTexturePushTimer);
        showPanelModal('Skin Texture', 'Adicionando "' + label + '"...', 'loading');
        window.SavizFunctions.runSkinTextureAddTexture(actionName).then(function () {
            return window.SavizFunctions.runSkinTextureGetBevelEmboss();
        }).then(function (values) {
            skinTextureLayerActive = true;
            // A camada recém-criada é a fonte da verdade: cada textura
            // nasce com seus próprios defaults de Bevel & Emboss /
            // Texture. Os sliders precisam carregar esses valores reais
            // antes de qualquer ajuste manual; senão mexer só no angle
            // reenvia scale/size/highlight/shadow antigos dos sliders.
            var defaultConfig = window.SavizFunctions.getSkinTextureDefaultConfig
                ? window.SavizFunctions.getSkinTextureDefaultConfig(actionName)
                : null;
            var displayConfig = defaultConfig || values || SKIN_TEXTURE_DEFAULTS;
            syncSkinTextureSlidersFromLayer(displayConfig);
            saveSkinTextureConfig(actionName, displayConfig);
            return null;
        }).then(function () {
            setPanelModalIcon('success');
            var lang = localStorage.getItem('saviz-lang') || 'en';
            panelModalMessage.textContent = translations[lang].msg_texture_added.replace('name', label);
            refreshSkinTextureBadges();
        }).catch(function (err) {
            setPanelModalIcon('error');
            var lang = localStorage.getItem('saviz-lang') || 'en';
            panelModalMessage.textContent = translations[lang].msg_error_add_texture + (err && err.message ? err.message : err);
            logErr('Erro em Skin Texture (Add):', err);
        }).finally(function () {
            skinTextureAddBtn.disabled = false;
        });
    });
}

// Inicializa o idioma padrão/salvo ao carregar o painel
applyLanguage(localStorage.getItem('saviz-lang') || 'en');

console.log('Savior Jordani Studio Panel (CEP) initialized');
