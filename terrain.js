// ==========================================================
// 生物群系
// ==========================================================
function getBiome(x, z) {
    if (worldType === 'forest') return 'forest';
    if (worldType === 'plains') return 'plains';
    if (worldType === 'desert') return 'desert';
    if (worldType === 'flat') return 'plains';

    const v = noise2(x * 0.008, z * 0.008, WORLD_SEED);
    const s = (v - 0.5) * 3.0 + 0.5;
    if (s < 0.20) return 'desert';
    if (s < 0.50) return 'plains';
    return 'forest';
}

function getHeight(x, z) {
    if (worldType === 'flat') return 20;
    const b = getBiome(x, z);
    let h;
    if (b === 'desert') {
        h = 18 + noise2(x*0.1, z*0.1, WORLD_SEED+1)*4 + noise2(x*0.03, z*0.03, WORLD_SEED+2)*3;
    } else if (b === 'plains') {
        h = 20 + noise2(x*0.15, z*0.15, WORLD_SEED+3)*3;
    } else {
        h = 22 + noise2(x*0.2, z*0.2, WORLD_SEED+4)*5 + noise2(x*0.05, z*0.05, WORLD_SEED+5)*4;
    }
    return Math.floor(h);
}

// ==========================================================
// 洞穴系统（参考 1.18：奶酪洞穴 + 面条洞穴 + 峡谷）
// ==========================================================
function isCave(x, y, z) {
    if (y < 1) return false;
    const surface = getHeight(x, z);
    if (y > surface - 2) return false;

    const depth = surface - y;

    // 1) 奶酪洞穴：大空腔
    const c1 = noise3(x*0.045, y*0.06, z*0.045, WORLD_SEED+100);
    const c2 = noise3(x*0.09, y*0.12, z*0.09, WORLD_SEED+200) * 0.5;
    const cheeseThreshold = 0.82 - Math.min(depth / 60, 0.20);
    if (c1 + c2 > cheeseThreshold) return true;

    // 2) 面条洞穴：细长隧道（两个噪声在 0.5 附近相交）
    if (depth > 4) {
        const n1 = noise3(x*0.04, y*0.05, z*0.04, WORLD_SEED+300);
        const n2 = noise3(x*0.04, y*0.05, z*0.04, WORLD_SEED+400);
        if (Math.abs(n1 - 0.5) < 0.045 && Math.abs(n2 - 0.5) < 0.045) return true;
    }

    // 3) 峡谷：垂直于地面的薄片
    if (depth > 10) {
        const cy = noise3(x*0.012, y*0.006, z*0.012, WORLD_SEED+500);
        if (cy > 0.76) return true;
    }

    return false;
}

// ==========================================================
// 树木
// ==========================================================
function hasTree(x, z) {
    if (getBiome(x, z) !== 'forest') return false;
    return hash2(x, z, WORLD_SEED + 400) < 0.10;
}

function treeBlockAt(x, y, z) {
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            const tx = x + dx, tz = z + dz;
            if (!hasTree(tx, tz)) continue;
            const baseY = getHeight(tx, tz) + 1;
            const th = 3 + Math.floor(hash2(tx, tz, WORLD_SEED + 500) * 3);
            const topY = baseY + th - 1;
            if (x === tx && z === tz && y >= baseY && y < baseY + th) return 'wood';
            if (y >= topY && y <= topY + 1 && Math.abs(x - tx) <= 1 && Math.abs(z - tz) <= 1) {
                if (x === tx && z === tz && y === topY) continue;
                return 'leaves';
            }
        }
    }
    return null;
}

// ==========================================================
// 方块生成
// ==========================================================
function generateBlock(x, y, z) {
    if (y < 0) return null;
    if (y === 0) return 'bedrock';
    const surface = getHeight(x, z);
    const biome = getBiome(x, z);

    if (y < surface - 1 && isCave(x, y, z)) {
        const t = treeBlockAt(x, y, z);
        return t || null;
    }
    const t = treeBlockAt(x, y, z);
    if (t && y > surface) return t;
    if (y === surface) return biome === 'desert' ? 'sand' : 'grass';
    if (y > surface) return null;
    const depth = surface - y;
    if (depth <= 3) return biome === 'desert' ? 'sand' : 'dirt';
    return 'stone';
}

// ==========================================================
// 出生点（★ 修复：避开树木）
// ==========================================================
function randomSpawn() {
    for (let i = 0; i < 100; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 200;
        const fx = Math.floor(x), fz = Math.floor(z);
        const y = getHeight(fx, fz) + 1;
        // 检查上方 5 格内是否有任何方块（树、树叶等）
        let blocked = false;
        for (let dy = 0; dy < 6; dy++) {
            if (generateBlock(fx, y + dy, fz) !== null) { blocked = true; break; }
        }
        if (!blocked) return new THREE.Vector3(x + 0.5, y + 1, z + 0.5);
    }
    return new THREE.Vector3(0.5, 40, 0.5);
}