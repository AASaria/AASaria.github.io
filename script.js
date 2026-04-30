// ========== DOM元素 ==========
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const apiKeyInput = document.getElementById('api-key-input');
const modelSelector = document.getElementById('model-selector');
const saveKeyBtn = document.getElementById('save-key-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const themeBtn = document.getElementById('theme-btn');
const menuBtn = document.getElementById('menu-btn');
const sidebar = document.getElementById('sidebar');
const charactersList = document.getElementById('characters-list');
const chatsList = document.getElementById('chats-list');
const welcomeScreen = document.getElementById('welcome-screen');
const characterBanner = document.getElementById('character-banner');
const closeCharacterBtn = document.getElementById('close-character');
const chatToolbar = document.getElementById('chat-toolbar');
const currentChatTitle = document.getElementById('current-chat-title');
const renameChatBtn = document.getElementById('rename-chat-btn');
const exportChatBtn = document.getElementById('export-chat-btn');
const deepThinkCheck = document.getElementById('deep-think');
const webPreviewCheck = document.getElementById('web-preview');
const charCounter = document.getElementById('char-counter');
const storageUsed = document.getElementById('storage-used');
const characterModal = document.getElementById('character-modal');
const saveCharBtn = document.getElementById('save-char-btn');
const closeCharModalBtn = document.getElementById('close-char-modal-btn');
const renameModal = document.getElementById('rename-modal');
const renameInput = document.getElementById('rename-input');
const saveRenameBtn = document.getElementById('save-rename-btn');
const closeRenameBtn = document.getElementById('close-rename-btn');

// ========== 全局变量 ==========
let API_KEY = localStorage.getItem('deepseek_api_key') || '';
let currentTheme = localStorage.getItem('theme') || 'light';
let currentModel = localStorage.getItem('model') || 'deepseek-chat';
let characters = [];
let chats = [];
let currentChatId = null;
let currentCharacter = null;
let isWaiting = false;
let pendingRenameId = null;

// ========== Toast提示 ==========
function showToast(msg, duration = 2000) {
    const existing = document.getElementById('export-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'export-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), duration + 300);
}

// ========== 数据加载 ==========
function loadData() {
    try {
        const charRaw = localStorage.getItem('characters');
        characters = charRaw ? JSON.parse(charRaw) : [];
        if (!Array.isArray(characters)) characters = [];
    } catch(e) { characters = []; }
    
    try {
        const chatRaw = localStorage.getItem('chats');
        chats = chatRaw ? JSON.parse(chatRaw) : [];
        if (!Array.isArray(chats)) chats = [];
    } catch(e) { chats = []; }
    
    currentChatId = localStorage.getItem('currentChatId');
    if (currentChatId && !chats.find(c => c.id === currentChatId)) {
        currentChatId = chats.length > 0 ? chats[0].id : null;
    }
}

function saveAll() {
    try {
        localStorage.setItem('characters', JSON.stringify(characters));
        localStorage.setItem('chats', JSON.stringify(chats));
        updateStorageInfo();
    } catch(e) {
        if (e.name === 'QuotaExceededError') {
            showToast('⚠️ 浏览器存储空间已满，请删除一些旧数据');
            // 尝试清理
            console.error('存储空间不足', e);
        }
    }
}

function updateStorageInfo() {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const val = localStorage.getItem(key);
        if (val) used += val.length * 2; // UTF-16
    }
    const usedMB = (used / 1024 / 1024).toFixed(2);
    storageUsed.textContent = usedMB + ' MB';
}

// ========== 主题 ==========
function applyTheme(theme) {
    document.body.className = theme + '-mode';
    themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    localStorage.setItem('theme', theme);
    currentTheme = theme;
}
applyTheme(currentTheme);
themeBtn.onclick = () => applyTheme(currentTheme === 'light' ? 'dark' : 'light');

// ========== 模型 ==========
modelSelector.value = currentModel;
modelSelector.onchange = () => {
    currentModel = modelSelector.value;
    localStorage.setItem('model', currentModel);
};

// ========== 菜单切换 ==========
menuBtn.onclick = () => sidebar.classList.toggle('hidden');

// ========== 标签页切换 ==========
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        if (tab === 'instructions') {
            document.getElementById('chats-list').classList.add('active');
        } else {
            document.getElementById('characters-list').classList.add('active');
        }
    };
});

// ========== 角色卡管理 ==========
function renderCharacters() {
    charactersList.innerHTML = '';
    characters.forEach(char => {
        const div = document.createElement('div');
        div.className = 'char-item' + (currentCharacter && currentCharacter.id === char.id ? ' active' : '');
        div.innerHTML = `
            <span class="char-emoji">${char.avatar || '🤖'}</span>
            <div class="char-info">
                <div class="char-name">${char.name}</div>
                <div class="char-desc">${char.prompt.substring(0, 30)}...</div>
            </div>
            <span class="char-delete" data-id="${char.id}">✕</span>
        `;
        div.querySelector('.char-info').onclick = () => selectCharacter(char);
        div.querySelector('.char-delete').onclick = (e) => {
            e.stopPropagation();
            if (confirm('删除角色「' + char.name + '」？')) {
                characters = characters.filter(c => c.id !== char.id);
                if (currentCharacter && currentCharacter.id === char.id) {
                    currentCharacter = null;
                    characterBanner.style.display = 'none';
                }
                saveAll();
                renderCharacters();
            }
        };
        charactersList.appendChild(div);
    });
    
    const addBtn = document.createElement('div');
    addBtn.id = 'add-char-btn';
    addBtn.textContent = '+ 创建新角色';
    addBtn.onclick = () => characterModal.classList.add('show');
    charactersList.appendChild(addBtn);
}

function selectCharacter(char) {
    currentCharacter = char;
    characterBanner.style.display = 'flex';
    document.getElementById('character-avatar').textContent = char.avatar || '🤖';
    document.getElementById('character-name').textContent = char.name;
    document.getElementById('character-desc').textContent = char.prompt.substring(0, 50) + '...';
    renderCharacters();
    sidebar.classList.add('hidden');
}

closeCharacterBtn.onclick = () => {
    currentCharacter = null;
    characterBanner.style.display = 'none';
    renderCharacters();
};

// 角色弹窗
saveCharBtn.onclick = () => {
    const name = document.getElementById('char-name-input').value.trim();
    const avatar = document.getElementById('char-avatar-input').value.trim() || '🤖';
    const prompt = document.getElementById('char-prompt-input').value.trim();
    if (!name || !prompt) { alert('请填写角色名称和设定'); return; }
    
    characters.push({
        id: Date.now().toString(),
        name, avatar, prompt,
        createdAt: new Date().toISOString()
    });
    saveAll();
    renderCharacters();
    characterModal.classList.remove('show');
    document.getElementById('char-name-input').value = '';
    document.getElementById('char-avatar-input').value = '';
    document.getElementById('char-prompt-input').value = '';
};

closeCharModalBtn.onclick = () => characterModal.classList.remove('show');
characterModal.onclick = (e) => { if (e.target === characterModal) characterModal.classList.remove('show'); };

// ========== 对话管理 ==========
function createChat(name) {
    const id = Date.now().toString();
    const chat = { id, name: name || '对话 ' + (chats.length + 1), messages: [], createdAt: new Date().toISOString() };
    chats.unshift(chat);
    return chat;
}

function deleteChat(id) {
    chats = chats.filter(c => c.id !== id);
    if (currentChatId === id) {
        currentChatId = chats.length > 0 ? chats[0].id : null;
    }
    localStorage.setItem('currentChatId', currentChatId || '');
    saveAll();
    renderChats();
    if (currentChatId) {
        loadChat(currentChatId);
    } else {
        chatBox.innerHTML = '';
        welcomeScreen.style.display = 'flex';
        chatToolbar.style.display = 'none';
    }
}

function renameChat(id) {
    pendingRenameId = id;
    const chat = chats.find(c => c.id === id);
    if (chat) {
        renameInput.value = chat.name;
        renameModal.classList.add('show');
        renameInput.focus();
        renameInput.select();
    }
}

function exportChat(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat || !chat.messages || chat.messages.length === 0) {
        showToast('⚠️ 没有可导出的消息');
        return;
    }
    
    // 构建导出文本
    let exportText = '=' .repeat(40) + '\n';
    exportText += '对话名称: ' + chat.name + '\n';
    exportText += '导出时间: ' + new Date().toLocaleString() + '\n';
    exportText += '消息数量: ' + chat.messages.length + '\n';
    exportText += '='.repeat(40) + '\n\n';
    
    chat.messages.forEach((msg, index) => {
        const role = msg.role === 'user' ? '🧑 你' : '🤖 DeepSeek';
        exportText += `[${index + 1}] ${role}:\n`;
        exportText += msg.content + '\n\n';
        exportText += '-'.repeat(30) + '\n\n';
    });
    
    // 下载文件
    const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // 清理文件名
    const safeName = chat.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').substring(0, 30);
    a.download = safeName + '_' + new Date().toISOString().slice(0, 10) + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('✅ 对话已导出！(' + chat.messages.length + '条消息)');
}

function renderChats() {
    chatsList.innerHTML = '';
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
        const msgCount = chat.messages ? chat.messages.length : 0;
        
        div.innerHTML = `
            <span class="chat-emoji">💬</span>
            <div class="chat-info">
                <div class="chat-name">${chat.name}</div>
                <div class="chat-msg-count">${msgCount} 条消息</div>
            </div>
            <div class="chat-actions">
                <button class="rename-btn" data-id="${chat.id}" title="重命名">✏️</button>
                <button class="export-btn" data-id="${chat.id}" title="导出">📥</button>
                <button class="delete-btn" data-id="${chat.id}" title="删除">✕</button>
            </div>
        `;
        
        // 点击对话名称切换
        div.querySelector('.chat-info').onclick = () => {
            currentChatId = chat.id;
            localStorage.setItem('currentChatId', currentChatId);
            loadChat(chat.id);
            renderChats();
            sidebar.classList.add('hidden');
        };
        
        // 重命名按钮
        div.querySelector('.rename-btn').onclick = (e) => {
            e.stopPropagation();
            renameChat(chat.id);
        };
        
        // 导出按钮
        div.querySelector('.export-btn').onclick = (e) => {
            e.stopPropagation();
            exportChat(chat.id);
        };
        
        // 删除按钮
        div.querySelector('.delete-btn').onclick = (e) => {
            e.stopPropagation();
            if (confirm('确定删除「' + chat.name + '」？\n（包含 ' + msgCount + ' 条消息，删除后不可恢复）')) {
                deleteChat(chat.id);
            }
        };
        
        chatsList.appendChild(div);
    });
}

// 重命名弹窗事件
saveRenameBtn.onclick = () => {
    const newName = renameInput.value.trim();
    if (!newName) { alert('名称不能为空'); return; }
    if (pendingRenameId) {
        const chat = chats.find(c => c.id === pendingRenameId);
        if (chat) {
            chat.name = newName;
            saveAll();
            renderChats();
            if (currentChatId === pendingRenameId) {
                currentChatTitle.textContent = newName;
            }
            showToast('✅ 已重命名为「' + newName + '」');
        }
    }
    renameModal.classList.remove('show');
    pendingRenameId = null;
};

closeRenameBtn.onclick = () => {
    renameModal.classList.remove('show');
    pendingRenameId = null;
};
renameModal.onclick = (e) => {
    if (e.target === renameModal) {
        renameModal.classList.remove('show');
        pendingRenameId = null;
    }
};
// 回车保存重命名
renameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        saveRenameBtn.click();
    }
});

function loadChat(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) {
        chatBox.innerHTML = '';
        welcomeScreen.style.display = 'flex';
        chatToolbar.style.display = 'none';
        return;
    }
    
    chatBox.innerHTML = '';
    welcomeScreen.style.display = 'none';
    chatToolbar.style.display = 'flex';
    currentChatTitle.textContent = chat.name;
    
    if (!chat.messages || chat.messages.length === 0) {
        welcomeScreen.style.display = 'flex';
        return;
    }
    
    chat.messages.forEach(msg => {
        addMessageToBox(msg.content, msg.role === 'user' ? 'user' : 'ai');
    });
    scrollToBottom();
}

function addMessageToBox(text, type) {
    const div = document.createElement('div');
    div.className = 'message ' + type;
    div.textContent = text;
    chatBox.appendChild(div);
}

function scrollToBottom() {
    setTimeout(() => { chatBox.scrollTop = chatBox.scrollHeight; }, 50);
}

// ========== API Key设置 ==========
settingsBtn.onclick = () => { settingsModal.classList.add('show'); apiKeyInput.value = API_KEY; };
closeModalBtn.onclick = () => settingsModal.classList.remove('show');
settingsModal.onclick = (e) => { if (e.target === settingsModal) settingsModal.classList.remove('show'); };
saveKeyBtn.onclick = () => {
    API_KEY = apiKeyInput.value.trim();
    API_KEY ? localStorage.setItem('deepseek_api_key', API_KEY) : localStorage.removeItem('deepseek_api_key');
    showToast(API_KEY ? '✅ API Key 已保存' : 'API Key 已清除');
    settingsModal.classList.remove('show');
};

// ========== 发送消息 ==========
async function sendMessageFunc() {
    const userMessage = userInput.value.trim();
    if (!userMessage || isWaiting) return;
    if (!API_KEY) { showToast('⚠️ 请先设置API Key'); return; }
    
    if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
        if (chats.length === 0) {
            const c = createChat(userMessage.substring(0, 15));
            currentChatId = c.id;
        } else {
            currentChatId = chats[0].id;
        }
        localStorage.setItem('currentChatId', currentChatId);
        saveAll();
        renderChats();
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) return;
    if (!chat.messages) chat.messages = [];
    
    welcomeScreen.style.display = 'none';
    chatToolbar.style.display = 'flex';
    currentChatTitle.textContent = chat.name;
    addMessageToBox(userMessage, 'user');
    scrollToBottom();
    userInput.value = '';
    updateCharCounter();
    userInput.style.height = 'auto';
    chat.messages.push({ role: 'user', content: userMessage });
    
    if (chat.messages.length === 1 && chat.name.startsWith('对话 ')) {
        chat.name = userMessage.substring(0, 20);
        currentChatTitle.textContent = chat.name;
        renderChats();
    }
    saveAll();
    
    // 构建消息
    let apiMessages = [];
    if (currentCharacter) {
        apiMessages.push({ role: 'system', content: currentCharacter.prompt });
    }
    // 发送全部消息历史（不限制轮数）
    let history = chat.messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
    }));
    // 如果单次消息太多（超过500条），截断防止API报错
    if (history.length > 500) {
        history = history.slice(-500);
    }
    apiMessages = apiMessages.concat(history);
    
    isWaiting = true;
    sendBtn.disabled = true;
    userInput.disabled = true;
    
    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + API_KEY
            },
            body: JSON.stringify({
                model: currentModel,
                messages: apiMessages,
                stream: false,
                temperature: deepThinkCheck.checked ? 0.3 : 0.7,
                max_tokens: 4096
            })
        });
        
        const data = await response.json();
        let reply = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
            reply = data.choices[0].message.content;
        } else if (data.error) {
            reply = '❌ 错误: ' + (data.error.message || JSON.stringify(data.error));
        } else {
            reply = '❌ API返回格式异常';
        }
        
        addMessageToBox(reply, 'ai');
        scrollToBottom();
        chat.messages.push({ role: 'assistant', content: reply });
        saveAll();
        renderChats(); // 更新消息计数
    } catch(e) {
        const errMsg = '⚠️ 网络请求失败，请检查连接';
        addMessageToBox(errMsg, 'ai');
        scrollToBottom();
        chat.messages.push({ role: 'assistant', content: errMsg });
        saveAll();
        console.error('发送失败:', e);
    }
    
    isWaiting = false;
    sendBtn.disabled = false;
    userInput.disabled = false;
    userInput.focus();
}

// ========== 字数统计 ==========
function updateCharCounter() {
    charCounter.textContent = userInput.value.length + '字';
}
userInput.addEventListener('input', () => {
    updateCharCounter();
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
});

// ========== 事件绑定 ==========
sendBtn.onclick = sendMessageFunc;
userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageFunc();
    }
});

// 工具栏按钮
renameChatBtn.onclick = () => {
    if (currentChatId) renameChat(currentChatId);
};
exportChatBtn.onclick = () => {
    if (currentChatId) exportChat(currentChatId);
};

// ========== 初始化 ==========
function init() {
    loadData();
    updateStorageInfo();
    renderCharacters();
    
    if (chats.length === 0) {
        const c = createChat('默认对话');
        currentChatId = c.id;
    }
    if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
        currentChatId = chats.length > 0 ? chats[0].id : null;
    }
    localStorage.setItem('currentChatId', currentChatId || '');
    saveAll();
    renderChats();
    if (currentChatId) {
        loadChat(currentChatId);
    } else {
        welcomeScreen.style.display = 'flex';
        chatToolbar.style.display = 'none';
    }
}

init();