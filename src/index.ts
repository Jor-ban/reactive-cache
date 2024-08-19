import { isSignal, Signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";

import { BehaviorSubject, exhaustMap, filter, Observable, tap } from "rxjs";

import { NamedBehaviorSubject } from "./named-behavior-subject";

export const EMPTY_SYMBOL = Symbol("[UPDATABLE CACHE] EMPTY"); // this symbol is needed, coz state can be null | undefined

export interface ReactiveCacheObservable<T> extends Observable<T> {
  getObservable: () => Observable<T>;
  getSignal: (initialValue: T) => Signal<T>;
  manualUpdateState: (newState: T) => void;
  resetState: () => void;
  update: () => Observable<T>;
  complete: () => void;
}

export interface ReactiveCacheParams {
  name?: string;
}

export const __REACTIVE_CACHES_LIST__: NamedBehaviorSubject<any>[] = [];
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__ = new BehaviorSubject<void>(undefined)

export function reactiveCache<T>(updateObservable: Observable<T>, params?: ReactiveCacheParams,): ReactiveCacheObservable<T>;
export function reactiveCache<T>(updateFunction: (...args: unknown[]) => T | Observable<T>, params?: ReactiveCacheParams): ReactiveCacheObservable<T>;
export function reactiveCache<T>(updateSignal: Signal<T>, params?: ReactiveCacheParams): ReactiveCacheObservable<T>;
export function reactiveCache<T>(
  updateRecourse$: Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Signal<T>,
  params?: ReactiveCacheParams,
): ReactiveCacheObservable<T> {
  const name = params?.name || '[UNNAMED] '  + new Error().stack?.split("\n")[4].trim().split(" ")[1];
  const _state$ = new NamedBehaviorSubject<T | typeof EMPTY_SYMBOL>(EMPTY_SYMBOL, name);

  let _updateProceeding = false;

  __REACTIVE_CACHES_LIST__.push(_state$);
  __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();

  return Object.assign(getObservable(), {
    getObservable,
    getSignal,
    manualUpdateState,
    resetState,
    update,
    complete,
  }) as ReactiveCacheObservable<T>;

  function getObservable(): Observable<T> {
    return _state$.pipe(
      exhaustMap((value: T | typeof EMPTY_SYMBOL): Observable<T> => {
        if (_updateProceeding || value !== EMPTY_SYMBOL) {
          return _state$.pipe(filter(v => v !== EMPTY_SYMBOL)) as Observable<T>;
        } else {
          return update();
        }
      })
    );
  }

  function getSignal(initialValue: T): Signal<T> {
    return toSignal(getObservable(), { initialValue });
  }

  /**
   *
   * @note: not recommended to use this method.
   * @param newState
   * @description Use this method to update state manually.
   */
  function manualUpdateState(newState: T): void {
    _state$.next(newState);
  }

  function resetState(): void {
    _state$.next(EMPTY_SYMBOL);
  }

  function complete(): void {
    __REACTIVE_CACHES_LIST__.splice(__REACTIVE_CACHES_LIST__.indexOf(_state$), 1);
    __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();
    _state$.complete();
  }

  function update(): Observable<T> {
    if (updateRecourse$ instanceof Observable) {
      _updateProceeding = true;

      return requestUpdateFromObservable(updateRecourse$);
    } else if(isSignal(updateRecourse$)) {
      _updateProceeding = true;

      return toObservable(updateRecourse$ as Signal<T>)
    } else {
      _updateProceeding = true;
      const result = updateRecourse$();

      if (result instanceof Observable) {
        return requestUpdateFromObservable(result);
      }

      _state$.next(result);

      return _state$.pipe(
        filter((value: T | typeof EMPTY_SYMBOL) => value !== EMPTY_SYMBOL)
      ) as Observable<T>;
    }
  }

  function requestUpdateFromObservable(updateRecourse: Observable<T>): Observable<T> {
    return updateRecourse.pipe(
      tap({
        error: () => _updateProceeding = false,
      }),
      exhaustMap((value) => {
        _state$.next(value);
        _updateProceeding = false;

        return _state$.pipe(
          filter((value: T | typeof EMPTY_SYMBOL) => value !== EMPTY_SYMBOL)
        ) as Observable<T>;
      })
    );
  }
}
