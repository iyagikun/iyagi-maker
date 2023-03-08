"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const throttle_1 = __importDefault(require("lodash-es/throttle"));
const pixi_js_1 = require("pixi.js");
const Constant_1 = require("../Constant");
const Tile_1 = require("../Object/Tile");
const Calc_1 = require("./Calc");
const TalkBox_1 = require("./TalkBox");
const DEFAULT_MARGIN = 30;
const REACTION_OVERLAP_THRESHOLD = 10;
class IScene extends EventTarget {
    constructor(name, tiles, objectList, info) {
        var _a;
        super();
        this.name = name;
        this.tiles = tiles;
        this.objectList = objectList;
        this.status = 'idle';
        this.container = new pixi_js_1.Container();
        this.container.sortableChildren = true;
        this.width = 0;
        this.height = 0;
        this.blockingObjectList = tiles.reduce((acc, items) => acc.concat(items)).concat(objectList).filter((obj) => !obj.isPassable());
        this.margin = (_a = info === null || info === void 0 ? void 0 : info.margin) !== null && _a !== void 0 ? _a : DEFAULT_MARGIN;
    }
    addEventListener(type, callback) {
        super.addEventListener(type, callback);
    }
    dispatchEvent(event) {
        super.dispatchEvent(event);
        return true;
    }
    getApplication() {
        if (!this.app) {
            throw new Error(`[scene: ${this.name}] no application.`);
        }
        return this.app;
    }
    setApplication(app) {
        this.app = app;
        this.app.stage.addChild(this.container);
    }
    load() {
        return Promise.all([
            ...this.tiles.reduce((acc, item) => acc.concat(item)).map(tile => tile.load()),
            ...this.objectList.map((obj) => obj.load())
        ]);
    }
    drawMap() {
        this.tiles.forEach((row, rowIdx) => row.forEach((tile, colIdx) => {
            tile.setPos(colIdx * Tile_1.TILE_SIZE, rowIdx * Tile_1.TILE_SIZE, -Tile_1.TILE_SIZE);
            tile.attachAt(this.container);
        }));
        this.width = this.container.width;
        this.height = this.container.height;
        this.objectList.forEach((obj) => {
            obj.attachAt(this.container);
        });
    }
    focus(target) {
        const [targetX, targetY] = target.getPos();
        const { width: appWidth, height: appHeight } = this.getApplication().view;
        const minX = appWidth - this.width - this.margin;
        const minY = appHeight - this.height - this.margin;
        const destX = Math.round((appWidth / 2) - targetX - (target.getWidth() / 2));
        const destY = Math.round((appHeight / 2) - targetY - (target.getHeight() / 2));
        this.container.x = Math.max(Math.min(destX, this.margin), minX);
        this.container.y = Math.max(Math.min(destY, this.margin), minY);
    }
    control(player) {
        if (this.status !== 'idle') {
            throw new Error(`[scene: ${this.name}] is busy. status = ${this.status}`);
        }
        if (!this.controller) {
            const { width: appWidth, height: appHeight } = this.getApplication().view;
            let joystickId = undefined;
            let [startX, startY] = [0, 0];
            let [deltaX, deltaY] = [0, 0];
            const controller = pixi_js_1.Sprite.from(Constant_1.TRANSPARENT_1PX_IMG);
            this.controller = controller;
            this.controller.width = appWidth;
            this.controller.height = appHeight;
            const ticker = this.getApplication().ticker;
            const tick = () => {
                const nextX = this.getObjectNextX(player, deltaX);
                const nextY = this.getObjectNextY(player, deltaY);
                player.setPos(nextX, nextY);
                this.focus(player);
            };
            const onTouchStart = (evt) => {
                const { x, y } = evt.global;
                if (x < appWidth / 2) {
                    // case:: joystick on
                    startX = x;
                    startY = y;
                    joystickId = evt.pointerId;
                    ticker.add(tick);
                }
                else {
                    // case:: interact
                    const interaction = this.getInteraction();
                    if (!interaction) {
                        return;
                    }
                    controller.interactive = false;
                    joystickId = undefined;
                    player.stop();
                    ticker.remove(tick);
                    interaction().then(() => {
                        controller.interactive = true;
                    });
                }
            };
            const onTouchMove = (0, throttle_1.default)((evt) => {
                if (joystickId !== evt.pointerId) {
                    return;
                }
                const { x, y } = evt.global;
                const diffX = x - startX;
                const diffY = y - startY;
                const distance = Math.sqrt(diffX ** 2 + diffY ** 2);
                if (distance === 0) {
                    return;
                }
                const acc = (0, Calc_1.getAcc)(distance);
                if (acc === 0) {
                    deltaX = 0;
                    deltaY = 0;
                    player.stop();
                    return;
                }
                deltaX = Math.round((diffX * acc) / distance);
                deltaY = Math.round((diffY * acc) / distance);
                player.changeDirection(deltaX, deltaY);
                player.play(acc);
            }, 50);
            const onTouchEnd = (evt) => {
                if (joystickId !== evt.pointerId) {
                    return;
                }
                joystickId = undefined;
                player.stop();
                ticker.remove(tick);
            };
            this.controller.addEventListener('touchstart', onTouchStart);
            this.controller.addEventListener('touchmove', onTouchMove);
            this.controller.addEventListener('touchend', onTouchEnd);
            this.controller.addEventListener('touchendoutside', onTouchEnd);
            this.container.parent.addChild(this.controller);
            this.focus(player);
        }
        this.controller.interactive = true;
        this.player = player;
    }
    getObjectNextX(target, dist) {
        const [curX, curY] = target.getPos();
        const width = target.getWidth();
        const height = target.getHeight();
        const nextX = curX + dist;
        // map out check
        if (nextX < 0 || nextX + width > this.width) {
            return curX;
        }
        const blockingObj = this.blockingObjectList.find((obj) => {
            if (obj === target) {
                return false;
            }
            const [objX, objY] = obj.getPos();
            return (0, Calc_1.isIntersecting)(nextX, curY, width, height, objX, objY, obj.getWidth(), obj.getHeight());
        });
        if (blockingObj) {
            const blockingObjX = blockingObj.getPos()[0];
            return curX < blockingObjX ? blockingObjX - width : blockingObjX + blockingObj.getWidth();
        }
        return nextX;
    }
    getObjectNextY(target, dist) {
        const [curX, curY] = target.getPos();
        const width = target.getWidth();
        const height = target.getHeight();
        const nextY = curY + dist;
        // map out check
        if (nextY < 0 || nextY + height > this.height) {
            return curY;
        }
        const blockingObj = this.blockingObjectList
            .find((obj) => {
            if (obj === target) {
                return false;
            }
            const [objX, objY] = obj.getPos();
            return (0, Calc_1.isIntersecting)(curX, nextY, width, height, objX, objY, obj.getWidth(), obj.getHeight());
        });
        if (blockingObj) {
            const blockingObjY = blockingObj.getPos()[1];
            return curY < blockingObjY ? blockingObjY - height : blockingObjY + blockingObj.getHeight();
        }
        return nextY;
    }
    getInteraction() {
        const player = this.player;
        if (!player) {
            throw new Error(`[scene: ${this.name}] no player`);
        }
        const playerDirection = player.getDirection();
        const [px, py] = player.getPos();
        const pWidth = player.getWidth();
        const cHeight = player.getHeight();
        const cCenterX = px + pWidth / 2;
        const cCenterY = py + cHeight / 2;
        const target = this.objectList.find((obj) => {
            const [oX, oY] = obj.getPos();
            switch (playerDirection) {
                case 'down':
                    return (Math.abs(cCenterX - (oX + obj.getWidth() / 2))
                        < REACTION_OVERLAP_THRESHOLD && Math.abs(py + cHeight - oY) < 2);
                case 'up':
                    return (Math.abs(cCenterX - (oX + obj.getWidth() / 2))
                        < REACTION_OVERLAP_THRESHOLD && Math.abs(oY + obj.getHeight() - py) < 2);
                case 'left':
                    return (Math.abs(cCenterY - (oY + obj.getHeight() / 2))
                        < REACTION_OVERLAP_THRESHOLD && Math.abs(oX + obj.getWidth() - px) < 2);
                case 'right':
                    return (Math.abs(cCenterY - (oY + obj.getHeight() / 2))
                        < REACTION_OVERLAP_THRESHOLD && Math.abs(px + pWidth - oX) < 2);
                default:
                    return false;
            }
        });
        if (!target) {
            return null;
        }
        return target.getReaction();
    }
    talk(speaker, message) {
        this.status = 'talking';
        const player = this.player;
        return new Promise((resolve) => {
            const app = this.getApplication();
            const talkBox = (0, TalkBox_1.getTalkBox)(speaker, message, app.view);
            const lastContainerX = this.container.x;
            const minusX = talkBox.width / 2;
            const speakerGlobalX = speaker.getGlobalPos()[0];
            if (app.view.width - speakerGlobalX < minusX) {
                this.container.x = lastContainerX - talkBox.width;
            }
            else if (speakerGlobalX + speaker.getWidth() > minusX) {
                this.container.x = lastContainerX - minusX;
            }
            talkBox.interactive = true;
            talkBox.addEventListener('touchstart', () => {
                app.stage.removeChild(talkBox);
                this.container.x = lastContainerX;
                this.status = 'idle';
                if (player) {
                    this.control(player);
                }
                resolve();
            });
            app.stage.addChild(talkBox);
        });
    }
}
exports.default = IScene;
