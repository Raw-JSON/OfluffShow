const app = {
    async init() {
        await API.init(); 
        await UI.renderList();
        const key = await DB.getSetting('tmdb_key');
        if (key) document.getElementById('apiKeyInput').value = key;
    },

    openModal() {
        document.getElementById('modal').classList.remove('hidden');
        UI.renderModalContent(null);
    },

    // MANUAL EDIT
    async openEdit(id) {
        document.getElementById('modal').classList.remove('hidden');
        await UI.renderModalContent(id);
        const show = await DB.getShow(id);
        if (show) UI.fillForm(show);
    },

    // API CHECKLIST
    async openChecklist(id) {
        document.getElementById('modal').classList.remove('hidden');
        const show = await DB.getShow(id);
        UI.renderChecklist(show);
    },

    closeModal() {
        document.getElementById('modal').classList.add('hidden');
        document.getElementById('modalBody').innerHTML = '';
    },

    // API SELECT LOGIC
    async selectApiShow(tmdbId) {
        const details = await API.getDetails(tmdbId);
        if (!details) return alert("Failed to fetch details");

        // Set hidden fields
        document.getElementById('title').value = details.title;
        document.getElementById('tmdbId').value = details.tmdbId;
        document.getElementById('apiPoster').value = details.poster;
        document.getElementById('apiStatus').value = details.status;
        document.getElementById('apiRating').value = details.rating;
        // IMPORTANT: Store the season structure map
        document.getElementById('apiSeasonData').value = JSON.stringify(details.seasonData);

        // Populate the UI Dropdown
        UI.populateSeasonSelect(details.seasonData);
    },

    async saveShow() {
        // ... (Same preamble as before) ...
        const idInput = document.getElementById('showId');
        const editId = idInput && idInput.value ? parseInt(idInput.value) : null;
        
        // Manual vs API Check
        const apiIdEl = document.getElementById('tmdbId');
        let showData = {};

        if (apiIdEl && apiIdEl.value) {
            // API SAVE
            const seasonSelect = document.getElementById('seasonSelect');
            showData = {
                title: document.getElementById('title').value,
                tmdbId: parseInt(apiIdEl.value),
                poster: document.getElementById('apiPoster').value,
                status: document.getElementById('apiStatus').value,
                rating: document.getElementById('apiRating').value,
                seasonData: JSON.parse(document.getElementById('apiSeasonData').value), // Store structure
                season: parseInt(seasonSelect.value),
                episode: parseInt(document.getElementById('episode').value),
                updated: Date.now()
            };
        } else {
            // MANUAL SAVE
            const title = document.getElementById('title').value;
            if(!title) return alert("Title req");
            
            showData = {
                title,
                season: parseInt(document.getElementById('season').value),
                episode: parseInt(document.getElementById('episode').value),
                updated: Date.now()
            };
            if (editId) showData.id = editId;
            
            // Image Logic for manual
            const fileInput = document.getElementById('poster');
            if (fileInput && fileInput.files[0]) {
                showData.poster = await toBase64(fileInput.files[0]);
            } else if (editId) {
                const old = await DB.getShow(editId);
                showData.poster = old.poster;
            }
        }

        if (editId) showData.id = editId; // Ensure ID is kept

        await DB.saveShow(showData);
        this.closeModal();
        UI.renderList();
    },

    // CHECKLIST LOGIC
    async setEpisode(id, epNum) {
        const show = await DB.getShow(id);
        show.episode = epNum;
        show.updated = Date.now();
        await DB.saveShow(show);
        UI.renderChecklist(show); // Re-render modal to show checkmark
        UI.renderList(); // Update background list
    },

    async startSeason(id, newSeasonNum) {
        const show = await DB.getShow(id);
        show.season = newSeasonNum;
        show.episode = 1; // Reset to Ep 1
        show.updated = Date.now();
        await DB.saveShow(show);
        UI.renderChecklist(show);
        UI.renderList();
    },

    // MANUAL ONLY UTILS
    async quickUpdate(id, ds, de) {
        const show = await DB.getShow(id);
        if (ds > 0) { show.season += ds; show.episode = 1; } 
        else { show.episode += de; }
        show.updated = Date.now();
        await DB.saveShow(show);
        UI.renderList();
    },

    async deleteShow(id) {
        if (!confirm("Delete show?")) return;
        await DB.deleteShow(id);
        this.closeModal(); // In case checklist is open
        UI.renderList();
    }
};

// ... (Keep settings and backup/restore functions) ...
function openSettings() { document.getElementById('settingsModal').classList.remove('hidden'); }
function closeSettings() { document.getElementById('settingsModal').classList.add('hidden'); }
async function saveSettings() {
    const key = document.getElementById('apiKeyInput').value.trim();
    await DB.saveSetting('tmdb_key', key);
    location.reload();
}
async function exportData() { /*...*/ const shows = await DB.getAllShows(); const blob = new Blob([JSON.stringify(shows)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `ofluff_backup_${new Date().toISOString().slice(0,10)}.json`; a.click(); }
async function importData(event) { /*...*/ const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (e) => { try { const data = JSON.parse(e.target.result); await DB.clearShows(); for (const item of data) await DB.saveShow(item); location.reload(); } catch (err) { alert("Invalid backup"); } }; reader.readAsText(file); }
function toBase64(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result); reader.onerror = error => reject(error); }); }

window.app = app;
window.openModal = app.openModal;
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.exportData = exportData;
window.importData = importData;

app.init();
