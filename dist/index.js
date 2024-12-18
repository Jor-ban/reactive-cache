import { BehaviorSubject, defer, exhaustMap, filter, from, Observable, switchMap, tap } from "rxjs";
import { NamedBehaviorSubject } from "./named-behavior-subject";
export const __REACTIVE_CACHES_LIST__ = [];
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__ = new BehaviorSubject(undefined);
export const EMPTY_SYMBOL = Symbol("[UPDATABLE CACHE] EMPTY");
let WINDOW;
try {
    WINDOW = window || this;
}
catch (_ignored) { }
if (WINDOW && typeof WINDOW === 'object') {
    const propName = '__REACTIVE_CACHE_DATA__';
    WINDOW[propName] = {};
    WINDOW[propName]['__REACTIVE_CACHES_LIST__'] = __REACTIVE_CACHES_LIST__;
    WINDOW[propName]['__REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__'] = __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__;
    WINDOW[propName]['EMPTY_SYMBOL'] = EMPTY_SYMBOL;
}
export function reactiveCache(name, updateRecourse$, params) {
    return createRCWithTracking(updateRecourse$, Object.assign({ name }, params));
}
reactiveCache.readonly = function (name, updateRecourse$, params) {
    return createRCWithTracking(updateRecourse$, Object.assign({ name, allowManualUpdate: false }, params));
};
reactiveCache.valueReadable = function (name, updateRecourse$, defaultValue, params) {
    return createRCWithTracking(updateRecourse$, Object.assign({ name, defaultValue, valueReachable: true }, params));
};
reactiveCache.anonymous = function (updateRecourse$, params) {
    return createRCWithTracking(updateRecourse$, params);
};
reactiveCache.constant = function (name, updateRecourse$) {
    return createRCWithTracking(updateRecourse$, { name, constant: true });
};
function createRCWithTracking(updateRecourse$, params) {
    const { rc, state$ } = __createReactiveCache__(updateRecourse$, params, () => {
        const index = __REACTIVE_CACHES_LIST__.indexOf(state$);
        if (index !== -1) {
            __REACTIVE_CACHES_LIST__.splice(index, 1);
        }
        __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();
    });
    __REACTIVE_CACHES_LIST__.push(state$);
    __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();
    return rc;
}
export function __createReactiveCache__(updateRecourse$, params, onComplete) {
    var _a;
    let name = (_a = params === null || params === void 0 ? void 0 : params.name) !== null && _a !== void 0 ? _a : '[UNNAMED]';
    const state$ = new NamedBehaviorSubject(EMPTY_SYMBOL, name);
    const isReactiveCacheObservable = true;
    let _updateProceeding = false;
    const nonEmptyStateRef$ = state$.pipe(filter((value) => value !== EMPTY_SYMBOL));
    if (params === null || params === void 0 ? void 0 : params.constant) {
        return {
            name, state$,
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
    function getObservable() {
        return state$.pipe(exhaustMap((value) => {
            if (_updateProceeding || value !== EMPTY_SYMBOL) {
                return state$.pipe(filter(v => v !== EMPTY_SYMBOL));
            }
            else {
                return update();
            }
        }));
    }
    function getConstantObservable() {
        const obs = getObservable();
        let subscription;
        return defer(() => {
            if (!subscription && state$.value === EMPTY_SYMBOL) {
                subscription = obs.subscribe();
            }
            return obs.pipe(tap({
                next: () => {
                    subscription === null || subscription === void 0 ? void 0 : subscription.unsubscribe();
                    subscription = undefined;
                }
            }));
        });
    }
    function next(newState) {
        var _a;
        state$.next(newState);
        (_a = params === null || params === void 0 ? void 0 : params.onNext) === null || _a === void 0 ? void 0 : _a.call(params, newState);
    }
    function resetState() {
        state$.next(EMPTY_SYMBOL);
    }
    function complete() {
        onComplete === null || onComplete === void 0 ? void 0 : onComplete();
        state$.complete();
    }
    function update() {
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
            return nonEmptyStateRef$;
        }
        else {
            state$.next(updateRecourse$);
            return nonEmptyStateRef$;
        }
    }
    function getValue() {
        var _a;
        if (state$.getValue() !== EMPTY_SYMBOL) {
            return state$.getValue();
        }
        return (_a = params === null || params === void 0 ? void 0 : params.defaultValue) !== null && _a !== void 0 ? _a : null;
    }
    function requestUpdateFromObservable(updateRecourse) {
        return updateRecourse.pipe(tap({
            next: (value) => {
                next(value);
                _updateProceeding = false;
            },
            error: () => {
                _updateProceeding = false;
            },
        }), switchMap(() => nonEmptyStateRef$));
    }
}
