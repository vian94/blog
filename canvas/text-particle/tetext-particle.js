'use strict';

/**
 *
 *
 * @author Zhong
 * @date 2019/6/14
 * @version
 */


(() => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const input = document.querySelector('input');

    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;
    // 全屏canvas
    canvas.width = clientWidth;
    canvas.height = clientHeight;

    //默认字体大小
    const defaultFont = '100px Calibri';
    // 默认粒子色彩
    const defaultColor = '#fff';
    // 默认粒子半径
    const defaultR = 2;
    // 粒子汇聚最小速度
    const minV = 15;
    // 粒子散开速度
    const divideV = 6;
    // 粒子散开坐标差值
    const divideDiff = 50;
    // 粒子闪动频率（多少帧闪一下）
    const binlkFrequency = 20;
    // 文字块储存数组
    const wordCache = [];
    // 待消亡的文字块
    const wordDeadCache = [];
    // 动画标志
    let rafID;

    // 随机颜色
    function getRandomColor() {
        const r = Math.floor(Math.random() * 255);
        const g = Math.floor(Math.random() * 255);
        const b = Math.floor(Math.random() * 255);
        return `rgba(${r},${g},${b},0.8)`;
    }
    // 粒子定义
    class Particle {
        constructor({x = Math.floor(Math.random() * clientWidth),
                     y = Math.floor(Math.random() * clientHeight),
                     r = defaultR,
                     color = defaultColor}) {
            this.x = x;
            this.y = y;
            this.r = r;
            this.color = color;
            const randomV = Math.ceil(Math.random() * 10 + 10);
            this.v = randomV >= minV ? randomV : minV;
            this.tarX = x;
            this.tarY = y;
            this.frame = 0;
        }
        // 移动
        move(tarX, tarY) {
            this.frame++;
            this.tarX = tarX || this.tarX;
            this.tarY = tarY || this.tarY;
            // 距离小于速度，直接移动到目的地
            if (Math.abs(this.x - this.tarX) <= this.v) {
                this.x = this.tarX;
            }
            if (Math.abs(this.y - this.tarY) <= this.v) {
                this.y = this.tarY;
            }
            // blink blink闪闪的
            // 粒子到达预定位置后，变换半径
            if (this.x === this.tarX &&
                this.y === this.tarY &&
                this.frame >= binlkFrequency) {
                this.frame = 0;
                this.blink();
                return;
            }
            // 运动方向
            const directX = this.x === this.tarX
                    ? 0
                    : this.x < this.tarX
                        ? 1
                        : -1;
            const directY = this.y === this.tarY
                    ? 0
                    : this.y < this.tarY
                        ? 1
                        : -1;
            this.x += directX * this.v;
            this.y += directY * this.v;
        }
        // 闪动
        blink() {
            const randomR = Math.random() * defaultR;
            this.r = randomR <= 1 ? defaultR / 2 : randomR;
        }
        // 画
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
            ctx.fillStyle = this.color;
            ctx.fill();
        };
    }

    class WordBlock {
        constructor(value, posData) {
            this.value = value; // 文字内容
            this.particles = []; // 文字包含的粒子
            // 根据位置数据初始化文字粒子
            posData.forEach(pos => {
                const particle = new Particle({});
                particle.tarX = pos.x;
                particle.tarY = pos.y;
                this.particles.push(particle);
            });
        }

        // 粒子聚集成文字
        form() {
            this.particles.forEach(particle => {
                particle.move();
                particle.draw();
            });
        }

        // 文字分散成粒子，消失
        divide() {
            for (let i = 0; i < this.particles.length; i++) {
                const particle = this.particles[i];
                const dividePos = getDividePos(particle.x, particle.y);
                particle.divideX = particle.divideX || dividePos.x;
                particle.divideY = particle.divideY || dividePos.y;
                if (particle.x === particle.divideX &&
                    particle.y === particle.divideY) {
                    this.particles.splice(i, 1);
                    i--;
                    continue;
                }
                particle.v = divideV;
                particle.move(particle.divideX, particle.divideY);
                particle.draw();
            }
        }

        // 重置目的地
        resetDestination(posData) {
            // 目前粒子不足以形成文字，补充粒子
            const diff = this.particles.length - posData.length;
            if (diff < 0) {
                for (let i = 0; i < -diff; i++) {
                    this.particles.push(new Particle({}));
                }
            } else if (diff > 0) { //减少粒子
                this.particles.splice(-diff, diff);
            }
            // 字符粒子重设目标坐标
            for (let i = 0; i < posData.length; i++) {
                this.particles[i].tarX = posData[i].x;
                this.particles[i].tarY = posData[i].y;
            }
        }
    }

    // 获取粒子散开的目标坐标：[x - divideDiff, x + divideDiff]  [y - divideDiff, y + divideDiff]
    function getDividePos(x, y) {
        // 散开方向随机
        const directX = Math.random() >= 0.5
                ? 1 // 正向
                : -1; // 反向
        const directY = Math.random() >= 0.5
                ? 1
                : -1;
        const tarX = x + directX * divideDiff;
        const tarY = y + directY * divideDiff;
        return { x: tarX, y: tarY };
    }

    // 动起来
    function animate() {
        ctx.clearRect(0, 0, clientWidth, clientHeight);
        wordCache.forEach(wordBlock => {
            wordBlock.form();
        });
        if (wordDeadCache.length) {
            for (let i = 0; i < wordDeadCache.length; i++) {
                let deadWord = wordDeadCache[i];
                if (!deadWord.particles.length) {
                    wordDeadCache.splice(i, 1);
                    i--;
                    continue;
                }
                deadWord.divide();
            }
        }
        rafID = requestAnimationFrame(animate);
    }

    /*
     * 获取文本粒子位置数据
     * @param {String} text
     * @return {Array}
     * */
    function getWordParticlePos(text, word) {
        const pos = [];
        ctx.clearRect(0, 0, clientWidth, clientHeight);
        ctx.font = defaultFont;
        const textLength = ctx.measureText(text).width;
        ctx.fillText(word, textLength, clientHeight * 0.4);
        const imageData = ctx.getImageData(0, 0, clientWidth, clientHeight);
        // 获取文字粒子位置
        for (let x = 0; x < imageData.width; x += 4) {
            for (let y = 0; y < imageData.height; y += 4) {
                const i = (imageData.width * y + x) * 4;
                if(imageData.data[i + 3] > 128){
                    pos.push({ x, y });
                }
            }
        }
        ctx.clearRect(0, 0, clientWidth, clientHeight);
        return pos;
    }

    // 获取start-end索引拼接成的字符串
    function getBaseText(start, end) {
        let text = '';
        for (let i = start; i < end; i++) {
            text += wordCache[i].value;
        }
        return text;
    }
    // 输入完成后变化效果
    function transformAfterInput(srcElement) {
        // 取消动画
        if (rafID) {
            cancelAnimationFrame(rafID);
        }
        // 所有的input变化都可以分解为：删除字符 + 添加字符
        const words = srcElement.value.split('');
        let delCount = selectionState.end - selectionState.start;
        let insertCount = srcElement.selectionStart - selectionState.start;
        if (insertCount < 0) {
            delCount = -insertCount;
            insertCount = 0;
            selectionState.start -= delCount;
        }
        const insertWords = words.splice(selectionState.start, insertCount);
        // 删除字符、增加需要散开的字符
        wordDeadCache.push(...wordCache.splice(selectionState.start, delCount));
        // 前面已存在的字符串
        let baseText = getBaseText(0, selectionState.start);
        // 插入字符
        let idx = selectionState.start;
        insertWords.forEach(word => {
            // 获取字符的粒子位置
            const wordPos = getWordParticlePos(baseText, word);
            baseText += word;
            wordCache.splice(idx++, 0, new WordBlock(word, wordPos));
        });
        // 插入字符的后面部分，重置坐标（右移动）
        const index = selectionState.start + insertCount;
        for (let i = index; i < wordCache.length; i++) {
            const wordPos = getWordParticlePos(baseText, wordCache[i].value);
            baseText += wordCache[i].value;
            wordCache[i].resetDestination(wordPos);
        }
        animate();
    }

    // input触发前的焦点索引
    const selectionState = {
        start: null,
        end: null,
    };
    function updateSelectionState(srcElement) {
        selectionState.start = srcElement.selectionStart;
        selectionState.end = srcElement.selectionEnd;
    }

    let isComposition = false;
    // 这几个事件的触发顺序：compositionstart -> beforeinput -> input -> compositionend
    // 中文输入法触发
    input.addEventListener('compositionstart', (e) => {
        isComposition = true;
        updateSelectionState(e.srcElement);
    });
    // 中文输入法结束
    input.addEventListener('compositionend', (e) => {
        isComposition = false;
        transformAfterInput(e.srcElement);
    });

    input.addEventListener('beforeinput', (e) => {
        if (isComposition) {
            return;
        }
        updateSelectionState(e.srcElement);
    });
    input.addEventListener('input', (e) => {
        if (isComposition) {
            return;
        }
        transformAfterInput(e.srcElement);
    });
})();