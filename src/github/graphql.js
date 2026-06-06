const GITHUB_GRAPHQL = 'https://api.github.com/graphql';

/**
 * Execute a GitHub GraphQL query
 * @param {string} query - The GraphQL query string
 * @param {object} variables - Variables for the query
 * @return {Promise<object>} - The data from the GraphQL response
 */
async function graphqlQuery(query, variables = {}) {
    if (!process.env.GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN required for GraphQL API access');
    }

    const res = await fetch(GITHUB_GRAPHQL, {
        method: 'POST',
        headers: {
            'Authorization': `bearer ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'User-Agent': 'my-git-stats/1.0',
        },
        body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
        throw new Error(`GitHub GraphQL API error: ${res.status} ${res.statusText}`);
    }

    const json = await res.json();

    if (json.erros && json.errors.length > 0) {
        throw new Error(`GitHub GraphQL API error: ${json.errors[0].message}`);
    }

    return json.data;
}

/**
 * Fetch contributions and pinned items for a user
 * @param {string} username
 * @return {Promise<object>} - { contributions: { totalContributions, contributionCalendar }, pinnedItems: [ { name, description, stargazerCount, forkCount, primaryLanguage } ] }
 */
async function fetchContributions(username) {
    const now = new Date();
    const from = new Date(now.getFullYear(), 0, 1);
    const to = now;

    const query = `
        query($login: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $login) {
            contributionsCollection(from: $from, to: $to) {
            totalCommitContributions
            totalPullRequestContributions
            totalIssueContributions
            totalPullRequestReviewContributions
            contributionCalendar {
                totalContributions
                weeks {
                contributionDays {
                    date
                    contributionCount
                }
                }
            }
            }
            pinnedItems(first: 6, types: REPOSITORY) {
            nodes {
                ... on Repository {
                name
                description
                stargazerCount
                primaryLanguage { name color }
                url
                }
            }
            }
        }
        }
    `;

    const data = await graphqlQuery(query, {
        login: username,
        from: from.toISOString(),
        to: to.toISOString(),
    });

    if (!data.user) {
        throw new Error(`GitHub user not found: ${username}`);
    }

    const cc = data.user.contributionsCollection;
    const calendar = cc.contributionCalendar;

    return {
        totalCommits: cc.totalCommitContributions,
        totalPRs: cc.totalPullRequestContributions,
        totalIssues: cc.totalIssueContributions,
        totalReviews: cc.totalPullRequestReviewContributions,
        totalContributions: calendar.totalContributions,
        calendar: calendar,
        pinnedItems: (data.user.pinnedItems.nodes || []).map((r) => ({
            name: r.name,
            description: r.description || '',
            stargazerCount: r.stargazerCount || 0,
            primaryLanguage: r.primaryLanguage,
            url: r.url,
        })),
    };
}

/**
 * Calculate streak from contribution calendar
 * @param {object} calendar
 * @returns {{ current: number, longest: number }}
 */
function calcStreak(calendar) {
    // Flatten all days into a sorted array
    const allDays = [];
    for (const week of calendar.weeks) {
        for (const day of week.contributionDays) {
            allDays.push(day);
        }
    }

    // Sort by date ascending (should already be sorted, but just in case)
    allDays.sort((a, b) => a.date.localeCompare(b.date));

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate longest streak
    for (const day of allDays) {
        if (day.contributionCount > 0) {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        }else {
            tempStreak = 0;
        }
    }

    // Calculate current streak (walk backwards from today)
    const today = new Date().toISOString().split('T')[0];
    for (let i = allDays.length - 1; i >= 0; i--) {
        const day = allDays[i];
        // Skip future dates
        if (day.date > today) continue;
        // Today with 0 contributions doesn't break the streak (day isn't over yet)
        if (day.date === today && day.contributionCount === 0) continue;

        if (day.contributionCount > 0) {
            currentStreak++;
        } else {
            break;
        }
    }

    return { current: currentStreak, longest: longestStreak };
}

module.exports = {
    fetchContributions,
    calcStreak,
};