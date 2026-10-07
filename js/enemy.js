/**
 * 障礙物與樓梯平台生成、動畫與粒子系統模組
 */
import { PLATFORM_TYPES, GAME_WIDTH, GAME_HEIGHT } from './config.js';
import { sfx } from './audio.js';

// 粒子池
let particles = [];

export function getParticles() {
    return particles;
}

export function resetParticles() {
    particles = [];
}

export function createParticles(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            radius: Math.random() * 3 + 2,
            color: color,
            life: 20
        });
    }
}

export function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

export function drawParticles(ctx) {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life / 20;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

/**
 * 樓梯/障礙物平台類別
 */
export class Platform {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 90;
        this.height = 16;
        this.type = type;
        this.touched = false;
        this.crumbleTimer = 0; // 易碎樓梯倒數
        this.isBroken = false;
        this.animFrame = 0; // 輸送帶與彈簧動畫計時
        this.soundPlayed = false;
    }

    update(scrollSpeed) {
        this.y -= scrollSpeed;
        this.animFrame += 0.2;

        if (this.type === PLATFORM_TYPES.FRAGILE && this.touched) {
            this.crumbleTimer++;
            if (this.crumbleTimer > 15) {
                this.isBroken = true;
                createParticles(this.x + this.width / 2, this.y + this.height / 2, '#d97706', 12);
            }
        }
    }

    draw(ctx) {
        if (this.isBroken) return;

        ctx.save();
        switch (this.type) {
            case PLATFORM_TYPES.NORMAL: {
                // 普通藍色樓梯
                const gradNorm = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
                gradNorm.addColorStop(0, '#38bdf8');
                gradNorm.addColorStop(1, '#0284c7');
                ctx.fillStyle = gradNorm;
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 6);
                ctx.fill();
                ctx.strokeStyle = '#e0f2fe';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                break;
            }

            case PLATFORM_TYPES.SPIKE: {
                // 尖刺危險平台
                ctx.fillStyle = '#64748b';
                ctx.fillRect(this.x, this.y + 6, this.width, this.height - 6);
                ctx.fillStyle = '#ef4444';
                const spikeCount = 6;
                const spikeWidth = this.width / spikeCount;
                for (let i = 0; i < spikeCount; i++) {
                    ctx.beginPath();
                    ctx.moveTo(this.x + i * spikeWidth, this.y + 6);
                    ctx.lineTo(this.x + (i + 0.5) * spikeWidth, this.y - 2);
                    ctx.lineTo(this.x + (i + 1) * spikeWidth, this.y + 6);
                    ctx.fill();
                }
                break;
            }

            case PLATFORM_TYPES.CONVEYOR_LEFT:
            case PLATFORM_TYPES.CONVEYOR_RIGHT: {
                // 輸送帶平台
                const gradConv = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
                gradConv.addColorStop(0, '#f59e0b');
                gradConv.addColorStop(1, '#b45309');
                ctx.fillStyle = gradConv;
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 8);
                ctx.fill();

                // 滾輪動畫
                ctx.fillStyle = '#fef3c7';
                const isLeft = this.type === PLATFORM_TYPES.CONVEYOR_LEFT;
                const dir = isLeft ? -1 : 1;
                const offset = (this.animFrame * 3 * dir) % 15;
                for (let rx = 6; rx < this.width - 6; rx += 15) {
                    const drawX = this.x + rx + offset;
                    if (drawX > this.x + 4 && drawX < this.x + this.width - 6) {
                        ctx.beginPath();
                        ctx.arc(drawX, this.y + this.height / 2, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                // 方向箭頭
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px sans-serif';
                ctx.fillText(isLeft ? '◄◄◄' : '►►►', this.x + this.width / 2 - 12, this.y + 12);
                break;
            }

            case PLATFORM_TYPES.TRAMPOLINE: {
                // 彈簧/彈跳床平台
                ctx.fillStyle = '#10b981';
                ctx.beginPath();
                ctx.roundRect(this.x, this.y + 6, this.width, this.height - 6, 4);
                ctx.fill();

                // 彈簧頂板
                ctx.fillStyle = '#34d399';
                const springY = this.touched ? this.y + 4 : this.y;
                ctx.fillRect(this.x + 10, springY, this.width - 20, 6);

                // 彈簧圈
                ctx.strokeStyle = '#047857';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(this.x + 20, springY + 6);
                ctx.lineTo(this.x + this.width - 20, this.y + this.height - 2);
                ctx.stroke();
                break;
            }

            case PLATFORM_TYPES.FRAGILE: {
                // 易碎木質平台
                if (this.touched) {
                    ctx.fillStyle = '#f97316'; // 踩中警告色
                } else {
                    ctx.fillStyle = '#d97706';
                }
                ctx.beginPath();
                ctx.roundRect(this.x, this.y, this.width, this.height, 4);
                ctx.fill();

                // 裂紋細節
                ctx.strokeStyle = '#78350f';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.moveTo(this.x + 15, this.y + 2);
                ctx.lineTo(this.x + 35, this.y + 14);
                ctx.lineTo(this.x + 65, this.y + 4);
                ctx.stroke();
                break;
            }
        }
        ctx.restore();
    }
}

/**
 * 頂部尖刺障礙繪製
 */
export function drawCeilingSpikes(ctx, width = GAME_WIDTH) {
    ctx.save();
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    const spikeWidth = 20;
    const count = Math.ceil(width / spikeWidth);

    for (let i = 0; i < count; i++) {
        ctx.beginPath();
        ctx.moveTo(i * spikeWidth, 0);
        ctx.lineTo((i + 0.5) * spikeWidth, 22);
        ctx.lineTo((i + 1) * spikeWidth, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

/**
 * 隨機取得下一座樓梯平台種類
 */
export function getRandomPlatformType() {
    const rand = Math.random();
    if (rand < 0.45) return PLATFORM_TYPES.NORMAL;
    if (rand < 0.60) return PLATFORM_TYPES.SPIKE;
    if (rand < 0.75) return PLATFORM_TYPES.CONVEYOR_LEFT;
    if (rand < 0.85) return PLATFORM_TYPES.CONVEYOR_RIGHT;
    if (rand < 0.93) return PLATFORM_TYPES.TRAMPOLINE;
    return PLATFORM_TYPES.FRAGILE;
}

/**
 * 建立遊戲初始樓梯群
 */
export function generateInitialPlatforms(gameWidth = GAME_WIDTH, gameHeight = GAME_HEIGHT) {
    const platforms = [];
    // 第一個穩定平台直接置於玩家正下方
    const p1 = new Platform(gameWidth / 2 - 45, 180, PLATFORM_TYPES.NORMAL);
    platforms.push(p1);

    let currentY = 180;
    while (currentY < gameHeight + 100) {
        currentY += 70 + Math.random() * 20;
        const x = Math.random() * (gameWidth - 90);
        const type = getRandomPlatformType();
        platforms.push(new Platform(x, currentY, type));
    }
    return platforms;
}

/**
 * 動態補足下方新產生的樓梯
 */
export function spawnNewPlatforms(platforms, gameWidth = GAME_WIDTH, gameHeight = GAME_HEIGHT) {
    const lastPlatform = platforms[platforms.length - 1];
    if (lastPlatform && lastPlatform.y < gameHeight) {
        const nextY = lastPlatform.y + 70 + Math.random() * 20;
        const x = Math.max(10, Math.min(gameWidth - 100, Math.random() * (gameWidth - 90)));
        const type = getRandomPlatformType();
        const plat = new Platform(x, nextY, type);
        platforms.push(plat);
        return plat;
    }
    return null;
}
