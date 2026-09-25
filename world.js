// ==========================================================
// 世界数据
// ==========================================================
const modifications = new Map();
const worldKey = (x, y, z) => `${x},${y},${z}`;

function getBlockType(x, y, z) {
    const k = worldKey(x, y, z);
    if (modifications.has(k)) return modifications.get(k);
    if (y === 0) return 'bedrock';
    return generateBlock(x, y, z);
}
function isSolid(x, y, z) { return getBlockType(x, y, z) !== null; }
function setBlock(x, y, z, type) { modifications.set(worldKey(x, y, z), type); }

// ==========================================================
// 材质
// ==========================================================
function makeTexture(color, opts = {}) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 80; i++) {
        const x = (Math.random() * 16) | 0, y = (Math.random() * 16) | 0;
        const a = (Math.random() * 0.3).toFixed(2);
        ctx.fillStyle = Math.random() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1, 1);
    }
    if (opts.sideSplit && opts.bottomColor) {
        ctx.fillStyle = opts.bottomColor;
        ctx.fillRect(0, 9, 16, 7);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath(); ctx.moveTo(0, 9); ctx.lineTo(16, 9); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.strokeRect(0.5, 0.5, 15, 15);
    const tex = new THREE.CanvasTexture(c);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    return tex;
}

const BLOCK_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);
const BLOCK_MATERIALS = {};
const SPECTATOR_MATERIALS = {};

function buildMaterials() {
    const grassTopTex = makeTexture(BLOCK_CONFIG.grass.top);
    const grassBottomTex = makeTexture(BLOCK_CONFIG.grass.bottom);
    const grassSideTex = makeTexture(BLOCK_CONFIG.grass.side, { sideSplit: true, bottomColor: BLOCK_CONFIG.grass.bottom });
    BLOCK_MATERIALS.grass = [
        new THREE.MeshLambertMaterial({ map: grassSideTex }),
        new THREE.MeshLambertMaterial({ map: grassSideTex }),
        new THREE.MeshLambertMaterial({ map: grassTopTex }),
        new THREE.MeshLambertMaterial({ map: grassBottomTex }),
        new THREE.MeshLambertMaterial({ map: grassSideTex }),
        new THREE.MeshLambertMaterial({ map: grassSideTex }),
    ];
    for (const k in BLOCK_CONFIG) {
        if (k === 'grass') continue;
        const cfg = BLOCK_CONFIG[k];
        const mat = new THREE.MeshLambertMaterial({ map: makeTexture(cfg.color) });
        if (cfg.emissive) {
            mat.emissive = new THREE.Color(cfg.color);
            mat.emissiveIntensity = 0.6;
        }
        BLOCK_MATERIALS[k] = mat;
    }
    // 旁观模式：幽灵材质
    for (const k in BLOCK_MATERIALS) {
        const src = BLOCK_MATERIALS[k];
        if (Array.isArray(src)) {
            SPECTATOR_MATERIALS[k] = src.map(m => {
                const t = m.clone();
                t.transparent = true;
                t.opacity = 0.12;
                t.depthWrite = false;
                return t;
            });
        } else {
            const t = src.clone();
            t.transparent = true;
            t.opacity = 0.12;
            t.depthWrite = false;
            SPECTATOR_MATERIALS[k] = t;
        }
    }
}

function setSpectatorVisual(on) {
    for (const mesh of renderedMeshes.values()) {
        const type = mesh.userData.type;
        mesh.material = on ? SPECTATOR_MATERIALS[type] : BLOCK_MATERIALS[type];
    }
}

const TORCH_GEOMETRY = new THREE.BoxGeometry(0.25, 0.6, 0.25);

// ==========================================================
// 火把光
// ==========================================================
const torchLights = new Map();
function addTorchLight(x, y, z) {
    const k = worldKey(x, y, z);
    if (torchLights.has(k)) return;
    const light = new THREE.PointLight(0xffcc55, 0.9, 8);
    light.position.set(x + 0.5, y + 0.3, z + 0.5);
    scene.add(light);
    torchLights.set(k, light);
    pruneTorchLights();
}
function removeTorchLight(x, y, z) {
    const k = worldKey(x, y, z);
    const light = torchLights.get(k);
    if (light) { scene.remove(light); torchLights.delete(k); }
}
function pruneTorchLights() {
    if (torchLights.size <= CONST.MAX_TORCH_LIGHTS) return;
    const entries = [...torchLights.entries()].map(([k, l]) => {
        const [x, y, z] = k.split(',').map(Number);
        const d = Math.hypot(x - player.pos.x, y - player.pos.y, z - player.pos.z);
        return { k, l, d };
    }).sort((a, b) => a.d - b.d);
    for (let i = CONST.MAX_TORCH_LIGHTS; i < entries.length; i++) {
        scene.remove(entries[i].l);
        torchLights.delete(entries[i].k);
    }
}

// ==========================================================
// 网格管理
// ==========================================================
const renderedMeshes = new Map();

function addMeshAt(x, y, z, type) {
    const k = worldKey(x, y, z);
    if (renderedMeshes.has(k)) return;
    let mesh;
    const mat = spectatorMode ? SPECTATOR_MATERIALS[type] : BLOCK_MATERIALS[type];
    if (type === 'torch') {
        mesh = new THREE.Mesh(TORCH_GEOMETRY, mat);
        mesh.position.set(x + 0.5, y + 0.3, z + 0.5);
    } else {
        mesh = new THREE.Mesh(BLOCK_GEOMETRY, mat);
        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    }
    mesh.userData = { x, y, z, type };
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.castShadow = !spectatorMode;
    mesh.receiveShadow = !spectatorMode;
    scene.add(mesh);
    renderedMeshes.set(k, mesh);
    if (type === 'torch') addTorchLight(x, y, z);
}

function removeMeshAt(x, y, z) {
    const k = worldKey(x, y, z);
    const mesh = renderedMeshes.get(k);
    if (mesh) { scene.remove(mesh); renderedMeshes.delete(k); }
    removeTorchLight(x, y, z);
}

function updateRender() {
    const cx = Math.floor(player.pos.x);
    const cz = Math.floor(player.pos.z);
    const cy = Math.floor(player.pos.y);
    const needed = new Set();
    const R = renderDistance;
    const yMin = Math.max(1, cy - 18);
    const yMax = cy + 18;
    for (let dx = -R; dx <= R; dx++) {
        for (let dz = -R; dz <= R; dz++) {
            const x = cx + dx, z = cz + dz;
            const h = getHeight(x, z);
            const topY = Math.min(h + 6, yMax);
            for (let y = topY; y >= yMin; y--) {
                const k = worldKey(x, y, z);
                const type = getBlockType(x, y, z);
                if (type !== null) {
                    needed.add(k);
                    if (!renderedMeshes.has(k)) addMeshAt(x, y, z, type);
                }
            }
        }
    }
    for (const [k, type] of modifications) {
        if (type === null) continue;
        const [x, y, z] = k.split(',').map(Number);
        if (Math.abs(x - cx) <= R && Math.abs(z - cz) <= R) {
            needed.add(k);
            if (!renderedMeshes.has(k)) addMeshAt(x, y, z, type);
        }
    }
    for (const k of [...renderedMeshes.keys()]) {
        if (!needed.has(k)) {
            scene.remove(renderedMeshes.get(k));
            renderedMeshes.delete(k);
            const [x, y, z] = k.split(',').map(Number);
            removeTorchLight(x, y, z);
        }
    }
}

function clearAllWorldMeshes() {
    for (const mesh of renderedMeshes.values()) scene.remove(mesh);
    for (const light of torchLights.values()) scene.remove(light);
    renderedMeshes.clear();
    torchLights.clear();
}