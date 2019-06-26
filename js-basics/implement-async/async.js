'use strict';

/**
 *
 *
 * @author Zhong
 * @date 2019/6/26
 * @version
 */

/*
* async/await是Generator函数和Promise对象结合实现的语法糖
* async函数本质上是Generator函数和自动执行器包装在一个函数中
*
* */
function getTimeout() {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve('Timeout.....');
        }, 2000);
    });
}

async function asyncF() {
    let a = await 123;
    console.log(a);
    let str = await getTimeout();
    console.log(str);
}

//asyncF();

function* genF() {
    let a = yield 123;
    alert(a);
    let str = yield getTimeout();
    alert(str);
}

function beAsync() {
    return (function spawn(genF) {
        return new Promise((resolve, reject) => {
            let gen = genF(),
                next;
            function step(nextF) {
                try {
                    next = nextF();
                } catch (err) {
                    reject(err);
                }
                if (next.done) {
                    resolve(next.value);
                }
                Promise.resolve(next.value).then(v => step(() => gen.next(v)),
                err => step(() => gen.throw(err)));
            }
            step(() => gen.next());
        });

    })(genF);
}
beAsync();























/*function fn() {
    function* genF() {
        let a = yield 123;
        console.log(a);
        let str = yield getTimeout();
        console.log(str);
    }
    function spawn(genF) {
        return new Promise((resolve, reject) => {
            const gen = genF();
            let next;
            function step(nextF) {
                try {
                    next = nextF();
                } catch (err) {
                    reject(err);
                }
                if (next.done) {
                    resolve(next.value);
                }
                Promise.resolve(next.value).then(v => {
                    step(() => gen.next(v));
                }, err => {
                    step(() => gen.throw(err));
                });
            }
            step(() => gen.next());
        });
    }
    return spawn(genF);
}*/

//fn();