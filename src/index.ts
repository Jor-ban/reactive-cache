import {BehaviorSubject, defer, exhaustMap, filter, from, Observable, Subscription, switchMap, tap} from "rxjs";
import {NamedBehaviorSubject} from "./named-behavior-subject";

export interface ReactiveCacheObservable<T> extends Observable<T> {
  getObservable: () => Observable<T>
  next: (newState: T) => void
  resetState: () => void
  update: () => Observable<T>
  complete: () => void
  isReactiveCacheObservable: true
}

export interface ReactiveCacheObservableParameters<T, Nil = typeof EMPTY_SYMBOL> {
  allowManualUpdate?: boolean
  valueReachable?: boolean
  nil?: Nil
  onNext?: (v: T | Nil) => void
}

export interface ValueReachableObservable<T> extends ReactiveCacheObservable<T> {
  getValue: () => T
  isReactiveCacheObservable: true
}

export interface ConstantReactiveCacheObservable<T> extends Observable<Readonly<T>> {
  getObservable: () => Observable<Readonly<T>>
}

export interface ImmutableReactiveCacheObservable<T> extends Observable<Readonly<T>> {
  getObservable: () => Observable<Readonly<T>>
  resetState: () => void
  update: () => Observable<Readonly<T>>
  complete: () => void
}


export type UpdateRecourseType<T> = Observable<T> | ((...args: unknown[]) => T | Observable<T> | Promise<T>) | Promise<T> | T

export const __REACTIVE_CACHE_WINDOW_PROP_NAME__ = '__REACTIVE_CACHE_DATA__'
export const __REACTIVE_CACHES_LIST__: NamedBehaviorSubject<any>[] = [];
export const __REACTIVE_CACHES_ON_UPDATE_MAP__ = new WeakMap<NamedBehaviorSubject<any>, BehaviorSubject<any>>()
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__ = new BehaviorSubject<void>(undefined)
export const EMPTY_SYMBOL = Symbol("[UPDATABLE CACHE] EMPTY"); // this symbol is needed, coz state can be null | undefined as value
let WINDOW: Window | null = null
try {
  WINDOW = window || this
} catch (_ignored) {}

if(WINDOW && typeof WINDOW === 'object') {
  // @ts-ignore
  if(!WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]) {
    // @ts-ignore
    WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__] = {}
  }
  // @ts-ignore
  WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]['__REACTIVE_CACHES_LIST__'] = __REACTIVE_CACHES_LIST__;
  // @ts-ignore
  WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]['__REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__'] = __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__;
  // @ts-ignore
  WINDOW[__REACTIVE_CACHE_WINDOW_PROP_NAME__]['EMPTY_SYMBOL'] = EMPTY_SYMBOL;
}

export const reactiveCache = <T>(name: string, updateRecourse$: UpdateRecourseType<T>, params?: ReactiveCacheObservableParameters<T>): ReactiveCacheObservable<T> => {
  return createRCWithTracking(updateRecourse$, { name, ...params }) as ReactiveCacheObservable<T>;
}

reactiveCache.readonly = <T>(
  name: string,
  updateRecourse$: UpdateRecourseType<T>,
  params?: Omit<ReactiveCacheObservableParameters<T>, 'allowManualUpdate'>
): ImmutableReactiveCacheObservable<T> => {
  return createRCWithTracking(updateRecourse$, { name, allowManualUpdate: false, ...params }) as ImmutableReactiveCacheObservable<T>
};

reactiveCache.valueReadable = <T>(
  name: string,
  updateRecourse$: UpdateRecourseType<T>,
  defaultValue?: T,
  params?: Omit<ReactiveCacheObservableParameters<T>, 'valueReachable'>
): ValueReachableObservable<T> => {
  return createRCWithTracking(updateRecourse$, { name, defaultValue, valueReachable: true, ...params }) as ValueReachableObservable<T>
};

reactiveCache.anonymous = <T>(
  updateRecourse$: UpdateRecourseType<T>,
  params?: ReactiveCacheObservableParameters<T>
): ReactiveCacheObservable<T> => {
  return createRCWithTracking(updateRecourse$, params) as ReactiveCacheObservable<T>;
};

reactiveCache.constant = <T>(
  name: string,
  updateRecourse$: UpdateRecourseType<T>,
): ConstantReactiveCacheObservable<T> => {
  return createRCWithTracking(updateRecourse$, { name, constant: true }) as ConstantReactiveCacheObservable<T>;
}

const createRCWithTracking = <T, Nil>(updateRecourse$: UpdateRecourseType<T>, params ?: ReactiveCacheObservableParameters<T, Nil> & { name?: string, constant?: boolean, defaultValue?: T }): Observable<T> => {
  const { rc, state$, nil } = __createReactiveCache__<T, Nil>(
    updateRecourse$,
    params,
    (data) => {
      if(!__REACTIVE_CACHES_ON_UPDATE_MAP__.has(state$)) {
        __REACTIVE_CACHES_ON_UPDATE_MAP__.set(state$, new BehaviorSubject<T | Nil>(nil));
      }
      __REACTIVE_CACHES_ON_UPDATE_MAP__.get(state$)?.next(data);
    },
    () => {
      const index = __REACTIVE_CACHES_LIST__.indexOf(state$);
      if(index !== -1) {
        __REACTIVE_CACHES_LIST__.splice(index, 1);
      }
      __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();
    }
  );
  if(!__REACTIVE_CACHES_ON_UPDATE_MAP__.has(state$)) {
    __REACTIVE_CACHES_ON_UPDATE_MAP__.set(state$, new BehaviorSubject<T | Nil>(nil));
  }
  __REACTIVE_CACHES_LIST__.push(state$);
  __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();

  return rc
}

export const __createReactiveCache__ = <T, Nil = typeof EMPTY_SYMBOL>(
  updateRecourse$: UpdateRecourseType<T>,
  params?: ReactiveCacheObservableParameters<T, Nil> & { name?: string, constant?: boolean, defaultValue?: T },
  onData?: (v: T | Nil) => void,
  onComplete?: () => void,
): {
  name: string,
  state$: NamedBehaviorSubject<T | Nil>,
  nil: Nil,
  rc: ReactiveCacheObservable<T> | ValueReachableObservable<T> | ImmutableReactiveCacheObservable<T> | ConstantReactiveCacheObservable<T>
} => {
  let name = params?.name ?? '[UNNAMED]';
  let patchedState: T | null = null
  let nil = (params && 'nil' in params ? params.nil : EMPTY_SYMBOL) as Nil;
  const state$ = new NamedBehaviorSubject<T | Nil>(nil as Nil, name);
  const isReactiveCacheObservable: true = true;

  if(params) {
    params.onNext = params.onNext || (() => {
      patchState()
    })
  } else {
    params = {
      onNext: () => {
        patchState()
      }
    }
  }

  let _updateProceeding = false;

  const nonEmptyStateRef$ = state$.pipe(
    filter((value: T | Nil): value is T | Nil => value !== nil)
  ) as Observable<T>;

  const getObservable = (): Observable<T> => state$.pipe(
      exhaustMap((value: T | Nil): Observable<T> => {
        if (_updateProceeding || value !== nil) {
          return state$.pipe(filter(v => v !== nil)) as Observable<T>;
        } else {
          return update();
        }
      })
  )

  const getConstantObservable = (): Observable<T> => {
    const obs = getObservable()
    let subscription: Subscription | undefined

    return defer(() => {
      if (!subscription && state$.value === nil) {
        subscription = obs.subscribe()
      }

      return obs.pipe(
          tap({
            next: () => {
              subscription?.unsubscribe();
              subscription = undefined;
            }
          })
      )
    })
  }

  /**
   *
   * @note: not recommended to use this method.
   * @param newState
   * @description Use this method to update state manually.
   */
  const next = (newState: T): void => {
    state$.next(newState);
    params?.onNext?.(newState);
    onData?.(newState);
  }

  const resetState = (): void => {
    state$.next(nil);
    params?.onNext?.(nil);
    onData?.(nil);
  }

  const complete = (): void => {
    onComplete?.();
    state$.complete();
  }

  const update = (): Observable<T> => {
    if (updateRecourse$ instanceof Observable) {
      _updateProceeding = true;

      return requestUpdateFromObservable(updateRecourse$);
    } else if(updateRecourse$ instanceof Promise) {
      _updateProceeding = true;

      return requestUpdateFromObservable(from(updateRecourse$))
    } else if (updateRecourse$ instanceof Function) {
      _updateProceeding = true;
      const result = updateRecourse$();

      if (result instanceof Promise) {
        return requestUpdateFromObservable(from(result));
      } else if (result instanceof Observable) {
        return requestUpdateFromObservable(result);
      }

      state$.next(result);
      onData?.(result);

      return nonEmptyStateRef$;
    } else {
      state$.next(updateRecourse$);
      onData?.(updateRecourse$);

      return nonEmptyStateRef$;
    }
  }

  const getValue = (): T => {
    if(state$.getValue() !== EMPTY_SYMBOL) {
      return state$.getValue() as T
    }
    // default value is required in this case
    return params?.defaultValue as T
  }

  const patchState = () => {
    if(patchedState !== null) {
      void Promise.resolve(() => {
        state$.next(patchedState!);
        patchedState = null
      })
    }
  }

  const requestUpdateFromObservable = (updateRecourse: Observable<T>): Observable<T> => {
    return updateRecourse.pipe(
        tap({
          next: (value) => {
            next(value);
            _updateProceeding = false;
          },
          error: () => {
            _updateProceeding = false
          },
        }),
        switchMap(() => nonEmptyStateRef$)
    );
  }

  if(params?.constant) {
    return {
      name, state$,
      nil,
      rc: Object.assign(getConstantObservable(), {
        getObservable: getConstantObservable,
        isReactiveCacheObservable,
      })
    }
  }

  if(params?.allowManualUpdate === false) {
    if(params?.valueReachable) {
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
      }
    } else {
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
      }
    }
  }

  if(params?.valueReachable) {
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
  } else {
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
    }
  }
}