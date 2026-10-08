// ==========================================================
// lang.js — 多语言支持（简体中文 / 繁體中文 / English / Español / Русский）
// ==========================================================
(function (global) {
    'use strict';

    const I18N = {
        zh_cn: {
            pause: '暂停', resume: '继续游戏', settings: '设置', save: '保存存档', load: '读取存档',
            newWorld: '新世界', language: '语言',
            worldType: '世界类型', time: '时间', weather: '强制天气',
            renderDist: '渲染距离', brightness: '亮度', speed: '移动速度',
            hd: '高清渲染（更卡）', fly: '飞行模式', spectator: '旁观模式（透视）',
            close: '关闭', applyWorld: '应用世界类型（重置世界）',
            normal: '普通世界', flat: '超平坦', forest: '全森林', plains: '全平原', desert: '全沙漠',
            cycle: '循环', day: '白天', night: '夜晚',
            auto: '自动', clear: '晴天', rain: '下雨', snow: '下雪', sandstorm: '沙尘暴',
            inventory: '背包', craft: '合成', jump: '跳',
            saved: '已保存', loaded: '已读取', newWorldGenerated: '新世界已生成',
            confirmReset: '确定生成新世界吗？当前存档会丢失。',
            grass: '草方块', dirt: '泥土', stone: '石头', wood: '原木',
            plank: '木板', leaves: '树叶', sandBlock: '沙子', torch: '火把',
            craftPlank: '原木 → 木板×4', material: '材料',
            noBlock: '没有方块', cantBreak: '不能破坏',brick: '砖块'
        },
        zh_tw: {
            pause: '暫停', resume: '繼續遊戲', settings: '設定', save: '儲存存檔', load: '讀取存檔',
            newWorld: '新世界', language: '語言',
            worldType: '世界類型', time: '時間', weather: '強制天氣',
            renderDist: '渲染距離', brightness: '亮度', speed: '移動速度',
            hd: '高清渲染（更卡）', fly: '飛行模式', spectator: '旁觀模式（透視）',
            close: '關閉', applyWorld: '套用世界類型（重置世界）',
            normal: '普通世界', flat: '超平坦', forest: '全森林', plains: '全平原', desert: '全沙漠',
            cycle: '循環', day: '白天', night: '夜晚',
            auto: '自動', clear: '晴天', rain: '下雨', snow: '下雪', sandstorm: '沙塵暴',
            inventory: '背包', craft: '合成', jump: '跳',
            saved: '已儲存', loaded: '已讀取', newWorldGenerated: '新世界已生成',
            confirmReset: '確定生成新世界嗎？目前存檔會遺失。',
            grass: '草地', dirt: '泥土', stone: '石頭', wood: '原木',
            plank: '木板', leaves: '樹葉', sandBlock: '沙子', torch: '火把',
            craftPlank: '原木 → 木板×4', material: '材料',
            noBlock: '沒有方塊', cantBreak: '不能破壞',brick: '磚塊',
        },
        en: {
            pause: 'Paused', resume: 'Resume', settings: 'Settings', save: 'Save', load: 'Load',
            newWorld: 'New World', language: 'Language',
            worldType: 'World Type', time: 'Time', weather: 'Weather',
            renderDist: 'Render Distance', brightness: 'Brightness', speed: 'Move Speed',
            hd: 'HD Rendering (slower)', fly: 'Fly Mode', spectator: 'Spectator (X-ray)',
            close: 'Close', applyWorld: 'Apply World Type (Reset)',
            normal: 'Normal', flat: 'Flat', forest: 'Forest', plains: 'Plains', desert: 'Desert',
            cycle: 'Cycle', day: 'Day', night: 'Night',
            auto: 'Auto', clear: 'Clear', rain: 'Rain', snow: 'Snow', sandstorm: 'Sandstorm',
            inventory: 'Inventory', craft: 'Craft', jump: 'Jump',
            saved: 'Saved', loaded: 'Loaded', newWorldGenerated: 'New world generated',
            confirmReset: 'Generate new world? Current save will be lost.',
            grass: 'Grass', dirt: 'Dirt', stone: 'Stone', wood: 'Wood',
            plank: 'Plank', leaves: 'Leaves', sandBlock: 'Sand', torch: 'Torch',
            craftPlank: 'Wood → Plank ×4', material: 'Material',
            noBlock: 'No block', cantBreak: 'Cannot break',brick: 'Brick'
        },
        es: {
            pause: 'Pausa', resume: 'Reanudar', settings: 'Ajustes', save: 'Guardar', load: 'Cargar',
            newWorld: 'Nuevo Mundo', language: 'Idioma',
            worldType: 'Tipo de Mundo', time: 'Hora', weather: 'Clima',
            renderDist: 'Distancia', brightness: 'Brillo', speed: 'Velocidad',
            hd: 'Alta Definición (lento)', fly: 'Modo Vuelo', spectator: 'Espectador (Rayos X)',
            close: 'Cerrar', applyWorld: 'Aplicar Tipo (Reiniciar)',
            normal: 'Normal', flat: 'Plano', forest: 'Bosque', plains: 'Llanura', desert: 'Desierto',
            cycle: 'Ciclo', day: 'Día', night: 'Noche',
            auto: 'Auto', clear: 'Despejado', rain: 'Lluvia', snow: 'Nieve', sandstorm: 'Tormenta',
            inventory: 'Inventario', craft: 'Fabricar', jump: 'Saltar',
            saved: 'Guardado', loaded: 'Cargado', newWorldGenerated: 'Nuevo mundo generado',
            confirmReset: '¿Generar nuevo mundo? Se perderá la partida.',
            grass: 'Césped', dirt: 'Tierra', stone: 'Piedra', wood: 'Madera',
            plank: 'Tabla', leaves: 'Hojas', sandBlock: 'Arena', torch: 'Antorcha',
            craftPlank: 'Madera → Tabla ×4', material: 'Material',
            noBlock: 'Sin bloque', cantBreak: 'No se puede romper',brick: 'Ladrillo'


        },
        ru: {
            pause: 'Пауза', resume: 'Продолжить', settings: 'Настройки', save: 'Сохранить', load: 'Загрузить',
            newWorld: 'Новый мир', language: 'Язык',
            worldType: 'Тип мира', time: 'Время', weather: 'Погода',
            renderDist: 'Дальность', brightness: 'Яркость', speed: 'Скорость',
            hd: 'HD Рендер (медленно)', fly: 'Полёт', spectator: 'Наблюдатель (Рентген)',
            close: 'Закрыть', applyWorld: 'Применить (Сброс)',
            normal: 'Обычный', flat: 'Плоский', forest: 'Лес', plains: 'Равнина', desert: 'Пустыня',
            cycle: 'Цикл', day: 'День', night: 'Ночь',
            auto: 'Авто', clear: 'Ясно', rain: 'Дождь', snow: 'Снег', sandstorm: 'Буря',
            inventory: 'Инвентарь', craft: 'Крафт', jump: 'Прыжок',
            saved: 'Сохранено', loaded: 'Загружено', newWorldGenerated: 'Мир создан',
            confirmReset: 'Создать новый мир? Прогресс будет потерян.',
            grass: 'Трава', dirt: 'Земля', stone: 'Камень', wood: 'Бревно',
            plank: 'Доска', leaves: 'Листья', sandBlock: 'Песок', torch: 'Факел',
            craftPlank: 'Бревно → Доска ×4', material: 'Материал',
            noBlock: 'Нет блока', cantBreak: 'Нельзя сломать' ,brick: 'Кирпич',
        }
    };

    const STORAGE_KEY = 'mc_lang';
    let current = localStorage.getItem(STORAGE_KEY) || 'zh_cn';
    if (!I18N[current]) current = 'en';

    const Lang = {
        // 所有语言列表
        list: Object.keys(I18N),
        // 获取当前语言
        get() { return current; },
        // 切换语言
        set(code) {
            if (!I18N[code]) return false;
            current = code;
            try { localStorage.setItem(STORAGE_KEY, code); } catch (e) {}
            return true;
        },
        // 翻译
        t(key) {
            return (I18N[current] && I18N[current][key]) || I18N.en[key] || key;
        },
        // 获取所有翻译（供 UI 刷新用）
        all() { return I18N[current] || I18N.en; },
        // 语言名（用于下拉框）
        getName(code) {
            const names = {
                zh_cn: '简体中文',
                zh_tw: '繁體中文',
                en: 'English',
                es: 'Español',
                ru: 'Русский'
            };
            return names[code] || code;
        }
    };

    global.MC_LANG = Lang;
    global.t = Lang.t.bind(Lang);
})(window);