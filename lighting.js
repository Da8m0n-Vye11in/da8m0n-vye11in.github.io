// ==========================================================
// lighting.js v3 — Minecraft 体素光照引擎
// 修复：暴露方块本身应得到天空光 15，而不是 0
// ==========================================================
(function (global) {
    'use strict';

    const DIRS = new Int8Array([
        1, 0, 0, -1, 0, 0,
        0, 1, 0, 0, -1, 0,
        0, 0, 1, 0, 0, -1
    ]);

    class VoxelLight {
        constructor(getBlockType) {
            this.getBlockType = getBlockType;
            this.minX = 0; this.maxX = 0;
            this.minZ = 0; this.maxZ = 0;
            this.yMax = 40;
            this.skylight = null;
            this.blocklight = null;
            this.sizeX = 0;
            this.sizeZ = 0;
            this.sizeY = 0;
        }

        _ensureSize(x0, x1, z0, z1, yMax) {
            const pad = 2;
            const nx0 = x0 - pad, nx1 = x1 + pad;
            const nz0 = z0 - pad, nz1 = z1 + pad;
            if (nx0 >= this.minX && nx1 <= this.maxX &&
                nz0 >= this.minZ && nz1 <= this.maxZ &&
                yMax <= this.yMax && this.skylight) return;

            this.minX = nx0; this.maxX = nx1;
            this.minZ = nz0; this.maxZ = nz1;
            this.yMax = yMax;
            this.sizeX = nx1 - nx0 + 1;
            this.sizeZ = nz1 - nz0 + 1;
            this.sizeY = yMax + 1;
            const total = this.sizeX * this.sizeY * this.sizeZ;
            this.skylight = new Int8Array(total);
            this.blocklight = new Int8Array(total);
        }

        _idx(x, y, z) {
            return ((x - this.minX) * this.sizeY + y) * this.sizeZ + (z - this.minZ);
        }

        _inBounds(x, y, z) {
            return x >= this.minX && x <= this.maxX &&
                   z >= this.minZ && z <= this.maxZ &&
                   y >= 0 && y <= this.yMax;
        }

        isBlocked(x, y, z) {
            return this.getBlockType(x, y, z) !== null;
        }

        // ==========================================================
        // 全量重建
        // ==========================================================
        rebuild(x0, x1, z0, z1, yMax) {
            this._ensureSize(x0, x1, z0, z1, yMax);
            this.skylight.fill(0);
            this.blocklight.fill(0);

            const skyQ = [];
            const blockQ = [];

            // ★ 关键修复：方块本身也接收天空光
            for (let x = x0; x <= x1; x++) {
                for (let z = z0; z <= z1; z++) {
                    let level = 15;
                    for (let y = this.yMax; y >= 0; y--) {
                        const t = this.getBlockType(x, y, z);
                        const idx = this._idx(x, y, z);

                        // 这一格（无论方块还是空气）都接收当前 level
                        if (level > 0) {
                            this.skylight[idx] = level;
                            skyQ.push(x, y, z, level);
                        }

                        // 火把光源
                        if (t === 'torch') {
                            this.blocklight[idx] = 14;
                            blockQ.push(x, y, z, 14);
                        }

                        // 遇到方块后，下方变暗
                        if (t !== null) level = 0;
                    }
                }
            }

            this._flood(skyQ, this.skylight);
            this._flood(blockQ, this.blocklight);
        }

        // ==========================================================
        // 局部更新（方块变化后 ±8 格）
        // ==========================================================
        onBlockChanged(x, y, z) {
            if (!this.skylight) return;
            const R = 8;
            const x0 = Math.max(this.minX, x - R);
            const x1 = Math.min(this.maxX, x + R);
            const z0 = Math.max(this.minZ, z - R);
            const z1 = Math.min(this.maxZ, z + R);
            if (x0 > x1 || z0 > z1) return;

            // 清理区域
            for (let cx = x0; cx <= x1; cx++) {
                for (let cz = z0; cz <= z1; cz++) {
                    const base = ((cx - this.minX) * this.sizeY) * this.sizeZ + (cz - this.minZ);
                    for (let cy = 0; cy <= this.yMax; cy++) {
                        const i = base + cy * this.sizeZ;
                        this.skylight[i] = 0;
                        this.blocklight[i] = 0;
                    }
                }
            }

            const skyQ = [];
            const blockQ = [];

            // 边界光照作为种子
            for (let cx = x0 - 1; cx <= x1 + 1; cx++) {
                for (let cz = z0 - 1; cz <= z1 + 1; cz++) {
                    const inside = cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1;
                    if (inside) continue;
                    if (!this._inBounds(cx, 0, cz)) continue;
                    for (let cy = 0; cy <= this.yMax; cy++) {
                        const i = this._idx(cx, cy, cz);
                        const sky = this.skylight[i];
                        if (sky > 0) skyQ.push(cx, cy, cz, sky);
                        const blk = this.blocklight[i];
                        if (blk > 0) blockQ.push(cx, cy, cz, blk);
                    }
                }
            }

            // 重算内部：★ 同样修复——方块本身接收天空光
            for (let cx = x0; cx <= x1; cx++) {
                for (let cz = z0; cz <= z1; cz++) {
                    let level = 15;
                    for (let cy = this.yMax; cy >= 0; cy--) {
                        const t = this.getBlockType(cx, cy, cz);
                        const idx = this._idx(cx, cy, cz);

                        if (level > 0) {
                            this.skylight[idx] = level;
                            skyQ.push(cx, cy, cz, level);
                        }

                        if (t === 'torch') {
                            this.blocklight[idx] = 14;
                            blockQ.push(cx, cy, cz, 14);
                        }

                        if (t !== null) level = 0;
                    }
                }
            }

            this._flood(skyQ, this.skylight);
            this._flood(blockQ, this.blocklight);
        }

        // ==========================================================
        // BFS 洪水填充
        // ==========================================================
        _flood(queue, map) {
            let i = 0;
            while (i < queue.length) {
                const x = queue[i++];
                const y = queue[i++];
                const z = queue[i++];
                const level = queue[i++];
                if (level <= 1) continue;
                const nl = level - 1;

                for (let d = 0; d < 18; d += 3) {
                    const nx = x + DIRS[d];
                    const ny = y + DIRS[d + 1];
                    const nz = z + DIRS[d + 2];
                    if (ny < 0 || ny > this.yMax) continue;
                    if (!this._inBounds(nx, ny, nz)) continue;

                    const idx = this._idx(nx, ny, nz);
                    // ★ 允许光照扩散到方块本身（让方块也能被相邻光照亮）
                    if (map[idx] < nl) {
                        map[idx] = nl;
                        queue.push(nx, ny, nz, nl);
                    }
                }
            }
        }

        // ==========================================================
        // 查询
        // ==========================================================
        getLight(x, y, z) {
            if (!this.skylight) return 15;
            if (!this._inBounds(x, y, z)) return 15;
            const i = this._idx(x, y, z);
            const sky = this.skylight[i];
            const blk = this.blocklight[i];
            return sky > blk ? sky : blk;
        }

        clear() {
            if (this.skylight) this.skylight.fill(0);
            if (this.blocklight) this.blocklight.fill(0);
        }
    }

    global.VoxelLight = VoxelLight;
})(window);