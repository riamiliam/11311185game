/**
 * 遊戲啟動入口 (main.js)
 */
import { game } from './game.js';
import { sfx } from './audio.js';

function setupGame() {
    // 初始化遊戲畫布與資料
    game.init();

    // 鍵盤控制事件
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            game.keys.left = true;
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            game.keys.right = true;
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
            game.keys.left = false;
        }
        if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            game.keys.right = false;
        }
    });

    // 行動裝置/螢幕觸控按鈕綁定
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');

    const bindTouch = (btn, keyProp) => {
        if (!btn) return;

        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            sfx.init();
            game.keys[keyProp] = true;
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            game.keys[keyProp] = false;
        }, { passive: false });

        btn.addEventListener('mousedown', () => {
            sfx.init();
            game.keys[keyProp] = true;
        });

        btn.addEventListener('mouseup', () => {
            game.keys[keyProp] = false;
        });

        btn.addEventListener('mouseleave', () => {
            game.keys[keyProp] = false;
        });
    };

    bindTouch(btnLeft, 'left');
    bindTouch(btnRight, 'right');

    // 聲音開關按鈕綁定
    const btnSound = document.getElementById('btnSound');
    if (btnSound) {
        btnSound.addEventListener('click', (e) => {
            e.stopPropagation();
            sfx.init();
            const muted = sfx.toggleMute();
            btnSound.innerText = muted ? '🔇' : '🔊';
            btnSound.title = muted ? '點擊開啟聲音' : '點擊靜音';
        });
    }

    // 開始與重新開始按鈕
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            game.startGame();
        });
    }

    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            game.startGame();
        });
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGame);
} else {
    setupGame();
}
