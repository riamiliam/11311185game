/**
 * 遊戲主循環與狀態管理模組
 */
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    INITIAL_SPEED,
    MAX_SPEED,
    STORAGE_KEY_HIGH_SCORE,
    BOSS_FLOOR_INTERVAL
} from './config.js?v=20261007_06';
import { sfx } from './audio.js?v=20261007_06';
import {
    generateInitialPlatforms,
    spawnNewPlatforms,
    drawCeilingSpikes,
    updateParticles,
    drawParticles,
    resetParticles
} from './enemy.js?v=20261007_06';
import { Player } from './player.js?v=20261007_06';
import { Boss, WeaponItem, LaserBeam } from './boss.js?v=20261007_06';

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

        // 魔王與戰鬥系統 (每 30 階一隻，場上有魔王時停止計算，擊敗後重新計算 30 階)
        this.boss = null;
        this.weapons = [];
        this.lasers = [];
        this.floorsSinceBoss = 0; // 自上一隻魔王擊敗後走過的階數
        this.bossWarningTimer = 0;
        this.bossVictoryTimer = 0;
        this.screenShake = 0;
        this.weaponSpawnCooldown = 0;

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

        // 重置魔王戰鬥實體與計數器
        this.boss = null;
        this.weapons = [];
        this.lasers = [];
        this.floorsSinceBoss = 0;
        this.bossWarningTimer = 0;
        this.bossVictoryTimer = 0;
        this.screenShake = 0;
        this.weaponSpawnCooldown = 0;

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

        // 更新愛心 HP (動態根據玩家目前最大上限顯示顆數)
        if (this.dom.hpContainer) {
            this.dom.hpContainer.innerHTML = '';
            const totalHearts = Math.round(this.player.maxHp / 3); // 每顆心 = 3 HP
            const activeHearts = Math.ceil(this.player.hp / 3);

            for (let i = 0; i < totalHearts; i++) {
                const heart = document.createElement('span');
                heart.className = 'text-sm sm:text-base transition-all duration-300';
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

        // 生成新平台 (當玩家往下移動時，下方會不斷刷新新平台)
        const newPlat = spawnNewPlatforms(this.platforms, GAME_WIDTH, GAME_HEIGHT);

        // 魔王戰期間：新刷新的格子上以高機率 (65%) 自動隨機附加武器，讓玩家往下走時格子上隨時有武器！
        if (this.boss && this.boss.state === 'fighting' && newPlat && newPlat.type !== 'spike') {
            if (Math.random() < 0.65) {
                const randomX = newPlat.x + Math.random() * (newPlat.width - 24);
                this.weapons.push(new WeaponItem(newPlat, randomX));
            }
        }

        // 魔王系統與戰鬥處理
        if (this.boss) {
            this.boss.update(this.player);

            // 在魔王戰期間，隨著玩家往下，在玩家下方不斷刷新的格子上持續生成武器 (場上隨時保持 2~3 個武器)
            if (this.boss.state === 'fighting') {
                const activeWeapons = this.weapons.filter(w => !w.isCollected);
                if (activeWeapons.length < 3) {
                    // 尋找玩家當前位置與下方即將前往的合格格子
                    const candidatePlatforms = this.platforms.filter(p =>
                        p.y >= this.player.y - 10 &&
                        p.y < GAME_HEIGHT - 30 &&
                        !p.isBroken &&
                        p.type !== 'spike' &&
                        !this.weapons.some(w => !w.isCollected && w.platform === p)
                    );
                    if (candidatePlatforms.length > 0) {
                        const chosen = candidatePlatforms[Math.floor(Math.random() * candidatePlatforms.length)];
                        const randomX = chosen.x + Math.random() * (chosen.width - 24);
                        this.weapons.push(new WeaponItem(chosen, randomX));
                    }
                }

                // 若主角目前站著的格子還沒有武器，也隨機在腳邊補上一把
                if (this.player.currentPlatform && !this.player.currentPlatform.isBroken && this.player.currentPlatform.type !== 'spike') {
                    const hasWeaponOnFoot = this.weapons.some(w => !w.isCollected && w.platform === this.player.currentPlatform);
                    if (!hasWeaponOnFoot && this.weaponSpawnCooldown <= 0) {
                        const spawnX = this.player.x + (Math.random() - 0.5) * 16;
                        this.weapons.push(new WeaponItem(this.player.currentPlatform, spawnX));
                        this.weaponSpawnCooldown = 20;
                    }
                }
                if (this.weaponSpawnCooldown > 0) {
                    this.weaponSpawnCooldown--;
                }
            }

            // 更新並繪製武器道具
            for (let i = this.weapons.length - 1; i >= 0; i--) {
                const weapon = this.weapons[i];
                weapon.update(this.scrollSpeed);
                weapon.draw(this.ctx);

                // 碰撞檢測：玩家吃武器 (微擴大判定讓跳躍下落時更容易拾取)
                const hitboxPad = 8;
                if (
                    !weapon.isCollected &&
                    this.player.x < weapon.x + weapon.width + hitboxPad &&
                    this.player.x + this.player.width > weapon.x - hitboxPad &&
                    this.player.y < weapon.y + weapon.height + hitboxPad &&
                    this.player.y + this.player.height > weapon.y - hitboxPad
                ) {
                    weapon.isCollected = true;
                    sfx.playWeaponPickup();
                    sfx.playLaser();

                    // 從玩家身上發射耀眼雷射特效直擊魔王！
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
                        this.bossVictoryTimer = 130;
                        // 打敗魔王後生命值上限永久加一顆愛心並補滿血量
                        this.player.increaseMaxHeart();
                        // 並且打敗後重新計算三十格！
                        this.floorsSinceBoss = 0;
                        this.weapons = []; // 打敗魔王後立即清空場上武器並停止生成！
                        this.updateHUD();
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

                // 場上有魔王時停止計算；無魔王時累計階數，每 30 階出現一隻魔王
                if (!this.boss) {
                    this.floorsSinceBoss++;
                    if (this.floorsSinceBoss >= BOSS_FLOOR_INTERVAL) {
                        this.boss = new Boss(this.currentScore);
                        this.bossWarningTimer = 110;
                        this.weapons = [];
                    }
                }

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
        this.ctx.font = 'bold 13px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏆 魔王擊潰！生命上限+1顆心 🏆', GAME_WIDTH / 2, 127);
        this.ctx.restore();
    }
}

export const game = new GameManager();
