const API_BASE = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p/w500";

const API = {
    key: null,

    async init() {
        this.key = await DB.getSetting('tmdb_key');
    },

    hasKey() {
        return !!this.key;
    },

    async search(query) {
        if (!this.key || !query) return [];
        try {
            const res = await fetch(`${API_BASE}/search/tv?api_key=${this.key}&query=${encodeURIComponent(query)}`);
            const data = await res.json();
            return data.results.slice(0, 5); // Limit to top 5
        } catch (e) {
            console.error("API Search Error", e);
            return [];
        }
    },

    async getDetails(tmdbId) {
        if (!this.key) return null;
        try {
            const res = await fetch(`${API_BASE}/tv/${tmdbId}?api_key=${this.key}`);
            const data = await res.json();
            return {
                tmdbId: data.id,
                title: data.name,
                poster: data.poster_path ? IMG_BASE + data.poster_path : null,
                totalSeasons: data.number_of_seasons,
                status: data.status, // "Returning Series", "Ended", etc.
                rating: data.vote_average ? data.vote_average.toFixed(1) : null,
                overview: data.overview
            };
        } catch (e) {
            console.error("API Detail Error", e);
            return null;
        }
    }
};
