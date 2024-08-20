import { isSignal, Signal } from "@angular/core";
import { toObservable, toSignal } from "@angular/core/rxjs-interop";

import {BehaviorSubject, exhaustMap, filter, from, Observable, tap} from "rxjs";

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

export interface ImmutableReactiveCacheObservable<T> extends Observable<T> {
  getObservable: () => Observable<T>;
  getSignal: (initialValue: T) => Signal<T>;
  update: () => Observable<T>;
  complete: () => void;
}
export interface ReactiveCacheParams {
  name?: string;
  allowManualUpdate?: boolean;
}

type ReactiveCacheReturnType<T, PT extends ReactiveCacheParams> = PT extends { allowManualUpdate: false } ? ImmutableReactiveCacheObservable<T> : ReactiveCacheObservable<T>;

export const __REACTIVE_CACHES_LIST__: NamedBehaviorSubject<any>[] = [];
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__ = new BehaviorSubject<void>(undefined)

export function reactiveCache<T, PT extends ReactiveCacheParams = ReactiveCacheParams>(updateObservable: Observable<T>, params?: ReactiveCacheParams): ReactiveCacheReturnType<T, PT>;
export function reactiveCache<T, PT extends ReactiveCacheParams = ReactiveCacheParams>(updateFunction: (...args: unknown[]) => T | Observable<T>, params?: ReactiveCacheParams): ReactiveCacheReturnType<T, PT>;
export function reactiveCache<T, PT extends ReactiveCacheParams = ReactiveCacheParams>(updateSignal: Signal<T>, params?: ReactiveCacheParams): ReactiveCacheReturnType<T, PT>;
export function reactiveCache<T, PT extends ReactiveCacheParams = ReactiveCacheParams>(updatePromise: Promise<T>, params?: ReactiveCacheParams): ReactiveCacheReturnType<T, PT>;
export function reactiveCache<T, PT extends ReactiveCacheParams = ReactiveCacheParams>(valueItself: T, params?: ReactiveCacheParams): ReactiveCacheReturnType<T, PT>;
export function reactiveCache<T, PT extends ReactiveCacheParams = ReactiveCacheParams>(
  updateRecourse$: Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Signal<T> | Promise<T> | T,
  params?: PT,
): ReactiveCacheReturnType<T, PT> {
  const name = params?.name || '[UNNAMED] '  + new Error().stack?.split("\n")[4].trim().split(" ")[1];
  const _state$ = new NamedBehaviorSubject<T | typeof EMPTY_SYMBOL>(EMPTY_SYMBOL, name);

  let _updateProceeding = false;

  __REACTIVE_CACHES_LIST__.push(_state$);
  __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();

  const nonEmptyStateRef$ = _state$.pipe(
    filter((value: T | typeof EMPTY_SYMBOL) => value !== EMPTY_SYMBOL)
  ) as Observable<T>;

  if(params?.allowManualUpdate === false) {
    return Object.assign(getObservable(), {
      getObservable,
      getSignal,
      update,
      complete,
    }) as ReactiveCacheObservable<T>;
  }

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

      _state$.next(result);

      return nonEmptyStateRef$;
    } else {
      _state$.next(updateRecourse$);

      return nonEmptyStateRef$;
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

        return nonEmptyStateRef$;
      })
    );
  }
}
