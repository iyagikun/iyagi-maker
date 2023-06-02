"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Coordinate_1 = require("../Utils/Coordinate");
const SceneBase_1 = __importDefault(require("./SceneBase"));
class SceneObjectManager extends SceneBase_1.default {
    constructor(name, objectList) {
        super(name);
        this.objectList = objectList;
        this.blockingObjectList = objectList.filter((obj) => !obj.isPassable());
    }
    load() {
        return Promise.all(this.objectList.map((obj) => obj.load()));
    }
    addObject(obj) {
        if (!obj.isLoaded()) {
            throw new Error(`Fail to add object. ${obj.getName()} is not loaded.`);
        }
        if (this.objectList.includes(obj)) {
            throw new Error(`Fail to add object. ${obj.getName()} is already in ${this.name}`);
        }
        this.objectList.push(obj);
        if (!obj.isPassable()) {
            this.blockingObjectList.push(obj);
        }
        obj.attach(this.container);
    }
    removeObject(obj) {
        if (!this.objectList.includes(obj)) {
            throw new Error(`Fail to add object. ${obj.getName()} is not in ${this.name}`);
        }
        this.objectList = this.objectList.filter((_obj) => _obj !== obj);
        this.blockingObjectList = this.blockingObjectList.filter((_obj) => _obj !== obj);
        obj.detach(this.container);
    }
    getObjectNextX(target, dist) {
        const [curX, curY] = target.getPos();
        const width = target.getWidth();
        const height = target.getHeight();
        const nextX = curX + dist;
        const blockingObj = this.blockingObjectList.find((obj) => {
            if (obj === target) {
                return false;
            }
            return (0, Coordinate_1.isIntersecting)([nextX, curY, width, height], obj.getCollisionCoords());
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
        const blockingObj = this.blockingObjectList
            .find((obj) => {
            if (obj === target) {
                return false;
            }
            return (0, Coordinate_1.isIntersecting)([curX, nextY, width, height], obj.getCollisionCoords());
        });
        if (blockingObj) {
            const blockingObjY = blockingObj.getPos()[1];
            return curY < blockingObjY ? blockingObjY - height : blockingObjY + blockingObj.getHeight();
        }
        return nextY;
    }
}
exports.default = SceneObjectManager;