const fs = require('fs');
const file = '/Users/boratektas/Desktop/mizirap/workout.js';
let content = fs.readFileSync(file, 'utf8');

const oldLogic = `cores = snap.docs.map(d => ({ id: d.id, ...d.data() }));`;
const newLogic = `cores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

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
                    console.log("Migrated core categories successfully.");
                } catch(e) {
                    console.error("Migration failed:", e);
                }
            }
        }`;

content = content.replace(oldLogic, newLogic);
fs.writeFileSync(file, content);
