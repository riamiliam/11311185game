/**
 * 遊戲主循環與狀態管理模組
 */
import {
    GAME_WIDTH,
    GAME_HEIGHT,
    INITIAL_SPEED,
    MAX_SPEED,
    STORAGE_KEY_HIGH_SCORE
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

        this.isRunning = true;
        this.isGameOver = false;
        this.currentScore = 1;
        this.gameTime = 0;
        this.scrollSpeed = INITIAL_SPEED;

        this.player.reset();
        resetParticles();

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

        if (this.isRunning) {
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        }
    }
}

export const game = new GameManager();
