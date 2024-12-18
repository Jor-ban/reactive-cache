import { BehaviorSubject, Observable } from "rxjs";

import { NamedBehaviorSubject } from "./named-behavior-subject";
import {ConstantReactiveCacheObservable} from "../src";

export interface ReactiveCacheObservableParameters {
  allowManualUpdate?: boolean
  valueReachable?: boolean
  minTeardownTimeMs?: number
}

export interface ReactiveCacheObservable<T> extends Observable<T> {
  getObservable: () => Observable<T>
  next: (newState: T) => void
  resetState: () => void
  update: () => Observable<T>
  complete: () => void
  isReactiveCacheObservable: true
}

export interface ValueReachableObservable<T> extends ReactiveCacheObservable<T> {
  getValue: () => T | null
  isReactiveCacheObservable: true
}

export interface ImmutableReactiveCacheObservable<T> extends Observable<Readonly<T>> {
  getObservable: () => Observable<Readonly<T>>
  update: () => Observable<Readonly<T>>
  complete: () => void
  resetState: () => void
}

export interface ConstantReactiveCacheObservable<T> extends Observable<Readonly<T>> {
  getObservable: () => Observable<Readonly<T>>
}

export type UpdateRecourseType<T> = Observable<T> | ((...args: unknown[]) => T | Observable<T>) | Promise<T> | T

export const __REACTIVE_CACHES_LIST__: NamedBehaviorSubject<any>[]
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__: BehaviorSubject<void>
export const EMPTY_SYMBOL: Symbol // this symbol is needed, coz state can be null | undefined as value

/**
 * Creates a reactive cache with a name in debugger
 */
export function reactiveCache<T>(name: string, updateRecourse$: UpdateRecourseType<T>, params?: ReactiveCacheObservableParameters): ReactiveCacheObservable<T> {}

/**
 * Creates a reactiveCache that does not allow next() method
 */
reactiveCache.readonly = function<T>(name: string, updateRecourse$: UpdateRecourseType<T>, params?: Omit<ReactiveCacheObservableParameters, 'allowManualUpdate'>): ImmutableReactiveCacheObservable<T> {};
/**
 * Allows to read value in observable using getValue() method
 *
 * Use with caution, this function is not recommended to use, the data might be outdated if there is no persistent subscription
 * -----------------------
 */
reactiveCache.valueReadable = function<T>(
  name: string,
  updateRecourse$: UpdateRecourseType<T>,
  defaultValue?: T,
  params?: Omit<ReactiveCacheObservableParameters, 'valueReachable'>
): ValueReachableObservable<T> {};

/**
 * Creates a reactive cache with anonymous name in debugger
 */
reactiveCache.anonymous = function<T>(updateRecourse$: UpdateRecourseType<T>, params?: ReactiveCacheObservableParameters): ReactiveCacheObservable<T> {};

reactiveCache.constant = function <T>(name: string, updateRecourse$: UpdateRecourseType<T>): ConstantReactiveCacheObservable<T> {}

export function __createReactiveCache__<T>(
  updateRecourse$: UpdateRecourseType<T>,
  params?: ReactiveCacheObservableParameters<T> & { name?: string, constant?: boolean, defaultValue?: T },
  onComplete?: () => void
): {
  name: string,
  state$: NamedBehaviorSubject<T | typeof EMPTY_SYMBOL>,
  rc: ReactiveCacheObservable<T> | ValueReachableObservable<T> | ImmutableReactiveCacheObservable<T> | ConstantReactiveCacheObservable<T>
} {}