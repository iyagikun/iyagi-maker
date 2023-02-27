"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pixi_js_1 = require("pixi.js");
const Constant_1 = require("../Constant");
const textureMap = {};
const coordsListToFrame = (prefix) => (coordsList) => {
    if (!coordsList) {
        return {};
    }
    return coordsList.reduce((frames, [x, y, w, h], idx) => {
        return {
            ...frames,
            [`${prefix}-${idx}`]: {
                frame: { x, y, w, h }
            }
        };
    }, {});
};
const getSprite = (frameKeyList) => {
    if (frameKeyList.length === 1) {
        return pixi_js_1.Sprite.from(frameKeyList[0]);
    }
    if (frameKeyList.length > 1) {
        return new pixi_js_1.AnimatedSprite(frameKeyList.map((key) => pixi_js_1.Texture.from(key)));
    }
    return undefined;
};
const getDirection = (deltaX, deltaY) => {
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'right' : 'left';
    }
    return deltaY > 0 ? 'down' : 'up';
};
class IObject {
    constructor(name, spriteInfo) {
        this.name = name;
        this.spriteInfo = spriteInfo;
    }
    getName() {
        return this.name;
    }
    getTexture() {
        const imageUrl = this.spriteInfo.imageUrl;
        if (!textureMap[imageUrl]) {
            textureMap[imageUrl] = pixi_js_1.BaseTexture.from(imageUrl);
        }
        return textureMap[imageUrl];
    }
    getDirFrames() {
        return {
            up: coordsListToFrame(`${this.name}-up`)(this.spriteInfo.up),
            down: coordsListToFrame(`${this.name}-down`)(this.spriteInfo.down),
            left: coordsListToFrame(`${this.name}-left`)(this.spriteInfo.left),
            right: coordsListToFrame(`${this.name}-right`)(this.spriteInfo.right)
        };
    }
    async load() {
        var _a;
        // case: loaded
        if (this.sprite) {
            return Promise.resolve();
        }
        // case: still not loaded
        const dirFrames = this.getDirFrames();
        await new pixi_js_1.Spritesheet(this.getTexture(), {
            frames: Object.values(dirFrames).reduce((acc, _frames) => {
                if (!_frames) {
                    return acc;
                }
                return {
                    ...acc,
                    ..._frames,
                };
            }, {}),
            meta: {
                scale: '1',
            }
        }).parse();
        this.upS = getSprite(Object.keys(dirFrames.up));
        this.downS = getSprite(Object.keys(dirFrames.down));
        this.leftS = getSprite(Object.keys(dirFrames.left));
        this.rightS = getSprite(Object.keys(dirFrames.right));
        this.sprite = this.downS;
        if (this.sprite === undefined) {
            throw new Error(`Fail to load ${this.name}. Down sprite info is required.`);
        }
        (_a = this.sprite.visible == this.spriteInfo.visible) !== null && _a !== void 0 ? _a : true;
    }
    getSprite() {
        if (!this.sprite) {
            throw new Error(`asset '${this.name}' is not loaded`);
        }
        return this.sprite;
    }
    getWidth() {
        return this.getSprite().width;
    }
    getHeight() {
        return this.getSprite().height;
    }
    getPos() {
        const { x, y } = this.getSprite();
        return [x, y];
    }
    setPos(x, y) {
        this.getSprite().x = x;
        this.getSprite().y = y;
    }
    changeDirectionWithDelta(deltaX, deltaY) {
        this.changeDirection(getDirection(deltaX, deltaY));
    }
    changeDirection(direction) {
        const lastSprite = this.getSprite();
        const [lastX, lastY] = this.getPos();
        const parent = lastSprite.parent;
        switch (direction) {
            case 'up':
                this.sprite = this.upS;
                break;
            case 'down':
                this.sprite = this.downS;
                break;
            case 'left':
                this.sprite = this.leftS;
                break;
            case 'right':
                this.sprite = this.rightS;
                break;
            default:
                throw new Error(`Fail to change ${this.name} dir. Invalid direction. ${direction}`);
        }
        if (!this.sprite) {
            throw new Error(`Fail to change ${this.name} dir. no sprite. ${direction}`);
        }
        this.setPos(lastX, lastY);
        if (parent) {
            parent.removeChild(lastSprite);
            parent.addChild(this.sprite);
        }
    }
    play(_speed) {
        const sprite = this.getSprite();
        if (!(sprite instanceof pixi_js_1.AnimatedSprite)) {
            return;
        }
        if (!sprite.playing) {
            sprite.play();
        }
        const speed = (_speed * 6) / Constant_1.FRAMES_PER_SECOND;
        if (sprite.animationSpeed === speed) {
            return;
        }
        sprite.animationSpeed = speed;
    }
    stop() {
        const sprite = this.getSprite();
        if (!(sprite instanceof pixi_js_1.AnimatedSprite)) {
            return;
        }
        sprite.stop();
    }
}
exports.default = IObject;
