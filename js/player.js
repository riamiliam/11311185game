/**
 * 玩家角色模組 (狀態控制、物理運動、碰撞偵測與繪製)
 */
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    MAX_HP,
    GRAVITY,
    PLAYER_SPEED,
    PLATFORM_TYPES,
    CEILING_DANGER_Y
} from './config.js';
import { sfx } from './audio.js';
import { createParticles } from './enemy.js';

export class Player {
    constructor() {
        this.reset();
    }

    reset() {
        this.width = 28;
        this.height = 32;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = 80;
        this.vx = 0;
        this.vy = 0;
        this.hp = MAX_HP;
        this.isGrounded = false;
        this.invulnerableTimer = 0;
        this.facingRight = true;
        this.blinkFrame = 0;
        this.lastTouchedPlatform = null;
    }

    update(keys, platforms, callbacks) {
        const { onScoreIncrease, onHpChange, onGameOver } = callbacks;

        // 水平操控
        if (keys.left) {
            this.vx = -PLAYER_SPEED;
            this.facingRight = false;
        } else if (keys.right) {
            this.vx = PLAYER_SPEED;
            this.facingRight = true;
        } else {
            this.vx *= 0.7; // 磨擦減速
        }

        this.x += this.vx;

        // 左右螢幕邊緣碰撞限制
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > GAME_WIDTH) this.x = GAME_WIDTH - this.width;

        // 重力物理加速度
        this.vy += GRAVITY;
        this.y += this.vy;

        // 受傷無敵倒數
        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer--;
        }

        // 平台碰撞檢測
        this.isGrounded = false;

        for (let i = 0; i < platforms.length; i++) {
            const plat = platforms[i];
            if (plat.isBroken) continue;

            // 腳底接觸判定 (自上方落下)
            if (
                this.vy >= 0 &&
                this.x + this.width > plat.x + 4 &&
                this.x < plat.x + plat.width - 4 &&
                this.y + this.height >= plat.y &&
                this.y + this.height <= plat.y + plat.height + this.vy
            ) {
                this.y = plat.y - this.height;
                this.vy = 0;
                this.isGrounded = true;

                // 首次接觸新平台計分
                if (this.lastTouchedPlatform !== plat) {
                    this.lastTouchedPlatform = plat;
                    if (!plat.touched) {
                        plat.touched = true;
                        if (onScoreIncrease) onScoreIncrease();
                    }
                }

                // 處理平台特殊機制
                switch (plat.type) {
                    case PLATFORM_TYPES.NORMAL:
                        if (!plat.soundPlayed) {
                            sfx.playLand();
                            plat.soundPlayed = true;
                        }
                        // 普通樓梯機率恢復 1 點生命值
                        if (this.hp < MAX_HP && Math.random() < 0.1) {
                            this.hp = Math.min(MAX_HP, this.hp + 1);
                            createParticles(this.x + this.width / 2, this.y, '#22c55e', 5);
                            if (onHpChange) onHpChange(this.hp);
                        }
                        break;

                    case PLATFORM_TYPES.SPIKE:
                        if (this.invulnerableTimer === 0) {
                            this.hp -= 3;
                            this.invulnerableTimer = 30; // 無敵幀
                            sfx.playSpike();
                            createParticles(this.x + this.width / 2, this.y + this.height, '#ef4444', 10);
                            if (onHpChange) onHpChange(this.hp);
                            if (this.hp <= 0) {
                                if (onGameOver) onGameOver("踩到尖刺樓梯受傷過重！");
                                return;
                            }
                        }
                        break;

                    case PLATFORM_TYPES.CONVEYOR_LEFT:
                        this.x -= 2.2;
                        break;

                    case PLATFORM_TYPES.CONVEYOR_RIGHT:
                        this.x += 2.2;
                        break;

                    case PLATFORM_TYPES.TRAMPOLINE:
                        this.vy = -10.5; // 超級高跳
                        sfx.playSpring();
                        createParticles(plat.x + plat.width / 2, plat.y, '#34d399', 8);
                        break;

                    case PLATFORM_TYPES.FRAGILE:
                        // 碎裂計時於 platform.update 進行
                        break;
                }
            }
        }

        // 天花板尖刺碰撞偵測
        if (this.y <= CEILING_DANGER_Y) {
            this.y = CEILING_DANGER_Y;
            this.vy = 1;
            if (this.invulnerableTimer === 0) {
                this.hp -= 4;
                this.invulnerableTimer = 25;
                sfx.playSpike();
                createParticles(this.x + this.width / 2, this.y, '#ef4444', 12);
                if (onHpChange) onHpChange(this.hp);
                if (this.hp <= 0) {
                    if (onGameOver) onGameOver("被頂部的尖刺刺傷了！");
                    return;
                }
            }
        }

        // 摔出螢幕底部判定
        if (this.y > GAME_HEIGHT) {
            sfx.playGameOver();
            if (onGameOver) onGameOver("跌落地下深淵！");
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 受傷閃爍效果
        if (this.invulnerableTimer > 0 && Math.floor(this.invulnerableTimer / 4) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 左右翻轉鏡像
        if (!this.facingRight) {
            ctx.scale(-1, 1);
        }

        // 身體 (黃色 Q 版主角)
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.roundRect(-12, -12, 24, 26, 8);
        ctx.fill();

        // 紅色棒球帽
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(0, -10, 12, Math.PI, 0);
        ctx.fill();
        // 帽沿
        ctx.fillRect(0, -12, 14, 4);

        // 眼睛
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(4, -3, 2.5, 0, Math.PI * 2);
        ctx.arc(-4, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 腮紅
        ctx.fillStyle = '#f87171';
        ctx.beginPath();
        ctx.arc(7, 2, 2, 0, Math.PI * 2);
        ctx.arc(-7, 2, 2, 0, Math.PI * 2);
        ctx.fill();

        // 嘴巴
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (this.vy < 0) {
            // 跳躍時開口笑
            ctx.arc(0, 4, 3, 0, Math.PI);
        } else {
            // 平常微笑
            ctx.arc(0, 3, 4, 0.2, Math.PI - 0.2);
        }
        ctx.stroke();

        // 鞋子
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(-10, 12, 8, 5);
        ctx.fillRect(2, 12, 8, 5);

        ctx.restore();
    }
}
