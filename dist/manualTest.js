import { reactiveCache } from './index';
import axios from 'axios';
import { map } from "rxjs";
const cachedObservable = reactiveCache("cachedObservable", axios.get("https://jsonplaceholder.typicode.com/todos/1").then((response) => response.data));
cachedObservable
    .pipe(map((todo) => "Author id is: " + todo.userId))
    .subscribe(console.log);
cachedObservable
    .pipe(map((todo) => "Title is: " + todo.title))
    .subscribe(console.log);
