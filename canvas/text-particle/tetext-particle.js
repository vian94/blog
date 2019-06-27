'use strict';

/**
 *
 *
 * @author Zhong
 * @date 2019/6/14
 * @version
 */


(() => {
    let canvas = document.getElementById('canvas'),
        ctx = canvas.getContext('2d'),
        input = document.querySelector('input');

    const WIN_WIDTH = document.documentElement.clientWidth,
          WIN_HEIGHT = document.documentElement.clientHeight;
    // 全屏canvas
    canvas.width = WIN_WIDTH;
    canvas.height = WIN_HEIGHT;

    //默认字体大小
    const DEF_FONT = '100px Calibri';
    // 默认粒子色彩
    const DEF_COLOR = '#fff';
    // 默认粒子半径
    const DEF_R = 2;
    // 粒子汇聚最小速度
    const MIN_V = 15;
    // 粒子散开速度
    const DIVIDE_V = 6;
    // 粒子散开坐标差值
    const DIVIDE = 50;
    // 粒子闪动频率（多少帧闪一下）
    const BLINK_COUNT = 20;
    // 文字块储存数组
    const WORD_CACHE = [];
    // 待消亡的文字块
    const WORD_DEAD = [];
    // 动画标志
    let rafID;

    // 随机颜色
    function getRandomColor() {
        let r = Math.floor(Math.random() * 255),
         g = Math.floor(Math.random() * 255),
         b = Math.floor(Math.random() * 255);
         return `rgba(${r},${g},${b},0.8)`;
    }
    // 粒子定义
    class Particle {
        constructor({x = Math.floor(Math.random() * WIN_WIDTH),
                     y = Math.floor(Math.random() * WIN_HEIGHT),
                     r = DEF_R,
                     color = DEF_COLOR}) {
            this.x = x;
            this.y = y;
            this.r = r;
            this.color = color;
            let randomV = Math.ceil(Math.random() * 10 + 10);
            this.v = randomV >= MIN_V ? randomV : MIN_V;
            this.tarX = x;
            this.tarY = y;
            this.frame = 0;
        }
        // 移动
        move(tarX, tarY) {
            this.frame++;
            if (tarX) {
                this.tarX = tarX;
            }
            if (tarY) {
                this.tarY = tarY;
            }
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
                this.frame >= BLINK_COUNT) {
                this.frame = 0;
                this.blink();
                return;
            }
            // 运动方向
            let directX = this.x === this.tarX
                    ? 0
                    : this.x < this.tarX
                        ? 1
                        : -1,
                directY = this.y === this.tarY
                    ? 0
                    : this.y < this.tarY
                        ? 1
                        : -1;
            this.x += directX * this.v;
            this.y += directY * this.v;
        }
        // 闪动
        blink() {
            let randomR = Math.random() * DEF_R;
            this.r = randomR <= 1 ? DEF_R / 2 : randomR;
        }
        // 画
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
            ctx.fillStyle = this.color;
            ctx.fill();
        };
    }

    class TextBlock {
        constructor(value, posData) {
            this.value = value; // 文字内容
            this.particles = []; // 文字包含的粒子
            // 根据位置数据初始化文字粒子
            posData.forEach(pos => {
                let p = new Particle({});
                p.tarX = pos.x;
                p.tarY = pos.y;
                this.particles.push(p);
            });
        }

        // 粒子聚集成文字
        form() {
            this.particles.forEach(p => {
                p.move();
                p.draw();
            });
        }

        // 文字分散成粒子，消失
        divide() {
            for (let i = 0; i < this.particles.length; i++) {
                let p = this.particles[i];
                let dividePos = getDividePos(p.x, p.y);
                p.divideX = p.divideX ? p.divideX : dividePos.x;
                p.divideY = p.divideY ? p.divideY : dividePos.y;
                if (p.x === p.divideX &&
                    p.y === p.divideY) {
                    this.particles.splice(i, 1);
                    i--;
                    continue;
                }
                p.v = DIVIDE_V;
                p.move(p.divideX, p.divideY);
                p.draw();
            }
        }

        // 重置目的地
        resetDestination(posData) {
            // 目前粒子不足以形成文字，补充粒子
            let diff = this.particles.length - posData.length;
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

    // 获取粒子散开的目标坐标：[x - DIVIDE, x + DIVIDE]  [y - DIVIDE, y + DIVIDE]
    function getDividePos(x, y) {
        // 散开方向随机
        let directX = Math.random() >= 0.5
                ? 1 // 正向
                : -1, // 反向
            directY = Math.random() >= 0.5
                ? 1
                : -1;
        let tarX = x + directX * DIVIDE,
            tarY = y + directY * DIVIDE;
        return {x: tarX, y: tarY};
    }

    // 动起来
    function animate() {
        ctx.clearRect(0, 0, WIN_WIDTH, WIN_HEIGHT);
        WORD_CACHE.forEach(wordBlock => {
            wordBlock.form();
        });
        if (WORD_DEAD.length) {
            for (let i = 0; i < WORD_DEAD.length; i++) {
                let deadWord = WORD_DEAD[i];
                if (!deadWord.particles.length) {
                    WORD_DEAD.splice(i, 1);
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
        let pos = [];
        ctx.clearRect(0, 0, WIN_WIDTH, WIN_HEIGHT);
        ctx.font = DEF_FONT;
        let textLength = ctx.measureText(text).width;
        ctx.fillText(word, textLength, WIN_HEIGHT * 0.4);
        let imageData = ctx.getImageData(0, 0, WIN_WIDTH, WIN_HEIGHT);
        // 获取文字粒子位置
        for (let x = 0; x < imageData.width; x += 4) {
            for (let y = 0; y < imageData.height; y += 4) {
                let i = (imageData.width * y + x) * 4;
                if(imageData.data[i+3] > 128){
                    pos.push({x, y});
                }
            }
        }
        ctx.clearRect(0, 0, WIN_WIDTH, WIN_HEIGHT);
        return pos;
    }

    // 获取start-end索引拼接成的字符串
    function getBaseText(start, end) {
        let text = '';
        for (let i = start; i < end; i++) {
            text += WORD_CACHE[i].value;
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
        let words = srcElement.value.split(''),
            delCount = selectionState.end - selectionState.start,
            insertCount = srcElement.selectionStart - selectionState.start;
        if (insertCount < 0) {
            delCount = -insertCount;
            insertCount = 0;
            selectionState.start -= delCount;
        }
        let insertWords = words.splice(selectionState.start, insertCount);
        // 删除字符、增加需要散开的字符
        WORD_DEAD.push(...WORD_CACHE.splice(selectionState.start, delCount));
        // 前面已存在的字符串
        let baseText = getBaseText(0, selectionState.start);
        // 插入字符
        let idx = selectionState.start;
        insertWords.forEach(word => {
            // 获取字符的粒子位置
            let wordPos = getWordParticlePos(baseText, word);
            baseText += word;
            WORD_CACHE.splice(idx++, 0, new TextBlock(word, wordPos));
        });
        // 插入字符的后面部分，重置坐标（右移动）
        for (let i = selectionState.start + insertCount; i < WORD_CACHE.length; i++) {
            let wordPos = getWordParticlePos(baseText, WORD_CACHE[i].value);
            baseText += WORD_CACHE[i].value;
            WORD_CACHE[i].resetDestination(wordPos);
        }
        animate();
    }

    // input触发前的焦点索引
    let selectionState = {};
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