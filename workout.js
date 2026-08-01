import { auth, db } from "./firebase-config.js";
import { collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml } from "./utils.js";

let allWorkouts = [];
let unsubscribe = null;
let callback = null; // To notify dashboard when workouts change

export function initWorkout(uid, onChangeCallback) {
    callback = onChangeCallback;
    const workoutsRef = query(collection(db, "users", uid, "workouts"), orderBy("createdAt", "desc"));
    unsubscribe = onSnapshot(workoutsRef, snap => {
        allWorkouts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderWorkouts();
        if(callback) callback(allWorkouts);
    });

    const form = document.getElementById("workout-form");
    if(form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById("workout-name").value.trim();
            const sets = parseInt(document.getElementById("workout-sets").value);
            const reps = parseInt(document.getElementById("workout-reps").value);
            const weight = parseFloat(document.getElementById("workout-weight").value);
            
            if (!name || isNaN(sets) || isNaN(reps) || isNaN(weight)) return;
            
            await addDoc(collection(db, "users", uid, "workouts"), {
                name, sets, reps, weight, createdAt: serverTimestamp()
            });
            e.target.reset();
        };
    }
}

export function clearWorkout() {
    if(unsubscribe) unsubscribe();
    allWorkouts = [];
}

function renderWorkouts() {
    const list = document.getElementById("workout-list");
    if(!list) return;
    list.innerHTML = "";
    
    if(allWorkouts.length === 0) {
        list.innerHTML = "<p class='text-on-surface-variant'>Henüz egzersiz eklenmemiş.</p>";
    }
    
    // Bu hafta istatistikleri
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const workoutsThisWeek = allWorkouts.filter(w => w.createdAt?.toDate && w.createdAt.toDate() > oneWeekAgo);
    const uniqueDays = new Set(workoutsThisWeek.map(w => w.createdAt.toDate().toDateString()));
    const weeklyText = document.getElementById("weekly-workout-text");
    if(weeklyText) weeklyText.textContent = `Bu hafta ${uniqueDays.size} gün antrenman yapıldı`;
    
    // Görüntüleme (Son 10)
    allWorkouts.slice(0, 10).forEach(w => {
        const btn = document.createElement("button");
        btn.className = "w-full text-left bg-surface-container-lowest rounded-xl p-4 card-shadow hover:scale-[0.98] transition-transform duration-200";
        
        const dateStr = w.createdAt?.toDate ? w.createdAt.toDate().toLocaleDateString("tr-TR", {day: 'numeric', month:'short'}) : "";
        
        btn.innerHTML = `
            <div class="flex justify-between items-center mb-2">
                <h3 class="font-headline-sm text-headline-sm text-on-background">${escapeHtml(w.name)}</h3>
                <span class="text-outline text-sm">${dateStr}</span>
            </div>
            <div class="flex justify-between items-end">
                <div class="font-body-lg text-body-lg text-on-surface-variant">
                    <span class="font-medium text-primary">${w.sets}</span> set × <span class="font-medium text-primary">${w.reps}</span> tekrar
                </div>
                <div class="font-headline-sm text-headline-sm text-primary">${w.weight}<span class="font-body-md text-body-md text-on-surface-variant ml-1">kg</span></div>
            </div>
        `;
        btn.addEventListener("click", () => {
            if(confirm("Bu egzersizi silmek istiyor musunuz?")) {
                deleteDoc(doc(db, "users", auth.currentUser.uid, "workouts", w.id));
            }
        });
        list.appendChild(btn);
    });
}
