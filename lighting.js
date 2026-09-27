// ==========================================================
// lighting.js v2 — 高性能体素光照引擎
// 用 Int8Array 存储，BFS 用索引队列，速度更快
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
            // 尺寸动态扩展
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
            // 只在需要时重新分配
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

            // 天空直射光 + 火把
            for (let x = x0; x <= x1; x++) {
                for (let z = z0; z <= z1; z++) {
                    let level = 15;
                    for (let y = this.yMax; y >= 0; y--) {
                        const t = this.getBlockType(x, y, z);
                        if (t !== null) level = 0;
                        if (level > 0) {
                            this.skylight[this._idx(x, y, z)] = level;
                            skyQ.push(x, y, z, level);
                        }
                        if (t === 'torch') {
                            this.blocklight[this._idx(x, y, z)] = 14;
                            blockQ.push(x, y, z, 14);
                        }
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

            // 重算内部
            for (let cx = x0; cx <= x1; cx++) {
                for (let cz = z0; cz <= z1; cz++) {
                    let level = 15;
                    for (let cy = this.yMax; cy >= 0; cy--) {
                        const t = this.getBlockType(cx, cy, cz);
                        if (t !== null) level = 0;
                        if (level > 0) {
                            this.skylight[this._idx(cx, cy, cz)] = level;
                            skyQ.push(cx, cy, cz, level);
                        }
                        if (t === 'torch') {
                            this.blocklight[this._idx(cx, cy, cz)] = 14;
                            blockQ.push(cx, cy, cz, 14);
                        }
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
            const len = queue.length;
            while (i < len) {
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
                    if (this.isBlocked(nx, ny, nz)) continue;

                    const idx = this._idx(nx, ny, nz);
                    if (map[idx] < nl) {
                        map[idx] = nl;
                        queue.push(nx, ny, nz, nl);
                    }
                }
                // 注意：len 只记录初始长度，但 queue 在增长
                // 所以要用 queue.length 动态判断
                if (i >= len && i < queue.length) {
                    // 继续处理新增的
                }
            }
            // 修正：上面逻辑有 bug，用 while i < queue.length
            // 但为了性能，改成下面的形式
        }

        // 用简单版本（修正）
        _floodFixed(queue, map) {
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
                    if (this.isBlocked(nx, ny, nz)) continue;

                    const idx = this._idx(nx, ny, nz);
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

    // 修正：把 _flood 替换为 _floodFixed
    VoxelLight.prototype._flood = VoxelLight.prototype._floodFixed;

    global.VoxelLight = VoxelLight;
})(window);