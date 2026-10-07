/**
 * 魔王 Boss、火球投擲、平台武器與雷射特效模組
 */
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    BOSS_MAX_HP,
    BOSS_ATTACK_COOLDOWN
} from './config.js';
import { sfx } from './audio.js';
import { createParticles } from './enemy.js';

/**
 * 追蹤火球子彈類別
 */
export class Fireball {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.speed = 3.2;
        this.isDead = false;
        this.animTimer = 0;

        // 計算朝向目標的方向向量
        const dx = targetX - x;
        const dy = targetY - y;
        const dist = Math.hypot(dx, dy) || 1;
        this.vx = (dx / dist) * this.speed;
        this.vy = Math.max(1.5, (dy / dist) * this.speed); // 確保往下墜落衝擊
    }

    update() {
        this.animTimer += 0.2;
        this.x += this.vx;
        this.y += this.vy;

        // 火球尾跡粒子
        if (Math.random() < 0.6) {
            createParticles(
                this.x + (Math.random() - 0.5) * 6,
                this.y + (Math.random() - 0.5) * 6,
                Math.random() < 0.5 ? '#f97316' : '#ef4444',
                2
            );
        }

        // 超出畫布邊界即消失
        if (
            this.x < -20 ||
            this.x > GAME_WIDTH + 20 ||
            this.y > GAME_HEIGHT + 20
        ) {
            this.isDead = true;
        }
    }

    draw(ctx) {
        ctx.save();
        // 外層熾熱光暈
        const grad = ctx.createRadialGradient(this.x, this.y, 2, this.x, this.y, this.radius + 6);
        grad.addColorStop(0, '#fef08a'); // 核心黃白光
        grad.addColorStop(0.4, '#f97316'); // 橘紅火焰
        grad.addColorStop(0.8, '#dc2626'); // 深紅烈焰
        grad.addColorStop(1, 'rgba(220, 38, 38, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
        ctx.fill();

        // 核心旋轉火球紋理
        ctx.fillStyle = '#fff7ed';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.55, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * 平台上生成的雷射武器道具
 */
export class WeaponItem {
    constructor(platform) {
        this.platform = platform;
        this.width = 24;
        this.height = 24;
        this.x = platform.x + platform.width / 2 - this.width / 2;
        this.y = platform.y - this.height - 4;
        this.isCollected = false;
        this.floatAngle = Math.random() * Math.PI * 2;
    }

    update(scrollSpeed) {
        this.floatAngle += 0.08;
        // 跟隨所屬平台捲動
        this.x = this.platform.x + this.platform.width / 2 - this.width / 2;
        this.y = this.platform.y - this.height - 4 + Math.sin(this.floatAngle) * 3;

        // 若平台損毀或捲出畫面，武器自動消失
        if (this.platform.isBroken || this.platform.y < -30) {
            this.isCollected = true;
        }
    }

    draw(ctx) {
        if (this.isCollected) return;

        ctx.save();
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // 外層旋轉神聖能量光暈
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.floatAngle);

        const auraGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 16);
        auraGrad.addColorStop(0, 'rgba(56, 189, 248, 0.9)');
        auraGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.4)');
        auraGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        // 四角菱形能量晶石符文
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(0, -11);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 11);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();

        // 晶石核心亮點
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 標籤提示文字
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡武器', centerX, this.y - 4);

        ctx.restore();
    }
}

/**
 * 玩家拾取武器時激發的雷射貫穿特效
 */
export class LaserBeam {
    constructor(startX, startY, targetX, targetY) {
        this.startX = startX;
        this.startY = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.life = 16;
        this.maxLife = 16;
    }

    update() {
        this.life--;
    }

    get isDead() {
        return this.life <= 0;
    }

    draw(ctx) {
        const progress = this.life / this.maxLife; // 1 -> 0
        ctx.save();

        // 1. 外圍發光雷射光柱
        ctx.strokeStyle = `rgba(56, 189, 248, ${progress * 0.8})`;
        ctx.lineWidth = 14 * progress;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(this.targetX, this.targetY);
        ctx.stroke();

        // 2. 核心超亮白光雷射線
        ctx.strokeStyle = `rgba(255, 255, 255, ${progress})`;
        ctx.lineWidth = 6 * progress;
        ctx.beginPath();
        ctx.moveTo(this.startX, this.startY);
        ctx.lineTo(this.targetX, this.targetY);
        ctx.stroke();

        // 3. 發射源 (玩家身上) 衝擊環
        ctx.fillStyle = `rgba(125, 211, 252, ${progress * 0.7})`;
        ctx.beginPath();
        ctx.arc(this.startX, this.startY, 16 * (1 - progress) + 4, 0, Math.PI * 2);
        ctx.fill();

        // 4. 擊中點 (魔王身上) 巨大雷射爆裂光
        ctx.fillStyle = `rgba(254, 240, 138, ${progress})`;
        ctx.beginPath();
        ctx.arc(this.targetX, this.targetY, 20 * (1 - progress) + 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

/**
 * 魔王 Boss 主體實體
 */
export class Boss {
    constructor(floorNumber) {
        this.floor = floorNumber;
        this.width = 68;
        this.height = 56;
        this.x = GAME_WIDTH / 2 - this.width / 2;
        this.y = -70; // 從螢幕頂端華麗降臨
        this.targetY = 62;
        this.hp = BOSS_MAX_HP; // 5 格血量
        this.maxHp = BOSS_MAX_HP;

        this.state = 'entering'; // 'entering' | 'fighting' | 'defeated'
        this.vx = 1.4;
        this.hoverTime = 0;
        this.attackCooldown = 70; // 剛進入時稍等一下才發動攻擊
        this.hurtTimer = 0;
        this.defeatedTimer = 0;
        this.wingAngle = 0;

        // 火球彈幕陣列
        this.fireballs = [];

        // 播放魔王降臨咆哮音效
        sfx.playBossSpawn();
        sfx.setBgmBossMode(true);
    }

    takeDamage(amount = 1) {
        if (this.state !== 'fighting') return;

        this.hp = Math.max(0, this.hp - amount);
        this.hurtTimer = 16;
        sfx.playBossHit();

        // 受到雷射擊中的四散火花粒子
        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#38bdf8', 16);
        createParticles(this.x + this.width / 2, this.y + this.height / 2, '#facc15', 12);

        if (this.hp <= 0) {
            this.state = 'defeated';
            this.defeatedTimer = 50;
            sfx.playBossDefeat();
            sfx.setBgmBossMode(false);
            // 爆破大量彩色粒子
            createParticles(this.x + this.width / 2, this.y + this.height / 2, '#ef4444', 25);
            createParticles(this.x + this.width / 2, this.y + this.height / 2, '#fbbf24', 25);
        }
    }

    update(player) {
        this.hoverTime += 0.05;
        this.wingAngle = Math.sin(this.hoverTime * 3) * 0.45;

        // 受傷閃爍倒數
        if (this.hurtTimer > 0) {
            this.hurtTimer--;
        }

        // 1. 降臨動畫
        if (this.state === 'entering') {
            this.y += (this.targetY - this.y) * 0.08;
            if (Math.abs(this.y - this.targetY) < 1.5) {
                this.y = this.targetY;
                this.state = 'fighting';
            }
        }

        // 2. 戰鬥移動與火球投擲
        else if (this.state === 'fighting') {
            // 水平左右巡弋飛行
            this.x += this.vx;
            if (this.x <= 20) {
                this.x = 20;
                this.vx = Math.abs(this.vx);
            } else if (this.x + this.width >= GAME_WIDTH - 20) {
                this.x = GAME_WIDTH - 20 - this.width;
                this.vx = -Math.abs(this.vx);
            }

            // 垂直輕微浮動
            this.y = this.targetY + Math.sin(this.hoverTime) * 6;

            // 火球冷卻計時
            this.attackCooldown--;
            if (this.attackCooldown <= 0) {
                this.attackCooldown = BOSS_ATTACK_COOLDOWN;
                // 投擲火球攻擊玩家
                const fb = new Fireball(
                    this.x + this.width / 2,
                    this.y + this.height - 4,
                    player.x + player.width / 2,
                    player.y + player.height / 2
                );
                this.fireballs.push(fb);
                sfx.playFireball();
            }
        }

        // 3. 被擊敗消散動畫
        else if (this.state === 'defeated') {
            this.defeatedTimer--;
            this.y -= 0.5; // 升空爆炸
            if (Math.random() < 0.6) {
                createParticles(
                    this.x + Math.random() * this.width,
                    this.y + Math.random() * this.height,
                    Math.random() < 0.5 ? '#f97316' : '#facc15',
                    4
                );
            }
        }

        // 更新火球子彈
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.update();
            if (fb.isDead) {
                this.fireballs.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        if (this.state === 'defeated' && this.defeatedTimer <= 0) return;

        // 繪製火球
        this.fireballs.forEach(fb => fb.draw(ctx));

        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);

        // 受傷閃爍與擊敗淡出
        if (this.hurtTimer > 0 && Math.floor(this.hurtTimer / 3) % 2 === 0) {
            ctx.filter = 'brightness(2.5)';
        }
        if (this.state === 'defeated') {
            ctx.globalAlpha = Math.max(0, this.defeatedTimer / 50);
        }

        // 1. 繪製魔王翅膀 (左右對稱雙翼)
        ctx.fillStyle = '#7f1d1d'; // 暗紅翼膜
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 2;

        // 左翼
        ctx.save();
        ctx.translate(-18, -4);
        ctx.rotate(-this.wingAngle - 0.2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-26, -22, -38, -6);
        ctx.quadraticCurveTo(-26, 12, 0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // 右翼
        ctx.save();
        ctx.translate(18, -4);
        ctx.rotate(this.wingAngle + 0.2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(26, -22, 38, -6);
        ctx.quadraticCurveTo(26, 12, 0, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // 2. 魔王身體主體 (惡魔龍/霸氣頭盔外型)
        const bodyGrad = ctx.createLinearGradient(0, -22, 0, 22);
        bodyGrad.addColorStop(0, '#dc2626'); // 熾焰鮮紅
        bodyGrad.addColorStop(1, '#7f1d1d'); // 深紅暗影
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.roundRect(-22, -20, 44, 42, 12);
        ctx.fill();

        // 身體外框
        ctx.strokeStyle = '#450a0a';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // 3. 頭頂惡魔雙角 (霸氣金色倒角)
        ctx.fillStyle = '#f59e0b';
        // 左角
        ctx.beginPath();
        ctx.moveTo(-14, -18);
        ctx.lineTo(-24, -36);
        ctx.lineTo(-7, -20);
        ctx.closePath();
        ctx.fill();
        // 右角
        ctx.beginPath();
        ctx.moveTo(14, -18);
        ctx.lineTo(24, -36);
        ctx.lineTo(7, -20);
        ctx.closePath();
        ctx.fill();

        // 4. 魔王雙眼 (燃燒發光的赤瞳)
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(-8, -5, 5, 3.5, -0.15, 0, Math.PI * 2);
        ctx.ellipse(8, -5, 5, 3.5, 0.15, 0, Math.PI * 2);
        ctx.fill();

        // 瞳孔
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(-8, -5, 2, 0, Math.PI * 2);
        ctx.arc(8, -5, 2, 0, Math.PI * 2);
        ctx.fill();

        // 5. 尖銳利齒 / 獰笑
        ctx.fillStyle = '#fef3c7';
        ctx.beginPath();
        ctx.moveTo(-10, 7);
        ctx.lineTo(-7, 13);
        ctx.lineTo(-4, 7);
        ctx.lineTo(0, 14);
        ctx.lineTo(4, 7);
        ctx.lineTo(7, 13);
        ctx.lineTo(10, 7);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // 6. 魔王頂部血量條 (清晰 5 格 HP 顯示)
        this.drawBossHpBar(ctx);
    }

    drawBossHpBar(ctx) {
        const barWidth = 120;
        const barHeight = 10;
        const barX = GAME_WIDTH / 2 - barWidth / 2;
        const barY = 28;

        ctx.save();
        // 標題字體
        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#f87171';
        ctx.textAlign = 'center';
        ctx.fillText(`🔥 深淵魔王 (B${this.floor}) 🔥`, GAME_WIDTH / 2, barY - 4);

        // 外框底色
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
        ctx.fill();
        ctx.stroke();

        // 5 格分段生命值繪製
        const segmentGap = 2;
        const totalSegments = this.maxHp;
        const segWidth = (barWidth - 4 - (totalSegments - 1) * segmentGap) / totalSegments;

        for (let i = 0; i < totalSegments; i++) {
            const segX = barX + 2 + i * (segWidth + segmentGap);
            const segY = barY + 2;

            if (i < this.hp) {
                // 存活血格 (鮮紅亮光漸層)
                const segGrad = ctx.createLinearGradient(segX, segY, segX, segY + barHeight - 4);
                segGrad.addColorStop(0, '#f87171');
                segGrad.addColorStop(1, '#dc2626');
                ctx.fillStyle = segGrad;
            } else {
                // 扣損血格
                ctx.fillStyle = 'rgba(51, 65, 85, 0.7)';
            }

            ctx.fillRect(segX, segY, segWidth, barHeight - 4);
        }

        ctx.restore();
    }
}
