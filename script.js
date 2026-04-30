// ========== 获取DOM元素 ==========
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const themeBtn = document.getElementById('theme-btn');
const newChatBtn = document.getElementById('new-chat-btn');
const chatList = document.getElementById('chat-list');

// ========== 全局变量 ==========
let API_KEY = localStorage.getItem('deepseek_api_key') || '';
let currentTheme = localStorage.getItem('theme') || 'light';
let chats = [];
let currentChatId = null;
let isWaiting = false; // 防止重复发送

// ========== 数据加载（安全解析） ==========
function loadChats() {
    try {
        const raw = localStorage.getItem('chats');
        chats = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(chats)) chats = [];
    } catch (e) {
        console.error('数据加载失败，重置', e);
        chats = [];
        localStorage.removeItem('chats');
    }
}

function saveChats() {
    try {
        localStorage.setItem('chats', JSON.stringify(chats));
    } catch (e) {
        // 存储空间满了
        alert('⚠️ 存储空间不足！请删除一些旧对话。');
        console.error('保存失败', e);
    }
}

// 初始化
loadChats();
currentChatId = localStorage.getItem('currentChatId');

// ========== 初始化主题 ==========
function applyTheme(theme) {
    document.body.className = theme + '-mode';
    themeBtn.textContent = theme === 'light' ? '🌙' : '☀️';
    localStorage.setItem('theme', theme);
    currentTheme = theme;
}
applyTheme(currentTheme);

themeBtn.onclick = () => {
    applyTheme(currentTheme === 'light' ? 'dark' : 'light');
};

// ========== 对话管理 ==========
function createChat(name) {
    const id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 6);
    const chat = {
        id: id,
        name: name || '对话 ' + (chats.length + 1),
        messages: [], // 空数组，不预设消息
        createdAt: new Date().toISOString()
    };
    chats.unshift(chat);
    saveChats();
    return chat;
}

function deleteChat(id) {
    const index = chats.findIndex(c => c.id === id);
    if (index === -1) return;
    
    chats.splice(index, 1);
    
    if (currentChatId === id) {
        currentChatId = chats.length > 0 ? chats[0].id : null;
        localStorage.setItem('currentChatId', currentChatId || '');
    }
    
    saveChats();
    renderChatList();
    
    if (currentChatId) {
        loadChat(currentChatId);
    } else {
        chatBox.innerHTML = '<div class="message ai">点击左侧➕新建对话开始聊天。</div>';
    }
}

function renderChatList() {
    chatList.innerHTML = '<h3>📋 对话列表</h3>';
    
    if (chats.length === 0) {
        chatList.innerHTML += '<div style="padding:10px;opacity:0.5;font-size:13px;">暂无对话，点击➕新建</div>';
        return;
    }
    
    chats.forEach(chat => {
        const div = document.createElement('div');
        div.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'chat-name';
        nameSpan.textContent = chat.name;
        nameSpan.title = chat.name + '\n消息数: ' + (chat.messages ? chat.messages.length : 0);
        nameSpan.onclick = () => {
            currentChatId = chat.id;
            localStorage.setItem('currentChatId', currentChatId);
            loadChat(chat.id);
            renderChatList();
        };
        
        const deleteSpan = document.createElement('span');
        deleteSpan.className = 'delete-chat';
        deleteSpan.textContent = '🗑️';
        deleteSpan.title = '删除此对话';
        deleteSpan.onclick = (e) => {
            e.stopPropagation();
            if (confirm('确定要删除「' + chat.name + '」吗？\n（包含 ' + (chat.messages ? chat.messages.length : 0) + ' 条消息）')) {
                deleteChat(chat.id);
            }
        };
        
        div.appendChild(nameSpan);
        div.appendChild(deleteSpan);
        chatList.appendChild(div);
    });
}

function loadChat(id) {
    const chat = chats.find(c => c.id === id);
    if (!chat) {
        chatBox.innerHTML = '<div class="message ai">对话未找到。</div>';
        return;
    }
    
    chatBox.innerHTML = '';
    
    if (!chat.messages || chat.messages.length === 0) {
        chatBox.innerHTML = '<div class="message ai">开始新的对话吧！</div>';
        return;
    }
    
    // 渲染所有消息（不限制数量）
    chat.messages.forEach(msg => {
        const type = (msg.role === 'user') ? 'user' : 'ai';
        addMessageToBox(msg.content, type);
    });
    
    // 滚动到底部
    setTimeout(() => {
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 50);
}

function addMessageToBox(text, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message ' + type;
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

// 初始化界面
if (chats.length === 0) {
    const defaultChat = createChat('默认对话');
    currentChatId = defaultChat.id;
}
if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
    currentChatId = chats[0] ? chats[0].id : null;
}
if (currentChatId) {
    localStorage.setItem('currentChatId', currentChatId);
}
saveChats();
renderChatList();
if (currentChatId) {
    loadChat(currentChatId);
}

// 新建对话
newChatBtn.onclick = () => {
    const name = prompt('给对话起个名字（可选，直接点确定使用默认名）：');
    const newChat = createChat(name || undefined);
    currentChatId = newChat.id;
    localStorage.setItem('currentChatId', currentChatId);
    saveChats();
    renderChatList();
    loadChat(currentChatId);
    userInput.focus();
};

// ========== API Key 设置 ==========
settingsBtn.onclick = () => {
    settingsModal.classList.add('show');
    apiKeyInput.value = API_KEY;
};

closeModalBtn.onclick = () => {
    settingsModal.classList.remove('show');
};

settingsModal.onclick = (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('show');
    }
};

saveKeyBtn.onclick = () => {
    API_KEY = apiKeyInput.value.trim();
    if (API_KEY) {
        localStorage.setItem('deepseek_api_key', API_KEY);
        alert('✅ API Key 已安全保存！');
    } else {
        localStorage.removeItem('deepseek_api_key');
        API_KEY = '';
        alert('API Key 已清除');
    }
    settingsModal.classList.remove('show');
};

// ========== 发送消息（核心功能） ==========
async function sendMessageFunc() {
    const userMessage = userInput.value.trim();
    
    if (!userMessage) return;
    if (isWaiting) {
        alert('请等待上一条回复完成');
        return;
    }
    if (!API_KEY) {
        alert('请先点击 ⚙️ 设置API Key');
        return;
    }
    
    // 确保有当前对话
    if (!currentChatId || !chats.find(c => c.id === currentChatId)) {
        if (chats.length === 0) {
            const newChat = createChat();
            currentChatId = newChat.id;
        } else {
            currentChatId = chats[0].id;
        }
        localStorage.setItem('currentChatId', currentChatId);
        saveChats();
        renderChatList();
    }
    
    const chat = chats.find(c => c.id === currentChatId);
    if (!chat) {
        alert('对话出错，请刷新页面');
        return;
    }
    
    // 确保 messages 数组存在
    if (!chat.messages) chat.messages = [];
    
    // 显示用户消息
    addMessageToBox(userMessage, 'user');
    scrollToBottom();
    userInput.value = '';
    
    // 保存用户消息
    chat.messages.push({ role: 'user', content: userMessage });
    saveChats();
    
    // 更新侧边栏（可能标题需要更新）
    // 如果是第一条消息，自动用消息内容作为对话名
    if (chat.messages.length === 1 && chat.name.startsWith('对话 ')) {
        chat.name = userMessage.substring(0, 20) + (userMessage.length > 20 ? '...' : '');
        renderChatList();
        saveChats();
    }
    
    // 构建发送给API的消息历史
    // 发送全部历史，不限制轮数。如果历史太长API会报错，则取最近100条
    let apiMessages = chat.messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
    }));
    
    // 如果消息太多（超过200条），取最近200条保证API稳定
    if (apiMessages.length > 200) {
        apiMessages = apiMessages.slice(-200);
    }
    
    // 发送请求
    isWaiting = true;
    sendBtn.disabled = true;
    sendBtn.textContent = '...';
    
    try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: apiMessages,
                stream: false,
                temperature: 0.7,
                max_tokens: 4096
            })
        });
        
        const data = await response.json();
        
        let aiReply = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
            aiReply = data.choices[0].message.content;
        } else if (data.error) {
            aiReply = '❌ API错误：' + (data.error.message || JSON.stringify(data.error));
        } else {
            aiReply = '❌ API返回格式异常，请检查Key和网络';
        }
        
        // 显示AI回复
        addMessageToBox(aiReply, 'ai');
        scrollToBottom();
        
        // 保存AI回复
        if (aiReply && !aiReply.startsWith('❌')) {
            chat.messages.push({ role: 'assistant', content: aiReply });
        } else {
            // 错误消息也保存，方便调试
            chat.messages.push({ role: 'assistant', content: aiReply });
        }
        saveChats();
        
    } catch (error) {
        const errMsg = '⚠️ 网络请求失败，请检查网络连接';
        addMessageToBox(errMsg, 'ai');
        scrollToBottom();
        chat.messages.push({ role: 'assistant', content: errMsg });
        saveChats();
        console.error('发送失败:', error);
    }
    
    isWaiting = false;
    sendBtn.disabled = false;
    sendBtn.textContent = '发送';
    userInput.focus();
}

// ========== 事件绑定 ==========
sendBtn.onclick = sendMessageFunc;
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessageFunc();
    }
});

// ========== 键盘快捷键 ==========
document.addEventListener('keydown', (e) => {
    // Ctrl+N 新建对话
    if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        newChatBtn.click();
    }
    // Ctrl+Shift+T 切换主题
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        themeBtn.click();
    }
});