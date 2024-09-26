import { BehaviorSubject, exhaustMap, filter, from, Observable, switchMap, tap } from "rxjs";

import { NamedBehaviorSubject } from "./named-behavior-subject";

export const EMPTY_SYMBOL = Symbol("[UPDATABLE CACHE] EMPTY"); // this symbol is needed, coz state can be null | undefined

export interface ReactiveCacheObservable<T> extends Observable<T> {
  getObservable: () => Observable<T>
  next: (newState: T) => void
  resetState: () => void
  update: () => Observable<T>
  complete: () => void
}

export interface ValueReachableObservable<T> extends ReactiveCacheObservable<T> {
  getValue: () => T
}

export interface ValueReachableImmutableObservable<T> extends ImmutableReactiveCacheObservable<T> {
  getValue: () => T
}

export interface ImmutableReactiveCacheObservable<T> extends Observable<T> {
  getObservable: () => Observable<T>
  update: () => Observable<T>
  complete: () => void
}

export const __REACTIVE_CACHES_LIST__: NamedBehaviorSubject<any>[] = [];
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__ = new BehaviorSubject<void>(undefined)

export function reactiveCache<T>(
  updateRecourse$: Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Promise<T> | T,
  params: { allowManualUpdate: false; valueReachable: true; name?: string }
): ValueReachableImmutableObservable<T>;
export function reactiveCache<T>(
  updateRecourse$: Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Promise<T> | T,
  params: { allowManualUpdate: false; name?: string }
): ImmutableReactiveCacheObservable<T>;
export function reactiveCache<T>(
  updateRecourse$: Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Promise<T> | T,
  params: { valueReachable: true; name?: string }
): ValueReachableObservable<T>;
export function reactiveCache<T>(
  updateRecourse$: Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Promise<T> | T,
  params?: { name?: string }
): ReactiveCacheObservable<T>;
export function reactiveCache<T>(
  updateRecourse$: Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Promise<T> | T,
  params?: { allowManualUpdate ?: boolean; valueReachable ?: boolean; name?: string },
): ReactiveCacheObservable<T> | ValueReachableObservable<T> | ImmutableReactiveCacheObservable<T> | ValueReachableImmutableObservable<T> {
  const name = params?.name || '[UNNAMED] '  + new Error().stack?.split("\n")[4].trim().split(" ")[1];
  const _state$ = new NamedBehaviorSubject<T | typeof EMPTY_SYMBOL>(EMPTY_SYMBOL, name);

  let _updateProceeding = false;

  __REACTIVE_CACHES_LIST__.push(_state$);
  __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__.next();

  const nonEmptyStateRef$ = _state$.pipe(
    filter((value: T | typeof EMPTY_SYMBOL) => value !== EMPTY_SYMBOL)
  ) as Observable<T>;

  if(params?.allowManualUpdate === false) {
    if(params?.valueReachable) {
      return Object.assign(getObservable(), {
        getObservable,
        update,
        complete,
        getValue: () => _state$.getValue(),
      });
    } else {
      return Object.assign(getObservable(), {
        getObservable,
        update,
        complete,
      });
    }
  }

  if(params?.valueReachable) {
    return Object.assign(getObservable(), {
      getObservable,
      next,
      resetState,
      update,
      complete,
      getValue: () => _state$.getValue(),
    });
  } else {
    return Object.assign(getObservable(), {
      getObservable,
      next,
      resetState,
      update,
      complete,
    });
  }

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

  /**
   *
   * @note: not recommended to use this method.
   * @param newState
   * @description Use this method to update state manually.
   */
  function next(newState: T): void {
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
        next: (value) => {
          _state$.next(value);
          _updateProceeding = false;
        },
        error: () => {
          _updateProceeding = false
        },
      }),
      switchMap(() => nonEmptyStateRef$)
    );
  }
}
