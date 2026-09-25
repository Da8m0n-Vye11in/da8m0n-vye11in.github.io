// ==========================================================
// 场景初始化
// ==========================================================
scene = new THREE.Scene();
const SKY_DAY = new THREE.Color(0x87CEEB);
const SKY_NIGHT = new THREE.Color(0x101830);
scene.background = SKY_DAY.clone();
scene.fog = new THREE.Fog(0x87CEEB, 20, 55);

camera = new THREE.PerspectiveCamera(70, 1, 0.1, 400);
canvasElement = document.getElementById('gameCanvas');
renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

buildMaterials();
buildDropMaterials();

// ==========================================================
// 光照
// ==========================================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 0.7);
sunLight.position.set(30, 50, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 1024;
sunLight.shadow.mapSize.height = 1024;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 100;
sunLight.shadow.camera.left = -20;
sunLight.shadow.camera.right = 20;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -20;
sunLight.shadow.bias = -0.001;
scene.add(sunLight);
scene.add(sunLight.target);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.15);
fillLight.position.set(-30, -20, -30);
scene.add(fillLight);

// 太阳 / 月亮
const sunSphere = new THREE.Mesh(
    new THREE.SphereGeometry(4, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffdd44, fog: false })
);
scene.add(sunSphere);
const moonSphere = new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xeeeeff, fog: false })
);
scene.add(moonSphere);

// ==========================================================
// 昼夜
// ==========================================================
function updateDayNight(dt) {
    if (dayNightMode === 'cycle') {
        worldTime = (worldTime + dt) % CONST.DAY_DURATION;
    } else if (dayNightMode === 'day') {
        worldTime = CONST.DAY_DURATION * 0.4;
    } else {
        worldTime = CONST.DAY_DURATION * 0.9;
    }

    const t = worldTime / CONST.DAY_DURATION;
    const angle = t * Math.PI * 2 - Math.PI / 2;

    const camX = player.pos.x, camY = player.pos.y, camZ = player.pos.z;
    const sunX = Math.cos(angle) * 120;
    const sunY = Math.sin(angle) * 120;
    sunSphere.position.set(camX + sunX, camY + sunY, camZ);
    moonSphere.position.set(camX - sunX, camY - sunY, camZ);

    sunLight.position.set(camX + sunX, camY + sunY, camZ + 20);
    sunLight.target.position.set(camX, camY, camZ);
    sunLight.target.updateMatrixWorld();

    const sunHeight = Math.sin(angle);
    const dayness = Math.max(0, sunHeight);

    const v = brightnessLevel / 100;
    sunLight.intensity = (0.2 + dayness * 0.7) * v;
    ambientLight.intensity = (0.15 + dayness * 0.4) * v;
    fillLight.intensity = 0.15 * v;

    const skyColor = SKY_NIGHT.clone().lerp(SKY_DAY, dayness);
    scene.background = skyColor;
    scene.fog.color = skyColor;

    sunSphere.visible = sunHeight > -0.1;
    moonSphere.visible = sunHeight < 0.1;
}

// ==========================================================
// 射线 & 放置/破坏
// ==========================================================
const raycaster = new THREE.Raycaster();
raycaster.far = 6;
const _rayDir = new THREE.Vector3();

function raycast() {
    camera.getWorldDirection(_rayDir);
    raycaster.set(camera.position, _rayDir);
    const hits = raycaster.intersectObjects([...renderedMeshes.values()], false);
    if (hits.length === 0) return null;
    const h = hits[0];
    return { block: h.object.userData, normal: h.face.normal.clone() };
}

function applyGravityToColumn(x, z, startY) {
    const sands = [];
    for (let y = startY; y < startY + 30; y++) {
        if (y < 1) continue;
        if (getBlockType(x, y, z) === 'sand') sands.push(y);
    }
    for (const sy of sands) {
        let ny = sy;
        while (ny > 1 && !isSolid(x, ny - 1, z)) ny--;
        if (ny !== sy) {
            setBlock(x, sy, z, null);
            removeMeshAt(x, sy, z);
            setBlock(x, ny, z, 'sand');
            addMeshAt(x, ny, z, 'sand');
        }
    }
}

function tryPlace() {
    if (spectatorMode) return;
    const hit = raycast();
    if (!hit) return;
    if ((inventory[currentBlock] || 0) <= 0) return toast('没有 ' + BLOCK_CONFIG[currentBlock].name);
    const { x, y, z } = hit.block;
    const n = hit.normal;
    const tx = x + n.x, ty = y + n.y, tz = z + n.z;
    if (isSolid(tx, ty, tz)) return;
    const pMinX = player.pos.x - CONST.PLAYER_W / 2, pMaxX = player.pos.x + CONST.PLAYER_W / 2;
    const pMinY = player.pos.y, pMaxY = player.pos.y + CONST.PLAYER_H;
    const pMinZ = player.pos.z - CONST.PLAYER_W / 2, pMaxZ = player.pos.z + CONST.PLAYER_W / 2;
    if (pMaxX > tx && pMinX < tx + 1 && pMaxY > ty && pMinY < ty + 1 && pMaxZ > tz && pMinZ < tz + 1)
        return;
    setBlock(tx, ty, tz, currentBlock);
    addMeshAt(tx, ty, tz, currentBlock);
    inventory[currentBlock]--;
    updateHotbarCounts();
    if (currentBlock === 'sand') applyGravityToColumn(tx, tz, ty);
    scheduleSave();
}

function tryBreak() {
    if (spectatorMode) return;
    const hit = raycast();
    if (!hit) return;
    const { x, y, z } = hit.block;
    if (y === 0) return toast('基岩无法破坏');
    const fx = Math.floor(player.pos.x), fz = Math.floor(player.pos.z);
    const fy = Math.floor(player.pos.y - 0.05);
    if (x === fx && y === fy && z === fz) return toast('不能挖脚下');
    const type = getBlockType(x, y, z);
    setBlock(x, y, z, null);
    removeMeshAt(x, y, z);
    if (type) spawnDrop(x + 0.5, y + 0.5, z + 0.5, type);
    applyGravityToColumn(x, z, y + 1);
    scheduleSave();
}

// ==========================================================
// 存档
// ==========================================================
let saveTimer = null;
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveToLocal, 500); }

function getSaveData() {
    return {
        version: 12, seed: WORLD_SEED, worldType, worldTime, dayNightMode,
        modifications: [...modifications],
        inventory,
        player: { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw, pitch: player.pitch },
        currentBlock,
        settings: { renderDistance, brightnessLevel, moveSpeed, flyingMode, spectatorMode },
    };
}
function saveToLocal() {
    try { localStorage.setItem(CONST.SAVE_KEY, JSON.stringify(getSaveData())); }
    catch (e) { console.warn('存档失败', e); }
}
function applySaveData(data) {
    if (!data || typeof data !== 'object') return false;
    if (Number.isFinite(data.seed)) WORLD_SEED = data.seed;
    if (data.worldType) worldType = data.worldType;
    if (Number.isFinite(data.worldTime)) worldTime = data.worldTime;
    if (data.dayNightMode) dayNightMode = data.dayNightMode;

    modifications.clear();
    if (Array.isArray(data.modifications)) {
        for (const e of data.modifications) {
            if (Array.isArray(e) && e.length === 2) {
                const [k, v] = e;
                if (typeof k === 'string' && (v === null || BLOCK_CONFIG[v])) modifications.set(k, v);
            }
        }
    }
    for (const k in inventory) delete inventory[k];
    if (data.inventory) for (const k in data.inventory) inventory[k] = data.inventory[k] || 0;
    updateHotbarCounts();

    if (data.player) {
        const px = Number(data.player.x), py = Number(data.player.y), pz = Number(data.player.z);
        const pyaw = Number(data.player.yaw), ppitch = Number(data.player.pitch);
        player.pos.set(
            Number.isFinite(px) ? px : 0.5,
            Number.isFinite(py) ? py : 30,
            Number.isFinite(pz) ? pz : 0.5
        );
        player.yaw = Number.isFinite(pyaw) ? pyaw : 0;
        player.pitch = Number.isFinite(ppitch)
            ? Math.max(-CONST.PITCH_LIMIT, Math.min(CONST.PITCH_LIMIT, ppitch))
            : -0.3;
    }
    if (data.currentBlock && BLOCK_CONFIG[data.currentBlock]) {
        currentBlock = data.currentBlock;
        updateHotbarSelection();
    }
    if (data.settings) {
        if (Number.isFinite(data.settings.renderDistance)) {
            renderDistance = Math.max(4, Math.min(14, data.settings.renderDistance));
            document.getElementById('renderDistSlider').value = renderDistance;
            document.getElementById('renderDistVal').textContent = renderDistance;
        }
        if (Number.isFinite(data.settings.brightnessLevel)) {
            brightnessLevel = Math.max(30, Math.min(150, data.settings.brightnessLevel));
            document.getElementById('brightnessSlider').value = brightnessLevel;
            document.getElementById('brightnessVal').textContent = brightnessLevel;
        }
        if (Number.isFinite(data.settings.moveSpeed)) {
            moveSpeed = Math.max(3, Math.min(15, data.settings.moveSpeed));
            document.getElementById('speedSlider').value = moveSpeed;
            document.getElementById('speedVal').textContent = moveSpeed;
        }
        if (typeof data.settings.flyingMode === 'boolean') {
            flyingMode = data.settings.flyingMode;
            document.getElementById('flyToggle').checked = flyingMode;
        }
        if (typeof data.settings.spectatorMode === 'boolean') {
            spectatorMode = data.settings.spectatorMode;
            document.getElementById('spectatorToggle').checked = spectatorMode;
        }
    }
    clearAllWorldMeshes();
    clearAllDrops();
    player.vy = 0;
    player.onGround = false;
    updateRender();
    updateFlyButtons();
    return true;
}
function loadFromLocal() {
    try {
        const raw = localStorage.getItem(CONST.SAVE_KEY);
        if (!raw) return false;
        return applySaveData(JSON.parse(raw));
    } catch (e) { return false; }
}
function exportSave() {
    saveToLocal();
    const json = JSON.stringify(getSaveData(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
    a.href = url;
    a.download = `minicraft-${stamp}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 5000);
    toast('已导出存档');
}
function importSave() {
    const input = document.getElementById('fileInput');
    input.value = '';
    input.click();
}
document.getElementById('fileInput').addEventListener('change', e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const data = JSON.parse(ev.target.result);
            if (applySaveData(data)) { saveToLocal(); toast('已导入存档'); }
            else toast('存档格式错误');
        } catch (err) { toast('读取失败'); }
    };
    reader.readAsText(file);
    e.target.value = '';
});

function resetWorld(newType) {
    if (!confirm('确定生成新世界吗？当前存档会丢失。')) return;
    localStorage.removeItem(CONST.SAVE_KEY);
    WORLD_SEED = Math.floor(Math.random() * 1e9);
    if (newType) worldType = newType;
    // ★ 修复：重置时间到白天
    worldTime = CONST.DAY_DURATION * 0.35;
    modifications.clear();
    clearAllWorldMeshes();
    clearAllDrops();
    for (const k in inventory) delete inventory[k];
    inventory.grass = 64; inventory.dirt = 64; inventory.stone = 64;
    inventory.wood = 32; inventory.plank = 32; inventory.leaves = 32;
    inventory.sand = 32; inventory.torch = 32;
    updateHotbarCounts();
    player.pos = randomSpawn();
    player.yaw = Math.random() * Math.PI * 2;
    player.pitch = -0.3;
    player.vy = 0;
    player.onGround = false;
    updateRender();
    toast('新世界已生成');
}

// ==========================================================
// 按钮事件
// ==========================================================
document.getElementById('settingsBtn').addEventListener('click', e => { e.preventDefault(); openSettings(); });
document.getElementById('saveBtn').addEventListener('click', e => { e.preventDefault(); exportSave(); });
document.getElementById('loadBtn').addEventListener('click', e => { e.preventDefault(); importSave(); });
document.getElementById('resetBtn').addEventListener('click', e => { e.preventDefault(); resetWorld(); });
document.getElementById('closeSettings').addEventListener('click', e => { e.preventDefault(); closeSettings(); });
document.getElementById('closeInventory').addEventListener('click', e => { e.preventDefault(); closeInventory(); });
document.getElementById('closeCraft').addEventListener('click', e => { e.preventDefault(); closeCraft(); });
document.getElementById('menuBtn3').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openMiniMenu(); });
document.getElementById('openInventoryBtn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openInventory(); });
document.getElementById('openCraftBtn').addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openCraft(); });
document.getElementById('applyWorldBtn').addEventListener('click', e => {
    e.preventDefault();
    const t = document.getElementById('worldTypeSelect').value;
    worldType = t;
    closeSettings();
    resetWorld(t);
});

document.getElementById('renderDistSlider').addEventListener('input', e => {
    renderDistance = Number(e.target.value);
    document.getElementById('renderDistVal').textContent = renderDistance;
    updateRender();
});
document.getElementById('brightnessSlider').addEventListener('input', e => {
    brightnessLevel = Number(e.target.value);
    document.getElementById('brightnessVal').textContent = brightnessLevel;
});
document.getElementById('speedSlider').addEventListener('input', e => {
    moveSpeed = Number(e.target.value);
    document.getElementById('speedVal').textContent = moveSpeed;
});
document.getElementById('dayNightSelect').addEventListener('change', e => {
    dayNightMode = e.target.value;
});
document.getElementById('flyToggle').addEventListener('change', e => {
    flyingMode = e.target.checked;
    if (!flyingMode) { player.vy = 0; unstickPlayer(); }
    updateFlyButtons();
});
document.getElementById('spectatorToggle').addEventListener('change', e => {
    spectatorMode = e.target.checked;
    setSpectatorVisual(spectatorMode);
    if (!spectatorMode) unstickPlayer();
    updateFlyButtons();
});

// ==========================================================
// 输入
// ==========================================================
const activeTouches = new Map();

document.addEventListener('touchstart', e => {
    // 面板内 → 放行
    for (const t of e.changedTouches) if (isInPanel(t.clientX, t.clientY)) return;
    // 面板打开时点外部 → 关闭
    if (isPanelOpen()) { closeAllPanels(); return; }
    // 顶栏按钮 → 放行给原生 click
    for (const t of e.changedTouches) {
        if (isInTopBar(t.clientX, t.clientY)) return;
        if (isInHotbarWrapper(t.clientX, t.clientY)) return;
    }

    const ui = getUIElements();
    for (const t of e.changedTouches) {
        const x = t.clientX, y = t.clientY;

        if (pointInCircle(x, y, ui.jump)) {
            if (flyingMode || spectatorMode) {
                moveUpRequested = true;
                activeTouches.set(t.identifier, { type: 'up' });
            } else {
                jumpRequested = true;
                activeTouches.set(t.identifier, { type: 'jump' });
            }
            continue;
        }
        if (ui.down && downBtnEl.style.display !== 'none' && pointInCircle(x, y, ui.down)) {
            moveDownRequested = true;
            activeTouches.set(t.identifier, { type: 'down' });
            continue;
        }

        let slotHit = null;
        for (const s of ui.slots) if (pointInCircle(x, y, s.rect)) { slotHit = s; break; }
        if (slotHit) {
            if ((inventory[slotHit.type] || 0) > 0 || spectatorMode) {
                currentBlock = slotHit.type;
                updateHotbarSelection();
            } else {
                toast('没有 ' + BLOCK_CONFIG[slotHit.type].name);
            }
            activeTouches.set(t.identifier, { type: 'ui' });
            continue;
        }

        if (pointInCircle(x, y, ui.joystick)) {
            const r = document.getElementById('joystick').getBoundingClientRect();
            joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            joyMove(x, y);
            activeTouches.set(t.identifier, { type: 'joystick' });
            continue;
        }

        const state = {
            type: 'empty', startX: x, startY: y, lastX: x, lastY: y,
            moved: false, longPressFired: false, longPressTimer: null,
        };
        state.longPressTimer = setTimeout(() => {
            if (!state.moved) {
                state.longPressFired = true;
                tryBreak();
                const hint = document.getElementById('longpressHint');
                hint.style.left = x + 'px'; hint.style.top = y + 'px';
                hint.classList.add('active');
                setTimeout(() => hint.classList.remove('active'), 150);
            }
        }, CONST.LONG_PRESS_MS);
        activeTouches.set(t.identifier, state);
    }
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
        if (isInPanel(t.clientX, t.clientY)) return;
        if (isInTopBar(t.clientX, t.clientY)) return;
        if (isInHotbarWrapper(t.clientX, t.clientY)) return;
    }
    for (const t of e.changedTouches) {
        const info = activeTouches.get(t.identifier);
        if (!info) continue;
        if (info.type === 'joystick') {
            joyMove(t.clientX, t.clientY);
        } else if (info.type === 'empty') {
            const dx = t.clientX - info.lastX, dy = t.clientY - info.lastY;
            if (Math.hypot(t.clientX - info.startX, t.clientY - info.startY) > CONST.MOVE_THRESHOLD) {
                info.moved = true;
                if (info.longPressTimer) { clearTimeout(info.longPressTimer); info.longPressTimer = null; }
            }
            if (info.moved) {
                player.yaw -= dx * 0.005;
                if (player.yaw > Math.PI) player.yaw -= 2 * Math.PI;
                else if (player.yaw < -Math.PI) player.yaw += 2 * Math.PI;
                player.pitch = Math.max(-CONST.PITCH_LIMIT, Math.min(CONST.PITCH_LIMIT, player.pitch - dy * 0.005));
            }
            info.lastX = t.clientX; info.lastY = t.clientY;
        }
    }
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchend', e => {
    for (const t of e.changedTouches) {
        const info = activeTouches.get(t.identifier);
        if (!info) continue;
        if (info.type === 'joystick') joyEnd();
        else if (info.type === 'up') moveUpRequested = false;
        else if (info.type === 'down') moveDownRequested = false;
        else if (info.type === 'empty') {
            if (info.longPressTimer) clearTimeout(info.longPressTimer);
            if (!info.moved && !info.longPressFired) tryPlace();
        }
        activeTouches.delete(t.identifier);
    }
});

document.addEventListener('touchcancel', e => {
    for (const t of e.changedTouches) {
        const info = activeTouches.get(t.identifier);
        if (!info) continue;
        if (info.type === 'joystick') joyEnd();
        if (info.type === 'up') moveUpRequested = false;
        if (info.type === 'down') moveDownRequested = false;
        if (info.longPressTimer) clearTimeout(info.longPressTimer);
        activeTouches.delete(t.identifier);
    }
});

// 摇杆处理（在 ui.js 里引用 joyCenter）
let joyCenter = { x: 0, y: 0 };
function joyMove(x, y) {
    const dx = x - joyCenter.x, dy = y - joyCenter.y;
    const dist = Math.hypot(dx, dy);
    const maxDist = 45;
    const clamped = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clamped;
    const ky = Math.sin(angle) * clamped;
    const knob = document.getElementById('joystick-knob');
    knob.style.transform = `translate(${kx}px,${ky}px)`;
    moveInput.x = kx / maxDist;
    moveInput.y = ky / maxDist;
}
function joyEnd() {
    moveInput = { x: 0, y: 0 };
    document.getElementById('joystick-knob').style.transform = 'translate(0,0)';
}

// ==========================================================
// 相机
// ==========================================================
const _yAxis = new THREE.Vector3(0, 1, 0);
const _xAxis = new THREE.Vector3(1, 0, 0);
const _yawQuat = new THREE.Quaternion();
const _pitchQuat = new THREE.Quaternion();
function updateCamera() {
    camera.position.set(player.pos.x, player.pos.y + CONST.EYE_H, player.pos.z);
    _yawQuat.setFromAxisAngle(_yAxis, player.yaw);
    _pitchQuat.setFromAxisAngle(_xAxis, player.pitch);
    camera.quaternion.copy(_yawQuat).multiply(_pitchQuat);
    const e = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
    if (Math.abs(e.z) > 1e-6) { e.z = 0; camera.quaternion.setFromEuler(e); }
}

// ==========================================================
// 主循环
// ==========================================================
function resizeRenderer() {
    const w = document.documentElement.clientWidth || window.innerWidth;
    const h = document.documentElement.clientHeight || window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
    canvasElement.style.width = w + 'px';
    canvasElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
}

let lastTime = performance.now();
let accumulator = 0;
let fpsTimer = 0, fpsCount = 0, renderTimer = 0, hudTimer = 0, resizeTimer = 0;

function update() {
    const now = performance.now();
    const frameTime = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    resizeTimer += frameTime;
    if (resizeTimer > 2) {
        resizeTimer = 0;
        const w = document.documentElement.clientWidth || window.innerWidth;
        const h = document.documentElement.clientHeight || window.innerHeight;
        if (Math.abs(camera.aspect - w / h) > 0.01) resizeRenderer();
    }

    accumulator += frameTime;
    let steps = 0;
    while (accumulator >= CONST.FIXED_DT && steps < 5) {
        physicsStep(CONST.FIXED_DT);
        accumulator -= CONST.FIXED_DT;
        steps++;
    }

    if (player.pos.y < -30 && !spectatorMode && !flyingMode) {
        player.pos = randomSpawn();
        player.vy = 0; player.onGround = false;
    }

    updateDayNight(frameTime);
    updateWeather(frameTime);
    updateDrops(frameTime);

    renderTimer += frameTime;
    if (renderTimer > 0.25) { renderTimer = 0; updateRender(); }

    updateCamera();
    renderer.render(scene, camera);

    fpsCount++; fpsTimer += frameTime; hudTimer += frameTime;
    if (hudTimer >= 0.5) {
        const dayT = (worldTime / CONST.DAY_DURATION) * 24;
        const hours = Math.floor(dayT);
        const mins = Math.floor((dayT - hours) * 60);
        const timeStr = `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}`;
        const mode = spectatorMode ? '旁观' : (flyingMode ? '飞行' : '生存');
        const weatherStr = weather.type === 'clear' ? '晴' : { rain: '雨', snow: '雪', sandstorm: '沙尘暴' }[weather.type];
        document.getElementById('hud').innerHTML =
            `FPS: ${Math.round(fpsCount / fpsTimer)}<br>` +
            `位置: ${player.pos.x.toFixed(1)}, ${player.pos.y.toFixed(1)}, ${player.pos.z.toFixed(1)}<br>` +
            `生物群系: ${getBiome(Math.floor(player.pos.x), Math.floor(player.pos.z))}<br>` +
            `时间: ${timeStr} | 天气: ${weatherStr} | ${mode}<br>` +
            `方块: ${renderedMeshes.size} | 掉落: ${drops.length}`;
        fpsCount = 0; fpsTimer = 0; hudTimer = 0;
    }

    requestAnimationFrame(update);
}

window.addEventListener('resize', resizeRenderer);
window.addEventListener('orientationchange', () => setTimeout(resizeRenderer, 200));
window.addEventListener('beforeunload', saveToLocal);

// ==========================================================
// 启动
// ==========================================================
initWeatherSystem();
buildHotbar();

if (loadFromLocal()) {
    setTimeout(() => toast('已读取存档'), 500);
} else {
    WORLD_SEED = Math.floor(Math.random() * 1e9);
    player.pos = randomSpawn();
    worldTime = CONST.DAY_DURATION * 0.35;
}

document.getElementById('worldTypeSelect').value = worldType;
document.getElementById('dayNightSelect').value = dayNightMode;

resizeRenderer();
updateRender();
updateFlyButtons();
update();