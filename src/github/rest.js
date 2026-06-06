const GITHUB_API = 'https://api.github.com';

/**
 * Build common headers for Github API requests
 */
function headers() {
    const h = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'my-git-stats/1.0',
    };
    if (process.env.GITHUB_TOKEN) {
        h['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }
    return h;
}

/**
 * Generic Github REST fetch with error handling
 */
async function githubFetch(url) {
    const res = await fetch(url, { headers: headers() });

    if (res.status === 404) {
        throw new Error('Github user not found');
    }
    if (res.status === 403) {
        const rateLimitReset = res.headers.get('x-ratelimit-reset');
        const resetIn = rateLimitReset
            ? Math.ceil((parseInt(rateLimitReset, 10) * 1000 - Date.now()) / 60000)
            : '?';
        throw new Error(`Github API rate limit exceeded. Resets in ~${resetIn} minutes.`);
    }
    if (!res.ok) {
        throw new Error(`Github API error: ${res.status} ${res.statusText}`);
    }

    return res.json();
}

/**
 * Fetch user profile
 * @param {string} username
 * @return {Promise<object>} - {  login, name, bio, avatar_url, location, company, blog, followers, public_repos, created_at }
 */
async function fetchUser(username) {
    const data = await githubFetch(`${GITHUB_API}/users/${username}`);
    return {
        login: data.login,
        name: data.name || data.login,
        bio: data.bio || '',
        avatar_url: data.avatar_url,
        location: data.location || '',
        company: data.company || '',
        blog: data.blog || '',
        followers: data.followers,
        public_repos: data.public_repos,
        created_at: data.created_at
    };
}

/**
 * Fetch all public repos (up to 100) for language and star calculations
 */
async function fetchRepos(username) {
    const repos = await githubFetch(
        `${GITHUB_API}/users/${username}/repos?per_page=100&sort=pushed&type=owner`
    );

    return repos.map((r) => ({
        name: r.name,
        description: r.description || '',
        language: r.language,
        stargazers_count: r.stargazers_count || 0,
        fork: r.fork,
        html_url: r.html_url,
        homepage: r.homepage || '',
    }));
}

/**
 * Calculate total stars across all repos
 * @param {object[]} repos
 * @return {number}
 */
function calcTotalStars(repos) {
    return repos.reduce((sum, r) => sum + r.stargazers_count, 0);
}

/**
 * Calculate language distribution from repos (top N)
 * Uses Github's `languages_url` for accurate byte counts
 * Falls back to repo.language for simplicity in MVP
 * @param {object[]} repos
 * @param {number} [topN=5]
 * @return {Array<{ name: string, bytes: number, percentage: number, color: string }>}
 */
function calcLanguages(repos, topN = 5) {
    const langMap = {};

    // Count repos per language as proxy for bytes (MVP simplification)
    for (const repo of repos) {
        if (repo.fork || !repo.language) continue;
        if (!langMap[repo.language]) {
            langMap[repo.language] = 0;
        }
        langMap[repo.language] += 1 + repo.stargazers_count; // Weight by stars
    }

    const entries = Object.entries(langMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, topN);

    const total = entries.reduce((sum, [, v]) => sum + v, 0);

    // Github language colors (common ones)
    const languageColors = {
        JavaScript: '#F1E05A',
        TypeScript: '#3178C6',
        Python: '#3572A5',
        Java: '#B07219',
        'C#': '#178600',
        'C++': '#F34B7D',
        C: '#555555',
        Go: '#00ADD8',
        Rust: '#DEA584',
        Ruby: '#701516',
        PHP: '#4F5D95',
        Swift: '#F05138',
        Kotlin: '#A97BFF',
        Dart: '#00B4AB',
        HTML: '#E34C26',
        CSS: '#563D7C',
        Shell: '#89E051',
        Lua: '#000080',
        R: '#198CE7',
        Scala: '#C22D40',
        Vue: '#41B883',
        Elixir: '#6E4A7E',
        Haskell: '#5E5086',
    };

    return entries.map(([name, bytes]) => ({
        name,
        bytes,
        percentage: total > 0 ? Math.round((bytes / total) * 1000) / 10 : 0,
        color: langColors[name] || '#8B949E',
    }));
}

/**
 * Fetch public events for badge calculations (Night Owl, Early Bird)
 * @param {string} username
 * @returns {Promise<object[]>}
 */
async function fetchEvents(username) {
    try {
        const events = await githubFetch(
            `${GITHUB_API}/users/${username}/events/public?per_page=100`
        );
        return events;
    } catch {
        // Events endpoint can fail for various reasons - non-critical
        return [];
    }
}

module.exports = {
    fetchUser,
    fetchRepos,
    fetchEvents,
    calcTotalStars,
    calcLanguages,
};