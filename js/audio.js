/**
 * Web Audio API 音效與背景配樂合成器模組 (完全不依賴外部音檔的 8-bit / 街機風格音效與動態配樂)
 */
export class SoundFX {
    constructor() {
        this.ctx = null;
        this.isMuted = false;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.bgmBpm = 136;
        this.isBossMode = false;

        // 音樂音量主控
        this.masterGain = null;
        this.sfxGain = null;
        this.bgmGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // 主音量
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
            this.masterGain.connect(this.ctx.destination);

            // 音效專用音量
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
            this.sfxGain.connect(this.masterGain);

            // 背景音樂專用音量
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            this.bgmGain.connect(this.masterGain);
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.85, this.ctx.currentTime);
        }
        return this.isMuted;
    }

    /* -------------------------------------------------------------
     * 背景音樂 (BGM) - 刺激動感的 8-bit / 復古街機合成器編曲
     * ------------------------------------------------------------- */
    startBgm() {
        this.init();
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        this.bgmStep = 0;
        this.scheduleNextBgmBeat();
    }

    stopBgm() {
        this.bgmPlaying = false;
        if (this.bgmTimer) {
            clearTimeout(this.bgmTimer);
            this.bgmTimer = null;
        }
    }

    setBgmBossMode(isBoss) {
        this.isBossMode = isBoss;
        this.bgmBpm = isBoss ? 152 : 136; // 魔王戰時節奏更加緊湊刺激
    }

    scheduleNextBgmBeat() {
        if (!this.bgmPlaying || !this.ctx) return;

        const secondsPerBeat = 60.0 / this.bgmBpm;
        const stepTime = secondsPerBeat / 4; // 16分音符拍子
        const now = this.ctx.currentTime;

        this.playBgmStep(this.bgmStep, now);
        this.bgmStep = (this.bgmStep + 1) % 64; // 64 拍 (4 小節循環)

        // 設定下一個 16 分音符倒數計時
        this.bgmTimer = setTimeout(() => {
            this.scheduleNextBgmBeat();
        }, stepTime * 1000 * 0.95);
    }

    playBgmStep(step, time) {
        if (this.isMuted || !this.ctx) return;

        // 旋律和弦音符頻率對照表 (Hz)
        const noteFreq = {
            'A2': 110.0, 'C3': 130.8, 'D3': 146.8, 'E3': 164.8, 'F3': 174.6, 'G3': 196.0,
            'A3': 220.0, 'B3': 246.9, 'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F4': 349.2, 'G4': 392.0,
            'A4': 440.0, 'B4': 493.9, 'C5': 523.3, 'D5': 587.3, 'E5': 659.3, 'F5': 698.5, 'G5': 784.0
        };

        // 1. 鼓組 (節奏感)
        const barStep = step % 16;
        if (barStep === 0 || barStep === 8 || (this.isBossMode && barStep === 14)) {
            // 大鼓 Kick (下潛正弦波)
            this.playKick(time);
        }
        if (barStep === 4 || barStep === 12) {
            // 小鼓 Snare (白噪音)
            this.playSnare(time);
        }
        if (barStep % 2 === 0) {
            // 腳踏鈸 Hi-Hat
            this.playHiHat(time, barStep % 4 === 2 ? 0.08 : 0.04);
        }

        // 2. 貝斯線條 (Bassline - 具衝擊感的連續跳躍低音)
        const bassNotes = this.isBossMode ? [
            'D3', 'D3', 'F3', 'D3', 'G3', 'D3', 'F3', 'C3',
            'D3', 'D3', 'F3', 'D3', 'A3', 'G3', 'F3', 'E3'
        ] : [
            'A2', 'A2', 'C3', 'A2', 'D3', 'A2', 'C3', 'G2',
            'F2', 'F2', 'A2', 'F2', 'G2', 'G2', 'B2', 'E2'
        ];
        const currentBass = bassNotes[step % bassNotes.length];
        if (currentBass && noteFreq[currentBass]) {
            this.playBassNote(noteFreq[currentBass], time, 0.12);
        }

        // 3. 主旋律 / 琶音 (Lead Melody - 刺激街機冒險風格)
        const melodySeq = this.isBossMode ? [
            'D4', null, 'F4', null, 'A4', null, 'D5', 'C5',
            'A4', null, 'F4', null, 'G4', 'A4', 'F4', null,
            'D4', null, 'F4', null, 'A4', null, 'D5', 'E5',
            'F5', 'E5', 'D5', 'C5', 'A4', 'C5', 'D5', null
        ] : [
            'A4', null, 'C5', null, 'E5', null, 'D5', null,
            'C5', 'D5', 'C5', null, 'A4', null, 'G4', null,
            'A4', null, 'C5', null, 'D5', null, 'E5', null,
            'G5', null, 'E5', 'D5', 'C5', null, 'A4', null
        ];
        const lead = melodySeq[step % melodySeq.length];
        if (lead && noteFreq[lead]) {
            this.playLeadNote(noteFreq[lead], time, 0.15);
        }
    }

    playKick(time) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, time);
        osc.frequency.exponentialRampToValueAtTime(35, time + 0.1);
        gain.gain.setValueAtTime(0.55, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.1);
    }

    playSnare(time) {
        const bufferSize = this.ctx.sampleRate * 0.08;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        noise.start(time);
        noise.stop(time + 0.08);
    }

    playHiHat(time, vol = 0.05) {
        const bufferSize = this.ctx.sampleRate * 0.03;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6000, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        noise.start(time);
        noise.stop(time + 0.03);
    }

    playBassNote(freq, time, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);

        // 濾波器加強飽滿度
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(650, time);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    playLeadNote(freq, time, duration) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, time);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, time);

        gain.gain.setValueAtTime(0.18, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    /* -------------------------------------------------------------
     * 遊戲音效 (SFX)
     * ------------------------------------------------------------- */

    /**
     * 1. 踩到地板踏步音效 (所有方塊落地時播放，彈簧格除外)
     */
    playLand() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(170, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.06);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.06);
    }

    /**
     * 2. 彈跳格彈簧音效 (經典卡通高彈跳 Boing 顫音)
     */
    playSpring() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';

        // 快速上升滑音 + 顫音頻率調變
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

        // 增加彈簧金屬擺動顫音效果
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.setValueAtTime(28, now);
        lfoGain.gain.setValueAtTime(60, now);
        lfo.connect(osc.frequency);
        lfo.start(now);
        lfo.stop(now + 0.25);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * 3. 易碎方塊破裂聲 (已完全刪除靜音，保持安靜無噪聲)
     */
    playShatter() {
        // 依使用者需求已直接刪除碎裂音效
    }

    /**
     * 4. 尖刺格與天花板落刺傷害音效 (劃傷、穿刺、流血飛濺聲 Squelch-Slash)
     */
    playBleed() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // 銳利切削割傷音
        const slashOsc = this.ctx.createOscillator();
        const slashGain = this.ctx.createGain();
        slashOsc.type = 'sawtooth';
        slashOsc.frequency.setValueAtTime(950, now);
        slashOsc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        slashGain.gain.setValueAtTime(0.4, now);
        slashGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        // 鮮血飛濺 / 穿刺打擊感 (濾波雜訊)
        const bufferSize = this.ctx.sampleRate * 0.14;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI);
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(320, now + 0.14);
        filter.Q.setValueAtTime(3.0, now);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.38, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        slashOsc.connect(slashGain);
        slashGain.connect(this.sfxGain);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain);

        slashOsc.start(now);
        slashOsc.stop(now + 0.18);
        noise.start(now);
        noise.stop(now + 0.14);
    }

    /**
     * 5. 拾取武器音效 (高昂清脆的充能強化音效)
     */
    playWeaponPickup() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.04);

            gain.gain.setValueAtTime(0.28, now + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(now + idx * 0.04);
            osc.stop(now + idx * 0.04 + 0.15);
        });
    }

    /**
     * 6. 雷射特效發射音效 (科幻高能雷射光束掃射音 Pew-Zap)
     */
    playLaser() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // 核心快速降頻雷射掃音
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1900, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.16);

        // 混入高頻脈衝
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'square';
        subOsc.frequency.setValueAtTime(2800, now);
        subOsc.frequency.exponentialRampToValueAtTime(450, now + 0.14);

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        subGain.gain.setValueAtTime(0.2, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        subOsc.connect(subGain);
        subGain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.18);
        subOsc.start(now);
        subOsc.stop(now + 0.14);
    }

    /**
     * 7. 魔王現身音效 (威嚴咆哮與警報戰號)
     */
    playBossSpawn() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'sawtooth';
        osc2.type = 'sawtooth';
        osc1.frequency.setValueAtTime(110, now);
        osc2.frequency.setValueAtTime(113, now); // 微失諧厚重感
        osc1.frequency.linearRampToValueAtTime(240, now + 0.4);
        osc2.frequency.linearRampToValueAtTime(246, now + 0.4);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.linearRampToValueAtTime(1800, now + 0.4);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.55);
        osc2.stop(now + 0.55);
    }

    /**
     * 8. 魔王受傷音效 (重擊、哀鳴震顫)
     */
    playBossHit() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.18);

        gain.gain.setValueAtTime(0.45, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.22);
    }

    /**
     * 9. 魔王投擲火球音效 (呼嘯風焰 Whoosh)
     */
    playFireball() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const bufferSize = this.ctx.sampleRate * 0.22;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(350, now);
        filter.frequency.exponentialRampToValueAtTime(950, now + 0.1);
        filter.frequency.exponentialRampToValueAtTime(200, now + 0.22);
        filter.Q.setValueAtTime(3.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        noise.start(now);
        noise.stop(now + 0.22);
    }

    /**
     * 10. 火球爆炸擊中音效 (火浪破壞低沈爆破)
     */
    playFireballHit() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.25);

        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * 11. 魔王擊敗音效 (大爆炸連環綻放與勝利和弦)
     */
    playBossDefeat() {
        if (!this.ctx || this.isMuted) return;
        const now = this.ctx.currentTime;

        // 巨響爆炸
        const bufferSize = this.ctx.sampleRate * 0.5;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.4));
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(80, now + 0.5);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);
        noise.start(now);
        noise.stop(now + 0.5);

        // 勝利大和弦 (C -> G -> C)
        [523.25, 659.25, 783.99, 1046.5].forEach(freq => {
            const osc = this.ctx.createOscillator();
            const noteGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + 0.2);

            noteGain.gain.setValueAtTime(0.25, now + 0.2);
            noteGain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

            osc.connect(noteGain);
            noteGain.connect(this.sfxGain);
            osc.start(now + 0.2);
            osc.stop(now + 0.75);
        });
    }

    /**
     * 12. 遊戲結束音效
     */
    playGameOver() {
        if (!this.ctx || this.isMuted) return;
        this.stopBgm();

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.65);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.65);
    }
}

export const sfx = new SoundFX();
