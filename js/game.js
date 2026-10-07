/**
 * 遊戲主循環與狀態管理模組
 */
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    INITIAL_SPEED,
    MAX_SPEED,
    MAX_HP,
    STORAGE_KEY_HIGH_SCORE,
    BOSS_FLOOR_INTERVAL
} from './config.js';
import { sfx } from './audio.js';
import {
    generateInitialPlatforms,
    spawnNewPlatforms,
    drawCeilingSpikes,
    updateParticles,
    drawParticles,
    resetParticles
} from './enemy.js';
import { Player } from './player.js';
import { Boss, WeaponItem, LaserBeam } from './boss.js';

export class GameManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;

        // 狀態變數
        this.isRunning = false;
        this.isGameOver = false;
        this.currentScore = 1;
        this.highScore = parseInt(localStorage.getItem(STORAGE_KEY_HIGH_SCORE) || '1', 10);
        this.scrollSpeed = INITIAL_SPEED;
        this.gameTime = 0;
        this.animationFrameId = null;

        // 控制鍵盤
        this.keys = { left: false, right: false };

        // 實體
        this.player = new Player();
        this.platforms = [];

        // 魔王與戰鬥系統
        this.boss = null;
        this.weapons = [];
        this.lasers = [];
        this.nextBossFloor = BOSS_FLOOR_INTERVAL; // 每 50 階
        this.bossWarningTimer = 0;
        this.bossVictoryTimer = 0;
        this.screenShake = 0;

        // DOM 元素快取
        this.dom = {};
    }

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 設定邏輯畫布尺寸
        this.canvas.width = GAME_WIDTH;
        this.canvas.height = GAME_HEIGHT;

        // 快取 DOM 元素
        this.dom.floorCount = document.getElementById('floorCount');
        this.dom.highScoreText = document.getElementById('highScoreText');
        this.dom.hpContainer = document.getElementById('hpContainer');
        this.dom.startOverlay = document.getElementById('startOverlay');
        this.dom.gameOverOverlay = document.getElementById('gameOverOverlay');
        this.dom.causeOfDeathText = document.getElementById('causeOfDeathText');
        this.dom.finalScore = document.getElementById('finalScore');
        this.dom.finalHighScore = document.getElementById('finalHighScore');

        this.updateHUD();
    }

    startGame() {
        sfx.init();
        sfx.startBgm();

        this.isRunning = true;
        this.isGameOver = false;
        this.currentScore = 1;
        this.gameTime = 0;
        this.scrollSpeed = INITIAL_SPEED;

        this.player.reset();
        resetParticles();

        // 重置魔王戰鬥實體
        this.boss = null;
        this.weapons = [];
        this.lasers = [];
        this.nextBossFloor = BOSS_FLOOR_INTERVAL;
        this.bossWarningTimer = 0;
        this.bossVictoryTimer = 0;
        this.screenShake = 0;

        this.platforms = generateInitialPlatforms(GAME_WIDTH, GAME_HEIGHT);
        this.updateHUD();

        this.dom.startOverlay.classList.add('hidden');
        this.dom.gameOverOverlay.classList.add('hidden');

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.gameLoop = this.gameLoop.bind(this);
        this.animationFrameId = requestAnimationFrame(this.gameLoop);
    }

    triggerGameOver(reason) {
        this.isRunning = false;
        this.isGameOver = true;
        sfx.stopBgm();
        sfx.playGameOver();

        if (this.dom.causeOfDeathText) {
            this.dom.causeOfDeathText.innerText = reason;
        }
        if (this.dom.finalScore) {
            this.dom.finalScore.innerText = `B${this.currentScore} 階`;
        }
        if (this.dom.finalHighScore) {
            this.dom.finalHighScore.innerText = `B${this.highScore} 階`;
        }
        if (this.dom.gameOverOverlay) {
            this.dom.gameOverOverlay.classList.remove('hidden');
        }
    }

    updateHUD() {
        // 更新當前樓層
        if (this.dom.floorCount) {
            this.dom.floorCount.innerText = `B${this.currentScore}`;
        }

        // 更新最高紀錄
        if (this.currentScore > this.highScore) {
            this.highScore = this.currentScore;
            localStorage.setItem(STORAGE_KEY_HIGH_SCORE, this.highScore);
        }
        if (this.dom.highScoreText) {
            this.dom.highScoreText.innerText = `B${this.highScore}`;
        }

        // 更新愛心 HP
        if (this.dom.hpContainer) {
            this.dom.hpContainer.innerHTML = '';
            const totalHearts = 4; // 每顆心 = 3 HP
            const activeHearts = Math.ceil(this.player.hp / 3);

            for (let i = 0; i < totalHearts; i++) {
                const heart = document.createElement('span');
                heart.className = 'text-lg sm:text-xl transition-all duration-300';
                if (i < activeHearts) {
                    heart.innerText = '❤️';
                } else {
                    heart.innerText = '🖤';
                    heart.style.opacity = '0.4';
                }
                this.dom.hpContainer.appendChild(heart);
            }
        }
    }

    gameLoop() {
        if (!this.isRunning) return;

        // 螢幕震動計算
        let shakeX = 0;
        let shakeY = 0;
        if (this.screenShake > 0) {
            shakeX = (Math.random() - 0.5) * this.screenShake;
            shakeY = (Math.random() - 0.5) * this.screenShake;
            this.screenShake *= 0.88;
            if (this.screenShake < 0.4) this.screenShake = 0;
        }

        this.ctx.save();
        this.ctx.translate(shakeX, shakeY);

        // 清理畫面
        this.ctx.fillStyle = '#0f172a';
        this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // 漸進式提升捲動速度
        this.gameTime++;
        this.scrollSpeed = Math.min(MAX_SPEED, INITIAL_SPEED + Math.floor(this.gameTime / 300) * 0.2);

        // 更新並繪製平台
        for (let i = this.platforms.length - 1; i >= 0; i--) {
            this.platforms[i].update(this.scrollSpeed);
            this.platforms[i].draw(this.ctx);

            // 移除捲出畫面上方的平台
            if (this.platforms[i].y < -20) {
                this.platforms.splice(i, 1);
            }
        }

        // 生成新平台
        spawnNewPlatforms(this.platforms, GAME_WIDTH, GAME_HEIGHT);

        // 觸發每 50 階魔王降臨
        if (this.currentScore >= this.nextBossFloor && !this.boss) {
            this.boss = new Boss(this.nextBossFloor);
            this.bossWarningTimer = 110;
        }

        // 魔王系統與戰鬥處理
        if (this.boss) {
            this.boss.update(this.player);

            // 在魔王戰期間，平台動態隨機生成武器道具 (最多場上保持 2 個)
            if (this.boss.state === 'fighting' && this.weapons.length < 2) {
                // 尋找畫面下方合適的樓梯平台 (非尖刺、未碎裂)
                const candidates = this.platforms.filter(p =>
                    p.y > 180 &&
                    p.y < GAME_HEIGHT - 40 &&
                    !p.isBroken &&
                    p.type !== 'spike' &&
                    !this.weapons.some(w => w.platform === p)
                );
                if (candidates.length > 0 && Math.random() < 0.05) {
                    const picked = candidates[Math.floor(Math.random() * candidates.length)];
                    this.weapons.push(new WeaponItem(picked));
                }
            }

            // 更新並繪製武器道具
            for (let i = this.weapons.length - 1; i >= 0; i--) {
                const weapon = this.weapons[i];
                weapon.update(this.scrollSpeed);
                weapon.draw(this.ctx);

                // 碰撞檢測：玩家吃武器
                if (
                    !weapon.isCollected &&
                    this.player.x < weapon.x + weapon.width &&
                    this.player.x + this.player.width > weapon.x &&
                    this.player.y < weapon.y + weapon.height &&
                    this.player.y + this.player.height > weapon.y
                ) {
                    weapon.isCollected = true;
                    sfx.playWeaponPickup();
                    sfx.playLaser();

                    // 從玩家身上發射耀眼雷射特效貫穿魔王！
                    const laser = new LaserBeam(
                        this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2,
                        this.boss.x + this.boss.width / 2,
                        this.boss.y + this.boss.height / 2
                    );
                    this.lasers.push(laser);
                    this.screenShake = 9;

                    // 魔王扣血 1 格 (5次被攻擊死亡)
                    this.boss.takeDamage(1);

                    // 檢查魔王是否被擊潰
                    if (this.boss.hp <= 0) {
                        this.bossVictoryTimer = 120;
                        this.player.hp = Math.min(MAX_HP, this.player.hp + 6); // 獎勵回血
                        this.currentScore += 3; // 額外加贈層數
                        this.updateHUD();
                        this.nextBossFloor += BOSS_FLOOR_INTERVAL; // 設定下一次 50 階魔王
                    }
                }

                if (weapon.isCollected) {
                    this.weapons.splice(i, 1);
                }
            }

            // 火球攻擊玩家碰撞檢測
            for (let i = this.boss.fireballs.length - 1; i >= 0; i--) {
                const fb = this.boss.fireballs[i];
                const pCenterX = this.player.x + this.player.width / 2;
                const pCenterY = this.player.y + this.player.height / 2;
                const dist = Math.hypot(fb.x - pCenterX, fb.y - pCenterY);

                if (dist < fb.radius + this.player.width * 0.42) {
                    fb.isDead = true;
                    sfx.playFireballHit();
                    this.screenShake = 10;
                    this.player.takeDamage(3, "被深淵魔王火球擊中灼傷身亡！", {
                        onHpChange: () => this.updateHUD(),
                        onGameOver: (reason) => this.triggerGameOver(reason)
                    });
                }
            }

            // 更新並繪製雷射光束
            for (let i = this.lasers.length - 1; i >= 0; i--) {
                const laser = this.lasers[i];
                laser.update();
                laser.draw(this.ctx);
                if (laser.isDead) {
                    this.lasers.splice(i, 1);
                }
            }

            // 繪製魔王與魔王血條
            this.boss.draw(this.ctx);

            // 若魔王已消滅且動畫結束
            if (this.boss.state === 'defeated' && this.boss.defeatedTimer <= 0) {
                this.boss = null;
                this.weapons = [];
            }
        }

        // 更新玩家
        this.player.update(this.keys, this.platforms, {
            onScoreIncrease: () => {
                this.currentScore++;
                this.updateHUD();
            },
            onHpChange: () => {
                this.updateHUD();
            },
            onGameOver: (reason) => {
                this.triggerGameOver(reason);
            }
        });

        // 繪製玩家
        this.player.draw(this.ctx);

        // 繪製天花板尖刺
        drawCeilingSpikes(this.ctx, GAME_WIDTH);

        // 更新與繪製粒子
        updateParticles();
        drawParticles(this.ctx);

        // 魔王降臨警告浮層橫幅
        if (this.bossWarningTimer > 0) {
            this.bossWarningTimer--;
            this.drawWarningBanner();
        }

        // 魔王擊敗慶祝橫幅
        if (this.bossVictoryTimer > 0) {
            this.bossVictoryTimer--;
            this.drawVictoryBanner();
        }

        this.ctx.restore();

        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    }

    drawWarningBanner() {
        const isBlink = Math.floor(this.bossWarningTimer / 6) % 2 === 0;
        this.ctx.save();
        this.ctx.fillStyle = isBlink ? 'rgba(239, 68, 68, 0.9)' : 'rgba(185, 28, 28, 0.75)';
        this.ctx.fillRect(0, 110, GAME_WIDTH, 34);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 15px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⚠️ WARNING! 深淵魔王降臨 ⚠️', GAME_WIDTH / 2, 127);
        this.ctx.restore();
    }

    drawVictoryBanner() {
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
        this.ctx.fillRect(0, 110, GAME_WIDTH, 34);

        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 14px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏆 魔王已被擊潰！生命值大幅恢復 🏆', GAME_WIDTH / 2, 127);
        this.ctx.restore();
    }
}

export const game = new GameManager();
