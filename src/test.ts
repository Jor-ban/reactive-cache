import {EMPTY_SYMBOL, reactiveCache} from './index';
import {first, map, Observable, tap} from "rxjs";
import {ImmutableReactiveCacheObservable} from "./index.js";

function expectNotificationsToCome<T>(name: string, obs: Observable<T>, expectedValue: T): Promise<void> {
  return new Promise((res, rej) => {
    const sub = obs.pipe(first()).subscribe((value) => {
      if(value === expectedValue) {
        console.log(' > ' + name + ' has emitted successfully [' + value + ']');
        res()
        setTimeout(() => {
          sub.unsubscribe()
        })
      } else if(value !== EMPTY_SYMBOL) {
        rej('===== ' + name + ' has not accessed successfully [' + value + '] - expected: {' + expectedValue + '}')
      }
    })

    setTimeout(() => {
      rej('===== ' + name + ' has not completed successfully, expected to be: ' + expectedValue)
    }, 1000);
  })
}

function expectReadonlyNotificationsToCome<T>(name: string, obs: Observable<T> & { update: () => Observable<any> }, expectedValue: string): Promise<void> {
  return new Promise((res, rej) => {
    const sub = obs.pipe(first()).subscribe((value) => {
      if(value === expectedValue) {
        res();
        console.log(' > ' + name + ' has emitted successfully [' + value + ']');
        setTimeout(() => {
          sub.unsubscribe()
        })
      }
    })

    setTimeout(() => {
      rej('===== ' + name + ' has not completed successfully, expected to be: ' + expectedValue)
    }, 1000);
  })
}

function expectGetValueToBe<T, R>(name: string, obs: ImmutableReactiveCacheObservable<T> & { getValue: () => T | R }, expectedValue: T | R) {
  const value = obs.getValue();
  if(value !== expectedValue) {
    throw new Error('===== ' + name + ' has not accessed successfully [' + value + '] - expected: {' + expectedValue + '}');
  }
  console.log(' > ' + name + ' has accessed successfully [' + value + ']');
}


const rc = reactiveCache<string>('test', new Observable(sub => {
  setTimeout(() => {
    sub.next('initial1')
    sub.complete()
  }, 100)
}));
await expectNotificationsToCome('rc', rc, 'initial1');

const vr = reactiveCache.valueReadable<string>('valueReachable', new Observable(sub => {
  setTimeout(() => {
    sub.next('initial2')
    sub.complete()
  }, 100)
}));
expectGetValueToBe('valueReachableDefault', vr, undefined)
const vrWithDefaultValue = reactiveCache.valueReadable<string>('valueReachable', new Observable(sub => sub.next('Hello')), 'Nihao')
expectGetValueToBe('valueReachableWithDefaultValue', vrWithDefaultValue, 'Nihao')
await expectNotificationsToCome('vr', vr, 'initial2');
expectGetValueToBe('valueReachable', vr, 'initial2');

const piped = reactiveCache.valueReadable('piped', vr.pipe(
  tap(v => console.log('vr piped', v)),
  map(v => v.split('').reverse().join(''))
));
piped.subscribe()
await expectNotificationsToCome('piped', piped, '2laitini');
expectGetValueToBe('piped', piped, '2laitini');

vr.next('VR NEXT')
await expectNotificationsToCome('VR NEXT', vr, 'VR NEXT');
await expectNotificationsToCome('piped NEXT', piped, 'TXEN RV');

const ro = reactiveCache.readonly<string>('readonly', new Observable(sub => {
  setTimeout(() => {
    sub.next('READONLY')
    sub.complete()
  }, 100)
}));
await expectReadonlyNotificationsToCome('readonly', ro, 'READONLY');

const ra = reactiveCache.anonymous<string>(new Observable(sub => {
  setTimeout(() => {
    sub.next('initial')
    sub.complete()
  }, 100)
}));
await expectNotificationsToCome('ra', ra, 'initial');

const anonymousPiped = reactiveCache.valueReadable('anonymousPiped', ra.pipe(map(v => v.split('').reverse().join(''))));
anonymousPiped.subscribe()
await expectNotificationsToCome('anonymousPiped', anonymousPiped, 'laitini');

ra.next('RA NEXT')
await expectNotificationsToCome('RA NEXT', ra, 'RA NEXT');
expectGetValueToBe('anonymousPiped NEXT', anonymousPiped, 'TXEN AR');

const constantParent = reactiveCache('constantParent', 'CONSTANT');
const c = reactiveCache.constant('constant', constantParent);

await expectNotificationsToCome('CONSTANT', c, 'CONSTANT');
constantParent.next('NO_MORE_CONSTANT');
await expectNotificationsToCome('NO_MORE_CONSTANT', c, 'CONSTANT');

process.exit(0)

// const parent = reactiveCache('parent', interval(1000).pipe(map(() => Math.random())));
//
// const child = reactiveCache('child', parent.pipe(map(v => v * 2)));
// child.subscribe(console.log);