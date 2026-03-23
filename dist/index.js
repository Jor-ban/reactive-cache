import { BehaviorSubject, defer, exhaustMap, filter, from, Observable, switchMap, tap } from "rxjs";
import { NamedBehaviorSubject } from "./named-behavior-subject.js";
export const __REACTIVE_CACHE_WINDOW_PROP_NAME__ = '__REACTIVE_CACHE_DATA__';
export const __REACTIVE_CACHES_LIST__ = [];
export const __REACTIVE_CACHES_ON_UPDATE_MAP__ = new WeakMap();
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__ = new BehaviorSubject(undefined);
export const EMPTY_SYMBOL = Symbol("[UPDATABLE CACHE] EMPTY");
let WINDOW = null;
try {
    WINDOW = window || this;
}
catch (_ignored) { }
if (WINDOW && typeof WINDOW === 'object') {
    if (!WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]) {
        WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__] = {};
    }
    WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]['__REACTIVE_CACHES_LIST__'] = __REACTIVE_CACHES_LIST__;
    WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]['__REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__'] = __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__;
    WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]['EMPTY_SYMBOL'] = EMPTY_SYMBOL;
}
export const reactiveCache = (name, updateRecourse$, params) => {
    return createRCWithTracking(updateRecourse$, Object.assign({ name }, params));
};
reactiveCache.readonly = (name, updateRecourse$, params) => {
    return createRCWithTracking(updateRecourse$, Object.assign({ name, allowManualUpdate: false }, params));
};
reactiveCache.valueReadable = (name, updateRecourse$, defaultValue, params) => {
    return createRCWithTracking(updateRecourse$, Object.assign({ name, defaultValue, valueReachable: true }, params));
};
reactiveCache.anonymous = (updateRecourse$, params) => {
    return createRCWithTracking(updateRecourse$, params);
};
reactiveCache.constant = (name, updateRecourse$) => {
    return createRCWithTracking(updateRecourse$, { name, constant: true });
};
const createRCWithTracking = (updateRecourse$, params) => {
    const { rc, state$, nil } = __createReactiveCache__(updateRecourse$, params, (data) => {
        var _a;
        if (!__REACTIVE_CACHES_ON_UPDATE_MAP__.has(state$)) {
            __REACTIVE_CACHES_ON_UPDATE_MAP__.set(state$, new BehaviorSubject(nil));
        }
        (_a = __REACTIVE_CACHES_ON_UPDATE_MAP__.get(state$)) === null || _a === void 0 ? void 0 : _a.next(data);
    }, () => {
        const index = __REACTIVE_CACHES_LIST__.indexOf(state$);
        if (index !== -1) {
            __REACTIVE_CACHES_LIST__.splice(index, 1);
        }
        __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();
    });
    if (!__REACTIVE_CACHES_ON_UPDATE_MAP__.has(state$)) {
        __REACTIVE_CACHES_ON_UPDATE_MAP__.set(state$, new BehaviorSubject(nil));
    }
    __REACTIVE_CACHES_LIST__.push(state$);
    __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();
    return rc;
};
export const __createReactiveCache__ = (updateRecourse$, params, onData, onComplete) => {
    var _a;
    let name = (_a = params === null || params === void 0 ? void 0 : params.name) !== null && _a !== void 0 ? _a : '[UNNAMED]';
    let patchedState = null;
    let nil = (params && 'nil' in params ? params.nil : EMPTY_SYMBOL);
    const state$ = new NamedBehaviorSubject(nil, name);
    const isReactiveCacheObservable = true;
    if (params) {
        params.onNext = params.onNext || (() => {
            patchState();
        });
    }
    else {
        params = {
            onNext: () => {
                patchState();
            }
        };
    }
    let _updateProceeding = false;
    const nonEmptyStateRef$ = state$.pipe(filter((value) => value !== nil));
    const getObservable = () => state$.pipe(exhaustMap((value) => {
        if (_updateProceeding || value !== nil) {
            return state$.pipe(filter(v => v !== nil));
        }
        else {
            return update();
        }
    }));
    const getConstantObservable = () => {
        const obs = getObservable();
        let subscription;
        return defer(() => {
            if (!subscription && state$.value === nil) {
                subscription = obs.subscribe();
            }
            return obs.pipe(tap({
                next: () => {
                    subscription === null || subscription === void 0 ? void 0 : subscription.unsubscribe();
                    subscription = undefined;
                }
            }));
        });
    };
    const next = (newState) => {
        var _a;
        state$.next(newState);
        (_a = params === null || params === void 0 ? void 0 : params.onNext) === null || _a === void 0 ? void 0 : _a.call(params, newState);
        onData === null || onData === void 0 ? void 0 : onData(newState);
    };
    const resetState = () => {
        var _a;
        state$.next(nil);
        (_a = params === null || params === void 0 ? void 0 : params.onNext) === null || _a === void 0 ? void 0 : _a.call(params, nil);
        onData === null || onData === void 0 ? void 0 : onData(nil);
    };
    const complete = () => {
        onComplete === null || onComplete === void 0 ? void 0 : onComplete();
        state$.complete();
    };
    const update = () => {
        if (updateRecourse$ instanceof Observable) {
            _updateProceeding = true;
            return requestUpdateFromObservable(updateRecourse$);
        }
        else if (updateRecourse$ instanceof Promise) {
            _updateProceeding = true;
            return requestUpdateFromObservable(from(updateRecourse$));
        }
        else if (updateRecourse$ instanceof Function) {
            _updateProceeding = true;
            const result = updateRecourse$();
            if (result instanceof Promise) {
                return requestUpdateFromObservable(from(result));
            }
            else if (result instanceof Observable) {
                return requestUpdateFromObservable(result);
            }
            state$.next(result);
            onData === null || onData === void 0 ? void 0 : onData(result);
            return nonEmptyStateRef$;
        }
        else {
            state$.next(updateRecourse$);
            onData === null || onData === void 0 ? void 0 : onData(updateRecourse$);
            return nonEmptyStateRef$;
        }
    };
    const getValue = () => {
        if (state$.getValue() !== EMPTY_SYMBOL) {
            return state$.getValue();
        }
        return params === null || params === void 0 ? void 0 : params.defaultValue;
    };
    const patchState = () => {
        if (patchedState !== null) {
            void Promise.resolve(() => {
                state$.next(patchedState);
                patchedState = null;
            });
        }
    };
    const requestUpdateFromObservable = (updateRecourse) => {
        return updateRecourse.pipe(tap({
            next: (value) => {
                next(value);
                _updateProceeding = false;
            },
            error: () => {
                _updateProceeding = false;
            },
        }), switchMap(() => nonEmptyStateRef$));
    };
    if (params === null || params === void 0 ? void 0 : params.constant) {
        return {
            name, state$,
            nil,
            rc: Object.assign(getConstantObservable(), {
                getObservable: getConstantObservable,
                isReactiveCacheObservable,
            })
        };
    }
    if ((params === null || params === void 0 ? void 0 : params.allowManualUpdate) === false) {
        if (params === null || params === void 0 ? void 0 : params.valueReachable) {
            return {
                name, state$,
                nil,
                rc: Object.assign(getObservable(), {
                    getObservable,
                    update,
                    complete,
                    resetState,
                    getValue,
                    isReactiveCacheObservable,
                })
            };
        }
        else {
            return {
                name, state$,
                nil,
                rc: Object.assign(getObservable(), {
                    getObservable,
                    update,
                    complete,
                    resetState,
                    isReactiveCacheObservable,
                })
            };
        }
    }
    if (params === null || params === void 0 ? void 0 : params.valueReachable) {
        return {
            name, state$,
            nil,
            rc: Object.assign(getObservable(), {
                getObservable,
                next,
                resetState,
                update,
                complete,
                getValue,
                isReactiveCacheObservable,
            })
        };
    }
    else {
        return {
            name, state$,
            nil,
            rc: Object.assign(getObservable(), {
                getObservable,
                next,
                resetState,
                update,
                complete,
                isReactiveCacheObservable,
            })
        };
    }
};
