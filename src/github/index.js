const cache = require('./cache');
const { fetchUser, fetchRepos, calcTotalStars, calcLanguages } = require('./rest');
const { fetchContributions, calcStreak } = require('./graphql');

/**
 * Fetch all data for a GitHub user, with caching
 * 
 * Orchestrates REST + GraphQL calls in parallel via Promise.all
 * Returns a normalized data object used by the SVG generators
 * 
 * @param {string} username
 * @returns {Promise<object>}
 */
async function fetchAllData(username) {
    const cacheKey = `user:${username.toLowerCase()}`;

    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Fetch REST + GraphQL data in parallel
    const [user, repos, contributions] = await Promise.all([
        fetchUser(username),
        fetchRepos(username),
        fetchContributions(username).catch((err) => {
            //GraphQL requires token - graceful fallback
            console.warn(`[GraphQL] Failed for ${username}: ${err.message}`);
            return null;
        }),
    ]);

    // Calculate derived data
    const totalStars = calcTotalStars(repos);
    const langs = calcLanguages(repos, 5);

    // Streak calculation
    let streak = { current: 0, longest: 0 };
    let totalContributions = 0;
    let calendar = null;
    let pinnedItems = [];

    if (contributions) {
        streak = calcStreak(contributions.contributionCalendar);
        totalContributions = contributions.totalContributions;
        calendar = contributions.contributionCalendar;
        pinnedItems = contributions.pinnedItems;
    }

    // Build normalized data object
    const data = {
        user,
        stats: {
            totalCommits: contributions ? contributions.totalCommits : 0,
            totalPRs: contributions ? contributions.totalPRs : 0,
            totalIssues: contributions ? contributions.totalIssues : 0,
            totalReviews: contributions ? contributions.totalReviews : 0,
            totalStars,
        },
        langs,
        streak: {
            current: streak.current,
            longest: streak.longest,
            totalContributions,
        },
        repos: pinnedItems.length > 0
            ? pinnedItems
            : repos
                .filter((r) => !r.fork)
                .sort((a, b) => b.stargazers_count - a.stargazers_count)
                .slice(0, 3)
                .map((r) => ({
                    name: r.name,
                    description: r.description,
                    stargazerCount: r.stargazers_count,
                    primaryLanguage: r.language ? { name: r.language, color: null } : null,
                    url: r.html_url,
                })),
        calendar,
    };

    // Store in cache
    cache.set(cacheKey, data);

    return data;
}

module.exports = { fetchAllData };