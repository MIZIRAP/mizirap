import { db, auth } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// State
let geminiApiKey = null;
let chatHistory = [];
const systemInstruction = "Sen MIZIRAP adlı kişisel takip uygulamasının asistanısın. Kullanıcıya beslenme, spor/antrenman ve finans konularında yardımcı oluyorsun. Kısa, net ve Türkçe cevap ver.";

// DOM Elements
const chatPanel = document.getElementById('ai-chat-panel');
const chatBackdrop = document.getElementById('ai-chat-backdrop');
const chatContent = document.getElementById('ai-chat-content');
const chatMessages = document.getElementById('ai-chat-messages');
const chatInput = document.getElementById('ai-chat-input');
const chatSendBtn = document.getElementById('ai-chat-send');

const profileAiMsg = document.getElementById('profile-ai-msg');
const profileApiKeyInput = document.getElementById('profile-gemini-apikey');
const profileSaveAiBtn = document.getElementById('profile-save-ai-btn');

// Initialize AI Chat
export async function initAiChat(uid) {
    if (!uid) return;
    
    // Reset state on login
    chatHistory = [];
    geminiApiKey = null;
    chatMessages.innerHTML = ''; // clear old messages
    
    // Add welcome message
    appendMessage('model', 'Merhaba! Sana beslenme, antrenman ve harcamaların konusunda nasıl yardımcı olabilirim?');

    try {
        const docRef = doc(db, "users", uid, "settings", "aiAssistant");
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().geminiApiKey) {
            geminiApiKey = docSnap.data().geminiApiKey;
            if (profileApiKeyInput) profileApiKeyInput.value = geminiApiKey;
        } else {
            if (profileApiKeyInput) profileApiKeyInput.value = '';
        }
    } catch (err) {
        console.error("AI Settings fetch error:", err);
    }
}

// Global UI toggle
window.toggleAiChatPanel = function() {
    if (chatPanel.classList.contains('hidden')) {
        chatPanel.classList.remove('hidden');
        // trigger reflow
        void chatPanel.offsetWidth;
        chatBackdrop.classList.remove('opacity-0');
        chatBackdrop.classList.add('opacity-100');
        chatContent.classList.remove('translate-y-full');
        
        // Auto-focus input
        setTimeout(() => chatInput.focus(), 300);
        
        // Check API Key
        if (!geminiApiKey) {
            appendMessage('model', 'Sohbeti kullanmak için önce Ayarlar\'dan bir Gemini API anahtarı ekleyin.', true);
        }
    } else {
        chatBackdrop.classList.remove('opacity-100');
        chatBackdrop.classList.add('opacity-0');
        chatContent.classList.add('translate-y-full');
        
        setTimeout(() => {
            chatPanel.classList.add('hidden');
        }, 300);
    }
};

// Add message to UI
function appendMessage(role, text, isWarning = false) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex items-start gap-2 max-w-[85%] ${role === 'user' ? 'ml-auto flex-row-reverse' : ''}`;
    
    let avatar = '';
    if (role === 'model') {
        avatar = `
            <div class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center neo-surface-small mt-1" style="background-color: #F0F2F8; box-shadow: 2px 2px 4px #D1D9E6, -2px -2px 4px rgba(255,255,255,0.7);">
                <span class="material-symbols-rounded text-neon-purple text-sm">smart_toy</span>
            </div>
        `;
    }

    let bubbleClasses = `p-3 rounded-2xl text-sm ${role === 'user' ? 'bg-neon-purple text-white rounded-tr-sm' : 'bg-[#F0F2F8] text-on-surface rounded-tl-sm'}`;
    let bubbleStyle = role === 'model' ? `box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px rgba(255,255,255,0.7);` : '';

    if (isWarning) {
        msgDiv.innerHTML = `
            ${avatar}
            <div class="${bubbleClasses}" style="${bubbleStyle}">
                <p class="mb-2">${text}</p>
                <button onclick="window.showView('view-profile'); setTimeout(() => { document.getElementById('profile-ai-content').classList.remove('hidden'); document.getElementById('profile-gemini-apikey').focus(); window.toggleAiChatPanel(); }, 300);" class="px-3 py-1 bg-background text-neon-blue rounded-full text-xs font-bold neo-surface-small">Ayarlar'a Git</button>
            </div>
        `;
    } else {
        msgDiv.innerHTML = `
            ${avatar}
            <div class="${bubbleClasses}" style="${bubbleStyle}">
                ${text.replace(/\n/g, '<br>')}
            </div>
        `;
    }

    chatMessages.appendChild(msgDiv);
    
    // Auto scroll to bottom
    setTimeout(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 50);
}

// Add loading state
function appendLoading() {
    const msgDiv = document.createElement('div');
    msgDiv.id = 'ai-chat-loading';
    msgDiv.className = `flex items-start gap-2 max-w-[85%]`;
    msgDiv.innerHTML = `
        <div class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center neo-surface-small mt-1" style="background-color: #F0F2F8; box-shadow: 2px 2px 4px #D1D9E6, -2px -2px 4px rgba(255,255,255,0.7);">
            <span class="material-symbols-rounded text-neon-purple text-sm">smart_toy</span>
        </div>
        <div class="bg-[#F0F2F8] p-3 rounded-2xl rounded-tl-sm text-sm text-on-surface flex items-center gap-1 h-[44px]" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px rgba(255,255,255,0.7);">
            <div class="w-2 h-2 bg-neon-purple rounded-full animate-bounce"></div>
            <div class="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            <div class="w-2 h-2 bg-neon-purple rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 50);
}

function removeLoading() {
    const loading = document.getElementById('ai-chat-loading');
    if (loading) loading.remove();
}

// Send Message logic
window.sendAiMessage = async function() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    if (!geminiApiKey) {
        appendMessage('model', 'Sohbeti kullanmak için önce Ayarlar\'dan bir Gemini API anahtarı ekleyin.', true);
        return;
    }

    // Add user message to UI
    appendMessage('user', text);
    chatInput.value = '';
    
    // Add to history
    chatHistory.push({ role: "user", parts: [{ text }] });

    // Show loading
    appendLoading();
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        
        const payload = {
            system_instruction: {
                parts: { text: systemInstruction }
            },
            contents: chatHistory
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        
        removeLoading();

        if (!res.ok) {
            console.error("Gemini API Error:", data);
            chatHistory.pop(); // remove user message on error
            if (res.status === 400 && data.error && data.error.message.includes('API key not valid')) {
                appendMessage('model', 'API anahtarınız geçersiz görünüyor, Ayarlar\'dan kontrol edin.', true);
            } else {
                appendMessage('model', `Bir hata oluştu: ${data.error?.message || 'Bilinmeyen hata'}`);
            }
            return;
        }

        const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (modelText) {
            appendMessage('model', modelText);
            chatHistory.push({ role: "model", parts: [{ text: modelText }] });
        } else {
            appendMessage('model', 'Üzgünüm, cevap oluşturulamadı.');
        }

    } catch (err) {
        removeLoading();
        chatHistory.pop();
        console.error("Gemini request failed:", err);
        appendMessage('model', 'Bağlantı hatası oluştu, lütfen tekrar deneyin.');
    } finally {
        chatSendBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
};

// Profile settings listener
if (profileSaveAiBtn) {
    profileSaveAiBtn.addEventListener('click', async () => {
        const uid = localStorage.getItem('uid');
        if (!uid) {
            profileAiMsg.textContent = "Oturum açmadınız.";
            profileAiMsg.className = "text-sm text-center mt-2 text-error";
            return;
        }
        
        const newKey = profileApiKeyInput.value.trim();
        profileSaveAiBtn.disabled = true;
        profileSaveAiBtn.innerHTML = "Kaydediliyor...";
        profileAiMsg.textContent = "";

        try {
            await setDoc(doc(db, "users", uid, "settings", "aiAssistant"), {
                geminiApiKey: newKey,
                updatedAt: new Date()
            }, { merge: true });
            
            geminiApiKey = newKey; // update local state
            profileAiMsg.textContent = "API Anahtarı başarıyla kaydedildi.";
            profileAiMsg.className = "text-sm text-center mt-2 text-neon-blue";
        } catch (err) {
            console.error("Error saving API Key:", err);
            profileAiMsg.textContent = "Kaydedilirken hata oluştu: " + err.message;
            profileAiMsg.className = "text-sm text-center mt-2 text-error";
        } finally {
            profileSaveAiBtn.disabled = false;
            profileSaveAiBtn.innerHTML = `
                <span class="material-symbols-rounded text-sm">save</span>
                Anahtarı Kaydet
            `;
        }
    });
}
