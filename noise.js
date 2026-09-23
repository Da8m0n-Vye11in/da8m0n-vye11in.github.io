// ==========================================================
// 哈希与噪声
// ==========================================================
function hash2(x, z, s) {
    let n = x * 374761393 + z * 668265263 + s * 1274126177;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

function hash3(x, y, z, s) {
    let n = x * 374761393 + y * 668265263 + z * 1274126177 + s * 13579;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
}

const smooth = t => t * t * (3 - 2 * t);

function noise2(x, z, s) {
    const xi = Math.floor(x), zi = Math.floor(z);
    const u = smooth(x - xi), w = smooth(z - zi);
    const c00 = hash2(xi, zi, s),     c10 = hash2(xi+1, zi, s);
    const c01 = hash2(xi, zi+1, s),   c11 = hash2(xi+1, zi+1, s);
    return c00*(1-u)*(1-w) + c10*u*(1-w) + c01*(1-u)*w + c11*u*w;
}

function noise3(x, y, z, s) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = smooth(x - xi), v = smooth(y - yi), w = smooth(z - zi);
    const c000 = hash3(xi, yi, zi, s),     c100 = hash3(xi+1, yi, zi, s);
    const c010 = hash3(xi, yi+1, zi, s),   c110 = hash3(xi+1, yi+1, zi, s);
    const c001 = hash3(xi, yi, zi+1, s),   c101 = hash3(xi+1, yi, zi+1, s);
    const c011 = hash3(xi, yi+1, zi+1, s), c111 = hash3(xi+1, yi+1, zi+1, s);
    const x00 = c000*(1-u) + c100*u, x10 = c010*(1-u) + c110*u;
    const x01 = c001*(1-u) + c101*u, x11 = c011*(1-u) + c111*u;
    return (x00*(1-v) + x10*v)*(1-w) + (x01*(1-v) + x11*v)*w;
}