// ==========================================================
// lighting.js v6 — 支持昼夜天空光因子 + 无限深度（负 Y 坐标）
// ==========================================================
(function (global) {
    'use strict';

    const MAX_SKY_LIGHT = 12;
    const MAX_BLOCK_LIGHT = 15;

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
            this.yMin = 0;
            this.yMax = 40;
            
            this.skylight = null;
            this.blocklight = null;
            this.sizeX = 0;
            this.sizeZ = 0;
            this.sizeY = 0;
            this.skyFactor = 1.0;
        }

        setSkyFactor(f) {
            const nf = Math.max(0.05, Math.min(1.0, f));
            if (Math.abs(nf - this.skyFactor) < 0.005) return false;
            this.skyFactor = nf;
            return true;
        }

        _ensureSize(x0, x1, z0, z1, yMin, yMax) {
            const pad = 2;
            const nx0 = x0 - pad, nx1 = x1 + pad;
            const nz0 = z0 - pad, nz1 = z1 + pad;
            
            if (nx0 >= this.minX && nx1 <= this.maxX &&
                nz0 >= this.minZ && nz1 <= this.maxZ &&
                yMin >= this.yMin && yMax <= this.yMax && this.skylight) return;

            this.minX = nx0; this.maxX = nx1;
            this.minZ = nz0; this.maxZ = nz1;
            this.yMin = yMin; this.yMax = yMax;
            
            this.sizeX = nx1 - nx0 + 1;
            this.sizeZ = nz1 - nz0 + 1;
            this.sizeY = yMax - yMin + 1; 
            
            const total = this.sizeX * this.sizeY * this.sizeZ;
            this.skylight = new Int8Array(total);
            this.blocklight = new Int8Array(total);
        }

        _idx(x, y, z) {
            return ((x - this.minX) * this.sizeY + (y - this.yMin)) * this.sizeZ + (z - this.minZ);
        }

        _inBounds(x, y, z) {
            return x >= this.minX && x <= this.maxX &&
                   z >= this.minZ && z <= this.maxZ &&
                   y >= this.yMin && y <= this.yMax;
        }

        isBlocked(x, y, z) {
            return this.getBlockType(x, y, z) !== null;
        }

        rebuild(x0, x1, z0, z1, yMin, yMax) {
            this._ensureSize(x0, x1, z0, z1, yMin, yMax);
            this.skylight.fill(0);
            this.blocklight.fill(0);

            const skyQ = [];
            const blockQ = [];

            for (let x = x0; x <= x1; x++) {
                for (let z = z0; z <= z1; z++) {
                    let level = MAX_SKY_LIGHT;
                    for (let y = this.yMax; y >= this.yMin; y--) {
                        const t = this.getBlockType(x, y, z);
                        const idx = this._idx(x, y, z);

                        if (level > 0) {
                            this.skylight[idx] = level;
                            skyQ.push(x, y, z, level);
                        }

                        if (t === 'torch') {
                            this.blocklight[idx] = MAX_BLOCK_LIGHT;
                            blockQ.push(x, y, z, MAX_BLOCK_LIGHT);
                        }

                        if (t !== null) level = 0;
                    }
                }
            }

            this._flood(skyQ, this.skylight);
            this._flood(blockQ, this.blocklight);
        }

        onBlockChanged(x, y, z) {
            if (!this.skylight) return;
            const R = 12; 
            const x0 = Math.max(this.minX, x - R);
            const x1 = Math.min(this.maxX, x + R);
            const z0 = Math.max(this.minZ, z - R);
            const z1 = Math.min(this.maxZ, z + R);
            if (x0 > x1 || z0 > z1) return;

            for (let cx = x0; cx <= x1; cx++) {
                for (let cz = z0; cz <= z1; cz++) {
                    const base = ((cx - this.minX) * this.sizeY) * this.sizeZ + (cz - this.minZ);
                    for (let cy = this.yMin; cy <= this.yMax; cy++) {
                        const i = base + (cy - this.yMin) * this.sizeZ;
                        this.skylight[i] = 0;
                        this.blocklight[i] = 0;
                    }
                }
            }

            const skyQ = [];
            const blockQ = [];

            for (let cx = x0 - 1; cx <= x1 + 1; cx++) {
                for (let cz = z0 - 1; cz <= z1 + 1; cz++) {
                    const inside = cx >= x0 && cx <= x1 && cz >= z0 && cz <= z1;
                    if (inside) continue;
                    if (!this._inBounds(cx, this.yMin, cz)) continue;
                    for (let cy = this.yMin; cy <= this.yMax; cy++) {
                        const i = this._idx(cx, cy, cz);
                        const sky = this.skylight[i];
                        if (sky > 0) skyQ.push(cx, cy, cz, sky);
                        const blk = this.blocklight[i];
                        if (blk > 0) blockQ.push(cx, cy, cz, blk);
                    }
                }
            }

            for (let cx = x0; cx <= x1; cx++) {
                for (let cz = z0; cz <= z1; cz++) {
                    let level = MAX_SKY_LIGHT;
                    for (let cy = this.yMax; cy >= this.yMin; cy--) {
                        const t = this.getBlockType(cx, cy, cz);
                        const idx = this._idx(cx, cy, cz);

                        if (level > 0) {
                            this.skylight[idx] = level;
                            skyQ.push(cx, cy, cz, level);
                        }

                        if (t === 'torch') {
                            this.blocklight[idx] = MAX_BLOCK_LIGHT;
                            blockQ.push(cx, cy, cz, MAX_BLOCK_LIGHT);
                        }

                        if (t !== null) level = 0;
                    }
                }
            }

            this._flood(skyQ, this.skylight);
            this._flood(blockQ, this.blocklight);
        }

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
                    if (ny < this.yMin || ny > this.yMax) continue;
                    if (!this._inBounds(nx, ny, nz)) continue;

                    const idx = this._idx(nx, ny, nz);
                    if (map[idx] < nl) {
                        map[idx] = nl;
                        queue.push(nx, ny, nz, nl);
                    }
                }
            }
        }

        getSkyLight(x, y, z) {
            if (!this.skylight) return MAX_SKY_LIGHT * this.skyFactor;
            if (!this._inBounds(x, y, z)) return MAX_SKY_LIGHT * this.skyFactor;
            return this.skylight[this._idx(x, y, z)] * this.skyFactor;
        }

        getBlockLight(x, y, z) {
            if (!this.blocklight) return 0;
            if (!this._inBounds(x, y, z)) return 0;
            return this.blocklight[this._idx(x, y, z)];
        }

        getLight(x, y, z) {
            const sky = this.getSkyLight(x, y, z);
            const blk = this.getBlockLight(x, y, z);
            return sky > blk ? sky : blk;
        }

        clear() {
            if (this.skylight) this.skylight.fill(0);
            if (this.blocklight) this.blocklight.fill(0);
        }
    }

    global.VoxelLight = VoxelLight;
})(window);