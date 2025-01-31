import { BehaviorSubject, Observable } from "rxjs";

import { NamedBehaviorSubject } from "./named-behavior-subject";
import {ConstantReactiveCacheObservable} from "../src";

export interface ReactiveCacheObservableParameters<T> {
  allowManualUpdate?: boolean
  valueReachable?: boolean
  onNext?: (v: T | typeof EMPTY_SYMBOL) => void
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
  getValue: () => T
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

export const __REACTIVE_CACHE_WINDOW_PROP_NAME__ = '__REACTIVE_CACHE_DATA__'
export const __REACTIVE_CACHES_LIST__: NamedBehaviorSubject<any>[]
export const __REACTIVE_CACHES_ON_UPDATE_MAP__ = new WeakMap<NamedBehaviorSubject<any>, BehaviorSubject<any>>()
export const __REACTIVE_CACHES_LIST_UPDATE_OBSERVABLE__: BehaviorSubject<void>
export const EMPTY_SYMBOL: Symbol // this symbol is needed, coz state can be null | undefined as value

/**
 * Creates a reactive cache with a name in debugger
 */
export function reactiveCache<T>(name: string, updateRecourse$: UpdateRecourseType<T>, params?: ReactiveCacheObservableParameters<T>): ReactiveCacheObservable<T> {}

/**
 * Creates a reactiveCache that does not allow next() method
 */
reactiveCache.readonly = function<T>(name: string, updateRecourse$: UpdateRecourseType<T>, params?: Omit<ReactiveCacheObservableParameters<T>, 'allowManualUpdate'>): ImmutableReactiveCacheObservable<T> {};
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
  params?: Omit<ReactiveCacheObservableParameters<T>, 'valueReachable'>
): ValueReachableObservable<T> {};

/**
 * Creates a reactive cache with anonymous name in debugger
 */
reactiveCache.anonymous = function<T>(updateRecourse$: UpdateRecourseType<T>, params?: ReactiveCacheObservableParameters<T>): ReactiveCacheObservable<T> {};

reactiveCache.constant = function <T>(name: string, updateRecourse$: UpdateRecourseType<T>): ConstantReactiveCacheObservable<T> {}

export function __createReactiveCache__<T>(
  updateRecourse$: UpdateRecourseType<T>,
  params?: ReactiveCacheObservableParameters<T> & { name?: string, constant?: boolean, defaultValue?: T },
  onData?: (v: T | typeof EMPTY_SYMBOL) => void,
  onComplete?: () => void,
): {
  name: string,
  state$: NamedBehaviorSubject<T | typeof EMPTY_SYMBOL>,
  rc: ReactiveCacheObservable<T> | ValueReachableObservable<T> | ImmutableReactiveCacheObservable<T> | ConstantReactiveCacheObservable<T>
} {}