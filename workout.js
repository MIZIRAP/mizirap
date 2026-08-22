import { auth, db } from "./firebase-config.js";
import { formatDate, formatCurrency } from "./utils.js";
import { collection, doc, addDoc, setDoc, getDocs, getDoc, query, orderBy, limit, serverTimestamp, where, onSnapshot, updateDoc, deleteDoc, deleteField, writeBatch } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { escapeHtml, handleFormSubmit } from "./utils.js";
import { registerListener } from "./listenerManager.js";
import { openActiveSession, closeActiveSession } from "./activeSession.js?v=1787301376";

const defaultCores = [
    { name: "Crunch", category: "Üst Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "V-Up", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Superman (Back Extension)", category: "Bel/Sırt", duration: "30", isDefault: true, imageBase64: null },
    { name: "Spiderman Plank", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Mountain Climber", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Dead Bug", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Plank (Front Plank)", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Heel Taps (Penguin Taps)", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Flutter Kicks", category: "Alt Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Plank Jacks", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Toe Touches", category: "Üst Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Russian Twist", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Hollow Body Hold", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Ab Wheel Rollout", category: "Tüm Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Lying Leg Raise", category: "Alt Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Side Plank", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Windshield Wipers", category: "Yan Karın", duration: "30", isDefault: true, imageBase64: null },
    { name: "Bird Dog", category: "Bel/Sırt", duration: "30", isDefault: true, imageBase64: null }
];

let coresSeeded = false;


let currentUid = null;
let splits = [];
let activeSplitId = null;
let activeDayId = null;
let currentWorkoutLog = null; 
let lastWorkoutLog = null; 

let callback = null; 

let unsubSplits = null;
let unsubLogs = null;
let unsubStretches = null;
let stretches = [];
let currentStretchImageBase64 = null;
let editingStretchId = null;
let editingStretchIsDefault = false;
let editingDefaultStretchId = null;
let hiddenDefaultStretchIds = new Set(JSON.parse(localStorage.getItem('hiddenDefaultStretches') || '[]'));

const DEFAULT_STRETCHES = [
    { id: 'def_stretch_1', name: 'Cat-Cow Stretch', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_cat_cow_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_2', name: 'Cobra Pose (Karın Esnetme)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_cobra_pose_fitness_exercise_a_person/circle_150.png', isDefault: true },
    { id: 'def_stretch_3', name: 'Thread the Needle Stretch', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_thread_the_needle_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_4', name: 'Doorway Chest Stretch (Kapı Eşiği Göğüs Esnetme)', duration: 30, category: 'Göğüs/Omuz', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_doorway_chest_stretch_fitness_exercise/circle_150.png', isDefault: true },
    { id: 'def_stretch_5', name: 'Wall Angel (Scapular Slide / Duvar Meleği)', duration: 30, category: 'Göğüs/Omuz', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_wall_angel_fitness_exercise_a_human/circle_150.png', isDefault: true },
    { id: 'def_stretch_6', name: 'Cross-Body Shoulder Stretch (Çapraz Omuz Esnetme)', duration: 30, category: 'Göğüs/Omuz', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_cross_body_shoulder_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_7', name: 'Overhead Triceps Stretch (Baş Üstü Arka Kol Esnetme)', duration: 30, category: 'Kol', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_an_overhead_triceps_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_8', name: 'Wall Biceps Stretch (Duvar Biceps Esnetme)', duration: 30, category: 'Kol', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_wall_biceps_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_9', name: 'Forearm Flexor Stretch (Ön Kol Flexor Esnetme)', duration: 30, category: 'Kol', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_forearm_flexor_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_10', name: 'Forearm Extensor Stretch (Ön Kol Extensor Esnetme)', duration: 30, category: 'Kol', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_forearm_extensor_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_11', name: 'Kneeling Hip Flexor Stretch (Diz Üstü Kalça Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_kneeling_hip_flexor_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_12', name: 'Standing Quadriceps Stretch (Ayakta Ön Bacak Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_standing_quadriceps_stretch_fitness_1/circle_150.png', isDefault: true },
    { id: 'def_stretch_13', name: 'Supine Hamstring Stretch (Sırtüstü Arka Bacak Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_supine_hamstring_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_14', name: 'Figure 4 Glute Stretch (Kalça Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_figure_4_glute_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_15', name: 'Pigeon Pose Stretch (Güvercin Duruşu)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_pigeon_pose_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_16', name: 'Seated Spinal Twist Stretch (Oturarak Omurga Döndürme)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_seated_spinal_twist_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_17', name: 'Downward-Facing Dog (Aşağı Bakan Köpek)', duration: 30, category: 'Tüm Vücut', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_downward_facing_dog_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_18', name: 'Child\'s Pose (Çocuk Duruşu)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_child_s_pose_fitness_exercise_a_human/circle_150.png', isDefault: true },
    { id: 'def_stretch_19', name: 'Wall Calf Stretch (Duvar Kalf Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_wall_calf_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_20', name: 'Butterfly Stretch (Kelebek Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_butterfly_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_21', name: 'Neck Tilt Stretch (Boyun Yana Eğme)', duration: 30, category: 'Boyun', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_neck_tilt_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_22', name: 'Neck Rotation Stretch (Boyun Döndürme)', duration: 30, category: 'Boyun', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_neck_rotation_stretch_fitness_exercise/circle_150.png', isDefault: true },
    { id: 'def_stretch_23', name: 'Chin Tuck (Çene Çekme / Boyun Arkası Esnetme)', duration: 30, category: 'Boyun', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_chin_tuck_fitness_exercise_a_human/circle_150.png', isDefault: true },
    { id: 'def_stretch_24', name: 'Sleeper Stretch (Yatarak Omuz Rotasyon Esnetmesi)', duration: 30, category: 'Göğüs/Omuz', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_sleeper_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_25', name: 'Hands Behind Back Stretch (Eller Arkada Göğüs ve Omuz Esnetme)', duration: 30, category: 'Göğüs/Omuz', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_hands_behind_back_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_26', name: 'Cow Face Pose Arms (İnek Yüzü Kol Esnetmesi)', duration: 30, category: 'Kol', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_cow_face_pose_arms_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_27', name: 'Standing Side Bend (Ayakta Yana Eğilme)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_standing_side_bend_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_28', name: 'Puppy Pose / Extended Child\'s Pose (Yavru Köpek Duruşu)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_puppy_pose_fitness_exercise_a_human/circle_150.png', isDefault: true },
    { id: 'def_stretch_29', name: 'Lying Pectoral Stretch (Yüzüstü Göğüs Esnetme)', duration: 30, category: 'Göğüs/Omuz', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_lying_pectoral_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_30', name: 'Open Book Stretch (Açık Kitap / Torasik Mobilite Esnetmesi)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_an_open_book_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_31', name: 'Knee to Chest Stretch (Dizi Göğse Çekme)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_knee_to_chest_stretch_fitness_exercise/circle_150.png', isDefault: true },
    { id: 'def_stretch_32', name: 'Double Knee to Chest (İki Dizi Göğse Çekme)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_double_knee_to_chest_fitness_exercise/circle_150.png', isDefault: true },
    { id: 'def_stretch_33', name: 'Lying Spinal Twist (Sırtüstü Omurga Döndürme)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_lying_spinal_twist_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_34', name: 'Upward-Facing Dog (Yukarı Bakan Köpek)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_an_upward_facing_dog_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_35', name: 'Sphinx Pose (Sfenks Duruşu)', duration: 30, category: 'Sırt/Bel', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_sphinx_pose_fitness_exercise_a_human/circle_150.png', isDefault: true },
    { id: 'def_stretch_36', name: 'World\'s Greatest Stretch / Spiderman Lunge (Dünyanın En İyi Esnetmesi)', duration: 30, category: 'Tüm Vücut', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_world_s_greatest_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_37', name: 'Frog Stretch (Kurbağa Esnetmesi)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_frog_stretch_fitness_exercise_a_human/circle_150.png', isDefault: true },
    { id: 'def_stretch_38', name: 'Happy Baby Pose (Mutlu Bebek Duruşu)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_happy_baby_pose_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_39', name: '90/90 Hip Stretch (90/90 Kalça Esnetmesi)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_90_90_hip_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_40', name: 'Lizard Pose (Kertenkele Duruşu)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_lizard_pose_fitness_exercise_a_human/circle_150.png', isDefault: true },
    { id: 'def_stretch_41', name: 'Deep Squat Stretch / Malasana (Derin Squat Esnetmesi)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_deep_squat_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_42', name: 'Standing Hamstring Stretch (Ayakta Arka Bacak Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_standing_hamstring_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_43', name: 'Half Kneeling Hamstring Stretch (Yarım Diz Üstü Arka Bacak Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_half_kneeling_hamstring_stretch/circle_150.png', isDefault: true },
    { id: 'def_stretch_44', name: 'Lying Quadriceps Stretch (Yüzüstü Ön Bacak Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_lying_quadriceps_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_45', name: 'Straddle Stretch / Wide-Angle Forward Bend (Bacaklar Açık Oturarak Öne Eğilme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_straddle_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_46', name: 'Standing Forward Bend / Uttanasana (Ayakta Öne Eğilme)', duration: 30, category: 'Tüm Vücut', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_standing_forward_bend_fitness_exercise/circle_150.png', isDefault: true },
    { id: 'def_stretch_47', name: 'Seated Forward Bend / Paschimottanasana (Oturarak Öne Eğilme)', duration: 30, category: 'Tüm Vücut', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_seated_forward_bend_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_48', name: 'Iliotibial (IT) Band Stretch (Çapraz Bacak Öne Eğilme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_an_iliotibial_it_band_stretch_fitness/circle_150.png', isDefault: true },
    { id: 'def_stretch_49', name: 'Heel Drop Stretch (Basamakta Topuk Düşürme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_heel_drop_stretch_fitness_exercise_a/circle_150.png', isDefault: true },
    { id: 'def_stretch_50', name: 'Tibialis Anterior Stretch (Kaval Kemiği Esnetme)', duration: 30, category: 'Kalça/Bacak', imageBase64: 'assets/stretches/minimalist_flat_vector_illustration_of_a_tibialis_anterior_stretch_fitness/circle_150.png', isDefault: true },
];


let unsubCores = null;
let cores = [];
let currentCoreImageBase64 = null;
let editingCoreId = null;
let editingCoreIsDefault = false;

let unsubStretchSessions = null;
let stretchSessions = [];
let activeStretchSessionId = localStorage.getItem('activeStretchSessionId') || null;

let unsubCoreSessions = null;
let coreSessions = [];
let activeCoreSessionId = localStorage.getItem('activeCoreSessionId') || null;

let sessionDraftMovements = []; // [{id, name, duration, imageBase64}]
let editingSessionId = null;
let currentStretchTab = 'movements';

let coreSessionDraftMovements = [];
let editingCoreSessionId = null;
let currentCoreTab = 'movements';

document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    const action = actionBtn.getAttribute('data-action');

    if (action === 'openSplitEdit') openSplitEdit();
    else if (action === 'closeSplitEdit') closeSplitEdit();
    else if (action === 'openStretchingView') openStretchingView();
    else if (action === 'closeStretchingView') closeStretchingView();
    else if (action === 'openCoreView') openCoreView();
    else if (action === 'closeCoreView') closeCoreView();
    else if (action === 'openAddStretchModal') openAddStretchModal();
    else if (action === 'closeAddStretchModal') closeAddStretchModal();
    else if (action === 'saveNewStretch') saveStretch();
    else if (action === 'deleteStretch') { e.stopPropagation(); deleteStretch(actionBtn.getAttribute('data-stretch-id')); }
    else if (action === 'editStretch') { e.stopPropagation(); editStretch(actionBtn.getAttribute('data-stretch-id')); }
    else if (action === 'triggerStretchImageUpload') document.getElementById('stretch-image-input').click();
    
    else if (action === 'openAddCoreModal') openAddCoreSheet();
    else if (action === 'closeAddCoreModal') closeAddCoreSheet();
    else if (action === 'saveNewCore') saveCoreExercise();
    else if (action === 'deleteCore') { e.stopPropagation(); deleteCore(actionBtn.getAttribute('data-core-id')); }
    else if (action === 'editCore') { e.stopPropagation(); editCore(actionBtn.getAttribute('data-core-id')); }

    else if (action === 'switchStretchTab') switchStretchTab(actionBtn.getAttribute('data-tab'));
    else if (action === 'openAddSessionModal') openAddSessionModal();
    else if (action === 'closeAddSessionModal') closeAddSessionModal();
    else if (action === 'saveStretchSession') saveStretchSession();
    else if (action === 'deleteStretchSession') { e.stopPropagation(); deleteStretchSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'editStretchSession') { e.stopPropagation(); editStretchSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'setActiveStretchSession') { e.stopPropagation(); setActiveStretchSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'toggleSessionMovement') toggleSessionMovement(actionBtn.getAttribute('data-move-id'));
    else if (action === 'removeSessionMovement') { e.stopPropagation(); removeSessionMovement(actionBtn.getAttribute('data-move-id')); }

    else if (action === 'switchCoreTab') switchCoreTab(actionBtn.getAttribute('data-tab'));
    else if (action === 'openAddCoreSessionModal') openAddCoreSessionModal();
    else if (action === 'closeAddCoreSessionModal') closeAddCoreSessionModal();
    else if (action === 'saveCoreSession') saveCoreSession();
    else if (action === 'deleteCoreSession') { e.stopPropagation(); deleteCoreSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'editCoreSession') { e.stopPropagation(); editCoreSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'setActiveCoreSession') { e.stopPropagation(); setActiveCoreSession(actionBtn.getAttribute('data-session-id')); }
    else if (action === 'toggleCoreSessionMovement') toggleCoreSessionMovement(actionBtn.getAttribute('data-move-id'));
    else if (action === 'removeCoreSessionMovement') { e.stopPropagation(); removeCoreSessionMovement(actionBtn.getAttribute('data-move-id')); }

    else if (action === 'openStretchPlayer') openStretchPlayer();
    else if (action === 'closeStretchPlayer') closeStretchPlayer();
    else if (action === 'stretchPlayerPauseToggle') stretchPlayerPauseToggle();
    else if (action === 'stretchPlayerPrev') stretchPlayerGoPrev();
    else if (action === 'stretchPlayerNext') stretchPlayerGoNext(true);
    else if (action === 'stretchPlayerEnd') stretchPlayerEnd();
    
    else if (action === 'openCorePlayer') openCorePlayer();
    else if (action === 'closeCorePlayer') closeCorePlayer();
    else if (action === 'corePlayerPauseToggle') _cpPauseToggle();
    else if (action === 'corePlayerPrev') corePlayerGoPrev();
    else if (action === 'corePlayerNext') corePlayerGoNext(true);
    else if (action === 'corePlayerEnd') corePlayerEnd();

    else if (action === 'closeExerciseHistory') closeExerciseHistory();
    else if (action === 'closeSplitSelectionModal') closeSplitSelectionModal();
    else if (action === 'closeSplitSelectionAndOpenModal') { closeSplitSelectionModal(); setTimeout(openSplitModal, 300); }
    else if (action === 'closeSplitModalAndOpenCreate') { closeSplitModal(); setTimeout(openCreateSplitView, 300); }
    else if (action === 'closeCreateSplitView') closeCreateSplitView();
    else if (action === 'changeExerciseSets') changeExerciseSets(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10), parseInt(actionBtn.getAttribute('data-delta'), 10));
    else if (action === 'removeExerciseFromSplit') removeExerciseFromSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10));
    else if (action === 'toggleDayAccordion') toggleDayAccordion(actionBtn.getAttribute('data-accordion-key'), actionBtn);
    else if (action === 'openExercisePickerForSplit') openExercisePickerForSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx'), 10));
    else if (action === 'removeExerciseFromNewDay') removeExerciseFromNewDay(parseInt(actionBtn.getAttribute('data-day-idx'), 10), parseInt(actionBtn.getAttribute('data-ex-idx'), 10));
    else if (action === 'removeDayFromNewSplit') removeDayFromNewSplit(parseInt(actionBtn.getAttribute('data-day-idx'), 10));
    else if (action === 'openExercisePicker') openExercisePicker(actionBtn.getAttribute('data-day-id'));
    else if (action === 'closeExercisePickerModal') closeExercisePickerModal();
    else if (action === 'filterPickerCategory') filterPickerCategory(actionBtn.getAttribute('data-category'), actionBtn);
    else if (action === 'selectSplit') selectSplit(actionBtn.getAttribute('data-split-id'));
    else if (action === 'openEditSplitView') { e.stopPropagation(); openEditSplitView(actionBtn.getAttribute('data-split-id')); }
    else if (action === 'startActiveSession') startActiveSession();
    else if (action === 'deleteSplit') { e.stopPropagation(); deleteSplit(actionBtn.getAttribute('data-split-id')); }
    else if (action === 'openSplitModal') openSplitModal();
    else if (action === 'changeExerciseSets') {
        changeExerciseSets(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx')), parseInt(actionBtn.getAttribute('data-ex-idx')), parseInt(actionBtn.getAttribute('data-delta')));
    }
    else if (action === 'removeExerciseFromSplit') {
        removeExerciseFromSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx')), parseInt(actionBtn.getAttribute('data-ex-idx')));
    }
    else if (action === 'openExercisePickerForSplit') {
        openExercisePickerForSplit(actionBtn.getAttribute('data-split-id'), parseInt(actionBtn.getAttribute('data-day-idx')));
    }
    else if (action === 'toggleFav') {
        toggleFavorite(e, actionBtn);
    }
    else if (action === 'removeExerciseFromNewDay') {
        removeExerciseFromNewDay(parseInt(actionBtn.getAttribute('data-day-idx')), parseInt(actionBtn.getAttribute('data-ex-idx')));
    }
    else if (action === 'removeDayFromNewSplit') {
        removeDayFromNewSplit(parseInt(actionBtn.getAttribute('data-day-idx')));
    }
});


export function initWorkout(uid, onChangeCallback) {
    if(!uid) return;
    currentUid = uid;
    if (typeof loadCustomExercises === 'function') {
        loadCustomExercises();
    }
    initFavoritesUI();
    localStorage.setItem('uid', uid);
    callback = onChangeCallback;
    
    const splitsRef = collection(db, "users", uid, "splits");
    unsubSplits = registerListener(onSnapshot(splitsRef, (snap) => {
        splits = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const savedSplit = localStorage.getItem(`miz_activeSplit_${uid}`);
        if(savedSplit && splits.find(s => s.id === savedSplit)) {
            activeSplitId = savedSplit;
        } else if(splits.length > 0) {
            activeSplitId = splits[0].id;
        } else {
            activeSplitId = null;
        }

        renderSplitView();
        
        if(callback) {
            const activeSplit = splits.find(s => s.id === activeSplitId);
            const activeSplitName = activeSplit ? activeSplit.name : "Yapılmadı";
            // We use the last known mappedLogs or empty array
            callback(window._miz_last_workout_logs || [], activeSplitName);
        }
    }));

    const logsRef = query(collection(db, "users", uid, "workout_logs"), orderBy("dateStr", "desc"));
    unsubLogs = registerListener(onSnapshot(logsRef, (snap) => {
        const allLogs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const mappedLogs = allLogs.map(log => {
            const dateObj = new Date(log.dateStr);
            return {
                ...log,
                createdAt: log.createdAt || { toDate: () => dateObj }
            };
        });
        
        window._miz_last_workout_logs = mappedLogs;
        
        if(callback) {
            const activeSplit = splits.find(s => s.id === activeSplitId);
            const activeSplitName = activeSplit ? activeSplit.name : "Yapılmadı";
            callback(mappedLogs, activeSplitName);
        }
    }));

    const stretchesRef = collection(db, "users", uid, "stretches");
    unsubStretches = registerListener(onSnapshot(stretchesRef, (snap) => {
        stretches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStretches();
    }));

    const coresRef = collection(db, "users", uid, "cores");
    unsubCores = registerListener(onSnapshot(coresRef, async (snap) => {
        cores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // One-time migration to assign categories to existing default cores in Firebase
        if (typeof defaultCores !== 'undefined') {
            let migrationNeeded = false;
            const migrationBatch = writeBatch(db);
            cores.forEach(core => {
                if (!core.category || core.category === 'undefined') {
                    const defaultMatch = defaultCores.find(dc => dc.name === core.name);
                    if (defaultMatch && defaultMatch.category) {
                        migrationNeeded = true;
                        const coreRef = doc(db, "users", uid, "cores", core.id);
                        migrationBatch.update(coreRef, { category: defaultMatch.category });
                        core.category = defaultMatch.category;
                    }
                }
            });
            if (migrationNeeded) {
                try {
                    await migrationBatch.commit();
                    // Migration complete
                } catch(e) {
                    console.error("Migration failed:", e);
                }
            }
        }
        if (cores.length === 0 && !coresSeeded && typeof defaultCores !== 'undefined') {
            coresSeeded = true;
            try {
                const batch = writeBatch(db);
                for (const dc of defaultCores) {
                    const docRef = doc(collection(db, "users", uid, "cores"));
                    batch.set(docRef, { ...dc, createdAt: serverTimestamp() });
                }
                await batch.commit();
            } catch (e) {
                console.error("Error seeding default cores: ", e);
            }
        }
        renderCores();
    }));

    const stretchSessionsRef = collection(db, "users", uid, "stretchSessions");
    unsubStretchSessions = registerListener(onSnapshot(stretchSessionsRef, (snap) => {
        stretchSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderStretchSessions();
    }));

    const coreSessionsRef = collection(db, "users", uid, "coreSessions");
    unsubCoreSessions = registerListener(onSnapshot(coreSessionsRef, (snap) => {
        coreSessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderCoreSessions();
    }));

    // Setup image picker
    const imageInput = document.getElementById('stretch-image-input');
    if (imageInput) {
        imageInput.addEventListener('change', handleStretchImageUpload);
    }
    // core-image-input: reserved for future core image upload UI

    setupEventListeners();
}

export function clearWorkout() {
    if(unsubSplits) unsubSplits();
    if(unsubLogs) unsubLogs();
    if(unsubStretches) unsubStretches();
    if(unsubCores) unsubCores();
    if(unsubStretchSessions) unsubStretchSessions();
    if(unsubCoreSessions) unsubCoreSessions();
    currentUid = null;
    splits = [];
    activeSplitId = null;
    activeDayId = null;
}

function setupEventListeners() {
    const saveSplitBtn = document.getElementById("save-split-btn");
    if (saveSplitBtn) saveSplitBtn.onclick = saveNewSplit;
    
    
    const saveWorkoutBtn = document.getElementById("workout-save-btn");
    if (saveWorkoutBtn) saveWorkoutBtn.onclick = saveWorkoutSession;
}

function renderSplitView() {
    const titleEl = document.getElementById('workout-split-title');
    const descEl = document.getElementById('workout-split-desc');
    const dotsContainer = document.getElementById('workout-day-indicator');
    const dashNameEl = document.getElementById('stat-workout-split');
    
    if (!activeSplitId || splits.length === 0) {
        if(titleEl) titleEl.innerText = "Split Bulunamadı";
        if(descEl) descEl.innerText = "Henüz bir program oluşturmadınız.";
        if(dotsContainer) dotsContainer.innerHTML = "";
        if(dashNameEl) dashNameEl.innerText = "Yapılmadı";
        return;
    }
    
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if (!activeSplit) return;
    
    if(dashNameEl) dashNameEl.innerText = activeSplit.name;
    
    // Restore saved active day or default to first
    if(!activeDayId || !activeSplit.days.find(d => d.id === activeDayId)) {
        const savedDay = localStorage.getItem(`miz_activeDay_${currentUid}`);
        if(savedDay && activeSplit.days.find(d => d.id === savedDay)) {
            activeDayId = savedDay;
        } else {
            activeDayId = activeSplit.days.length > 0 ? activeSplit.days[0].id : null;
        }
    }
    
    const currentDay = activeSplit.days.find(d => d.id === activeDayId) || (activeSplit.days.length > 0 ? activeSplit.days[0] : null);
    if(currentDay) {
        if(titleEl) titleEl.innerText = "Bugün: " + currentDay.name;
        if(descEl) descEl.innerText = (currentDay.exercises ? currentDay.exercises.length : 0) + " Hareket içeren antrenman";
    }
    
    if(dotsContainer && activeSplit.days) {
        dotsContainer.innerHTML = '';
        activeSplit.days.forEach((day, idx) => {
            const isActive = day.id === activeDayId;
            const bar = document.createElement('button');
            const shadowStyle = isActive 
                ? 'box-shadow: 2px 2px 5px #D1D9E6, -2px -2px 5px #FFFFFF;' 
                : 'box-shadow: inset 2px 2px 5px #D1D9E6, inset -2px -2px 5px #FFFFFF;';
            const bgClass = isActive ? 'bg-gradient-to-r from-neon-purple to-neon-blue' : 'bg-[#E2E8F0]';
            bar.className = `h-2 rounded-full transition-all duration-300 cursor-pointer ${bgClass} ${isActive ? 'w-10' : 'w-6 opacity-80 hover:opacity-100'}`;
            bar.style = shadowStyle;
            bar.title = day.name;
            bar.onclick = () => selectActiveDay(day.id);
            dotsContainer.appendChild(bar);
        });
    }
}

function selectActiveDay(dayId) {
    if(!activeSplitId || !dayId) return;
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(!activeSplit) return;
    const day = activeSplit.days.find(d => d.id === dayId);
    if(!day) return;
    
    activeDayId = dayId;
    localStorage.setItem(`miz_activeDay_${currentUid}`, dayId);
    
    renderSplitView();
};

function startActiveSession() {
    if(!currentUid || !activeSplitId || !activeDayId) {
        alert('Lütfen önce bir split ve gün seçin.');
        return;
    }
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(!activeSplit) return;
    const day = activeSplit.days.find(d => d.id === activeDayId);
    if(!day || !day.exercises || day.exercises.length === 0) {
        alert('Seçili günde egzersiz bulunmuyor. Önce split düzenleyenden egzersiz ekleyin.');
        return;
    }
    openActiveSession(currentUid, activeSplitId, activeDayId, day);
};

async function saveWorkoutSession() {
    if(!currentUid || !activeSplitId || !activeDayId) return;
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    const exercisesData = {};
    
    const cards = document.querySelectorAll(".exercise-card");
    cards.forEach(card => {
        const exId = card.dataset.exerciseId;
        const setRows = card.querySelectorAll(".set-row");
        const sets = [];
        setRows.forEach(row => {
            const w = parseFloat(row.querySelector(".weight-input").value);
            const r = parseInt(row.querySelector(".reps-input").value);
            if (!isNaN(w) && !isNaN(r)) {
                sets.push({ weight: w, reps: r });
            }
        });
        if(sets.length > 0) exercisesData[exId] = sets;
    });
    
    if (Object.keys(exercisesData).length === 0) {
        alert("En az bir set verisi girmelisiniz.");
        return;
    }
    
    const logData = {
        splitId: activeSplitId,
        dayId: activeDayId,
        dateStr: todayStr,
        exercises: exercisesData,
        createdAt: serverTimestamp() 
    };
    
    try {
        const saveBtn = document.getElementById("workout-save-btn");
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = "Kaydediliyor...";
        saveBtn.disabled = true;
        
        // Always update or create a log for this specific split, day, and date
        logData.completed = true;
        const docId = `${activeSplitId}_${activeDayId}_${todayStr}`;
        await setDoc(doc(db, "users", currentUid, "workout_logs", docId), logData).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        currentWorkoutLog = { id: docId, ...logData };
        
        saveBtn.innerHTML = `<span class="material-symbols-rounded">check_circle</span> Kaydedildi!`;
        saveBtn.classList.add("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");
        
        setTimeout(() => {
            saveBtn.innerHTML = originalText;
            saveBtn.classList.remove("bg-gradient-to-r from-neon-purple to-neon-blue-container", "text-white-container");
            saveBtn.disabled = false;
            
            // RESET STATE
            activeDayId = null;
            currentWorkoutLog = null;
            renderSplitView(); 
            window.scrollTo(0,0);
        }, 1500);
        
    } catch (e) {
        console.error("Save error:", e);
        alert("Kaydetme sırasında bir hata oluştu.");
    }
}

;

// ==========================================
// EDIT TEMPLATE VIEW
// ==========================================

let editingExercises = [];

function openEditTemplateView() {
    if (!activeSplitId || !activeDayId) return;
    const split = splits.find(s => s.id === activeSplitId);
    if (!split) return;
    const day = split.days.find(d => d.id === activeDayId);
    if (!day) return;

    // Set Header Info
    const splitNameEl = document.getElementById("edit-template-split-name");
    const dayNameEl = document.getElementById("edit-template-day-name");
    if (splitNameEl) splitNameEl.textContent = `Split Profili: ${split.name}`;
    if (dayNameEl) dayNameEl.textContent = `${day.name} Günü Şablonu`;

    // Copy current day's exercises to local editing array
    editingExercises = JSON.parse(JSON.stringify(day.exercises));

    renderEditTemplateList();

    // Switch View
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-edit-workout-template").classList.remove("hidden");
    
    // Hide BottomNavBar for this transactional screen
    const navBar = document.getElementById("bottom-nav");
    if(navBar) navBar.style.display = "none";
};

function renderEditTemplateList() {
    const listEl = document.getElementById("edit-template-exercise-list");
    if (!listEl) return;
    
    listEl.innerHTML = "";
    
    editingExercises.forEach((ex, index) => {
        const item = document.createElement("div");
        item.className = "exercise-item bg-background shadow-neo-lowest rounded-[32px] p-4 shadow-sm flex items-center gap-4 group";
        item.dataset.index = index;
        
        item.innerHTML = `
            <span class="material-symbols-rounded text-outline-variant drag-handle">drag_handle</span>
            <div class="flex-1">
                <h3 class="font-body-lg text-body-lg font-medium text-on-surface">${escapeHtml(ex.name)}</h3>
                <p class="font-label-sm text-label-sm text-on-surface-variant">Genel • ${ex.defaultSets || 3} Set</p>
            </div>
            <button class="text-error opacity-70 hover:opacity-100 transition-opacity p-2 delete-btn">
                <span class="material-symbols-rounded" style="font-variation-settings: 'FILL' 1;">delete</span>
            </button>
        `;
        
        item.querySelector(".delete-btn").onclick = () => {
            editingExercises.splice(index, 1);
            renderEditTemplateList();
        };
        
        listEl.appendChild(item);
    });
    
    // Init SortableJS
    if (window.Sortable && !listEl.sortableInstance) {
        listEl.sortableInstance = new Sortable(listEl, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const itemEl = editingExercises.splice(evt.oldIndex, 1)[0];
                editingExercises.splice(evt.newIndex, 0, itemEl);
            },
        });
    } else if (listEl.sortableInstance) {
        // Just keep the existing instance, it automatically works with DOM updates as long as we re-render or sync.
        // Wait, if we completely re-render, we might need to destroy and re-create.
        listEl.sortableInstance.destroy();
        listEl.sortableInstance = new Sortable(listEl, {
            handle: '.drag-handle',
            animation: 150,
            ghostClass: 'sortable-ghost',
            onEnd: function (evt) {
                const itemEl = editingExercises.splice(evt.oldIndex, 1)[0];
                editingExercises.splice(evt.newIndex, 0, itemEl);
            },
        });
    }
}

// Add New Exercise
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const addBtn = document.getElementById("edit-template-add-ex-btn");
        const addInput = document.getElementById("edit-template-new-ex-input");
        if(addBtn && addInput) {
            addBtn.onclick = () => {
                const name = addInput.value.trim();
                if(!name) return;
                editingExercises.push({
                    id: `e${Date.now()}`,
                    name: name,
                    defaultSets: 3
                });
                addInput.value = "";
                renderEditTemplateList();
            };
            addInput.addEventListener('keypress', (e) => {
                if(e.key === 'Enter') addBtn.click();
            });
        }
        
        // Back Btn
        const backBtn = document.getElementById("edit-template-back-btn");
        if(backBtn) {
            backBtn.onclick = () => {
                closeEditTemplateView();
            };
        }
        
        // Save Btn
        const saveBtn = document.getElementById("edit-template-save-btn");
        if(saveBtn) {
            saveBtn.onclick = async () => {
                if (!activeSplitId || !activeDayId) return;
                const split = splits.find(s => s.id === activeSplitId);
                if (!split) return;
                
                const dayIndex = split.days.findIndex(d => d.id === activeDayId);
                if (dayIndex === -1) return;
                
                // Update local split object
                const updatedSplit = JSON.parse(JSON.stringify(split));
                updatedSplit.days[dayIndex].exercises = editingExercises;
                
                try {
                    saveBtn.style.opacity = '0.5';
                    saveBtn.disabled = true;
                    
                    await setDoc(doc(db, "users", currentUid, "splits", activeSplitId), updatedSplit).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                    
                    saveBtn.style.opacity = '1';
                    saveBtn.disabled = false;
                    closeEditTemplateView();
                    
                } catch(e) {
                    console.error("Error updating template:", e);
                    alert("Şablon kaydedilirken hata oluştu.");
                    saveBtn.style.opacity = '1';
                    saveBtn.disabled = false;
                }
            };
        }
    }, 1000); // Give time for DOM parsing just in case since this is appended
});

function closeEditTemplateView() {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    document.getElementById("view-workout").classList.remove("hidden");
    
    // Show BottomNavBar again
    const navBar = document.getElementById("bottom-nav");
    if(navBar) navBar.style.display = "flex";
}

// ==========================================
// SPLIT SELECTION MODAL
// ==========================================

function openSplitSelectionModal() {
    const modal = document.getElementById("splitSelectionModal");
    const content = document.getElementById("splitSelectionModalContent");
    const list = document.getElementById("split-selection-list");
    
    if(!modal || !content || !list) return;
    
    list.innerHTML = "";
    
    if (splits.length === 0) {
        list.innerHTML = `<p class="text-on-surface-variant text-center mt-6">Kayıtlı split yok.</p>`;
    } else {
        splits.forEach(split => {
            const isActive = split.id === activeSplitId;
            const btn = document.createElement("button");
            
            if (isActive) {
                btn.className = "w-full text-left bg-background shadow-neo-low border-2 border-primary rounded-[32px] p-4 flex items-center justify-between group transition-transform active:scale-[0.98] relative overflow-hidden shadow-sm";
                btn.innerHTML = `
                    <div class="flex flex-col gap-1 z-10">
                        <span class="font-body-lg text-body-lg text-on-background font-medium">${escapeHtml(split.name)}</span>
                        <span class="font-label-md text-label-md text-neon-blue">Aktif Program</span>
                    </div>
                    <div class="w-8 h-8 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue flex items-center justify-center z-10">
                        <span class="material-symbols-rounded text-white icon-md font-bold">check</span>
                    </div>
                    <div class="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-blue/5 pointer-events-none"></div>
                `;
            } else {
                btn.className = "w-full text-left bg-background shadow-neo-lowest border-none rounded-[32px] p-4 flex items-center justify-between hover:bg-background shadow-neo-low transition-colors active:scale-[0.98] shadow-sm";
                
                // For subtitle, we could show creation date if available
                let subTitle = "Kayıtlı Program";
                if (split.createdAt && split.createdAt.toDate) {
                    const d = split.createdAt.toDate();
                    subTitle = `Eklenme: ${formatDate(d)}`;
                }
                
                btn.innerHTML = `
                    <div class="flex flex-col gap-1">
                        <span class="font-body-lg text-body-lg text-on-background">${escapeHtml(split.name)}</span>
                        <span class="font-label-md text-label-md text-on-surface-variant">${subTitle}</span>
                    </div>
                `;
                
                btn.onclick = () => {
                    activeSplitId = split.id;
                    localStorage.setItem(`miz_activeSplit_${currentUid}`, split.id);
                    // activeDayId will be reset/fixed automatically in renderSplitView
                    activeDayId = null; 
                    renderSplitView();
                    closeSplitSelectionModal();
                };
            }
            list.appendChild(btn);
        });
    }
    
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
};

function closeSplitSelectionModal() {
    const modal = document.getElementById("splitSelectionModal");
    const content = document.getElementById("splitSelectionModalContent");
    if(modal && content) {
        modal.classList.add('opacity-0');
        content.classList.add('translate-y-full');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
};


function initFavoritesUI() {
    if(!currentUid) return;
    const favs = JSON.parse(localStorage.getItem(`miz_fav_exercises_${currentUid}`) || "[]");
    document.querySelectorAll('.exercise-item').forEach(item => {
        const title = item.querySelector('h4').innerText;
        const btn = item.querySelector('.exercise-fav-btn');
        if(!btn) return;
        const span = btn.querySelector('span');
        if (favs.includes(title)) {
            span.style.fontVariationSettings = "'FILL' 1";
            btn.classList.remove('text-on-surface-variant');
            btn.classList.add('text-primary');
            item.dataset.fav = "true";
        } else {
            span.style.fontVariationSettings = "'FILL' 0";
            btn.classList.add('text-on-surface-variant');
            btn.classList.remove('text-primary');
            item.dataset.fav = "false";
        }
    });
}

function toggleFavorite(e, btn) {
    e.stopPropagation();
    const exName = btn.closest('.exercise-item').querySelector('h4').innerText;
    let favs = JSON.parse(localStorage.getItem(`miz_fav_exercises_${currentUid}`) || "[]");
    
    if (favs.includes(exName)) {
        favs = favs.filter(f => f !== exName);
    } else {
        favs.push(exName);
    }
    localStorage.setItem(`miz_fav_exercises_${currentUid}`, JSON.stringify(favs));
    initFavoritesUI();
}

// ==========================================
// EXERCISE HISTORY VIEW
// ==========================================

function switchView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById("view-" + viewId);
    if(target) target.classList.remove("hidden");
}

function closeExerciseHistory() {
    switchView('workout');
    renderSplitView(); 
};

async function openExerciseHistory(triggerExId, exName) {
    if(!currentUid) return;
    
    // Switch view
    switchView('exercise-history');
    
    // Setup UI loading state
    const titleEl = document.getElementById("history-title");
    const maxWeightEl = document.getElementById("history-max-weight");
    const trendBadgeEl = document.getElementById("history-trend-badge");
    const chartContainer = document.getElementById("history-chart-container");
    const listContainer = document.getElementById("history-list-container");
    
    titleEl.textContent = `${exName} Geçmişi`;
    maxWeightEl.textContent = "...";
    trendBadgeEl.innerHTML = ``;
    chartContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-outline text-sm">Yükleniyor...</div>`;
    listContainer.innerHTML = `<div class="text-center text-outline text-sm py-4">Veriler getiriliyor...</div>`;
    
    // 1. Gather all exercise IDs that match the target name (case-insensitive) across all splits
    const targetNameLower = exName.toLowerCase().trim();
    const targetIds = new Set();
    
    splits.forEach(s => {
        s.days.forEach(d => {
            d.exercises.forEach(e => {
                if(e.name.toLowerCase().trim() === targetNameLower) {
                    targetIds.add(e.id);
                }
            });
        });
    });
    
    // 2. Fetch all workout logs for this user, ordered by date descending
    try {
        const q = query(
            collection(db, "users", currentUid, "workout_logs"),
            orderBy("dateStr", "desc") // Fetching all and filtering in memory, limits could be applied if >1000 logs, but ok for now
        );
        const snap = await getDocs(q).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        
        let historyRecords = []; // Array to store matching logs
        let overallMaxWeight = 0;
        
        snap.forEach(docSnap => {
            const logData = docSnap.data();
            const exData = logData.exercises || {};
            
            // Check if this log contains ANY of the target IDs
            let matchedSets = null;
            let matchedExId = null;
            for(let id of targetIds) {
                if(exData[id]) {
                    matchedSets = exData[id];
                    matchedExId = id;
                    break;
                }
            }
            
            if(matchedSets && matchedSets.length > 0) {
                // Calculate max weight and volume for this session
                let sessionMaxW = 0;
                let sessionTotalSets = matchedSets.length;
                let sessionTotalReps = 0;
                let bestSet = null;
                
                matchedSets.forEach(s => {
                    const w = parseFloat(s.weight) || 0;
                    const r = parseInt(s.reps) || 0;
                    sessionTotalReps += r;
                    if(w > sessionMaxW) sessionMaxW = w;
                    
                    if(!bestSet || w > parseFloat(bestSet.weight)) {
                        bestSet = s;
                    } else if (w === parseFloat(bestSet.weight) && r > parseInt(bestSet.reps)) {
                        bestSet = s;
                    }
                });
                
                if(sessionMaxW > overallMaxWeight) overallMaxWeight = sessionMaxW;
                
                historyRecords.push({
                    dateStr: logData.dateStr, // YYYY-MM-DD
                    maxWeight: sessionMaxW,
                    sets: matchedSets,
                    bestSet: bestSet,
                    totalSets: sessionTotalSets,
                    totalReps: sessionTotalReps
                });
            }
        });
        
        // 3. Process Data for UI
        if(historyRecords.length === 0) {
            maxWeightEl.textContent = "0.0 kg";
            chartContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-outline text-sm">Veri bulunamadı.</div>`;
            listContainer.innerHTML = `<div class="text-center text-outline text-sm py-4">Henüz bu hareket için geçmiş kayıt yok.</div>`;
            return;
        }
        
        maxWeightEl.textContent = `${overallMaxWeight.toFixed(1)} kg`;
        
        // Trend calculation (compare most recent with the one before it, or oldest in this month)
        // Let's just compare the latest record's max weight with the second latest
        if(historyRecords.length >= 2) {
            const diff = historyRecords[0].maxWeight - historyRecords[1].maxWeight;
            if(diff > 0) {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-rounded text-neon-blue text-lg" data-icon="trending_up">trending_up</span>
                    <span class="font-label-sm text-label-sm text-neon-blue inline-block min-w-[48px] text-right">+${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-gradient-to-r from-neon-purple to-neon-blue-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else if (diff < 0) {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-rounded text-error text-lg" data-icon="trending_down">trending_down</span>
                    <span class="font-label-sm text-label-sm text-error inline-block min-w-[48px] text-right">${diff.toFixed(1)} kg</span>
                `;
                trendBadgeEl.className = "bg-error-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
            } else {
                trendBadgeEl.innerHTML = `
                    <span class="material-symbols-rounded text-outline text-lg" data-icon="trending_flat">trending_flat</span>
                    <span class="font-label-sm text-label-sm text-outline">Değişim Yok</span>
                `;
                trendBadgeEl.className = "bg-background shadow-neo-variant bg-opacity-50 rounded-full px-3 py-1 flex items-center gap-1";
            }
        } else {
             trendBadgeEl.innerHTML = `
                <span class="material-symbols-rounded text-neon-blue text-lg" data-icon="fiber_new">fiber_new</span>
                <span class="font-label-sm text-label-sm text-neon-blue">İlk Kayıt</span>
            `;
             trendBadgeEl.className = "bg-gradient-to-r from-neon-purple to-neon-blue-container bg-opacity-20 rounded-full px-3 py-1 flex items-center gap-1";
        }
        
        // Render List (Only last 3)
        listContainer.innerHTML = "";
        const recordsToDisplay = historyRecords.slice(0, 3);
        
        recordsToDisplay.forEach((rec, idx) => {
            const dateObj = new Date(rec.dateStr);
            const dateFormatted = formatDate(dateObj, { day: 'numeric', month: 'long', year: 'numeric' });
            
            // Format best set like "4 x 8 x 85.0 kg" as per UI mockup
            const bestW = rec.bestSet ? parseFloat(rec.bestSet.weight).toFixed(1) : 0;
            const bestR = rec.bestSet ? parseInt(rec.bestSet.reps) : 0;
            
            let diffBadge = `<div class="text-on-surface-variant font-label-md text-label-md px-2 py-1">-</div>`;
            if (idx < historyRecords.length - 1) {
                const prevRec = historyRecords[idx+1];
                const diff = rec.maxWeight - prevRec.maxWeight;
                if(diff > 0) {
                    diffBadge = `<div class="bg-gradient-to-r from-neon-purple to-neon-blue-container bg-opacity-10 text-neon-blue font-label-md text-label-md px-1 py-1 rounded inline-block min-w-[56px] text-center">+${diff.toFixed(1)} kg</div>`;
                } else if(diff < 0) {
                    diffBadge = `<div class="bg-error-container bg-opacity-10 text-error font-label-md text-label-md px-1 py-1 rounded inline-block min-w-[56px] text-center">${diff.toFixed(1)} kg</div>`;
                }
            }
            
            // Opacity for older items
            const opacityClass = idx === 0 ? "opacity-100" : (idx === 1 ? "opacity-90" : "opacity-80");
            
            listContainer.innerHTML += `
                <div class="bg-background shadow-neo-lowest rounded-[32px] shadow-sm p-4 flex items-center justify-between interactive-card cursor-pointer ${opacityClass}">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-background shadow-neo flex items-center justify-center text-${idx===0 ? 'primary' : 'secondary'}">
                            <span class="material-symbols-rounded" data-icon="calendar_today" ${idx===0 ? "style=\"font-variation-settings: 'FILL' 1;\"" : ""}>calendar_today</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-label-sm text-label-sm text-on-surface-variant">${dateFormatted}</span>
                            <span class="font-body-md text-body-md font-medium text-on-background">${rec.totalSets} x ${bestR} x ${bestW} kg</span>
                        </div>
                    </div>
                    ${diffBadge}
                </div>
            `;
        });
        
        // Render Chart
        // We take up to 5 points for the chart to make it look nice (ascending order for left-to-right)
        const chartData = historyRecords.slice(0, 5).reverse();
        if(chartData.length < 2) {
             chartContainer.innerHTML = `<div class="absolute inset-0 flex items-center justify-center text-outline text-sm">Grafik için yeterli veri yok.</div>`;
        } else {
            // Find Min and Max
            const weights = chartData.map(d => d.maxWeight);
            const maxW = Math.max(...weights);
            const minW = Math.max(0, Math.min(...weights) - 5); // padding below
            const range = maxW - minW || 1; // avoid div by 0
            
            // Y Axis Labels
            const yLabels = `
                <div class="absolute left-0 top-0 h-full flex flex-col justify-between text-label-sm text-outline font-label-sm pb-6 pr-2">
                    <span>${Math.round(maxW)}k</span>
                    <span>${Math.round(maxW - range*0.33)}k</span>
                    <span>${Math.round(maxW - range*0.66)}k</span>
                    <span>${Math.round(minW)}k</span>
                </div>
            `;
            
            const gridLines = `
                <div class="absolute inset-0 ml-6 mb-6 flex flex-col justify-between z-0">
                    <div class="w-full border-t border-surface-variant"></div>
                    <div class="w-full border-t border-surface-variant"></div>
                    <div class="w-full border-t border-surface-variant"></div>
                    <div class="w-full border-t border-surface-variant"></div>
                </div>
            `;
            
            let pathD = "";
            let pointsHtml = "";
            let xLabelsHtml = "";
            
            const width = 100; // SVG viewBox 0-100
            const height = 100;
            
            chartData.forEach((d, i) => {
                const x = 5 + (i * (90 / (chartData.length - 1))); // spread 5 to 95
                const y = 100 - (((d.maxWeight - minW) / range) * 80 + 10); // 10 to 90
                
                if(i === 0) pathD += `M ${x},${y} `;
                else pathD += `L ${x},${y} `;
                
                pointsHtml += `<div class="w-2 h-2 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue border-2 border-surface-container-lowest absolute bottom-[${100-y}%] left-[${x}%] transform -translate-x-1/2 translate-y-1/2"></div>`;
                
                const dObj = new Date(d.dateStr);
                const shortDate = formatDate(dObj, { day: 'numeric', month: 'short' });
                xLabelsHtml += `<span>${shortDate}</span>`;
            });
            
            const chartHtml = `
                ${yLabels}
                ${gridLines}
                <div class="relative w-full ml-6 mb-6 h-full z-10 flex items-end justify-between px-2">
                    <svg class="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                        <path d="${pathD}" fill="none" stroke="#446554" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
                    </svg>
                    ${pointsHtml}
                </div>
                <div class="absolute bottom-0 left-6 right-0 flex justify-between text-label-sm text-outline font-label-sm px-2">
                    ${xLabelsHtml}
                </div>
            `;
            
            chartContainer.innerHTML = chartHtml;
        }

    } catch (e) {
        console.error("Error loading history:", e);
        listContainer.innerHTML = `<div class="text-center text-error text-sm py-4">Veriler getirilirken bir hata oluştu.</div>`;
    }
};



// ==========================================
// SPLIT EDIT & CREATE LOGIC
// ==========================================

let newSplitDays = [];
let currentPickerDayId = null;
let newSplitId = null;

// Extends the global scope
function openSplitEdit() {
    // Hide workout home
    document.getElementById('view-workout').classList.add('hidden');
    // Hide all other views just in case
    document.querySelectorAll('.view').forEach(v => {
        if(v.id !== 'view-split-edit') v.classList.add('hidden');
    });
    
    document.getElementById('view-split-edit').classList.remove('hidden');
    renderSplitEditView();
};

function closeSplitEdit() {
    document.getElementById('view-split-edit').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
};

// Track which day accordions are open
const _openDayAccordions = new Set();

function renderSplitEditView() {
    const activeNameEl = document.getElementById('split-edit-active-name');
    const daysContainer = document.getElementById('split-edit-days-container');
    const createBtn = document.getElementById('split-edit-create-btn');
    
    if(createBtn) createBtn.onclick = openCreateSplitView;
    
    if(!activeSplitId || splits.length === 0) {
        if(activeNameEl) activeNameEl.innerText = "Henüz Split Yok";
        if(daysContainer) {
            daysContainer.innerHTML = `<div class="text-center text-on-surface-variant p-4">Kayıtlı bir splitiniz bulunmuyor. Yeni bir split oluşturun.</div>`;
        }
        return;
    }
    
    const activeSplit = splits.find(s => s.id === activeSplitId);
    if(activeNameEl) activeNameEl.innerText = activeSplit.name;
    if(!daysContainer) return;
    
    daysContainer.innerHTML = '';
    
    activeSplit.days.forEach((day, dayIdx) => {
        const isOpen = _openDayAccordions.has(`${activeSplit.id}-${dayIdx}`);
        const exCount = day.exercises ? day.exercises.length : 0;
        const accordionKey = `${activeSplit.id}-${dayIdx}`;
        
        const dayCard = document.createElement('div');
        dayCard.className = "bg-background shadow-neo-lowest rounded-[32px] shadow-sm overflow-hidden";
        dayCard.dataset.dayIdx = dayIdx;
        dayCard.dataset.splitId = activeSplit.id;
        
        // Build exercise rows
        let exRows = '';
        if(exCount === 0) {
            exRows = `<p class="text-label-sm text-on-surface-variant italic px-md py-sm pb-3">Henüz hareket eklenmedi.</p>`;
        } else {
            day.exercises.forEach((ex, exIdx) => {
                exRows += `
                    <div class="ex-drag-item flex items-center gap-2 px-md py-2.5 border-b border-surface-container-highest last:border-0 active:bg-background shadow-neo-high transition-colors"
                         data-ex-idx="${exIdx}" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}">
                        <!-- Drag Handle -->
                        <span class="material-symbols-rounded text-on-surface-variant/50 drag-handle select-none shrink-0 cursor-grab active:cursor-grabbing" style="font-size:20px">drag_indicator</span>
                        <!-- Hareket Adı -->
                        <span class="flex-1 font-body-md text-on-surface text-sm leading-tight">${ex.name}</span>
                        <!-- Set Sayısı -->
                        <div class="flex items-center gap-1 shrink-0">
                            <button data-action="changeExerciseSets" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="-1"
                                class="w-7 h-7 rounded-full bg-background shadow-neo-high flex items-center justify-center hover:bg-gradient-to-r from-neon-purple to-neon-blue-container/40 transition-colors text-on-surface font-bold text-lg leading-none">−</button>
                            <span class="font-label-sm text-on-surface w-10 text-center whitespace-nowrap" id="sets-lbl-${activeSplit.id}-${dayIdx}-${exIdx}">${ex.defaultSets || 3} set</span>
                            <button data-action="changeExerciseSets" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}" data-delta="1"
                                class="w-7 h-7 rounded-full bg-background shadow-neo-high flex items-center justify-center hover:bg-gradient-to-r from-neon-purple to-neon-blue-container/40 transition-colors text-on-surface font-bold text-lg leading-none">+</button>
                        </div>
                        <!-- Sil -->
                        <button data-action="removeExerciseFromSplit" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}" data-ex-idx="${exIdx}"
                            class="shrink-0 w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error-container/20 rounded-full transition-colors">
                            <span class="material-symbols-rounded" style="font-size:18px">delete</span>
                        </button>
                    </div>
                `;
            });
        }
        
        dayCard.innerHTML = `
            <!-- Accordion Header -->
            <button class="accordion-header w-full flex items-center justify-between px-md py-3.5 text-left group transition-colors hover:bg-background shadow-neo-high"
                    data-action="toggleDayAccordion" data-accordion-key="${accordionKey}">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-rounded text-neon-blue transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}" style="font-size:20px">chevron_right</span>
                    <h3 class="font-title-md text-title-md font-semibold text-on-surface">${day.name}</h3>
                </div>
                <span class="font-label-sm text-on-surface-variant">${exCount} hareket</span>
            </button>
            <!-- Accordion Body -->
            <div class="accordion-body ${isOpen ? '' : 'hidden'}">
                <div class="ex-list flex flex-col" id="ex-list-${activeSplit.id}-${dayIdx}">
                    ${exRows}
                </div>
                <div class="px-md pt-2 pb-md">
                    <button data-action="openExercisePickerForSplit" data-split-id="${activeSplit.id}" data-day-idx="${dayIdx}"
                        class="w-full py-2 bg-gradient-to-r from-neon-purple to-neon-blue-container/20 text-neon-blue rounded-lg font-label-sm hover:bg-gradient-to-r from-neon-purple to-neon-blue-container/40 transition-colors flex items-center justify-center gap-1">
                        <span class="material-symbols-rounded text-[18px]">add</span> Egzersiz Ekle
                    </button>
                </div>
            </div>
        `;
        
        daysContainer.appendChild(dayCard);
        
        // Init Sortable on the exercise list
        if(isOpen) {
            const listEl = dayCard.querySelector(`#ex-list-${activeSplit.id}-${dayIdx}`);
            if(listEl) _initExSortable(listEl, activeSplit.id, dayIdx);
        }
    });
}

function toggleDayAccordion(key, headerBtn) {
    const body = headerBtn.closest('.bg-background.shadow-neo-lowest').querySelector('.accordion-body');
    const chevron = headerBtn.querySelector('.material-symbols-rounded');
    
    if(_openDayAccordions.has(key)) {
        _openDayAccordions.delete(key);
        body.classList.add('hidden');
        chevron.classList.remove('rotate-90');
    } else {
        _openDayAccordions.add(key);
        body.classList.remove('hidden');
        chevron.classList.add('rotate-90');
        
        // Init sortable after opening
        const [splitId, dayIdx] = [key.split('-')[0] + '-' + key.split('-')[1] + '-' + key.split('-')[2], parseInt(key.split('-').pop())];
        // Re-parse key properly: key is `${activeSplit.id}-${dayIdx}` but splitId may contain dashes
        const lastDash = key.lastIndexOf('-');
        const parsedSplitId = key.substring(0, lastDash);
        const parsedDayIdx = parseInt(key.substring(lastDash + 1));
        
        const listEl = document.getElementById(`ex-list-${parsedSplitId}-${parsedDayIdx}`);
        if(listEl) _initExSortable(listEl, parsedSplitId, parsedDayIdx);
    }
};

function _initExSortable(listEl, splitId, dayIdx) {
    if(listEl._sortable) { listEl._sortable.destroy(); }
    if(typeof Sortable === 'undefined') return;
    
    listEl._sortable = Sortable.create(listEl, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'opacity-30',
        chosenClass: 'bg-gradient-to-r from-neon-purple to-neon-blue-container/10',
        onEnd: function(evt) {
            const split = splits.find(s => s.id === splitId);
            if(!split) return;
            const day = split.days[dayIdx];
            const moved = day.exercises.splice(evt.oldIndex, 1)[0];
            day.exercises.splice(evt.newIndex, 0, moved);
            persistSplitEdit(split);
            // Re-render to update indices on buttons
            renderSplitEditView();
        }
    });
}

// ---------- Split Düzenle – Inline Hareket İşlemleri ----------

function changeExerciseSets(splitId, dayIdx, exIdx, delta) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    const ex = split.days[dayIdx].exercises[exIdx];
    ex.defaultSets = Math.max(1, (ex.defaultSets || 3) + delta);
    
    const label = document.getElementById(`sets-lbl-${splitId}-${dayIdx}-${exIdx}`);
    if(label) label.innerText = `${ex.defaultSets} set`;
    
    persistSplitEdit(split);
};

function removeExerciseFromSplit(splitId, dayIdx, exIdx) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    split.days[dayIdx].exercises.splice(exIdx, 1);
    persistSplitEdit(split);
    renderSplitEditView();
};

function openExercisePickerForSplit(splitId, dayIdx) {
    // "Yeni Split Oluştur" formundaki picker'ı yeniden kullanıyoruz,
    // ama callback'i aktif split'e yazacak şekilde yönlendiriyoruz.
    currentPickerDayId = `__split__${splitId}__day__${dayIdx}`;
    document.getElementById('modal-exercise-picker').classList.remove('hidden');
    renderExercisePickerList('Tümü');
    
    const searchInput = document.getElementById('exercise-picker-search');
    if(searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => renderExercisePickerList('Tümü', e.target.value);
    }
};

// Picker'daki "ekle" butonuna basıldığında çağrılan mevcut fonksiyonu override et
const _origPickerClick = window._origPickerClick;
function handlePickerSelect(exName) {
    if(!currentPickerDayId) return;
    
    if(currentPickerDayId.startsWith('__split__')) {
        // Mevcut split'e ekle
        const parts = currentPickerDayId.split('__');
        const splitId = parts[2];
        const dayIdx = parseInt(parts[4]);
        const split = splits.find(s => s.id === splitId);
        if(split) {
            split.days[dayIdx].exercises.push({
                id: `e${Date.now()}_${Math.floor(Math.random()*1000)}`,
                name: exName,
                defaultSets: 3
            });
            persistSplitEdit(split);
            closeExercisePickerModal();
            renderSplitEditView();
        }
    } else {
        // Yeni split formuna ekle
        const day = newSplitDays.find(d => d.id === currentPickerDayId);
        if(day) {
            day.exercises.push({
                id: `e${Date.now()}_${Math.floor(Math.random()*1000)}`,
                name: exName,
                defaultSets: 3
            });
            closeExercisePickerModal();
            renderCreateSplitDays();
        }
    }
}

// Picker listesi render fonksiyonu içindeki onclick'i override et
function patchPickerListClick() {
    const list = document.getElementById('exercise-picker-list');
    if(!list) return;
    list.querySelectorAll('button').forEach(btn => {
        const oldClick = btn.onclick;
        btn.onclick = function() {
            const nameEl = btn.querySelector('.font-body-md');
            if(nameEl) handlePickerSelect(nameEl.textContent.trim());
            else if(oldClick) oldClick.call(this);
        };
    });
}

async function persistSplitEdit(split) {
    try {
        await setDoc(doc(db, "users", currentUid, "splits", split.id), split).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        // Yerel listeyi de güncelle
        const idx = splits.findIndex(s => s.id === split.id);
        if(idx !== -1) splits[idx] = split;
    } catch(e) {
        console.error("Split kayıt hatası:", e);
    }
}

function openCreateSplitView() {
    document.getElementById('view-split-edit').classList.add('hidden');
    document.getElementById('view-create-split').classList.remove('hidden');
    
    const headerTitle = document.querySelector('#view-create-split header h1');
    if(headerTitle) headerTitle.innerText = "Yeni Split";
    
    newSplitId = 'split_' + Date.now();
    newSplitDays = [];
    document.getElementById('create-split-name-input').value = "";
    renderCreateSplitDays();
    
    // Bind save button
    document.getElementById('create-split-save-btn').onclick = saveNewSplit;
};

function closeCreateSplitView() {
    document.getElementById('view-create-split').classList.add('hidden');
    document.getElementById('view-split-edit').classList.remove('hidden');
};

function addDayToNewSplit() {
    const dayCount = newSplitDays.length + 1;
    newSplitDays.push({
        id: `d${Date.now()}`,
        name: `Day ${dayCount}`,
        exercises: []
    });
    renderCreateSplitDays();
};

function renderCreateSplitDays() {
    const container = document.getElementById('create-split-days-container');
    container.innerHTML = '';
    
    newSplitDays.forEach((day, index) => {
        const div = document.createElement('div');
        div.className = "bg-background shadow-neo-lowest rounded-[32px] p-md shadow-sm relative";
        
        let exHtml = '';
        if(day.exercises.length === 0) {
            exHtml = `<p class="text-label-sm text-on-surface-variant italic mb-2">Henüz hareket eklenmedi.</p>`;
        } else {
            day.exercises.forEach((ex, exIdx) => {
                exHtml += `
                    <div class="flex items-center justify-between py-2 border-b border-surface-container-highest last:border-0">
                        <span class="text-body-sm">${ex.name}</span>
                        <button data-action="removeExerciseFromNewDay" data-day-idx="${index}" data-ex-idx="${exIdx}" class="text-error/80 hover:text-error p-1">
                            <span class="material-symbols-rounded" style="font-size: 18px">close</span>
                        </button>
                    </div>
                `;
            });
        }
        
        div.innerHTML = `
            <div class="flex items-center justify-between mb-sm">
                <input type="text" value="${day.name}" onchange="updateNewDayName(${index}, this.value)" class="font-title-md text-title-md font-bold text-on-surface bg-transparent outline-none w-3/4 border-b border-transparent focus:border-none focus:shadow-neo-inset rounded">
                <button data-action="removeDayFromNewSplit" data-day-idx="${index}" class="text-on-surface-variant hover:text-error transition-colors p-1">
                    <span class="material-symbols-rounded" style="font-size: 20px">delete</span>
                </button>
            </div>
            <div class="mb-3">
                ${exHtml}
            </div>
            <button data-action="openExercisePicker" data-day-id="${day.id}" class="w-full py-2 bg-gradient-to-r from-neon-purple to-neon-blue-container/30 text-neon-blue rounded-lg font-label-sm hover:bg-gradient-to-r from-neon-purple to-neon-blue-container/50 transition-colors flex items-center justify-center gap-1">
                <span class="material-symbols-rounded text-[18px]">add</span> Egzersiz Ekle
            </button>
        `;
        container.appendChild(div);
    });
}

function updateNewDayName(index, val) {
    newSplitDays[index].name = val;
};

function removeDayFromNewSplit(index) {
    newSplitDays.splice(index, 1);
    renderCreateSplitDays();
};

function removeExerciseFromNewDay(dayIndex, exIndex) {
    newSplitDays[dayIndex].exercises.splice(exIndex, 1);
    renderCreateSplitDays();
};

function openExercisePicker(dayId) {
    currentPickerDayId = dayId;
    document.getElementById('modal-exercise-picker').classList.remove('hidden');
    renderExercisePickerList('Tümü');
    
    const searchInput = document.getElementById('exercise-picker-search');
    if(searchInput) {
        searchInput.value = '';
        searchInput.oninput = (e) => {
            renderExercisePickerList('Tümü', e.target.value);
        };
    }
};

function closeExercisePickerModal() {
    document.getElementById('modal-exercise-picker').classList.add('hidden');
    currentPickerDayId = null;
};

function filterPickerCategory(cat, btnElement) {
    const buttons = document.querySelectorAll('#exercise-picker-categories button');
    buttons.forEach(b => {
        b.className = "px-4 py-1.5 rounded-full border-none text-on-surface-variant font-label-sm whitespace-nowrap";
    });
    if(btnElement) btnElement.className = "px-4 py-1.5 rounded-full bg-gradient-to-r from-neon-purple to-neon-blue text-white font-label-sm whitespace-nowrap";
    
    const searchInput = document.getElementById('exercise-picker-search');
    renderExercisePickerList(cat, searchInput ? searchInput.value : '');
};

function renderExercisePickerList(category, searchTerm = '') {
    const list = document.getElementById('exercise-picker-list');
    list.innerHTML = '';
    
    if(!window.EXERCISE_MUSCLE_MAPPING) {
        list.innerHTML = '<p class="text-on-surface-variant p-4">Egzersiz verisi bulunamadı. Lütfen sayfayı yenileyin.</p>';
        return;
    }
    
    const exercises = Object.keys(window.EXERCISE_MUSCLE_MAPPING);
    let filtered = exercises;
    
    if(category !== 'Tümü') {
        const catMap = {
            'Göğüs': ['chest'],
            'Sırt': ['upper-back', 'lower-back'],
            'Omuz': ['deltoids'],
            'Bacak': ['quadriceps', 'hamstring', 'calves', 'gluteal'],
            'Biceps': ['biceps'],
            'Triceps': ['triceps'],
            'Karın': ['abs', 'obliques']
        };
        const targets = catMap[category] || [category.toLowerCase()];
        
        filtered = filtered.filter(exName => {
            const data = window.EXERCISE_MUSCLE_MAPPING[exName];
            if(!data) return false;
            return targets.some(t =>
                (data.primary && data.primary.includes(t)) ||
                (data.secondary && data.secondary.includes(t))
            );
        });
    }
    
    if(searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(ex => ex.toLowerCase().includes(term));
    }
    
    filtered.forEach(exName => {
        const btn = document.createElement('button');
        btn.className = "w-full text-left p-3 rounded-[32px] hover:bg-background shadow-neo-high transition-colors flex items-center justify-between border-none hover:border-none shadow-neo-inset p-2 rounded";
        btn.innerHTML = `
            <span class="font-body-md text-on-surface">${exName}</span>
            <span class="material-symbols-rounded text-neon-blue">add_circle</span>
        `;
        btn.onclick = () => handlePickerSelect(exName);
        list.appendChild(btn);
    });
}

async function saveNewSplit() {
    const nameInput = document.getElementById('create-split-name-input').value.trim();
    if(!nameInput) {
        alert("Lütfen split adı girin.");
        return;
    }
    
    if(newSplitDays.length === 0) {
        alert("En az bir gün eklemelisiniz.");
        return;
    }
    
    const saveBtn = document.getElementById('create-split-save-btn');
    saveBtn.disabled = true;
    saveBtn.innerText = "Kaydediliyor...";
    
    try {
        
        const newSplit = {
            id: newSplitId,
            name: nameInput,
            days: newSplitDays,
            createdAt: new Date().toISOString()
        };
        
        await setDoc(doc(db, "users", currentUid, "splits", newSplitId), newSplit).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        
        const existingIdx = splits.findIndex(s => s.id === newSplitId);
        if (existingIdx !== -1) {
            splits[existingIdx] = newSplit;
        } else {
            splits.push(newSplit);
        }
        
        if(splits.length === 1 || !activeSplitId) {
            activeSplitId = newSplitId;
            await setDoc(doc(db, "users", currentUid), {
                activeSplitId: newSplitId
            }, { merge: true });
            localStorage.setItem(`miz_activeSplit_${currentUid}`, newSplitId);
        }
        
        closeCreateSplitView();
        renderSplitEditView();
        
        if(typeof renderSplitView === 'function') {
            renderSplitView();
        }
        
    } catch(e) {
        console.error("Error saving new split", e);
        alert("Kaydedilirken hata oluştu.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Kaydet";
    }
};

function openSplitModal() {
    const modal = document.getElementById('modal-split-change');
    const optionsContainer = document.getElementById('split-modal-options');
    
    if(!modal || !optionsContainer) return;
    
    optionsContainer.innerHTML = '';
    tempSelectedSplitId = activeSplitId;
    
    splits.forEach(split => {
        const isAct = split.id === activeSplitId;
        const div = document.createElement('div');
        div.className = `flex flex-col p-4 rounded-[32px] border ${isAct ? 'border-none shadow-neo-inset bg-gradient-to-r from-neon-purple to-neon-blue-container/10' : 'border-none bg-background shadow-neo'} cursor-pointer hover:bg-background shadow-neo-high transition-colors`;
        
        div.innerHTML = `
            <div class="flex items-center justify-between mb-2" data-action="selectSplit" data-split-id="${split.id}">
                <div>
                    <div class="font-title-md text-on-surface font-bold">${split.name}</div>
                    <div class="font-label-sm text-on-surface-variant">${split.days ? split.days.length : 0} Gün</div>
                </div>
                ${isAct ? '<span class="material-symbols-rounded text-neon-blue">check_circle</span>' : '<span class="material-symbols-rounded text-outline">radio_button_unchecked</span>'}
            </div>
            <div class="flex justify-end gap-2 mt-2 pt-2 border-t border-none shadow-neo-inset p-2 rounded">
                <button data-action="openEditSplitView" data-split-id="${split.id}" class="p-2 rounded-full text-neon-blue hover:bg-gradient-to-r from-neon-purple to-neon-blue-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-rounded text-sm">edit</span>
                </button>
                <button data-action="deleteSplit" data-split-id="${split.id}" class="p-2 rounded-full text-error hover:bg-error-container/20 transition-colors flex items-center justify-center">
                    <span class="material-symbols-rounded text-sm">delete</span>
                </button>
            </div>
        `;
        optionsContainer.appendChild(div);
    });
    
    modal.classList.remove('hidden');
};

function closeSplitModal() {
    const modal = document.getElementById('modal-split-change');
    if(modal) modal.classList.add('hidden');
};

let tempSelectedSplitId = null;
function selectSplit(splitId) {
    tempSelectedSplitId = splitId;
    const optionsContainer = document.getElementById('split-modal-options');
    Array.from(optionsContainer.children).forEach((child, index) => {
        const split = splits[index];
        const isSel = split.id === tempSelectedSplitId;
        child.className = `flex flex-col p-4 rounded-[32px] border ${isSel ? 'border-none shadow-neo-inset bg-gradient-to-r from-neon-purple to-neon-blue-container/10' : 'border-none bg-background shadow-neo'} cursor-pointer hover:bg-background shadow-neo-high transition-colors`;
        const icon = child.querySelector('.material-symbols-rounded.text-neon-blue, .material-symbols-rounded.text-outline');
        if(icon) {
            icon.className = `material-symbols-rounded ${isSel ? 'text-neon-blue' : 'text-outline'}`;
            icon.innerText = isSel ? 'check_circle' : 'radio_button_unchecked';
        }
    });
};

async function applySplitSelection() {
    if(!tempSelectedSplitId) return;
    activeSplitId = tempSelectedSplitId;
    
    try {
        await setDoc(doc(db, "users", currentUid), {
            activeSplitId: activeSplitId
        }, { merge: true });
        localStorage.setItem(`miz_activeSplit_${currentUid}`, activeSplitId);
        
        if (typeof renderSplitEditView === 'function') renderSplitEditView();
        if (typeof renderSplitView === 'function') renderSplitView();
        
        // Notify dashboard of the split change so it doesn't revert
        if (callback) {
            const activeSplit = splits.find(s => s.id === activeSplitId);
            const activeSplitName = activeSplit ? activeSplit.name : "Yapılmadı";
            callback(window._miz_last_workout_logs || [], activeSplitName);
        }
        
        closeSplitModal();
    } catch(e) {
        console.error(e);
        alert("Split seçimi kaydedilemedi.");
    }
};

function openEditSplitView(splitId) {
    const split = splits.find(s => s.id === splitId);
    if(!split) return;
    
    closeSplitModal();
    
    document.getElementById('view-split-edit').classList.add('hidden');
    document.getElementById('view-create-split').classList.remove('hidden');
    
    const headerTitle = document.querySelector('#view-create-split header h1');
    if(headerTitle) headerTitle.innerText = "Split Düzenle";
    
    newSplitId = split.id;
    newSplitDays = JSON.parse(JSON.stringify(split.days || []));
    
    document.getElementById('create-split-name-input').value = split.name;
    renderCreateSplitDays();
    
    document.getElementById('create-split-save-btn').onclick = saveNewSplit;
};

async function deleteSplit(splitId) {
    if(!confirm("Bu split'i silmek istediğinize emin misiniz?")) return;
    
    try {
        await deleteDoc(doc(db, "users", currentUid, "splits", splitId)).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        splits = splits.filter(s => s.id !== splitId);
        
        if(activeSplitId === splitId) {
            activeSplitId = splits.length > 0 ? splits[0].id : null;
            if(activeSplitId) {
                await setDoc(doc(db, "users", currentUid), { activeSplitId }, { merge: true }).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                localStorage.setItem(`miz_activeSplit_${currentUid}`, activeSplitId);
            } else {
                await setDoc(doc(db, "users", currentUid), { activeSplitId: deleteField() }, { merge: true }).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
                localStorage.removeItem(`miz_activeSplit_${currentUid}`);
            }
        }
        
        if (typeof renderSplitEditView === 'function') renderSplitEditView();
        if (typeof renderSplitView === 'function') renderSplitView();
        
        const modal = document.getElementById('modal-split-change');
        if(modal && !modal.classList.contains('hidden')) {
            openSplitModal();
        }
        
    } catch(e) {
        console.error(e);
        alert("Silme işlemi başarısız.");
    }
};

// ==========================================
// STRETCHING & CORE PLACEHOLDER VIEWS
// ==========================================

function openStretchingView() {
    document.getElementById('view-workout').classList.add('hidden');
    document.querySelectorAll('.view').forEach(v => {
        if(v.id !== 'view-stretching') v.classList.add('hidden');
    });
    document.getElementById('view-stretching').classList.remove('hidden');
}

function closeStretchingView() {
    document.getElementById('view-stretching').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
}

function openCoreView() {
    document.getElementById('view-workout').classList.add('hidden');
    document.querySelectorAll('.view').forEach(v => {
        if(v.id !== 'view-core') v.classList.add('hidden');
    });
    document.getElementById('view-core').classList.remove('hidden');
}

function closeCoreView() {
    document.getElementById('view-core').classList.add('hidden');
    document.getElementById('view-workout').classList.remove('hidden');
}

function openAddStretchModal(isEdit = false) {
    const nameInput = document.getElementById('stretch-name');
    const imageBtn = document.getElementById('stretch-image-picker-btn');
    
    if (!isEdit) {
        editingStretchId = null;
        editingDefaultStretchId = null;
        editingStretchIsDefault = false;
        currentStretchImageBase64 = null;
        nameInput.value = '';
        document.getElementById('stretch-duration').value = '';
        document.getElementById('modal-title').textContent = "Yeni Hareket";
        
        const preview = document.getElementById('stretchImagePreview');
        const placeholder = document.getElementById('stretchImagePreviewContainer');
            const uploadBtn = document.getElementById('stretchImageUploadBtn');
            if(uploadBtn) uploadBtn.classList.add('hidden');
        if (preview && placeholder) {
            preview.src = "";
            preview.classList.add('hidden');
            placeholder.classList.remove('hidden');
        }
    }
    
    // Always re-enable for new movements or normal edits (editStretch will disable if needed)
    if (nameInput) {
        nameInput.disabled = editingStretchIsDefault;
        if (editingStretchIsDefault) nameInput.classList.add('opacity-50', 'cursor-not-allowed');
        else nameInput.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    if (imageBtn) {
        imageBtn.disabled = editingStretchIsDefault;
        if (editingStretchIsDefault) imageBtn.classList.add('opacity-50', 'cursor-not-allowed');
        else imageBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }

    const modal = document.getElementById('addStretchModal');
    const content = document.getElementById('addStretchModalContent');
    modal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function closeAddStretchModal() {
    const modal = document.getElementById('addStretchModal');
    const content = document.getElementById('addStretchModalContent');
    
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// ==========================================
// STRETCHES CRUD & RENDERING
// ==========================================

// --- Stretch Library Functions ---
let currentStretchCategory = 'Tümü';
let currentStretchSearchTerm = '';

function renderStretches() {
    const container = document.getElementById('stretch-list-container');
    if (!container) return;
    
    if (!DEFAULT_STRETCHES && (!typeof stretches !== 'undefined' || stretches.length === 0)) {
        container.innerHTML = `<p class="text-center text-on-surface-variant font-body-md mt-4">Henüz hareket eklenmedi.</p>`;
        return;
    }
    
    // Group stretches by category
    const categories = ['Sırt/Bel', 'Göğüs/Omuz', 'Kol', 'Kalça/Bacak', 'Boyun', 'Tam Vücut', 'Diğer'];
    const groupedStretches = {};
    categories.forEach(cat => groupedStretches[cat] = []);
    
    
    // Combine defaults and custom stretches
    const allStretches = [...DEFAULT_STRETCHES, ...(typeof stretches !== 'undefined' ? stretches : [])].sort((a, b) => {
        const nameA = a.name || '';
        const nameB = b.name || '';
        return nameA.localeCompare(nameB, 'tr');
    });

    allStretches.forEach(stretch => {

        let cat = stretch.category || 'Diğer';
        if (!groupedStretches[cat]) {
            groupedStretches[cat] = [];
        }
        groupedStretches[cat].push(stretch);
    });

    let html = '';
    for (const [catName, items] of Object.entries(groupedStretches)) {
        if (items.length === 0) continue;
        
        html += `
        <div class="mb-4 stretch-category" data-category="${catName}">
            <div class="flex items-center justify-between mb-2 py-1">
                <h2 class="font-title-lg text-on-surface">${catName}</h2>
            </div>
            <div class="flex flex-col gap-2">
        `;
        
        items.forEach(stretch => {
            let imageHtml = '';
            if (stretch.imageBase64) {
                imageHtml = `<img alt="${escapeHtml(stretch.name)}" class="w-full h-full object-cover" src="${stretch.imageBase64}"/>`;
            } else {
                imageHtml = `<div class="w-full h-full flex items-center justify-center font-bold text-lg">${stretch.name.charAt(0)}</div>`;
            }

            // Using the same design as exercise library
            html += `
            <div class="neo-surface p-4 rounded-2xl flex items-center justify-between neo-button transition-all stretch-item mb-3 cursor-pointer" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full neo-inset flex items-center justify-center bg-surface-light text-on-surface overflow-hidden font-bold text-lg">
                        ${imageHtml}
                    </div>
                    <div>
                        <h4 class="font-semibold text-body-md text-on-surface tracking-tight">${escapeHtml(stretch.name)}</h4>
                        <p class="text-xs text-on-surface-variant capitalize">Bölge: ${escapeHtml(stretch.category || 'Diğer')}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </div>
            </div>
            `;
        });
        
        html += `
            </div>
        </div>
        `;
    }
    
    container.innerHTML = html;
    applyStretchFilters();
}

function handleStretchSearch(value) {
    currentStretchSearchTerm = value.toLowerCase().trim();
    applyStretchFilters();
}

function filterStretches(category, btnElement) {
    currentStretchCategory = category;
    
    // Update active styling on chips
    const allChips = document.querySelectorAll('#view-stretch-library .filter-chip');
    allChips.forEach(chip => {
        chip.className = 'neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip';
    });
    
    // Set clicked chip to active
    btnElement.className = 'neo-inset px-5 py-2 rounded-full text-sm font-semibold text-on-surface whitespace-nowrap filter-chip active';

    applyStretchFilters();
}

function applyStretchFilters() {
    const categories = document.querySelectorAll('.stretch-category');
    
    categories.forEach(catGroup => {
        const catName = catGroup.getAttribute('data-category');
        const items = catGroup.querySelectorAll('.stretch-item');
        let hasVisibleItems = false;
        
        items.forEach(item => {
            const name = item.querySelector('h4').textContent.toLowerCase();
            const matchesSearch = name.includes(currentStretchSearchTerm);
            const matchesCategory = (currentStretchCategory === 'Tümü' || catName === currentStretchCategory);
            
            if (matchesSearch && matchesCategory) {
                item.style.display = 'flex';
                hasVisibleItems = true;
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide category header if no items match
        if (hasVisibleItems) {
            catGroup.style.display = 'block';
        } else {
            catGroup.style.display = 'none';
        }
    });
}



function handleStretchImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 200;
            const MAX_HEIGHT = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            currentStretchImageBase64 = canvas.toDataURL('image/jpeg', 0.8);
            
            const preview = document.getElementById('stretchImagePreview');
            const placeholder = document.getElementById('stretchImagePreviewContainer');
            const uploadBtn = document.getElementById('stretchImageUploadBtn');
            if(uploadBtn) uploadBtn.classList.add('hidden');
            
            if (preview && placeholder) {
                preview.src = currentStretchImageBase64;
                preview.classList.remove('hidden');
                placeholder.classList.add('hidden');
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveStretch() {
    if (!currentUid) return;
    const nameInput = document.getElementById('stretch-name').value.trim();
    const durationInput = document.getElementById('stretch-duration').value.trim();
    
    if (!nameInput || !durationInput) {
        alert('Lütfen hareket adı ve süresi girin.');
        return;
    }
    
    const stretchData = {
        name: nameInput,
        duration: parseInt(durationInput, 10) || 30,
        imageBase64: currentStretchImageBase64 || null,
        updatedAt: serverTimestamp()
    };
    
    try {
        if (editingStretchId) {
            await updateDoc(doc(db, "users", currentUid, "stretches", editingStretchId), stretchData).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        } else {
            stretchData.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "stretches"), stretchData).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
            
            // Eğer default hareketi editleyerek yeni hareket oluşturduysak, eski defaultu gizle
            if (editingDefaultStretchId) {
                hiddenDefaultStretchIds.add(editingDefaultStretchId);
                localStorage.setItem('hiddenDefaultStretches', JSON.stringify([...hiddenDefaultStretchIds]));
            }
        }
        
        closeAddStretchModal();
    } catch (e) {
        console.error("Error saving stretch: ", e);
        alert("Hareket kaydedilirken bir hata oluştu.");
    }
}

function editStretch(id) {
    // Check custom stretches first, then defaults
    let stretch = stretches.find(s => s.id === id);
    editingStretchIsDefault = false;
    
    if (!stretch) {
        stretch = DEFAULT_STRETCHES.find(s => s.id === id);
        editingStretchIsDefault = true;
    }
    if (!stretch) return;
    
    // For defaults: don't set editingStretchId so it saves as NEW Firestore doc
    editingStretchId = editingStretchIsDefault ? null : id;
    editingDefaultStretchId = editingStretchIsDefault ? id : null;
    
    const nameInput = document.getElementById('stretch-name');
    nameInput.value = stretch.name;
    document.getElementById('stretch-duration').value = stretch.duration;
    
    currentStretchImageBase64 = stretch.imageBase64 || null;
    
    const preview = document.getElementById('stretchImagePreview');
    const placeholder = document.getElementById('stretchImagePreviewContainer');
            const uploadBtn = document.getElementById('stretchImageUploadBtn');
            if(uploadBtn) uploadBtn.classList.add('hidden');
    const imageBtn = document.getElementById('stretch-image-picker-btn');
    
    if (editingStretchIsDefault) {
        nameInput.disabled = true;
        nameInput.classList.add('opacity-50', 'cursor-not-allowed');
        imageBtn.disabled = true;
        imageBtn.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        nameInput.disabled = false;
        nameInput.classList.remove('opacity-50', 'cursor-not-allowed');
        imageBtn.disabled = false;
        imageBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    if (currentStretchImageBase64) {
        preview.src = currentStretchImageBase64;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        preview.src = "";
        preview.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }
    
    document.getElementById('modal-title').textContent = "Hareketi Düzenle";
    openAddStretchModal(true);
}

async function deleteStretch(id) {
    if (!confirm("Bu hareketi silmek istediğinize emin misiniz?")) return;
    
    const isDefault = DEFAULT_STRETCHES.some(s => s.id === id);
    
    if (isDefault) {
        // Hide default from list via localStorage
        hiddenDefaultStretchIds.add(id);
        localStorage.setItem('hiddenDefaultStretches', JSON.stringify([...hiddenDefaultStretchIds]));
        renderStretches();
        return;
    }
    
    if (!currentUid) return;
    try {
        await deleteDoc(doc(db, "users", currentUid, "stretches", id)).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
    } catch (e) {
        console.error("Error deleting stretch: ", e);
        alert("Hareket silinirken bir hata oluştu.");
    }
}

// ==========================================
// CORE CRUD & RENDERING
// ==========================================

function renderCores() {
    const container = document.getElementById('core-list-container');
    if (!container) return;
    
    if (cores.length === 0) {
        container.innerHTML = `<p class="text-center text-on-surface-variant font-body-md mt-4">Henüz hareket eklenmedi.</p>`;
        return;
    }
    
    // Group cores by category
    const categories = ['Alt Karın', 'Üst Karın', 'Yan Karın', 'Bel/Sırt', 'Tüm Karın', 'Diğer'];
    const groupedCores = {};
    categories.forEach(cat => groupedCores[cat] = []);
    
    cores.forEach(core => {
        let cat = core.category || 'Diğer';
        if (!groupedCores[cat]) {
            groupedCores[cat] = [];
        }
        groupedCores[cat].push(core);
    });

    let html = '';
    for (const [catName, items] of Object.entries(groupedCores)) {
        if (items.length === 0) continue;
        
        html += `
        <div class="mb-4 core-category" data-category="${catName}">
            <div class="flex items-center justify-between mb-2 py-1">
                <h2 class="font-title-lg text-on-surface">${catName}</h2>
            </div>
            <div class="flex flex-col gap-2">
        `;
        
        items.forEach(core => {
            let imageHtml = '';
            if (core.imageBase64) {
                imageHtml = `<img alt="${escapeHtml(core.name)}" class="w-full h-full object-cover" src="${core.imageBase64}"/>`;
            } else {
                imageHtml = `<div class="w-full h-full flex items-center justify-center font-bold text-lg">${core.name.charAt(0)}</div>`;
            }
            
            const isFavClass = core.isFav ? 'text-amber-500' : 'text-on-surface-variant';
            const iconFill = core.isFav ? "'FILL' 1" : "'FILL' 0";

            // Note: openCoreSheet needs the core object or ID, we will pass ID.
            html += `
            <div onclick="openCoreSheet(this, '${core.id}')" class="neo-surface p-4 rounded-2xl flex items-center justify-between neo-button transition-all core-item mb-3 cursor-pointer" style="box-shadow: 4px 4px 8px #D1D9E6, -4px -4px 8px rgba(255, 255, 255, 0.7);">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 rounded-full neo-inset flex items-center justify-center bg-surface-light text-on-surface overflow-hidden font-bold text-lg">
                        ${imageHtml}
                    </div>
                    <div>
                        <h4 class="font-semibold text-body-md text-on-surface tracking-tight">${escapeHtml(core.name)}</h4>
                        <p class="text-xs text-on-surface-variant capitalize">Bölge: ${escapeHtml(core.category || 'Diğer')}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button class="p-2 transition-colors core-fav-btn flex items-center justify-center ${isFavClass}" onclick="toggleCoreFav(event, this, '${core.id}')">
                        <span class="material-symbols-outlined text-xl" style="font-variation-settings: ${iconFill}">star</span>
                    </button>
                    <span class="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </div>
            </div>
            `;
        });
        
        html += `
            </div>
        </div>
        `;
    }
    
    container.innerHTML = html;
    if(typeof applyCoreFilters === 'function') {
        applyCoreFilters();
    }
}

async function deleteCore(id) {
    if (!currentUid) return;
    if (!confirm("Bu hareketi silmek istediğinize emin misiniz?")) return;
    
    try {
        await deleteDoc(doc(db, "users", currentUid, "cores", id)).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
    } catch (e) {
        console.error("Error deleting core: ", e);
        alert("Hareket silinirken bir hata oluştu.");
    }
}

// ==========================================
// STRETCH SESSIONS
// ==========================================

function switchStretchTab(tab) {
    currentStretchTab = tab;
    const movements = document.getElementById('stretch-panel-movements');
    const sessions = document.getElementById('stretch-panel-sessions');
    const tabMovements = document.getElementById('stretch-tab-movements');
    const tabSessions = document.getElementById('stretch-tab-sessions');
    if (!movements || !sessions) return;

    if (tab === 'movements') {
        movements.classList.remove('hidden');
        sessions.classList.add('hidden');
        tabMovements.className = 'flex-1 py-3 font-label-lg text-label-lg text-neon-blue border-b-2 border-primary transition-colors';
        tabSessions.className = 'flex-1 py-3 font-label-lg text-label-lg text-on-surface-variant border-b-2 border-transparent hover:text-on-surface transition-colors';
    } else {
        movements.classList.add('hidden');
        sessions.classList.remove('hidden');
        tabMovements.className = 'flex-1 py-3 font-label-lg text-label-lg text-on-surface-variant border-b-2 border-transparent hover:text-on-surface transition-colors';
        tabSessions.className = 'flex-1 py-3 font-label-lg text-label-lg text-neon-blue border-b-2 border-primary transition-colors';
        renderStretchSessions();
    }
}

function getAllStretchMovements() {
    const visibleDefaults = DEFAULT_STRETCHES.filter(s => !hiddenDefaultStretchIds.has(s.id));
    return [...visibleDefaults, ...stretches];
}

function openAddSessionModal(isEdit = false) {
    if (!isEdit) {
        editingSessionId = null;
        sessionDraftMovements = [];
        document.getElementById('session-name').value = '';
        document.getElementById('session-modal-title').textContent = 'Yeni Seans';
    }
    renderSessionMovementPicker();
    renderSessionOrderedList();

    const modal = document.getElementById('addStretchSessionModal');
    const content = document.getElementById('addStretchSessionModalContent');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function closeAddSessionModal() {
    const modal = document.getElementById('addStretchSessionModal');
    const content = document.getElementById('addStretchSessionModalContent');
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    setTimeout(() => modal.classList.add('hidden'), 300);
}

function renderSessionMovementPicker() {
    const picker = document.getElementById('session-movement-picker');
    if (!picker) return;
    const all = getAllStretchMovements();
    if (all.length === 0) {
        picker.innerHTML = `<p class="text-center text-on-surface-variant font-body-sm py-2">Önce Hareketler sekmesinden hareket ekleyin.</p>`;
        return;
    }
    picker.innerHTML = all.map(m => {
        const selected = sessionDraftMovements.some(d => d.id === m.id);
        return `
        <button data-action="toggleSessionMovement" data-move-id="${m.id}"
            class="flex items-center gap-3 p-2 rounded-lg transition-colors text-left w-full ${selected ? 'bg-gradient-to-r from-neon-purple to-neon-blue/10 border border-primary/30' : 'hover:bg-background shadow-neo-low'}">
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-background shadow-neo-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="material-symbols-rounded text-[18px] ${selected ? 'text-neon-blue' : 'text-outline-variant'}" style="font-variation-settings: 'FILL' ${selected ? 1 : 0};">
                ${selected ? 'check_circle' : 'radio_button_unchecked'}
            </span>
        </button>`;
    }).join('');
}

function toggleSessionMovement(id) {
    const all = getAllStretchMovements();
    const move = all.find(m => m.id === id);
    if (!move) return;
    const idx = sessionDraftMovements.findIndex(d => d.id === id);
    if (idx === -1) {
        sessionDraftMovements.push({ id: move.id, name: move.name, duration: move.duration, imageBase64: move.imageBase64 || null });
    } else {
        sessionDraftMovements.splice(idx, 1);
    }
    renderSessionMovementPicker();
    renderSessionOrderedList();
}

function removeSessionMovement(id) {
    sessionDraftMovements = sessionDraftMovements.filter(d => d.id !== id);
    renderSessionMovementPicker();
    renderSessionOrderedList();
}

function renderSessionOrderedList() {
    const list = document.getElementById('session-ordered-list');
    const hint = document.getElementById('session-empty-hint');
    const durationEl = document.getElementById('session-total-duration');
    if (!list) return;

    if (sessionDraftMovements.length === 0) {
        list.innerHTML = `<p id="session-empty-hint" class="text-center text-on-surface-variant font-body-sm py-3">Yukarıdan hareket seçin</p>`;
        if (durationEl) durationEl.textContent = '0 dk';
        return;
    }

    list.innerHTML = sessionDraftMovements.map((m, i) => `
        <div class="flex items-center gap-3 bg-background shadow-neo-low rounded-lg p-2 cursor-grab active:cursor-grabbing session-drag-item"
            draggable="true" data-drag-idx="${i}">
            <span class="material-symbols-rounded text-outline text-[20px] select-none">drag_indicator</span>
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-background shadow-neo-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${m.duration}s</span>
            <button data-action="removeSessionMovement" data-move-id="${m.id}" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full">
                <span class="material-symbols-rounded text-[18px]">close</span>
            </button>
        </div>
    `).join('');

    // Total duration
    const total = sessionDraftMovements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (durationEl) durationEl.textContent = mins > 0 ? `${mins} dk ${secs > 0 ? secs + ' sn' : ''}` : `${secs} sn`;

    initSessionDrag(list);
}

function initSessionDrag(list) {
    let dragIdx = null;
    list.querySelectorAll('.session-drag-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            dragIdx = parseInt(item.getAttribute('data-drag-idx'));
            item.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => item.classList.remove('opacity-50'));
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetIdx = parseInt(item.getAttribute('data-drag-idx'));
            if (dragIdx === null || dragIdx === targetIdx) return;
            const moved = sessionDraftMovements.splice(dragIdx, 1)[0];
            sessionDraftMovements.splice(targetIdx, 0, moved);
            dragIdx = null;
            renderSessionOrderedList();
        });
    });
}

async function saveStretchSession() {
    if (!currentUid) return;
    const name = document.getElementById('session-name').value.trim();
    if (!name) { alert('Lütfen seans adı girin.'); return; }
    if (sessionDraftMovements.length === 0) { alert('En az bir hareket seçin.'); return; }

    const totalDuration = sessionDraftMovements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
    const data = {
        name,
        movements: sessionDraftMovements,
        totalDuration,
        updatedAt: serverTimestamp()
    };

    try {
        if (editingSessionId) {
            await updateDoc(doc(db, "users", currentUid, "stretchSessions", editingSessionId), data).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "stretchSessions"), data).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        }
        closeAddSessionModal();
    } catch (e) {
        console.error("Error saving session:", e);
        alert("Seans kaydedilirken hata oluştu.");
    }
}

function editStretchSession(id) {
    const session = stretchSessions.find(s => s.id === id);
    if (!session) return;
    editingSessionId = id;
    sessionDraftMovements = [...(session.movements || [])];
    document.getElementById('session-name').value = session.name;
    document.getElementById('session-modal-title').textContent = 'Seans Düzenle';
    openAddSessionModal(true);
}

async function deleteStretchSession(id) {
    if (!currentUid) return;
    if (!confirm("Bu seansı silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUid, "stretchSessions", id)).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        if (activeStretchSessionId === id) {
            activeStretchSessionId = null;
            localStorage.removeItem('activeStretchSessionId');
        }
    } catch (e) {
        console.error("Error deleting session:", e);
        alert("Seans silinirken hata oluştu.");
    }
}

function setActiveStretchSession(id) {
    activeStretchSessionId = id;
    localStorage.setItem('activeStretchSessionId', id);
    renderStretchSessions();
}

function renderStretchSessions() {
    const container = document.getElementById('stretch-sessions-container');
    if (!container) return;

    if (stretchSessions.length === 0) {
        container.innerHTML = `<p class="text-center text-on-surface-variant font-body-md mt-4">Henüz seans eklenmedi.</p>`;
        return;
    }

    container.innerHTML = stretchSessions.map(session => {
        const isActive = session.id === activeStretchSessionId;
        const mins = Math.floor((session.totalDuration || 0) / 60);
        const secs = (session.totalDuration || 0) % 60;
        const durationStr = mins > 0 ? `${mins} dk ${secs > 0 ? secs + ' sn' : ''}` : `${secs} sn`;
        const moveCount = (session.movements || []).length;

        return `
        <div class="rounded-[32px] p-4 flex flex-col gap-3 border transition-colors ${isActive ? 'bg-gradient-to-r from-neon-purple to-neon-blue/8 border-primary/40' : 'bg-background shadow-neo-low border-surface-variant/20'}">
            <!-- Header row -->
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        ${isActive ? `<span class="inline-flex items-center gap-1 bg-gradient-to-r from-neon-purple to-neon-blue text-white font-label-sm text-label-sm px-2 py-0.5 rounded-full text-[11px]">
                            <span class="material-symbols-rounded text-[12px]" style="font-variation-settings:'FILL' 1;">check_circle</span> Aktif
                        </span>` : ''}
                        <h3 class="font-title-sm text-title-sm font-semibold text-on-surface">${escapeHtml(session.name)}</h3>
                    </div>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                            <span class="material-symbols-rounded text-[14px]">timer</span> ${durationStr}
                        </span>
                        <span class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                            <span class="material-symbols-rounded text-[14px]">fitness_center</span> ${moveCount} hareket
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    ${!isActive ? `<button data-action="setActiveStretchSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-neon-blue transition-colors p-1.5 rounded-full hover:bg-background shadow-neo-variant active:scale-95" title="Aktif Seans Yap">
                        <span class="material-symbols-rounded text-[20px]">play_circle</span>
                    </button>` : ''}
                    <button data-action="editStretchSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-neon-blue transition-colors p-1.5 rounded-full hover:bg-background shadow-neo-variant active:scale-95">
                        <span class="material-symbols-rounded text-[20px]">edit</span>
                    </button>
                    <button data-action="deleteStretchSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-full hover:bg-background shadow-neo-variant active:scale-95">
                        <span class="material-symbols-rounded text-[20px]">delete</span>
                    </button>
                </div>
            </div>
            <!-- Movement Preview Strip -->
            ${moveCount > 0 ? `
            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar">
                ${(session.movements || []).map(m => `
                    <div class="flex-shrink-0 flex flex-col items-center gap-1">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-background shadow-neo-highest border border-surface-variant/30">
                            ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>` : ''}
        </div>`;
    }).join('');
}

// ==========================================
// STRETCH PLAYER
// ==========================================

let _spMovements = [];     // current session's movement list
let _spIdx = 0;            // current movement index
let _spTimeLeft = 0;       // seconds left for current movement
let _spTotalTime = 0;      // total duration of current movement
let _spInterval = null;    // setInterval handle
let _spPaused = false;
const CIRCUMFERENCE = 753.98; // 2 * π * 120

let _audioCtx = null;
function _playBeep(freq = 880, duration = 0.3, vol = 0.4) {
    try {
        if (!_audioCtx) {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (_audioCtx.state === 'suspended') {
            _audioCtx.resume();
        }
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(vol, _audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + duration);
        osc.start(_audioCtx.currentTime);
        osc.stop(_audioCtx.currentTime + duration);
    } catch(e) {}
}

function _playFinishBeep() {
    // Triple ascending beep on movement finish
    _playBeep(660, 0.15, 0.3);
    setTimeout(() => _playBeep(784, 0.15, 0.35), 180);
    setTimeout(() => _playBeep(1046, 0.25, 0.4), 360);
}

function openStretchPlayer() {
    // Decide which movements to use
    let movements = [];
    if (activeStretchSessionId) {
        const session = stretchSessions.find(s => s.id === activeStretchSessionId);
        if (session && session.movements && session.movements.length > 0) {
            movements = session.movements;
            const nameEl = document.getElementById('stretch-player-session-name');
            if (nameEl) nameEl.textContent = session.name;
        }
    }
    if (movements.length === 0) {
        // Fallback: use all visible movements
        movements = getAllStretchMovements();
        const nameEl = document.getElementById('stretch-player-session-name');
        if (nameEl) nameEl.textContent = 'Tüm Hareketler';
    }
    if (movements.length === 0) {
        alert('Önce Esneme Hareketleri sekmesinden hareket ekleyin veya bir seans oluşturun.');
        return;
    }

    _spMovements = movements;
    _spIdx = 0;
    _spPaused = false;

    // Find the currently active view and hide it
    const activeView = document.querySelector('.view:not(.hidden)');
    if (activeView && activeView.id !== 'view-stretch-player') {
        window._prevStretchView = activeView.id;
        activeView.classList.add('hidden');
    }

    const view = document.getElementById('view-stretch-player');
    view.classList.remove('hidden');
    view.style.display = 'flex';
    view.style.zIndex = '999999';
    view.style.position = 'fixed';
    view.style.top = '0';
    view.style.left = '0';
    view.style.width = '100%';
    view.style.height = '100dvh';
    // Ensure we start at the top of the player
    const appContainer = document.getElementById('app-container');
    if(appContainer) appContainer.scrollTop = 0;
    view.scrollTop = 0;

    _spLoadMovement(_spIdx);
    _spStartTimer();
}

function closeStretchPlayer() {
    _spStopTimer();
    const view = document.getElementById('view-stretch-player');
    view.classList.add('hidden');
    view.style.display = '';
    
    // Restore the previous view
    if (window._prevStretchView) {
        document.getElementById(window._prevStretchView).classList.remove('hidden');
        window._prevStretchView = null;
    } else {
        // Fallback
        document.getElementById('view-workout').classList.remove('hidden');
    }
}

function _spLoadMovement(idx) {
    const m = _spMovements[idx];
    if (!m) return;

    _spTotalTime = parseInt(m.duration) || 30;
    _spTimeLeft = _spTotalTime;

    // Image
    const img = document.getElementById('stretch-player-image');
    const placeholder = document.getElementById('stretch-player-image-placeholder');
    if (m.imageBase64) {
        img.src = m.imageBase64;
        img.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        img.src = '';
        img.classList.add('hidden');
        placeholder.classList.remove('hidden');
    }

    // Name
    document.getElementById('stretch-player-name').textContent = m.name;

    // Counter
    document.getElementById('stretch-player-counter').textContent = `${idx + 1} / ${_spMovements.length}`;

    // Progress strip
    _spRenderProgressStrip(idx);

    // Timer display
    _spUpdateTimerUI();

    _playBeep(660, 0.15, 0.3);
    setTimeout(() => _playBeep(784, 0.15, 0.35), 180);
    setTimeout(() => _playBeep(1046, 0.25, 0.4), 360);
}

function _spRenderProgressStrip(currentIdx) {
    const strip = document.getElementById('stretch-player-progress-strip');
    if (!strip) return;
    strip.innerHTML = _spMovements.map((_, i) => `
        <div class="flex-1 h-1 rounded-full overflow-hidden" style="background:#E0E5EC;">
            <div class="h-full rounded-full transition-all duration-300" style="${
                i < currentIdx ? 'width:100%; background: linear-gradient(to right, #4648d4, #8a4cfc);' :
                i === currentIdx ? 'width:100%; background: linear-gradient(to right, #4648d4, #8a4cfc);' :
                'width:0%;'
            }"></div>
        </div>
    `).join('');
}

function _spUpdateTimerUI() {
    const timeEl = document.getElementById('stretch-player-time');
    if (timeEl) timeEl.textContent = _spTimeLeft;
}

function _spStartTimer() {
    _spStopTimer();
    _spPaused = false;
    const pauseIcon = document.getElementById('stretch-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = 'pause';

    _spInterval = setInterval(() => {
        if (_spPaused) return;
        _spTimeLeft--;
        _spUpdateTimerUI();

        if (_spTimeLeft <= 0) {
            _spStopTimer();
            _playFinishBeep();
            // Move to next or end session
            setTimeout(() => stretchPlayerGoNext(false), 600);
        }
    }, 1000);
}

function _spStopTimer() {
    if (_spInterval) {
        clearInterval(_spInterval);
        _spInterval = null;
    }
}

function stretchPlayerPauseToggle() {
    _spPaused = !_spPaused;
    const pauseIcon = document.getElementById('stretch-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = _spPaused ? 'play_arrow' : 'pause';
}

function stretchPlayerGoNext(userTriggered = true) {
    _playFinishBeep();
    if (_spIdx >= _spMovements.length - 1) {
        // Session complete
        if (userTriggered) {
            closeStretchPlayer();
        } else {
            // Last movement finished naturally — play success beep and close
            _playBeep(1046, 0.5, 0.5);
            setTimeout(closeStretchPlayer, 800);
        }
        return;
    }
    _spIdx++;
    _spStopTimer();
    _spPaused = false;
    _spLoadMovement(_spIdx);
    _spStartTimer();
}

function stretchPlayerGoPrev() {
    if (_spIdx <= 0) return;
    _spIdx--;
    _spStopTimer();
    _spPaused = false;
    _spLoadMovement(_spIdx);
    _spStartTimer();
}


// ==========================================
// CORE SESSIONS & TABS
// ==========================================

function switchCoreTab(tab) {
    currentCoreTab = tab;
    document.getElementById('core-tab-movements').classList.toggle('text-neon-blue', tab === 'movements');
    document.getElementById('core-tab-movements').classList.toggle('border-primary', tab === 'movements');
    document.getElementById('core-tab-movements').classList.toggle('text-on-surface-variant', tab !== 'movements');
    document.getElementById('core-tab-movements').classList.toggle('border-transparent', tab !== 'movements');

    document.getElementById('core-tab-sessions').classList.toggle('text-neon-blue', tab === 'sessions');
    document.getElementById('core-tab-sessions').classList.toggle('border-primary', tab === 'sessions');
    document.getElementById('core-tab-sessions').classList.toggle('text-on-surface-variant', tab !== 'sessions');
    document.getElementById('core-tab-sessions').classList.toggle('border-transparent', tab !== 'sessions');

    if (tab === 'movements') {
        document.getElementById('core-panel-movements').classList.remove('hidden');
        document.getElementById('core-panel-sessions').classList.add('hidden');
    } else {
        document.getElementById('core-panel-movements').classList.add('hidden');
        document.getElementById('core-panel-sessions').classList.remove('hidden');
        renderCoreSessions();
    }
}

function renderCoreSessions() {
    const container = document.getElementById('core-sessions-container');
    if (!container) return;

    if (coreSessions.length === 0) {
        container.innerHTML = '<p class="text-center text-on-surface-variant mt-4 font-body-md">Henüz Core seansı eklenmemiş.</p>';
        return;
    }

    container.innerHTML = coreSessions.map(session => {
        const isActive = session.id === activeCoreSessionId;
        const totalSec = session.movements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        const durationStr = mins > 0 ? `${mins} dk ${secs > 0 ? secs + ' sn' : ''}` : `${secs} sn`;
        const moveCount = (session.movements || []).length;

        return `
        <div class="rounded-[32px] p-4 flex flex-col gap-3 border transition-colors ${isActive ? 'bg-gradient-to-r from-neon-purple to-neon-blue/8 border-primary/40' : 'bg-background shadow-neo-low border-surface-variant/20'}">
            <!-- Header row -->
            <div class="flex items-start justify-between gap-2">
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        ${isActive ? `<span class="inline-flex items-center gap-1 bg-gradient-to-r from-neon-purple to-neon-blue text-white font-label-sm text-label-sm px-2 py-0.5 rounded-full text-[11px]">
                            <span class="material-symbols-rounded text-[12px]" style="font-variation-settings:'FILL' 1;">check_circle</span> Aktif
                        </span>` : ''}
                        <h3 class="font-title-sm text-title-sm font-semibold text-on-surface">${escapeHtml(session.name)}</h3>
                    </div>
                    <div class="flex items-center gap-3 mt-1">
                        <span class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                            <span class="material-symbols-rounded text-[14px]">timer</span> ${durationStr}
                        </span>
                        <span class="flex items-center gap-1 text-on-surface-variant font-label-sm text-label-sm">
                            <span class="material-symbols-rounded text-[14px]">fitness_center</span> ${moveCount} hareket
                        </span>
                    </div>
                </div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    ${!isActive ? `<button data-action="setActiveCoreSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-neon-blue transition-colors p-1.5 rounded-full hover:bg-background shadow-neo-variant active:scale-95" title="Aktif Seans Yap">
                        <span class="material-symbols-rounded text-[20px]">play_circle</span>
                    </button>` : ''}
                    <button data-action="editCoreSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-neon-blue transition-colors p-1.5 rounded-full hover:bg-background shadow-neo-variant active:scale-95">
                        <span class="material-symbols-rounded text-[20px]">edit</span>
                    </button>
                    <button data-action="deleteCoreSession" data-session-id="${session.id}"
                        class="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-full hover:bg-background shadow-neo-variant active:scale-95">
                        <span class="material-symbols-rounded text-[20px]">delete</span>
                    </button>
                </div>
            </div>
            <!-- Movement Preview Strip -->
            ${moveCount > 0 ? `
            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar">
                ${(session.movements || []).map(m => `
                    <div class="flex-shrink-0 flex flex-col items-center gap-1">
                        <div class="w-10 h-10 rounded-full overflow-hidden bg-background shadow-neo-highest border border-surface-variant/30">
                            ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>` : ''}
        </div>
        `;
    }).join('');
}

function openAddCoreSessionModal() {
    editingCoreSessionId = null;
    coreSessionDraftMovements = [];
    document.getElementById('core-session-name').value = '';
    document.getElementById('core-session-modal-title').textContent = "Yeni Core Seansı";
    
    renderCoreSessionMovementPicker();
    renderCoreSessionOrderedList();

    const modal = document.getElementById('addCoreSessionModal');
    const content = document.getElementById('addCoreSessionModalContent');
    modal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function closeAddCoreSessionModal() {
    const modal = document.getElementById('addCoreSessionModal');
    const content = document.getElementById('addCoreSessionModalContent');
    
    modal.classList.add('opacity-0');
    content.classList.add('translate-y-full');
    
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

async function saveCoreSession() {
    if (!currentUid) return;
    
    const name = document.getElementById('core-session-name').value.trim();
    if (!name) { alert("Lütfen seans adı girin."); return; }
    if (coreSessionDraftMovements.length === 0) { alert("En az 1 hareket seçmelisiniz."); return; }

    const data = {
        name,
        movements: coreSessionDraftMovements
    };

    try {
        if (editingCoreSessionId) {
            await updateDoc(doc(db, "users", currentUid, "coreSessions", editingCoreSessionId), data).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        } else {
            data.createdAt = serverTimestamp();
            await addDoc(collection(db, "users", currentUid, "coreSessions"), data).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        }
        closeAddCoreSessionModal();
    } catch (e) {
        console.error("Error saving core session: ", e);
        alert("Kaydedilirken hata oluştu.");
    }
}

async function deleteCoreSession(id) {
    if (!currentUid || !confirm("Bu core seansını silmek istediğinize emin misiniz?")) return;
    try {
        await deleteDoc(doc(db, "users", currentUid, "coreSessions", id)).catch(e => { console.error('DB Error:', e); alert('Veritabanı işlemi sırasında bir hata oluştu.'); throw e; });
        if (activeCoreSessionId === id) {
            activeCoreSessionId = null;
            localStorage.removeItem('activeCoreSessionId');
        }
    } catch (e) {
        console.error("Error deleting core session: ", e);
    }
}

function editCoreSession(id) {
    const session = coreSessions.find(s => s.id === id);
    if (!session) return;

    editingCoreSessionId = id;
    document.getElementById('core-session-name').value = session.name;
    document.getElementById('core-session-modal-title').textContent = "Seans Düzenle";
    coreSessionDraftMovements = JSON.parse(JSON.stringify(session.movements));

    renderCoreSessionMovementPicker();
    renderCoreSessionOrderedList();

    const modal = document.getElementById('addCoreSessionModal');
    const content = document.getElementById('addCoreSessionModalContent');
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.remove('opacity-0');
        content.classList.remove('translate-y-full');
    }, 10);
}

function setActiveCoreSession(id) {
    activeCoreSessionId = id;
    localStorage.setItem('activeCoreSessionId', id);
    renderCoreSessions();
}

function renderCoreSessionMovementPicker() {
    const picker = document.getElementById('core-session-movement-picker');
    if (!picker) return;
    if (cores.length === 0) {
        picker.innerHTML = `<p class="text-center text-on-surface-variant font-body-sm py-2">Önce Hareketler sekmesinden hareket ekleyin.</p>`;
        return;
    }
    picker.innerHTML = cores.map(m => {
        const selected = coreSessionDraftMovements.some(d => d.id === m.id);
        return `
        <button data-action="toggleCoreSessionMovement" data-move-id="${m.id}"
            class="flex items-center gap-3 p-2 rounded-lg transition-colors text-left w-full ${selected ? 'bg-gradient-to-r from-neon-purple to-neon-blue/10 border border-primary/30' : 'hover:bg-background shadow-neo-low'}">
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-background shadow-neo-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="material-symbols-rounded text-[18px] ${selected ? 'text-neon-blue' : 'text-outline-variant'}" style="font-variation-settings: 'FILL' ${selected ? 1 : 0};">
                ${selected ? 'check_circle' : 'radio_button_unchecked'}
            </span>
        </button>`;
    }).join('');
}

function toggleCoreSessionMovement(id) {
    const move = cores.find(m => m.id === id);
    if (!move) return;
    const idx = coreSessionDraftMovements.findIndex(d => d.id === id);
    if (idx === -1) {
        coreSessionDraftMovements.push({ id: move.id, name: move.name, duration: move.duration, imageBase64: move.imageBase64 || null });
    } else {
        coreSessionDraftMovements.splice(idx, 1);
    }
    renderCoreSessionMovementPicker();
    renderCoreSessionOrderedList();
}

function removeCoreSessionMovement(id) {
    coreSessionDraftMovements = coreSessionDraftMovements.filter(d => d.id !== id);
    renderCoreSessionMovementPicker();
    renderCoreSessionOrderedList();
}

function renderCoreSessionOrderedList() {
    const list = document.getElementById('core-session-ordered-list');
    const totalEl = document.getElementById('core-session-total-duration');
    if (!list) return;

    if (coreSessionDraftMovements.length === 0) {
        list.innerHTML = `<p id="core-session-empty-hint" class="text-center text-on-surface-variant font-body-sm py-3">Yukarıdan hareket seçin</p>`;
        if (totalEl) totalEl.textContent = '0 dk';
        return;
    }

    list.innerHTML = coreSessionDraftMovements.map((m, i) => `
        <div class="flex items-center gap-3 bg-background shadow-neo-low rounded-lg p-2 cursor-grab active:cursor-grabbing core-session-drag-item"
            draggable="true" data-drag-idx="${i}">
            <span class="material-symbols-rounded text-outline text-[20px] select-none">drag_indicator</span>
            <div class="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-background shadow-neo-highest">
                ${m.imageBase64 ? `<img src="${m.imageBase64}" class="w-full h-full object-cover" alt="${escapeHtml(m.name)}"/>` : ''}
            </div>
            <span class="flex-1 font-body-md text-body-md text-on-surface truncate">${escapeHtml(m.name)}</span>
            <span class="font-label-sm text-label-sm text-on-surface-variant">${m.duration}s</span>
            <button data-action="removeCoreSessionMovement" data-move-id="${m.id}" class="text-on-surface-variant hover:text-error transition-colors p-1 rounded-full">
                <span class="material-symbols-rounded text-[18px]">close</span>
            </button>
        </div>
    `).join('');

    // Total duration
    const total = coreSessionDraftMovements.reduce((acc, m) => acc + (parseInt(m.duration) || 0), 0);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    if (totalEl) totalEl.textContent = mins > 0 ? `${mins} dk ${secs > 0 ? secs + ' sn' : ''}` : `${secs} sn`;

    initCoreSessionDrag(list);
}

function initCoreSessionDrag(list) {
    let dragIdx = null;
    list.querySelectorAll('.core-session-drag-item').forEach(item => {
        item.addEventListener('dragstart', (e) => {
            dragIdx = parseInt(item.getAttribute('data-drag-idx'));
            item.classList.add('opacity-50');
            e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => item.classList.remove('opacity-50'));
        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        item.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetIdx = parseInt(item.getAttribute('data-drag-idx'));
            if (dragIdx === null || dragIdx === targetIdx) return;
            const moved = coreSessionDraftMovements.splice(dragIdx, 1)[0];
            coreSessionDraftMovements.splice(targetIdx, 0, moved);
            dragIdx = null;
            renderCoreSessionOrderedList();
        });
    });
}


// ==========================================
// CORE PLAYER ENGINE
// ==========================================

let _cpMovements = [];
let _cpIdx = 0;
let _cpTimeLeft = 0;
let _cpTotalTime = 0;
let _cpInterval = null;
let _cpPaused = false;

function openCorePlayer() {
    let movements = [];
    if (activeCoreSessionId) {
        const session = coreSessions.find(s => s.id === activeCoreSessionId);
        if (session && session.movements && session.movements.length > 0) {
            movements = session.movements;
            const nameEl = document.getElementById('core-player-session-name');
            if (nameEl) nameEl.textContent = session.name;
        }
    }
    if (movements.length === 0) {
        movements = cores;
        const nameEl = document.getElementById('core-player-session-name');
        if (nameEl) nameEl.textContent = 'Tüm Hareketler';
    }
    if (movements.length === 0) {
        alert('Önce Core Hareketleri ekleyin veya bir seans oluşturun.');
        return;
    }

    _cpMovements = movements;
    _cpIdx = 0;
    _cpPaused = false;

    // Find the currently active view and hide it
    const activeView = document.querySelector('.view:not(.hidden)');
    if (activeView && activeView.id !== 'view-core-player') {
        window._prevCoreView = activeView.id;
        activeView.classList.add('hidden');
    }

    const view = document.getElementById('view-core-player');
    view.classList.remove('hidden');
    view.style.display = 'flex';
    view.style.zIndex = '999999';
    view.style.position = 'fixed';
    view.style.top = '0';
    view.style.left = '0';
    view.style.width = '100%';
    view.style.height = '100dvh';
    
    const appContainer = document.getElementById('app-container');
    if(appContainer) appContainer.scrollTop = 0;
    view.scrollTop = 0;

    _cpLoadMovement(_cpIdx);
    _cpStartTimer();
}

function closeCorePlayer() {
    _cpStopTimer();
    const view = document.getElementById('view-core-player');
    view.classList.add('hidden');
    view.style.display = '';
    
    // Restore the previous view
    if (window._prevCoreView) {
        document.getElementById(window._prevCoreView).classList.remove('hidden');
        window._prevCoreView = null;
    } else {
        document.getElementById('view-workout').classList.remove('hidden');
    }
}

function _cpLoadMovement(idx) {
    const move = _cpMovements[idx];
    if (!move) return;

    _cpTotalTime = parseInt(move.duration) || 30;
    _cpTimeLeft = _cpTotalTime;

    const imgEl = document.getElementById('core-player-image');
    const placeholder = document.getElementById('core-player-image-placeholder');
    if (move.imageBase64) {
        imgEl.src = move.imageBase64;
        imgEl.classList.remove('hidden');
        placeholder.classList.add('hidden');
    } else {
        imgEl.classList.add('hidden');
        imgEl.src = "";
        placeholder.classList.remove('hidden');
    }

    document.getElementById('core-player-name').textContent = move.name;
    document.getElementById('core-player-counter').textContent = `${idx + 1} / ${_cpMovements.length}`;
    
    _cpRenderProgressStrip(idx);

    _playBeep(660, 0.15, 0.3);
    setTimeout(() => _playBeep(784, 0.15, 0.35), 180);
    setTimeout(() => _playBeep(1046, 0.25, 0.4), 360);
}

function _cpRenderProgressStrip(currentIdx) {
    const strip = document.getElementById('core-player-progress-strip');
    if (!strip) return;
    strip.innerHTML = _cpMovements.map((_, i) => `
        <div class="flex-1 h-1 rounded-full overflow-hidden" style="background:#E0E5EC;">
            <div class="h-full rounded-full transition-all duration-300" style="${
                i < currentIdx ? 'width:100%; background: linear-gradient(to right, #4648d4, #22C55E);' :
                i === currentIdx ? 'width:100%; background: linear-gradient(to right, #4648d4, #22C55E);' :
                'width:0%;'
            }"></div>
        </div>
    `).join('');
}

function _cpUpdateTimerUI() {
    const timeEl = document.getElementById('core-player-time');
    if (timeEl) timeEl.textContent = _cpTimeLeft;
}

function _cpStartTimer() {
    _cpStopTimer();
    _cpPaused = false;
    const pauseIcon = document.getElementById('core-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = 'pause';

    _cpInterval = setInterval(() => {
        if (_cpPaused) return;
        _cpTimeLeft--;
        _cpUpdateTimerUI();

        if (_cpTimeLeft <= 0) {
            _cpStopTimer();
            _playFinishBeep();
            setTimeout(() => corePlayerGoNext(false), 600);
        }
    }, 1000);
}

function _cpStopTimer() {
    if (_cpInterval) {
        clearInterval(_cpInterval);
        _cpInterval = null;
    }
}

function _cpPauseToggle() {
    _cpPaused = !_cpPaused;
    const pauseIcon = document.getElementById('core-player-pause-icon');
    if (pauseIcon) pauseIcon.textContent = _cpPaused ? 'play_arrow' : 'pause';
}

function corePlayerGoNext(userTriggered = true) {
    _playFinishBeep();
    if (_cpIdx >= _cpMovements.length - 1) {
        if (userTriggered) {
            closeCorePlayer();
        } else {
            _playBeep(1046, 0.5, 0.5);
            setTimeout(closeCorePlayer, 800);
        }
        return;
    }
    _cpIdx++;
    _cpStopTimer();
    _cpPaused = false;
    _cpLoadMovement(_cpIdx);
    _cpStartTimer();
}

function corePlayerGoPrev() {
    if (_cpIdx <= 0) return;
    _cpIdx--;
    _cpStopTimer();
    _cpPaused = false;
    _cpLoadMovement(_cpIdx);
    _cpStartTimer();
}

function corePlayerEnd() {
    closeCorePlayer();
}



let currentCoreCategory = 'Tümü';
let currentCoreSearchTerm = '';
let currentCoreElement = null;
let currentCoreId = null;

function handleCoreSearch(value) {
    currentCoreSearchTerm = value.toLowerCase().trim();
    applyCoreFilters();
}

function filterCores(category, btnElement) {
    currentCoreCategory = category;
    
    // Update active styling on chips
    const allChips = document.querySelectorAll('#view-core-library .filter-chip');
    allChips.forEach(chip => {
        chip.className = 'neo-surface px-5 py-2 rounded-full text-sm font-semibold text-on-surface-variant whitespace-nowrap neo-button filter-chip';
    });
    
    // Set clicked chip to active
    btnElement.className = 'neo-inset px-5 py-2 rounded-full text-sm font-semibold text-on-surface whitespace-nowrap filter-chip active';

    applyCoreFilters();
}

function applyCoreFilters() {
    const categories = document.querySelectorAll('.core-category');
    
    categories.forEach(catGroup => {
        const catName = catGroup.getAttribute('data-category');
        const items = catGroup.querySelectorAll('.core-item');
        let hasVisibleItems = false;
        
        items.forEach(item => {
            let shouldShow = false;
            
            // 1. Tab Filter
            if (currentCoreCategory === 'Tümü') {
                shouldShow = true;
            } else if (currentCoreCategory === 'Favoriler') {
                const isFav = item.querySelector('.core-fav-btn').classList.contains('text-amber-500');
                shouldShow = isFav;
            } else {
                shouldShow = (catName === currentCoreCategory);
            }
            
            // 2. Search Filter
            if (shouldShow && currentCoreSearchTerm !== '') {
                const name = item.querySelector('h4').innerText.toLowerCase();
                if (!name.includes(currentCoreSearchTerm)) {
                    shouldShow = false;
                }
            }
            
            if (shouldShow) {
                item.classList.remove('hidden');
                hasVisibleItems = true;
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Hide the whole category group if no items are visible
        if (hasVisibleItems) {
            catGroup.classList.remove('hidden');
        } else {
            catGroup.classList.add('hidden');
        }
    });
}

function openCoreSheet(element, id) {
    const ev = window.event;
    if (ev && ev.target.closest('.core-fav-btn')) return;
    currentCoreElement = element;
    currentCoreId = id;
    
    const core = cores.find(c => c.id === id);
    if (!core) return;
    
    // Sync sheet star state with list item star state
    const listFavBtn = element.querySelector('.core-fav-btn');
    const isFav = listFavBtn.classList.contains('text-amber-500');
    const sheetFavBtn = document.getElementById('sheet-core-fav-btn');
    const sheetIcon = sheetFavBtn.querySelector('span');
    
    if (isFav) {
        sheetFavBtn.classList.add('text-amber-500');
        sheetFavBtn.classList.remove('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 1";
    } else {
        sheetFavBtn.classList.remove('text-amber-500');
        sheetFavBtn.classList.add('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 0";
    }

    document.getElementById('sheet-core-name').innerText = core.name;
    
    // Render the interactive SVG instead of static image
    if (typeof renderCoreMuscleMap === 'function') {
        renderCoreMuscleMap(core.category);
        
        // Initialize Panzoom
        const mapElement = document.getElementById('sheet-core-interactive-map');
        
        // Destroy previous instance if exists to prevent memory leaks
        if (window.currentCorePanzoom) {
            window.currentCorePanzoom.destroy();
        }
        
        window.currentCorePanzoom = Panzoom(mapElement, {
            maxScale: 4,
            minScale: 0.8,
            contain: 'outside',
            step: 0.2
        });
        
        // Bind buttons
        document.getElementById('core-zoom-in').onclick = () => window.currentCorePanzoom.zoomIn();
        document.getElementById('core-zoom-out').onclick = () => window.currentCorePanzoom.zoomOut();
        document.getElementById('core-zoom-reset').onclick = () => window.currentCorePanzoom.reset();
        
        // Add wheel support
        mapElement.parentElement.addEventListener('wheel', window.currentCorePanzoom.zoomWithWheel);
    }

    
    let legendHtml = `
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: #7ea18d;"></div>
            <span class="text-body-md text-on-surface-variant">Ana Kaslar</span>
        </div>
        <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: #c6ebd5;"></div>
            <span class="text-body-md text-on-surface-variant">Yardımcı Kaslar</span>
        </div>
    `;
    document.getElementById('sheet-core-legend').innerHTML = legendHtml;
    
    const sheet = document.getElementById('core-bottom-sheet');
    const sheetContent = document.getElementById('core-bottom-sheet-content');
    
    sheet.classList.remove('pointer-events-none');
    sheet.classList.add('opacity-100');
    sheet.classList.remove('opacity-0');
    
    setTimeout(() => {
        sheetContent.classList.remove('translate-y-full');
        sheetContent.classList.add('translate-y-0');
    }, 10);
}

function closeCoreSheet() {
    const sheet = document.getElementById('core-bottom-sheet');
    const sheetContent = document.getElementById('core-bottom-sheet-content');
    
    sheetContent.classList.remove('translate-y-0');
    sheetContent.classList.add('translate-y-full');
    
    setTimeout(() => {
        sheet.classList.add('opacity-0');
        sheet.classList.remove('opacity-100');
        sheet.classList.add('pointer-events-none');
    }, 300);
}

function closeCoreSheetOnOutsideClick(event) {
    if (event.target.id === 'core-bottom-sheet') {
        closeCoreSheet();
    }
}

async function toggleCoreFav(event, btn, coreId) {
    if(event) event.stopPropagation();
    
    const core = cores.find(c => c.id === coreId);
    if(!core) return;

    const isFav = !core.isFav; // Toggle state
    core.isFav = isFav; // Optimistic update

    const icon = btn.querySelector('span');
    if (isFav) {
        btn.classList.add('text-amber-500');
        btn.classList.remove('text-on-surface-variant');
        icon.style.fontVariationSettings = "'FILL' 1";
    } else {
        btn.classList.remove('text-amber-500');
        btn.classList.add('text-on-surface-variant');
        icon.style.fontVariationSettings = "'FILL' 0";
    }

    if(currentCoreCategory === 'Favoriler') {
        applyCoreFilters();
    }
    
    // Save to Firebase
    try {
        const coreRef = doc(db, "users", auth.currentUser.uid, "cores", coreId);
        await updateDoc(coreRef, { isFav: isFav });
    } catch(err) {
        console.error("Error updating fav:", err);
    }
}

function toggleCoreSheetFav() {
    if (!currentCoreElement || !currentCoreId) return;
    const listFavBtn = currentCoreElement.querySelector('.core-fav-btn');
    const sheetFavBtn = document.getElementById('sheet-core-fav-btn');
    const sheetIcon = sheetFavBtn.querySelector('span');
    
    // Toggle the list item star
    toggleCoreFav(null, listFavBtn, currentCoreId);
    
    // Update sheet star visually
    const isFav = listFavBtn.classList.contains('text-amber-500');
    if (isFav) {
        sheetFavBtn.classList.add('text-amber-500');
        sheetFavBtn.classList.remove('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 1";
    } else {
        sheetFavBtn.classList.remove('text-amber-500');
        sheetFavBtn.classList.add('text-on-surface-variant');
        sheetIcon.style.fontVariationSettings = "'FILL' 0";
    }
}

// category grid logic for Add Core Sheet
document.addEventListener('DOMContentLoaded', () => {
    const catBtns = document.querySelectorAll('#coreCategoryGrid .category-select-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            catBtns.forEach(b => {
                b.classList.remove('border-primary', 'text-primary', 'bg-primary/5');
            });
            // Add to clicked
            btn.classList.add('border-primary', 'text-primary', 'bg-primary/5');
            document.getElementById('newCoreCategory').value = btn.getAttribute('data-cat');
        });
    });
});

function openAddCoreSheet() {
    editingCoreId = null;
    editingCoreIsDefault = false;
    currentCoreImageBase64 = null;
    
    document.getElementById('newCoreName').value = '';
    document.getElementById('newCoreDuration').value = '';
    document.getElementById('newCoreCategory').value = '';
    
    const catBtns = document.querySelectorAll('#coreCategoryGrid .category-select-btn');
    catBtns.forEach(b => b.classList.remove('border-primary', 'text-primary', 'bg-primary/5'));
    
    const previewContainer = document.getElementById('coreImagePreviewContainer');
    const uploadBtn = document.getElementById('coreImageUploadBtn');
    previewContainer.classList.add('hidden');
    uploadBtn.classList.remove('hidden');
    
    const sheet = document.getElementById('add-core-bottom-sheet');
    const sheetContent = document.getElementById('add-core-bottom-sheet-content');
    
    sheet.classList.remove('pointer-events-none');
    sheet.classList.add('opacity-100');
    sheet.classList.remove('opacity-0');
    
    setTimeout(() => {
        sheetContent.classList.remove('translate-y-full');
        sheetContent.classList.add('translate-y-0');
    }, 10);
}

function closeAddCoreSheet() {
    const sheet = document.getElementById('add-core-bottom-sheet');
    const sheetContent = document.getElementById('add-core-bottom-sheet-content');
    
    sheetContent.classList.remove('translate-y-0');
    sheetContent.classList.add('translate-y-full');
    
    setTimeout(() => {
        sheet.classList.add('opacity-0');
        sheet.classList.remove('opacity-100');
        sheet.classList.add('pointer-events-none');
    }, 300);
}

function closeAddCoreSheetOnOutsideClick(event) {
    if (event.target.id === 'add-core-bottom-sheet') {
        closeAddCoreSheet();
    }
}

async function deleteCurrentCore() {
    if (!currentCoreId) return;
    
    const core = cores.find(c => c.id === currentCoreId);
    if (!core) return;
    
    const confirmDelete = confirm(`${core.name} adlı hareketi silmek istediğinize emin misiniz?`);
    if (!confirmDelete) return;

    try {
        await deleteDoc(doc(db, "users", auth.currentUser.uid, "cores", currentCoreId));
        closeCoreSheet();
    } catch (error) {
        console.error("Error removing document: ", error);
        alert("Hareket silinirken bir hata oluştu.");
    }
}

async function saveCoreExercise() {
    const name = document.getElementById('newCoreName').value.trim();
    const duration = document.getElementById('newCoreDuration').value.trim();
    const category = document.getElementById('newCoreCategory').value.trim();
    
    if (!name || !duration || !category) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }
    
    const coreData = {
        name,
        duration,
        category,
        isDefault: false
    };
    if (currentCoreImageBase64) {
        coreData.imageBase64 = currentCoreImageBase64;
    }
    
    try {
        if (editingCoreId) {
            const coreRef = doc(db, "users", auth.currentUser.uid, "cores", editingCoreId);
            await updateDoc(coreRef, coreData);
        } else {
            const coresRef = collection(db, "users", auth.currentUser.uid, "cores");
            await addDoc(coresRef, coreData);
        }
        closeAddCoreSheet();
    } catch(err) {
        console.error("Error saving core:", err);
        alert("Kaydedilirken hata oluştu.");
    }
}



function renderCoreMuscleMap(category) {
    const container = document.getElementById('sheet-core-interactive-map');
    if (!container || typeof COMBINED_SVG === 'undefined') return;
    
    container.innerHTML = COMBINED_SVG;
    
    const svgEl = container.querySelector('svg');
    const primaryColor = '#7ea18d'; // Sage green
    
    let targetMuscles = [];
    if (category === 'Alt Karın' || category === 'Üst Karın' || category === 'Tüm Karın' || category === 'Karın') {
        targetMuscles = ['abs'];
    } else if (category === 'Yan Karın') {
        targetMuscles = ['obliques'];
    } else if (category === 'Bel/Sırt' || category === 'Sırt') {
        targetMuscles = ['lower-back', 'upper-back'];
    } else if (category === 'Kalça') {
        targetMuscles = ['glutes'];
    }
    
    targetMuscles.forEach(muscle => {
        const paths = svgEl.querySelectorAll(`path[data-muscle="${muscle}"]`);
        paths.forEach(p => p.setAttribute('fill', primaryColor));
    });
}


// --- Global Exports for Inline HTML Handlers ---
window.filterCores = typeof filterCores !== 'undefined' ? filterCores : null;
window.handleCoreSearch = typeof handleCoreSearch !== 'undefined' ? handleCoreSearch : null;
window.filterStretches = typeof filterStretches !== 'undefined' ? filterStretches : null;
window.handleStretchSearch = typeof handleStretchSearch !== 'undefined' ? handleStretchSearch : null;
window.renderCores = typeof renderCores !== 'undefined' ? renderCores : null;
window.renderStretches = typeof renderStretches !== 'undefined' ? renderStretches : null;
window.openCoreSheet = typeof openCoreSheet !== 'undefined' ? openCoreSheet : null;
window.openAddCoreSheet = typeof openAddCoreSheet !== 'undefined' ? openAddCoreSheet : null;


window.closeAddCoreSheet = typeof closeAddCoreSheet !== 'undefined' ? closeAddCoreSheet : null;
window.closeAddCoreSheetOnOutsideClick = typeof closeAddCoreSheetOnOutsideClick !== 'undefined' ? closeAddCoreSheetOnOutsideClick : null;
window.closeCoreSheet = typeof closeCoreSheet !== 'undefined' ? closeCoreSheet : null;
window.closeCoreSheetOnOutsideClick = typeof closeCoreSheetOnOutsideClick !== 'undefined' ? closeCoreSheetOnOutsideClick : null;
window.deleteCurrentCore = typeof deleteCurrentCore !== 'undefined' ? deleteCurrentCore : null;
window.saveCoreExercise = typeof saveCoreExercise !== 'undefined' ? saveCoreExercise : null;
window.toggleCoreSheetFav = typeof toggleCoreSheetFav !== 'undefined' ? toggleCoreSheetFav : null;
window.toggleCoreFav = typeof toggleCoreFav !== 'undefined' ? toggleCoreFav : null;


// --- Stretch Add/Edit Bottom Sheet Functions ---

function openAddStretchSheet() {
    editingStretchId = null;
    currentStretchImageBase64 = null;
    
    document.getElementById('newStretchName').value = '';
    document.getElementById('newStretchDuration').value = '30';
    document.getElementById('newStretchCategory').value = 'Sırt/Bel';
    
    document.getElementById('stretchImagePreviewContainer').classList.add('hidden');
    document.getElementById('stretchImageUploadBtn').classList.remove('hidden');
    
    const catOptions = document.querySelectorAll('#newStretchCategoryOptions .category-select-btn');
    catOptions.forEach(btn => {
        if (btn.getAttribute('data-cat') === 'Sırt/Bel') {
            btn.classList.remove('neo-surface', 'text-on-surface-variant');
            btn.classList.add('neo-inset', 'text-primary', 'border-primary/20');
        } else {
            btn.classList.add('neo-surface', 'text-on-surface-variant');
            btn.classList.remove('neo-inset', 'text-primary', 'border-primary/20');
        }
    });
    
    const sheet = document.getElementById('add-stretch-bottom-sheet');
    const sheetContent = document.getElementById('add-stretch-bottom-sheet-content');
    
    sheet.classList.remove('pointer-events-none');
    sheet.classList.remove('opacity-0');
    sheet.classList.add('opacity-100');
    
    setTimeout(() => {
        sheetContent.classList.remove('translate-y-full');
        sheetContent.classList.add('translate-y-0');
    }, 50);
}

function closeAddStretchSheet() {
    const sheet = document.getElementById('add-stretch-bottom-sheet');
    const sheetContent = document.getElementById('add-stretch-bottom-sheet-content');
    
    sheetContent.classList.remove('translate-y-0');
    sheetContent.classList.add('translate-y-full');
    
    setTimeout(() => {
        sheet.classList.add('opacity-0');
        sheet.classList.remove('opacity-100');
        sheet.classList.add('pointer-events-none');
    }, 300);
}

function closeAddStretchSheetOnOutsideClick(event) {
    if (event.target.id === 'add-stretch-bottom-sheet') {
        closeAddStretchSheet();
    }
}

async function saveStretchExercise() {
    const name = document.getElementById('newStretchName').value.trim();
    const duration = document.getElementById('newStretchDuration').value.trim();
    const category = document.getElementById('newStretchCategory').value.trim();
    
    if (!name || !duration || !category) {
        alert("Lütfen tüm alanları doldurun.");
        return;
    }
    
    const stretchData = {
        name,
        duration,
        category,
        isDefault: false
    };
    if (currentStretchImageBase64) {
        stretchData.imageBase64 = currentStretchImageBase64;
    }
    
    try {
        if (editingStretchId) {
            const stretchRef = doc(db, "users", auth.currentUser.uid, "stretches", editingStretchId);
            await updateDoc(stretchRef, stretchData);
        } else {
            const stretchesRef = collection(db, "users", auth.currentUser.uid, "stretches");
            await addDoc(stretchesRef, stretchData);
        }
        closeAddStretchSheet();
    } catch(err) {
        console.error("Error saving stretch:", err);
        alert("Kaydedilirken hata oluştu.");
    }
}

function triggerStretchImageUpload() {
    document.getElementById('stretchImageInput').click();
}



// Window Exports
window.openAddStretchSheet = openAddStretchSheet;
window.closeAddStretchSheet = closeAddStretchSheet;
window.closeAddStretchSheetOnOutsideClick = closeAddStretchSheetOnOutsideClick;
window.saveStretchExercise = saveStretchExercise;
window.triggerStretchImageUpload = triggerStretchImageUpload;
window.handleStretchImageUpload = handleStretchImageUpload;


// category grid logic for Add Stretch Sheet
document.addEventListener('DOMContentLoaded', () => {
    const stretchCatBtns = document.querySelectorAll('#newStretchCategoryOptions .category-select-btn');
    stretchCatBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            stretchCatBtns.forEach(b => {
                b.classList.remove('neo-inset', 'text-primary', 'border-primary/20');
                b.classList.add('neo-surface', 'text-on-surface-variant');
            });
            // Add to clicked
            btn.classList.add('neo-inset', 'text-primary', 'border-primary/20');
            btn.classList.remove('neo-surface', 'text-on-surface-variant');
            document.getElementById('newStretchCategory').value = btn.getAttribute('data-cat');
        });
    });
});
