import {
  AnimatedSprite,
  Container,
  Sprite,
} from 'pixi.js';

import { FRAMES_PER_SECOND } from '../Constant';
import { Coords } from '../Utils/Coordinate';
import ISprite from './ISprite';
import { Direction, Pos } from './type';

export type ISpriteMap = {
  default: ISprite;
  [key:string]: ISprite;
};

/**
 * 높이를 나타내는 zIndex 는 y 값에 따라 보정이 필요하므로 해당 값만큼의 y값에 따른 보정이 가능하도록 함.
 * 따라서, 맵의 크기가 Z_INDEX_MOD 값보다 크면 문제가 될 수 있음
 */
const Z_INDEX_MOD = 10000;
const DEFAULT_ANIMATION_SPEED = 6 / FRAMES_PER_SECOND; // 10 fps

export type IObject = Container & {
  _loaded: boolean;
  _iSprite: ISprite;
  _iSpriteMap: ISpriteMap;
  _dir: Direction;
  _iZIndex: number;
  load(): Promise<void>
  isLoaded(): boolean;
  getSprite(): Sprite;
  getCollisionMod(): Coords;
  getCollisionArea(): Coords;
  getWidth(): number;
  getHeight(): number;
  getZIndex(): number;
  setZIndex(zIndex: number): IObject;
  getPos(): Pos;
  setPos(pos: Pos): IObject;
  getDirection(): Direction;
  setDirection(dir: Direction): IObject;
  play(acc?: number, playPosition?: number): IObject;
  stop(): IObject;
  getCenterPos(): Pos;
  change(key: string): IObject;
  emit(key:string, data:any):IObject;
  reaction(): Promise<void>
};

export const IObjectPrototype: IObject = Object.assign(Object.create(Container.prototype), {
  async load() {
    await Promise.all(Object.values(this._iSpriteMap).map((iSprite) => iSprite.load()));
    this._iSprite = this._iSpriteMap.default;
    this._loaded = true;
  },
  isLoaded() {
    return this._loaded;
  },
  getSprite() {
    const sprite = this._iSprite?.getSprite(this._dir);
    if (!sprite) {
      throw new Error('[IObject.getSprite] no iSprite');
    }
    return sprite;
  },
  getCollisionMod() {
    const collisionMod = this._iSprite?.getCollisionMod(this._dir);
    if (!collisionMod) {
      throw new Error('[IObject.getSprite] no collision mod');
    }
    return collisionMod;
  },
  getCollisionArea() {
    const [x, y] = this.getPos();
    const [, , colsW, colsH] = this.getCollisionMod();
    return [x, y, colsW, colsH] as Coords;
  },
  getWidth() {
    return this.getCollisionMod()[2];
  },
  getHeight() {
    return this.getCollisionMod()[3];
  },
  getZIndex() {
    return this._iZIndex;
  },
  setZIndex(zIndex: number) {
    this._iZIndex = zIndex;
    this.zIndex = zIndex * Z_INDEX_MOD + this.y + this.height;
  },
  getPos(): Pos {
    const [modX, modY] = this.getCollisionMod();
    return [this.x + modX, this.y + modY];
  },
  setPos([x, y]: Pos) {
    const [modX, modY] = this.getCollisionMod();
    this.x = x - modX;
    this.y = y - modY;
    this.setZIndex(this._iZIndex);
    return this;
  },
  getDirection() {
    return this._dir;
  },
  setDirection(nextDir: Direction) {
    const lastDir = this._dir;
    if (lastDir === nextDir) {
      return this;
    }
    if (!this.isLoaded()) {
      return this;
    }
    const curSprite = this.getSprite();
    this._dir = nextDir;
    const nextSprite = this.getSprite();
    if (curSprite instanceof AnimatedSprite) {
      this.stop();
    }
    this.removeChild(curSprite);
    this.addChild(nextSprite);
    return this;
  },
  play(acc = 1, playPosition?: number) {
    const sprite = this.getSprite();
    if (!(sprite instanceof AnimatedSprite)) {
      throw new Error('[IObject.play] Not an animation.');
    }
    if (!sprite.playing) {
      if (playPosition === undefined) {
        sprite.play();
      } else {
        sprite.gotoAndPlay(playPosition);
      }
    }
    sprite.animationSpeed = acc * DEFAULT_ANIMATION_SPEED;
    return this;
  },
  stop() {
    const sprite = this.getSprite();
    if (!(sprite instanceof AnimatedSprite)) {
      throw new Error('[IObject.stop] Not an animation.');
    }
    if (!sprite.playing) {
      return this;
    }
    sprite.stop();
    return this;
  },
  getCenterPos() {
    const [x, y] = this.getPos();
    return [x + this.getWidth() / 2, y + this.getHeight() / 2];
  },
  change(spriteKey: string) {
    const nextSprite = this._iSpriteMap[spriteKey];
    if (!nextSprite) {
      throw new Error('[IObject.change] No the sprite.');
    }
    try {
      this.removeChild(this.getSprite());
      this.stop();
    } catch (e) {
      if (!`${e}`.includes('[Object.')) {
        throw e;
      }
    }
    this._iSprite = nextSprite;
    this.addChild(this._iSprite.getSprite(this._dir));
    const lastSprite = this.getSprite();
    if (lastSprite instanceof AnimatedSprite) {
      this.stop();
    }
  },
  emit(event: string, data: any) {
    console.error(event, data);
    return this;
  },
} as IObject);

export const IObjectMaker = {
  from(name: string, iSpriteMap: ISpriteMap) {
    const iObject = new Container() as IObject;
    Object.setPrototypeOf(iObject, IObjectPrototype);
    iObject.name = name;
    iObject._loaded = false;
    iObject._iSpriteMap = iSpriteMap;
    iObject._dir = 'down';
    iObject._iZIndex = 1;
    return iObject;
  },
};
