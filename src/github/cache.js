const NodeCache = require('node-cache');

const TTL = parseInt(process.env.CACHE_TTL_SECONDS, 10) || 1800; // 30 min default

const apiCache = new NodeCache({
    stdTTL: TTL,
    checkperiod: Math.floor(TTL / 2),
    useClones: false // avoid deep-cloning large objects on every get
});

/**
 * Get cached data for a username.
 * @param {string} key
 * @return {object|undefined} 
 */
function get(key) {
    return apiCache.get(key);
}

/**
 * Set cached data for a username
 * @param {string} key
 * @param {object} value
 * @param {number} [ttl] Optional TTL in seconds
 */
function set(key, value, ttl) {
    apiCache.set(key, value, ttl || TTL);
}

/**
 * Check if a key exists in cache
 * @param {string} key
 * @return {boolean}
 */
function has(key) {
    return apiCache.has(key);
}

/**
 * Get cache stats for debugging
 */
function stats() {
    return apiCache.getStats();
}

module.exports = { get, set, has, stats };