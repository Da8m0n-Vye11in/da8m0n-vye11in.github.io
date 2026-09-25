// ==========================================================
// 天气系统
// ==========================================================
let weather = {
    type: 'clear',           // clear / rain / snow / sandstorm
    remaining: 90,
    intensity: 0,
};

let weatherParticles = null;

function initWeatherSystem() {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 0xffffff, size: 0.1, transparent: true, opacity: 0,
        depthWrite: false, sizeAttenuation: true,
    });
    const points = new THREE.Points(geo, mat);
    points.visible = false;
    points.frustumCulled = false;
    scene.add(points);
    weatherParticles = { points, positions, count };
}

const WEATHER_CFG = {
    rain:      { color: 0x88aaff, size: 0.09, speedY: -22, sway: 1.2 },
    snow:      { color: 0xffffff, size: 0.16, speedY: -2.5, sway: 0.6 },
    sandstorm: { color: 0xddaa55, size: 0.22, speedY: -1.5, sway: 10 },
};

function pickNextWeather() {
    const roll = Math.random();
    if (roll < 0.50) weather.type = 'clear';
    else if (roll < 0.68) weather.type = 'rain';
    else if (roll < 0.86) weather.type = 'snow';
    else weather.type = 'sandstorm';
    weather.remaining = CONST.WEATHER_MIN + Math.random() * (CONST.WEATHER_MAX - CONST.WEATHER_MIN);
}

function updateWeather(dt) {
    if (!weatherParticles) return;

    weather.remaining -= dt;
    if (weather.remaining <= 0) pickNextWeather();

    const target = weather.type === 'clear' ? 0 : 1;
    weather.intensity += (target - weather.intensity) * dt * 0.4;

    if (weather.type === 'clear' || weather.intensity < 0.05) {
        weatherParticles.points.visible = false;
        return;
    }

    const cfg = WEATHER_CFG[weather.type];
    weatherParticles.points.visible = true;
    weatherParticles.points.material.color.setHex(cfg.color);
    weatherParticles.points.material.size = cfg.size;
    weatherParticles.points.material.opacity = weather.intensity * 0.75;

    const px = player.pos.x, py = player.pos.y, pz = player.pos.z;
    const R = 22, H = 24;
    const arr = weatherParticles.positions;

    for (let i = 0; i < weatherParticles.count; i++) {
        let x = arr[i*3], y = arr[i*3 + 1], z = arr[i*3 + 2];
        if (Math.abs(x - px) > R || Math.abs(z - pz) > R || y < py - H/2 || y > py + H/2) {
            x = px + (Math.random() - 0.5) * R * 2;
            y = py + H/2 - Math.random() * H;
            z = pz + (Math.random() - 0.5) * R * 2;
        }
        y += cfg.speedY * dt;
        x += (Math.random() - 0.5) * cfg.sway * dt;
        z += (Math.random() - 0.5) * cfg.sway * dt;
        arr[i*3] = x;
        arr[i*3+1] = y;
        arr[i*3+2] = z;
    }
    weatherParticles.points.geometry.attributes.position.needsUpdate = true;
}