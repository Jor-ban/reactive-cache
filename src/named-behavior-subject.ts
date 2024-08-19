import { BehaviorSubject } from "rxjs";

export class NamedBehaviorSubject<T> extends BehaviorSubject<T> {
  public constructor(initialValue: T, public readonly name: string) {
    super(initialValue);
  }
}
