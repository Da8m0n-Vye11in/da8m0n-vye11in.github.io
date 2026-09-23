// ==========================================================
// 方块配置
// ==========================================================
const BLOCK_CONFIG = {
    grass:  { name: '草方块', top: '#7ec850', side: '#8fb860', bottom: '#8b5a2b' },
    dirt:   { name: '泥土',   color: '#8b5a2b' },
    stone:  { name: '石头',   color: '#888888' },
    wood:   { name: '原木',   color: '#6b4423' },
    plank:  { name: '木板',   color: '#b88a4a' },
    leaves: { name: '树叶',   color: '#3d7a1e' },
    sand:   { name: '沙子',   color: '#d4c694', gravity: true },
    torch:  { name: '火把',   color: '#ffcc33', light: true, emissive: true },
};

const HOTBAR_ORDER = ['grass', 'dirt', 'stone', 'wood', 'plank', 'leaves', 'sand', 'torch'];

const RECIPES = [
    { id: 'plank', inputs: { wood: 1 }, outputs: { plank: 4 }, name: '原木 → 木板×4' },
];

const CONST = {
    GRAVITY: 22, JUMP_SPEED: 8.5,
    PLAYER_W: 0.6, PLAYER_H: 1.8, EYE_H: 1.6,
    SAVE_KEY: 'minicraft_v12',
    FIXED_DT: 1 / 60,
    LONG_PRESS_MS: 450, MOVE_THRESHOLD: 25, SWEEP_STEP: 0.05,
    PITCH_LIMIT: 1.45, MAX_TORCH_LIGHTS: 3,
    DAY_DURATION: 2400,  // 40 分钟 = 一天
    WEATHER_MIN: 300,    // 天气最短 5 分钟
    WEATHER_MAX: 600,    // 天气最长 10 分钟
};

// ==========================================================
// 全局状态
// ==========================================================
let WORLD_SEED = Math.floor(Math.random() * 1e9);
let worldType = 'normal';
let renderDistance = 7;
let brightnessLevel = 100;
let moveSpeed = 6;
let flyingMode = false;
let spectatorMode = false;
let dayNightMode = 'cycle';
let worldTime = CONST.DAY_DURATION * 0.35;  // 从早晨开始

let currentBlock = 'grass';
let moveInput = { x: 0, y: 0 };
let jumpRequested = false;
let moveUpRequested = false;
let moveDownRequested = false;

const player = {
    pos: new THREE.Vector3(0, 50, 0),
    yaw: 0, pitch: -0.3, vy: 0, onGround: false,
};

const inventory = {
    grass: 64, dirt: 64, stone: 64,
    wood: 32, plank: 32, leaves: 32,
    sand: 32, torch: 32,
};

// 运行时其他模块会填充这些
let scene, camera, renderer, canvasElement;