import { BehaviorSubject } from "rxjs";
export class NamedBehaviorSubject extends BehaviorSubject {
    constructor(initialValue, name) {
        super(initialValue);
        this.name = name;
    }
}
