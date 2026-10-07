/**
 * 玩家角色模組 (狀態控制、物理運動、碰撞偵測與繪製)
 */
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    INITIAL_MAX_HP,
    HP_PER_HEART,
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
        this.maxHp = INITIAL_MAX_HP;
        this.hp = this.maxHp;
        this.isGrounded = false;
        this.previouslyGrounded = false;
        this.currentPlatform = null;
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
        const wasInAir = !this.previouslyGrounded;
        this.isGrounded = false;
        this.currentPlatform = null;

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
                this.currentPlatform = plat;

                // 首次落到方塊時播放踩地板聲音 (彈跳格與易碎格除外，易碎格完全安靜無聲)
                if (wasInAir && plat.type !== PLATFORM_TYPES.TRAMPOLINE && plat.type !== PLATFORM_TYPES.FRAGILE) {
                    sfx.playLand();
                }

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
                        // 普通樓梯機率恢復 1 點生命值
                        if (this.hp < this.maxHp && Math.random() < 0.1) {
                            this.hp = Math.min(this.maxHp, this.hp + 1);
                            createParticles(this.x + this.width / 2, this.y, '#22c55e', 5);
                            if (onHpChange) onHpChange(this.hp);
                        }
                        break;

                    case PLATFORM_TYPES.SPIKE:
                        if (this.invulnerableTimer === 0) {
                            this.hp -= 3;
                            this.invulnerableTimer = 30; // 無敵幀
                            sfx.playBleed(); // 尖刺流血受傷音效
                            createParticles(this.x + this.width / 2, this.y + this.height, '#ef4444', 12);
                            if (onHpChange) onHpChange(this.hp);
                            if (this.hp <= 0) {
                                if (onGameOver) onGameOver("踩到尖刺樓梯流血過多！");
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
                        sfx.playSpring(); // 彈跳格彈簧音效
                        createParticles(plat.x + plat.width / 2, plat.y, '#34d399', 8);
                        break;

                    case PLATFORM_TYPES.FRAGILE:
                        // 碎裂計時於 platform.update 進行，碎裂時播放 sfx.playShatter()
                        break;
                }
            }
        }

        this.previouslyGrounded = this.isGrounded;

        // 天花板尖刺碰撞偵測
        if (this.y <= CEILING_DANGER_Y) {
            this.y = CEILING_DANGER_Y;
            this.vy = 1;
            if (this.invulnerableTimer === 0) {
                this.hp -= 4;
                this.invulnerableTimer = 25;
                sfx.playBleed(); // 天花板尖刺割傷流血音效
                createParticles(this.x + this.width / 2, this.y, '#ef4444', 14);
                if (onHpChange) onHpChange(this.hp);
                if (this.hp <= 0) {
                    if (onGameOver) onGameOver("被頂部的尖刺刺傷流血身亡！");
                    return;
                }
            }
        }

        // 摔出螢幕底部判定
        if (this.y > GAME_HEIGHT) {
            if (onGameOver) onGameOver("跌落地下深淵！");
        }
    }

    /**
     * 受到外在傷害 (如魔王火球)
     */
    takeDamage(amount, reason, callbacks) {
        if (this.invulnerableTimer > 0) return false;
        const { onHpChange, onGameOver } = callbacks;
        this.hp -= amount;
        this.invulnerableTimer = 34; // 受傷無敵幀
        sfx.playBleed();

        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#ef4444', 14);
        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#f97316', 10);

        if (onHpChange) onHpChange(this.hp);
        if (this.hp <= 0) {
            if (onGameOver) onGameOver(reason || "受到過多傷害陣亡！");
        }
        return true;
    }

    /**
     * 擊敗魔王獎勵：生命值上限永久加一顆愛心 (3 HP) 並補滿生命值
     */
    increaseMaxHeart(hpAmount = HP_PER_HEART) {
        this.maxHp += hpAmount;
        this.hp = this.maxHp; // 補滿生命值
        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#f43f5e', 24);
        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#facc15', 18);
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
