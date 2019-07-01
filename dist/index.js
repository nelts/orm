"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const pathToRegexp = require("path-to-regexp");
function Cacheable(path) {
    const toPathRegexp = pathToRegexp.compile(path);
    return (target, property, descriptor) => {
        const callback = descriptor.value;
        if (callback._rewrited)
            throw new Error('cannot use `@Cacheable` more then once');
        descriptor.value = function (...args) {
            const ctx = this.ctx;
            const that = this;
            if (!ctx.redis)
                throw new Error('@Cacheable must setup redis option.');
            return {
                async set(pathParams, expire) {
                    pathParams = pathParams || {};
                    const key = toPathRegexp(pathParams).replace(/\//g, ':');
                    const result = await this.invoke();
                    if (result !== null && result !== undefined) {
                        await ctx.redis.set(key, result, expire);
                    }
                    return result;
                },
                async get(pathParams, expire) {
                    pathParams = pathParams || {};
                    const key = toPathRegexp(pathParams).replace(/\//g, ':');
                    let result = await ctx.redis.get(key);
                    if (result === undefined)
                        result = await this.set(pathParams, expire);
                    return result;
                },
                async delete(pathParams) {
                    pathParams = pathParams || {};
                    const key = toPathRegexp(pathParams).replace(/\//g, ':');
                    if (await ctx.redis.exists(key)) {
                        await ctx.redis.delete(key);
                    }
                },
                async invoke() {
                    return await callback.call(that, ...args);
                }
            };
        };
        descriptor.value._rewrited = true;
    };
}
exports.Cacheable = Cacheable;
