/**
 * 遊戲設定與常數配置
 */

// 內部邏輯畫布尺寸 (解析度)
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 500;

// 平台/障礙物類型
export const PLATFORM_TYPES = {
    NORMAL: 'normal',
    SPIKE: 'spike',
    CONVEYOR_LEFT: 'conveyor_left',
    CONVEYOR_RIGHT: 'conveyor_right',
    TRAMPOLINE: 'trampoline',
    FRAGILE: 'fragile'
};

// 玩家與遊戲數值設定
export const MAX_HP = 12;
export const INITIAL_SPEED = 1.8;
export const MAX_SPEED = 4.5;
export const GRAVITY = 0.42;
export const PLAYER_SPEED = 4.2;

// 天花板尖刺高度
export const CEILING_SPIKE_HEIGHT = 22;
export const CEILING_DANGER_Y = 20;

// 本地存儲鍵名
export const STORAGE_KEY_HIGH_SCORE = 'nsshaft_high_score';

// 魔王與戰鬥系統設定
export const BOSS_FLOOR_INTERVAL = 50;  // 每 50 階出現一次魔王
export const BOSS_MAX_HP = 5;           // 魔王 5 格血量 (被攻擊 5 次死亡)
export const BOSS_ATTACK_COOLDOWN = 110; // 魔王火球投擲頻率 (幀數)
