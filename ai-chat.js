import { db, auth } from "./firebase-config.js";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, getDocs, writeBatch, increment } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { fetchSharedProfile, updateSharedProfile } from "./sharedState.js";
import { getDailySummaryRef } from "./dashboard.js";

// State
let geminiApiKey = null;
let chatHistory = [];
let currentUid = null;
const systemInstruction = `Sen MIZIRAP uygulamasının asistanısın. Türkçe, kısa ve öz yanıt ver. İşlem başarılıysa SADECE tek cümleyle onayla, uzun açıklama yapma. Yiyecek sorunulursa makrolarını (kcal/protein/karb/yağ) tahmin et.
Kullanıcı gün sonunda ne yediğini/içtiğini sorduğunda veya beslenme değerlendirmesi istediğinde, profildeki günlük kalori/makro hedefleri ile bugünkü tüketim verilerini karşılaştırarak yapıcı ve motive edici bir değerlendirme sun.`;

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
    currentUid = uid;
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

    let bubbleClasses = `p-3 rounded-2xl text-sm ${role === 'user' ? 'bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-tr-sm shadow-sm font-medium' : 'bg-[#F0F2F8] text-on-surface rounded-tl-sm'}`;
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

// Generate Context — cached for 60s to avoid repeated Firestore reads on every message
let _cachedContext = null;
let _cachedContextAt = 0;

async function buildAiContext() {
    if (!currentUid) return systemInstruction;

    const now = Date.now();
    if (_cachedContext && (now - _cachedContextAt) < 60_000) {
        return _cachedContext;
    }

    let context = systemInstruction + "\n\nEk Bağlam:\n";
    try {
        const profile = await fetchSharedProfile(currentUid);
        const isProfileIncomplete = !profile || !profile.weight || !profile.height || !profile.goal;

        if (profile && !isProfileIncomplete) {
            const goalLabel = profile.goal === 'kilo_verme' || profile.goal === 'lose' ? 'Kilo Verme'
                : profile.goal === 'kilo_alma' || profile.goal === 'gain' ? 'Kilo Alma' : 'Koruma';
            context += `- Kullanıcı Profili: Kilo: ${profile.weight} kg, Boy: ${profile.height} cm, Hedef: ${goalLabel}`;
            if (profile.dob) {
                const parts = profile.dob.split('.');
                const year = parts.length === 3 ? parseInt(parts[2], 10) : NaN;
                const age = isNaN(year) ? null : new Date().getFullYear() - year;
                if (age) context += `, Yaş: ${age}`;
            }
            if (profile.activity) context += `, Aktivite Katsayısı: ${profile.activity}`;
            context += '\n';
        } else if (isProfileIncomplete) {
            context += '- Kullanıcı Profili: EKSİK (boy/kilo/hedef girilmemiş)\n';
            context += '- ONBOARDING TALİMATI: Kullanıcının profil bilgileri eksik. İlk mesajında MIZIRAP\'a hoş geldiniz de ve sana daha iyi tavsiyeler verebilmen için boy, kilo, yaş ve hedeflerini sormayı nazikçe teklif et. Kullanıcı yanıt verdiğinde bu bilgileri `updateUserProfile` aracıyla kaydet.\n';
        }

        const summarySnap = await getDoc(getDailySummaryRef(currentUid));
        if (summarySnap.exists()) {
            const sum = summarySnap.data();
            const consumedCal = sum.caloriesConsumed || sum.consumedCalories || 0;
            const waterMl = sum.waterAmount || 0;
            context += `- Bugünkü Beslenme: Alınan Kalori: ${consumedCal} kcal, Su: ${waterMl} ml`;
            if (sum.burnedCalories) context += `, Yakılan: ${sum.burnedCalories} kcal`;
            context += '\n';
        }

        const catSnap = await getDocs(collection(db, "users", currentUid, "finance_categories"));
        if (!catSnap.empty) {
            const catNames = catSnap.docs.map(d => `'${d.data().name}' (ID: ${d.id})`);
            context += `- Mevcut Finans Kategorileri: ${catNames.join(', ')}\n`;
        } else {
            context += `- Mevcut Finans Kategorileri: Yok\n`;
        }

        const pmSnap = await getDocs(collection(db, "users", currentUid, "finance_payment_methods"));
        if (!pmSnap.empty) {
            const pmNames = pmSnap.docs.map(d => `'${d.data().name}' (ID: ${d.id})`);
            context += `- Mevcut Ödeme Yöntemleri: ${pmNames.join(', ')}\n`;
        } else {
            context += `- Mevcut Ödeme Yöntemleri: Yok\n`;
        }
    } catch(err) {
        console.error("Context build error:", err);
    }

    _cachedContext = context;
    _cachedContextAt = now;
    return context;
}

// Tool Declarations
const aiTools = [{
    function_declarations: [
        {
            name: "addShoppingItems",
            description: "Kullanıcının alışveriş/market listesine bir veya birden fazla öğe ekler. Kullanıcı birden fazla ürün söylerse, HER BİRİNİ items array'inde AYRI bir string elemanı olarak gönder, ASLA tek bir virgülle ayrılmış string gönderme.",
            parameters: {
                type: "OBJECT",
                properties: {
                    items: { 
                        type: "ARRAY", 
                        items: { type: "STRING" },
                        description: "Alınacak ürünlerin adları (örn. ['Süt', 'Ekmek'])" 
                    }
                },
                required: ["items"]
            }
        },
        {
            name: "addFinanceTransaction",
            description: "Kullanıcının finans/gelir-gider tablosuna işlem ekler. (örn. 50 TL market harcadım)",
            parameters: {
                type: "OBJECT",
                properties: {
                    amount: { type: "NUMBER", description: "İşlem tutarı (pozitif sayı)" },
                    type: { type: "STRING", description: "İşlem türü. Yalnızca 'expense' (gider) veya 'income' (gelir)." },
                    categoryId: { type: "STRING", description: "Mevcut Finans Kategorileri listesindeki uygun kategorinin ID'si. Yoksa boş bırakın." },
                    paymentMethodId: { type: "STRING", description: "Mevcut Ödeme Yöntemleri listesindeki uygun ID. Yoksa boş bırakın." },
                    description: { type: "STRING", description: "İşlemin açıklaması" }
                },
                required: ["amount", "type", "description"]
            }
        },
        {
            name: "addWaterLog",
            description: "Kullanıcının günlüğüne içtiği su miktarını (ml cinsinden) ekler.",
            parameters: {
                type: "OBJECT",
                properties: {
                    amount: { type: "NUMBER", description: "İçilen su miktarı (ml cinsinden, örn. 500)" }
                },
                required: ["amount"]
            }
        },
        {
            name: "addCalorieLog",
            description: "Kullanıcının günlüğüne yediği yemeği ve tahmini besin değerlerini ekler. Kullanıcı bir yiyecek söylediğinde (örn. '1 orta boy elma'), bilinen ortalama besin değerlerine göre tahmini makroları hesaplayıp bu fonksiyonu çağırın.",
            parameters: {
                type: "OBJECT",
                properties: {
                    foodName: { type: "STRING", description: "Yiyeceğin adı (örn. Orta Boy Nektarin)" },
                    kcal: { type: "NUMBER", description: "Tahmini toplam kalori (kcal)" },
                    grams: { type: "NUMBER", description: "Tahmini ağırlık (gram cinsinden)" },
                    protein: { type: "NUMBER", description: "Tahmini toplam protein (g)" },
                    carbs: { type: "NUMBER", description: "Tahmini toplam karbonhidrat (g)" },
                    fat: { type: "NUMBER", description: "Tahmini toplam yağ (g)" }
                },
                required: ["foodName", "kcal", "grams"]
            }
        },
        {
            name: "updateUserProfile",
            description: "Kullanıcının profilini günceller. Kullanıcı boy, kilo, yaş, hedef veya aktivite düzeyi gibi bilgilerini söylediğinde bu aracı çağır.",
            parameters: {
                type: "OBJECT",
                properties: {
                    weight:           { type: "NUMBER", description: "Kilo (kg)" },
                    height:           { type: "NUMBER", description: "Boy (cm)" },
                    age:              { type: "NUMBER", description: "Yaş (yıl)" },
                    goal:             { type: "STRING", description: "Hedef: 'kilo_verme' (kilo vermek), 'kilo_alma' (kilo almak) veya 'kilo_koruma' (koruma)" },
                    activity:         { type: "STRING", description: "Aktivite katsayısı: '1.2' (hareketsiz), '1.375' (hafif), '1.55' (orta), '1.725' (aktif), '1.9' (çok aktif)" },
                    gender:           { type: "STRING", description: "Cinsiyet: 'm' (erkek) veya 'f' (kadın)" }
                },
                required: []
            }
        }
    ]
}];

let pendingFunctionCalls = [];

// Send Message logic
window.sendAiMessage = async function(isSystemResponse = false) {
    if (!isSystemResponse) {
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
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === "user" && !chatHistory[chatHistory.length - 1].parts[0].functionResponse) {
            chatHistory[chatHistory.length - 1].parts[0].text += "\n" + text;
        } else {
            chatHistory.push({ role: "user", parts: [{ text }] });
        }
    }

    // Show loading
    appendLoading();
    chatSendBtn.disabled = true;
    chatInput.disabled = true;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`;
        
        const dynamicInstruction = await buildAiContext();
        
        // Truncate history to last 10 turns to keep payload small and fast
        const trimmedHistory = chatHistory.slice(-10);

        const payload = {
            system_instruction: {
                parts: { text: dynamicInstruction }
            },
            contents: trimmedHistory,
            tools: aiTools
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
            if (res.status === 400 && data.error && data.error.message.includes('API key not valid')) {
                appendMessage('model', 'API anahtarınız geçersiz görünüyor, Ayarlar\'dan kontrol edin.', true);
            } else {
                appendMessage('model', `Bir hata oluştu: ${data.error?.message || 'Bilinmeyen hata'}`);
            }
            return;
        }

        const candidate = data.candidates?.[0];
        const functionCallParts = candidate?.content?.parts?.filter(p => p.functionCall) || [];
        const modelText = candidate?.content?.parts?.find(p => p.text)?.text;

        if (functionCallParts.length > 0) {
            // Kaydet ki response dönebilelim
            pendingFunctionCalls = functionCallParts.map(p => p.functionCall);
            // Modele ait çağrıyı history'ye olduğu gibi ekle (Gemini şartı)
            chatHistory.push({ role: "model", parts: candidate.content.parts });
            showFunctionConfirmation(pendingFunctionCalls);
        } else if (modelText) {
            appendMessage('model', modelText);
            chatHistory.push({ role: "model", parts: [{ text: modelText }] });
        } else {
            appendMessage('model', 'Üzgünüm, cevap oluşturulamadı.');
        }

    } catch (err) {
        removeLoading();
        console.error("Gemini request failed:", err);
        appendMessage('model', 'Bağlantı hatası oluştu, lütfen tekrar deneyin.');
    } finally {
        if (!pendingFunctionCalls || pendingFunctionCalls.length === 0) {
            chatSendBtn.disabled = false;
            chatInput.disabled = false;
            chatInput.focus();
        }
    }
};

window.showFunctionConfirmation = function(funcCalls) {
    let combinedTitle = "Çoklu İşlem Onayı";
    if (funcCalls.length === 1) combinedTitle = "İşlem Onayı";
    let descriptions = [];
    
    funcCalls.forEach((funcCall, index) => {
        const args = funcCall.args;
        let desc = "";

        if (funcCall.name === "addShoppingItems") {
            const itemsList = args.items || [];
            let displayItems = itemsList;
            if (typeof itemsList === "string") displayItems = [itemsList];
            desc = `🛒 Alışveriş: ${displayItems.join(', ')}`;
        } else if (funcCall.name === "addFinanceTransaction") {
            const t = args.type === 'expense' ? 'Gider' : 'Gelir';
            desc = `💰 Finans: ${args.amount} TL ${t} (${args.description})`;
        } else if (funcCall.name === "addWaterLog") {
            desc = `💧 Su: ${args.amount} ml`;
        } else if (funcCall.name === "addCalorieLog") {
            desc = `🍎 Besin: ${args.foodName} (${args.kcal} kcal)`;
        } else if (funcCall.name === "updateUserProfile") {
            const parts = [];
            if (args.weight) parts.push(`Kilo: ${args.weight} kg`);
            if (args.height) parts.push(`Boy: ${args.height} cm`);
            if (args.age)    parts.push(`Yaş: ${args.age}`);
            if (args.goal)   parts.push(`Hedef: ${args.goal}`);
            if (args.activity) parts.push(`Aktivite: ${args.activity}`);
            if (args.gender) parts.push(`Cinsiyet: ${args.gender === 'm' ? 'Erkek' : 'Kadın'}`);
            desc = `👤 Profil Güncelleme: ${parts.join(', ') || 'Değişiklik yok'}`;
        }
        descriptions.push(`${index + 1}) ${desc}`);
    });

    const msgDiv = document.createElement('div');
    msgDiv.id = "pending-func-card";
    msgDiv.className = `flex flex-col gap-2 p-4 rounded-2xl bg-[#F7F9FF] border border-outline-variant/30 w-[85%] mx-auto my-2`;
    msgDiv.style.boxShadow = "4px 4px 8px #D1D9E6, -4px -4px 8px #FFFFFF";
    
    msgDiv.innerHTML = `
        <div class="flex items-center gap-2 mb-1">
            <span class="material-symbols-rounded text-neon-purple text-lg">psychology</span>
            <span class="font-bold text-sm text-[#1E293B]">${combinedTitle}</span>
        </div>
        <p class="text-sm text-[#64748B] mb-2 whitespace-pre-wrap">Şunlar eklensin mi?\n${descriptions.join('\n')}</p>
        <div class="flex gap-3">
            <button onclick="window.confirmFunctionCall()" class="flex-1 py-2 rounded-xl bg-neon-purple text-white text-xs font-bold transition-transform active:scale-95" style="box-shadow: 2px 2px 5px #D1D9E6, -2px -2px 5px #FFFFFF;">Evet</button>
            <button onclick="window.rejectFunctionCall()" class="flex-1 py-2 rounded-xl bg-background text-[#64748B] text-xs font-bold transition-transform active:scale-95" style="box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;">Hayır</button>
        </div>
    `;

    chatMessages.appendChild(msgDiv);
    setTimeout(() => { chatMessages.scrollTop = chatMessages.scrollHeight; }, 50);
};

window.confirmFunctionCall = async function() {
    const card = document.getElementById("pending-func-card");
    if (card) card.innerHTML = `<p class="text-xs text-neon-purple font-bold text-center py-2">Onaylandı, işleniyor...</p>`;
    
    let allResponses = [];

    for (const funcCall of pendingFunctionCalls) {
        let status = "success";
        let message = "İşlem başarıyla tamamlandı.";

        try {
            if (funcCall.name === "addShoppingItems") {
                let items = funcCall.args.items || [];
                
                if (typeof items === "string") {
                    items = items.split(",").map(i => i.trim()).filter(i => i);
                }
                if (!Array.isArray(items) || items.length === 0) throw new Error("Eklenecek ürün bulunamadı.");
                
                let finalItems = [];
                items.forEach(i => {
                    if (typeof i === 'string' && i.includes(',')) {
                        finalItems.push(...i.split(",").map(x => x.trim()).filter(x => x));
                    } else if (typeof i === 'string') {
                        finalItems.push(i.trim());
                    }
                });
                
                const promises = finalItems.map(itemName => {
                    return addDoc(collection(db, "users", currentUid, "shoppingList"), {
                        title: itemName,
                        done: false,
                        createdAt: serverTimestamp()
                    });
                });
                await Promise.all(promises);
                
            } else if (funcCall.name === "addFinanceTransaction") {
                const amount = parseFloat(funcCall.args.amount);
                if (isNaN(amount) || amount <= 0) throw new Error("Geçersiz veya eksik işlem tutarı.");
                
                let pmId = funcCall.args.paymentMethodId;
                if (!pmId) {
                    const pmSnap = await getDocs(collection(db, "users", currentUid, "finance_payment_methods"));
                    if (!pmSnap.empty) {
                        pmId = pmSnap.docs[0].id;
                    }
                }

                const dateStr = new Date().toISOString().split('T')[0];
                await addDoc(collection(db, "users", currentUid, "finance_transactions"), {
                    title: funcCall.args.description || "AI İşlemi",
                    amount: amount,
                    type: funcCall.args.type === 'expense' ? 'expense' : 'income',
                    categoryId: funcCall.args.categoryId || null,
                    paymentMethodId: pmId || null,
                    dateStr: dateStr,
                    createdAt: serverTimestamp()
                });
            } else if (funcCall.name === "addWaterLog") {
                const amount = parseFloat(funcCall.args.amount);
                if (isNaN(amount) || amount <= 0) throw new Error("Geçersiz su miktarı.");
                
                const batch = writeBatch(db);
                const logRef = doc(collection(db, "users", currentUid, "waterLogs"));
                batch.set(logRef, {
                    amount: amount,
                    type: amount >= 500 ? "Water Bottle" : "Glass of Water",
                    icon: amount >= 500 ? "water_bottle" : "local_drink",
                    createdAt: serverTimestamp()
                });

                batch.set(getDailySummaryRef(currentUid), {
                    waterAmount: increment(amount)
                }, { merge: true });

                await batch.commit();
                
            } else if (funcCall.name === "addCalorieLog") {
                const args = funcCall.args;
                const name = args.foodName;
                const kcal = parseFloat(args.kcal) || 0;
                const amount = parseFloat(args.grams) || 100;
                const protein = parseFloat(args.protein) || 0;
                const karb = parseFloat(args.carbs) || 0;
                const yag = parseFloat(args.fat) || 0;

                if (!name || kcal <= 0) throw new Error("Geçersiz besin adı veya kalori.");
                
                const batch = writeBatch(db);
                const logRef = doc(collection(db, "users", currentUid, "calorieLogs"));
                batch.set(logRef, {
                    name: name,
                    kcal: kcal,
                    protein: protein,
                    karb: karb,
                    yag: yag,
                    amount: amount,
                    createdAt: serverTimestamp(),
                    type: "Food"
                });
                
                batch.set(getDailySummaryRef(currentUid), {
                    caloriesConsumed: increment(kcal)
                }, { merge: true });

                await batch.commit();
            } else if (funcCall.name === "updateUserProfile") {
                const args = funcCall.args;
                const updates = {};
                if (args.weight   != null) updates.weight   = Number(args.weight);
                if (args.height   != null) updates.height   = Number(args.height);
                if (args.goal     != null) updates.goal     = String(args.goal);
                if (args.activity != null) updates.activity = String(args.activity);
                if (args.gender   != null) updates.gender   = String(args.gender);
                if (args.age      != null) {
                    // Store age as birth year estimate in dob field for compatibility
                    const birthYear = new Date().getFullYear() - Number(args.age);
                    updates.dob = String(birthYear);
                }
                if (Object.keys(updates).length === 0) throw new Error("Güncellenecek alan bulunamadı.");
                await setDoc(doc(db, "users", currentUid, "profile", "data"), updates, { merge: true });
                updateSharedProfile(updates);
                // Invalidate context cache so next message picks up new profile data
                _cachedContext = null;
                _cachedContextAt = 0;
            }
        } catch(err) {
            console.error("Function exec error:", err);
            status = "error";
            message = err.message || "Bilinmeyen bir hata oluştu.";
        }
        
        const responsePart = {
            functionResponse: {
                name: funcCall.name,
                response: { status, message }
            }
        };
        if (funcCall.id) responsePart.functionResponse.id = funcCall.id;
        if (funcCall.call_id) responsePart.functionResponse.call_id = funcCall.call_id;
        allResponses.push(responsePart);
    }
    
    sendFunctionResponses(allResponses);
};

window.rejectFunctionCall = function() {
    const card = document.getElementById("pending-func-card");
    if (card) card.innerHTML = `<p class="text-xs text-[#64748B] font-bold text-center py-2">İptal edildi.</p>`;
    
    let allResponses = [];
    for (const funcCall of pendingFunctionCalls) {
        const responsePart = {
            functionResponse: {
                name: funcCall.name,
                response: { status: "cancelled", message: "Kullanıcı işlemi reddetti." }
            }
        };
        if (funcCall.id) responsePart.functionResponse.id = funcCall.id;
        if (funcCall.call_id) responsePart.functionResponse.call_id = funcCall.call_id;
        allResponses.push(responsePart);
    }
    
    sendFunctionResponses(allResponses);
};

async function sendFunctionResponses(responsesPartArray) {
    if (!pendingFunctionCalls || pendingFunctionCalls.length === 0) return;

    const card = document.getElementById("pending-func-card");
    if (card) card.removeAttribute("id");

    chatHistory.push({ role: "user", parts: responsesPartArray });
    
    pendingFunctionCalls = [];
    appendLoading();

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiApiKey}`;
        const dynamicInstruction = await buildAiContext();
        // Truncate history to last 10 turns to keep payload small and fast
        const trimmedHistory = chatHistory.slice(-10);
        const payload = {
            system_instruction: { parts: { text: dynamicInstruction } },
            contents: trimmedHistory,
            tools: aiTools
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        removeLoading();

        if (!res.ok) {
            console.error("Gemini API Error after func:", data);
            appendMessage('model', `Bir hata oluştu: ${data.error?.message || 'Bilinmeyen hata'}`);
            return;
        }

        const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (modelText) {
            appendMessage('model', modelText);
            chatHistory.push({ role: "model", parts: [{ text: modelText }] });
        } else {
            appendMessage('model', 'İşlem tamamlandı.');
        }
    } catch (err) {
        removeLoading();
        console.error("Gemini req failed:", err);
        appendMessage('model', 'Bağlantı hatası.');
    } finally {
        chatInput.disabled = false;
        chatSendBtn.disabled = false;
        chatInput.focus();
    }
}

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
