// ==========================================================
// 碰撞检测
// ==========================================================
function isColliding(pos) {
    if (spectatorMode) return false;
    const minX = pos.x - CONST.PLAYER_W / 2, maxX = pos.x + CONST.PLAYER_W / 2;
    const minY = pos.y, maxY = pos.y + CONST.PLAYER_H;
    const minZ = pos.z - CONST.PLAYER_W / 2, maxZ = pos.z + CONST.PLAYER_W / 2;
    const x0 = Math.floor(minX), x1 = Math.floor(maxX);
    const y0 = Math.floor(minY), y1 = Math.floor(maxY);
    const z0 = Math.floor(minZ), z1 = Math.floor(maxZ);
    for (let x = x0; x <= x1; x++)
        for (let y = y0; y <= y1; y++)
            for (let z = z0; z <= z1; z++)
                if (isSolid(x, y, z) &&
                    maxX > x && minX < x + 1 &&
                    maxY > y && minY < y + 1 &&
                    maxZ > z && minZ < z + 1) return true;
    return false;
}

function exactGroundY(pos) {
    const hw = CONST.PLAYER_W / 2;
    const x0 = Math.floor(pos.x - hw + 0.001);
    const x1 = Math.floor(pos.x + hw - 0.001);
    const z0 = Math.floor(pos.z - hw + 0.001);
    const z1 = Math.floor(pos.z + hw - 0.001);
    let highest = -Infinity;
    for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
            for (let y = Math.floor(pos.y + CONST.PLAYER_H); y >= 0; y--) {
                if (isSolid(x, y, z)) {
                    if (y + 1 > highest) highest = y + 1;
                    break;
                }
            }
        }
    }
    return highest;
}

function sweepMove(axis, dist) {
    if (spectatorMode) {
        player.pos.x += (axis === 'x' ? dist : 0);
        player.pos.y += (axis === 'y' ? dist : 0);
        player.pos.z += (axis === 'z' ? dist : 0);
        return false;
    }
    const n = Math.max(1, Math.ceil(Math.abs(dist) / CONST.SWEEP_STEP));
    const s = dist / n;
    for (let i = 0; i < n; i++) {
        const test = {
            x: player.pos.x + (axis === 'x' ? s : 0),
            y: player.pos.y + (axis === 'y' ? s : 0),
            z: player.pos.z + (axis === 'z' ? s : 0),
        };
        if (isColliding(test)) return true;
        player.pos.x = test.x;
        player.pos.y = test.y;
        player.pos.z = test.z;
    }
    return false;
}

function unstickPlayer() {
    if (!isColliding(player.pos)) return;
    for (let dy = 0; dy < 10; dy += 0.1) {
        const test = { x: player.pos.x, y: player.pos.y + dy, z: player.pos.z };
        if (!isColliding(test)) {
            player.pos.y += dy;
            player.vy = 0;
            return;
        }
    }
}

// ==========================================================
// 物理步进
// ==========================================================
function physicsStep(dt) {
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

    // 旁观模式：无碰撞自由飞行
    if (spectatorMode) {
        const forward3D = new THREE.Vector3(
            -Math.sin(player.yaw) * Math.cos(player.pitch),
            Math.sin(player.pitch),
            -Math.cos(player.yaw) * Math.cos(player.pitch)
        );
        const move = new THREE.Vector3();
        move.addScaledVector(forward3D, -moveInput.y);
        move.addScaledVector(right, moveInput.x);
        if (move.length() > 1) move.normalize();
        player.pos.x += move.x * moveSpeed * dt;
        player.pos.y += move.y * moveSpeed * dt;
        player.pos.z += move.z * moveSpeed * dt;
        if (moveUpRequested) player.pos.y += moveSpeed * dt;
        if (moveDownRequested) player.pos.y -= moveSpeed * dt;
        player.vy = 0;
        return;
    }

    const move = new THREE.Vector3();
    move.addScaledVector(forward, -moveInput.y);
    move.addScaledVector(right, moveInput.x);
    if (move.length() > 1) move.normalize();

    // 飞行模式
    if (flyingMode) {
        sweepMove('x', move.x * moveSpeed * dt);
        sweepMove('z', move.z * moveSpeed * dt);
        if (moveUpRequested) {
            const tryPos = player.pos.clone();
            tryPos.y += moveSpeed * dt;
            if (!isColliding(tryPos)) player.pos.y = tryPos.y;
        }
        if (moveDownRequested) {
            const tryPos = player.pos.clone();
            tryPos.y -= moveSpeed * dt;
            if (!isColliding(tryPos)) player.pos.y = tryPos.y;
        }
        player.vy = 0;
        player.onGround = false;
        return;
    }

    // 生存模式
    sweepMove('x', move.x * moveSpeed * dt);
    sweepMove('z', move.z * moveSpeed * dt);

    if (jumpRequested && player.onGround) {
        player.vy = CONST.JUMP_SPEED;
        player.onGround = false;
    }
    jumpRequested = false;
    player.vy -= CONST.GRAVITY * dt;
    player.vy = Math.max(player.vy, -30);
    const hit = sweepMove('y', player.vy * dt);
    if (hit) {
        if (player.vy < 0) {
            const g = exactGroundY(player.pos);
            if (g > -Infinity && g <= player.pos.y + 0.1) player.pos.y = g;
            player.vy = 0; player.onGround = true;
        } else {
            player.vy = 0; player.onGround = false;
        }
    } else {
        const below = { x: player.pos.x, y: player.pos.y - 0.05, z: player.pos.z };
        player.onGround = isColliding(below);
        if (player.onGround) {
            const g = exactGroundY(player.pos);
            if (g > -Infinity && g <= player.pos.y + 0.1) player.pos.y = g;
            player.vy = 0;
        }
    }
}