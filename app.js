// 0fluffShow - Main Controller

const app = {
    async init() {
        await API.init(); // Check for key
        await UI.renderList();
        
        // Populate Settings Input if key exists
        const key = await DB.getSetting('tmdb_key');
        if (key) document.getElementById('apiKeyInput').value = key;
    },

    // --- Modal Logic ---
    openModal() {
        document.getElementById('modal').classList.remove('hidden');
        UI.renderModalContent(null); // Render Add Mode
    },

    async openEdit(id) {
        document.getElementById('modal').classList.remove('hidden');
        await UI.renderModalContent(id); // Render Edit Mode
        const show = await DB.getShow(id);
        if (show) UI.fillForm(show);
    },

    closeModal() {
        document.getElementById('modal').classList.add('hidden');
        document.getElementById('modalBody').innerHTML = ''; // Clear DOM
    },

    // --- API Selection ---
    async selectApiShow(tmdbId) {
        const details = await API.getDetails(tmdbId);
        if (!details) return alert("Failed to fetch details");

        // Fill hidden inputs
        document.getElementById('apiSearch').value = details.title;
        document.getElementById('title').value = details.title;
        document.getElementById('tmdbId').value = details.tmdbId;
        document.getElementById('apiPoster').value = details.poster;
        document.getElementById('apiStatus').value = details.status;
        document.getElementById('apiRating').value = details.rating;
        document.getElementById('apiTotalSeasons').value = details.totalSeasons;
        document.getElementById('searchResults').classList.add('hidden');
    },

    // --- CRUD ---
    async saveShow() {
        const idInput = document.getElementById('showId');
        const editId = idInput && idInput.value ? parseInt(idInput.value) : null;
        
        const titleEl = document.getElementById('title');
        const title = titleEl ? titleEl.value.trim() : "";
        if (!title) return alert("Title is required");

        const season = parseInt(document.getElementById('season').value || 1);
        const episode = parseInt(document.getElementById('episode').value || 1);

        // Gather Data
        let showData = {
            title, season, episode,
            updated: Date.now()
        };

        if (editId) showData.id = editId;

        // Check source of data (API or Manual)
        const apiIdEl = document.getElementById('tmdbId');
        
        if (apiIdEl && apiIdEl.value) {
            // API Data
            showData.tmdbId = parseInt(apiIdEl.value);
            showData.poster = document.getElementById('apiPoster').value;
            showData.status = document.getElementById('apiStatus').value;
            showData.rating = document.getElementById('apiRating').value;
            showData.totalSeasons = parseInt(document.getElementById('apiTotalSeasons').value || 0);
        } else {
            // Manual Data
            const fileInput = document.getElementById('poster');
            const totalSeasonsInput = document.getElementById('totalSeasons');
            
            if (totalSeasonsInput) showData.totalSeasons = parseInt(totalSeasonsInput.value);

            // Handle Image conversion
            if (fileInput && fileInput.files[0]) {
                showData.poster = await toBase64(fileInput.files[0]);
            } else if (editId) {
                // Keep existing poster if editing and no new file
                const old = await DB.getShow(editId);
                showData.poster = old.poster;
            }
        }

        try {
            await DB.saveShow(showData);
            this.closeModal();
            UI.renderList();
        } catch (err) {
            alert("Error saving: " + err.message);
        }
    },

    async quickUpdate(id, ds, de) {
        const show = await DB.getShow(id);
        if (!show) return;

        if (ds > 0) {
            show.season += ds;
            show.episode = 1;
        } else {
            show.episode += de;
        }
        show.updated = Date.now();
        await DB.saveShow(show);
        UI.renderList();
    },

    async deleteShow(id) {
        if (!confirm("Delete show?")) return;
        await DB.deleteShow(id);
        UI.renderList();
    }
};

// --- Settings Logic ---
function openSettings() { document.getElementById('settingsModal').classList.remove('hidden'); }
function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }
async function saveSettings() {
    const key = document.getElementById('apiKeyInput').value.trim();
    await DB.saveSetting('tmdb_key', key);
    location.reload(); // Reload to re-init API
}

// --- Backup/Restore Wrappers ---
async function exportData() {
    const shows = await DB.getAllShows();
    const blob = new Blob([JSON.stringify(shows)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ofluff_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
}

async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            await DB.clearShows();
            for (const item of data) await DB.saveShow(item);
            location.reload();
        } catch (err) { alert("Invalid backup"); }
    };
    reader.readAsText(file);
}

function toBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Global Expose for HTML OnClick
window.app = app;
window.openModal = app.openModal;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.exportData = exportData;
window.importData = importData;

// Start
app.init();
