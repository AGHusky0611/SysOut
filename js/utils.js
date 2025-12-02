/**
 * Hashes a string using the SHA-256 algorithm.
 * @param {string} text The text to hash.
 * @returns {Promise<string>} The hexadecimal representation of the hash.
 */
export async function hashText(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Convert bytes to hex string
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}