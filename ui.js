// ==========================================================
// 掉落物
// ==========================================================
const drops = [];
const DROP_GEOMETRY = new THREE.BoxGeometry(0.28, 0.28, 0.28);
const DROP_MATERIALS = {};

function buildDropMaterials() {
    for (const k in BLOCK_CONFIG) {
        if (k === 'grass') {
            DROP_MATERIALS.grass = new THREE.MeshLambertMaterial({
                map: makeTexture(BLOCK_CONFIG.grass.top),
                polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
            });
        } else {
            const mat = new THREE.MeshLambertMaterial({
                map: makeTexture(BLOCK_CONFIG[k].color),
                polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
            });
            if (BLOCK_CONFIG[k].emissive) {
                mat.emissive = new THREE.Color(BLOCK_CONFIG[k].color);
                mat.emissiveIntensity = 0.6;
            }
            DROP_MATERIALS[k] = mat;
        }
    }
}

function spawnDrop(x, y, z, type) {
    if (type === 'bedrock' || !BLOCK_CONFIG[type]) return;
    const mesh = new THREE.Mesh(DROP_GEOMETRY, DROP_MATERIALS[type]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    scene.add(mesh);
    drops.push({
        mesh, type,
        vx: 0, vy: 0, vz: 0,
        age: 0,
        bobPhase: Math.random() * Math.PI * 2,
    });
}

function updateDrops(dt) {
    for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i];
        d.age += dt;
        d.bobPhase += dt * 3;
        d.mesh.rotation.y += dt * 2;

        // 重力
        d.vy -= 20 * dt;
        d.vy = Math.max(d.vy, -12);

        // 垂直移动 + 地面碰撞
        let ny = d.mesh.position.y + d.vy * dt;
        const bottom = ny - 0.14;
        const floorY = Math.floor(bottom);
        const bx = Math.floor(d.mesh.position.x);
        const bz = Math.floor(d.mesh.position.z);
        if (isSolid(bx, floorY, bz)) {
            ny = floorY + 1 + 0.14;
            if (d.vy < 0) d.vy = 0;
            d.vx *= 0.7;
            d.vz *= 0.7;
        }
        d.mesh.position.y = ny + Math.sin(d.bobPhase) * 0.03;

        // 水平移动
        if (Math.abs(d.vx) > 0.01 || Math.abs(d.vz) > 0.01) {
            const nx = d.mesh.position.x + d.vx * dt;
            const nz = d.mesh.position.z + d.vz * dt;
            if (!isSolid(Math.floor(nx), Math.floor(ny), Math.floor(d.mesh.position.z))) d.mesh.position.x = nx;
            else d.vx = 0;
            if (!isSolid(Math.floor(d.mesh.position.x), Math.floor(ny), Math.floor(nz))) d.mesh.position.z = nz;
            else d.vz = 0;
        }

        // 拾取范围 1.5 格
        const dx = player.pos.x - d.mesh.position.x;
        const dy = (player.pos.y + 0.9) - d.mesh.position.y;
        const dz = player.pos.z - d.mesh.position.z;
        if (dx*dx + dy*dy + dz*dz < 2.25) {
            inventory[d.type] = (inventory[d.type] || 0) + 1;
            scene.remove(d.mesh);
            drops.splice(i, 1);
            updateHotbarCounts();
            continue;
        }
        if (d.age > 60) { scene.remove(d.mesh); drops.splice(i, 1); }
    }
}

function clearAllDrops() {
    for (const d of drops) scene.remove(d.mesh);
    drops.length = 0;
}

// ==========================================================
// 快捷栏
// ==========================================================
const hotbar = document.getElementById('hotbar');
const hotbarSlots = [];

function buildHotbar() {
    hotbar.innerHTML = '';
    hotbarSlots.length = 0;
    for (const k of HOTBAR_ORDER) {
        const slot = document.createElement('div');
        slot.className = 'hotbar-slot';
        slot.dataset.type = k;
        slot.style.background = BLOCK_CONFIG[k].color || BLOCK_CONFIG[k].top;
        const count = document.createElement('div');
        count.className = 'hotbar-count';
        count.textContent = inventory[k] || 0;
        slot.appendChild(count);
        hotbar.appendChild(slot);
        hotbarSlots.push(slot);
    }
    updateHotbarSelection();
    updateHotbarCounts();
}

function updateHotbarSelection() {
    hotbarSlots.forEach((s, i) => s.classList.toggle('selected', HOTBAR_ORDER[i] === currentBlock));
}
function updateHotbarCounts() {
    hotbarSlots.forEach((s, i) => {
        const k = HOTBAR_ORDER[i];
        const c = inventory[k] || 0;
        s.querySelector('.hotbar-count').textContent = c;
        s.classList.toggle('empty', c === 0);
    });
}

// ==========================================================
// 提示
// ==========================================================
function toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 900);
}

// ==========================================================
// 面板控制（★ 修复：miniMenu 也纳入 isInPanel）
// ==========================================================
function isInPanel(x, y) {
    for (const id of ['settingsPanel', 'inventoryPanel', 'craftPanel', 'miniMenu']) {
        const el = document.getElementById(id);
        if (el.classList.contains('show') && pointInRect(x, y, el.getBoundingClientRect())) return true;
    }
    return false;
}
function isPanelOpen() {
    return document.getElementById('settingsPanel').classList.contains('show') ||
           document.getElementById('inventoryPanel').classList.contains('show') ||
           document.getElementById('craftPanel').classList.contains('show') ||
           document.getElementById('miniMenu').classList.contains('show');
}
function closeAllPanels() {
    document.getElementById('settingsPanel').classList.remove('show');
    document.getElementById('inventoryPanel').classList.remove('show');
    document.getElementById('craftPanel').classList.remove('show');
    document.getElementById('miniMenu').classList.remove('show');
}
function isInTopBar(x, y) {
    for (const id of ['settingsBtn', 'saveBtn', 'loadBtn', 'resetBtn']) {
        if (pointInRect(x, y, document.getElementById(id).getBoundingClientRect())) return true;
    }
    return false;
}
function isInHotbarWrapper(x, y) {
    return pointInRect(x, y, document.getElementById('menuBtn3').getBoundingClientRect());
}

function openSettings() { document.getElementById('settingsPanel').classList.add('show'); }
function closeSettings() { document.getElementById('settingsPanel').classList.remove('show'); }

function openInventory() {
    closeAllPanels();
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = '';
    for (const k in BLOCK_CONFIG) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot' + (k === currentBlock ? ' selected' : '');
        slot.style.background = BLOCK_CONFIG[k].color || BLOCK_CONFIG[k].top;
        slot.innerHTML = `<div>${BLOCK_CONFIG[k].name}</div><div class="count">${inventory[k] || 0}</div>`;
        slot.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            currentBlock = k;
            updateHotbarSelection();
            openInventory();
        });
        grid.appendChild(slot);
    }
    document.getElementById('inventoryPanel').classList.add('show');
}
function closeInventory() { document.getElementById('inventoryPanel').classList.remove('show'); }

function openCraft() {
    closeAllPanels();
    const list = document.getElementById('craftList');
    list.innerHTML = '';
    for (const r of RECIPES) {
        const hasMaterials = Object.entries(r.inputs).every(([k, v]) => (inventory[k] || 0) >= v);
        const row = document.createElement('div');
        row.className = 'craft-row';
        const outKey = Object.keys(r.outputs)[0];
        row.innerHTML = `
            <div class="craft-icon" style="background:${BLOCK_CONFIG[outKey].color || BLOCK_CONFIG[outKey].top}"></div>
            <div class="craft-info">${r.name}<br>
                材料: ${Object.entries(r.inputs).map(([k, v]) => `${BLOCK_CONFIG[k].name}×${v}`).join(', ')}</div>
            <button class="craft-btn" ${hasMaterials ? '' : 'disabled'}>合成</button>
        `;
        row.querySelector('.craft-btn').addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            if (!hasMaterials) return;
            for (const [k, v] of Object.entries(r.inputs)) inventory[k] -= v;
            for (const [k, v] of Object.entries(r.outputs)) inventory[k] = (inventory[k] || 0) + v;
            updateHotbarCounts();
            openCraft();
            toast('合成成功');
        });
        list.appendChild(row);
    }
    document.getElementById('craftPanel').classList.add('show');
}
function closeCraft() { document.getElementById('craftPanel').classList.remove('show'); }

function openMiniMenu() {
    document.getElementById('settingsPanel').classList.remove('show');
    document.getElementById('inventoryPanel').classList.remove('show');
    document.getElementById('craftPanel').classList.remove('show');
    document.getElementById('miniMenu').classList.toggle('show');
}

// ==========================================================
// 飞行按钮（★ 修复：上下箭头）
// ==========================================================
const jumpBtnEl = document.getElementById('jumpBtn');
const downBtnEl = document.getElementById('downBtn');

function updateFlyButtons() {
    const isFlyMode = flyingMode || spectatorMode;
    jumpBtnEl.textContent = isFlyMode ? '▲' : '跳';
    jumpBtnEl.style.background = isFlyMode ? 'rgba(80,120,180,0.85)' : 'rgba(80,180,100,0.85)';
    downBtnEl.style.display = isFlyMode ? 'block' : 'none';
}

// ==========================================================
// 辅助
// ==========================================================
function pointInCircle(x, y, r) {
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.hypot(x - cx, y - cy) <= Math.min(r.width, r.height) / 2;
}
function pointInRect(x, y, r) {
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function getUIElements() {
    return {
        jump: document.getElementById('jumpBtn').getBoundingClientRect(),
        down: document.getElementById('downBtn').getBoundingClientRect(),
        joystick: document.getElementById('joystick').getBoundingClientRect(),
        slots: [...document.querySelectorAll('.hotbar-slot')].map(el => ({
            el, rect: el.getBoundingClientRect(), type: el.dataset.type
        })),
    };
}