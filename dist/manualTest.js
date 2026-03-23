import { reactiveCache } from './index';
import { first, map } from "rxjs";
import { ajax } from "rxjs/ajax";
const cachedTodo = reactiveCache("cachedObservable", ajax("https://jsonplaceholder.typicode.com/todos/1").pipe(map((respWithMetadata) => respWithMetadata.response)));
cachedTodo
    .pipe(map((todo) => "Author id is: " + todo.userId))
    .subscribe(console.log);
cachedTodo.pipe(map((todo) => "Title is: " + todo.userId)).subscribe(console.log);
cachedTodo
    .pipe(map((todo) => (todo.completed ? "Completed" : "Not completed")))
    .subscribe(console.log);
setTimeout(() => {
    cachedTodo.resetState();
    console.log("----------[ here the state resets ]-------------");
}, 5000);
setTimeout(() => {
    cachedTodo.pipe(map((todo) => "Todo id: " + todo.id)).subscribe(console.log);
}, 7000);
setTimeout(() => {
    console.log("-----------[ calling update ]------------");
    cachedTodo
        .update()
        .pipe(first())
        .subscribe(() => {
        console.log("---[ as you can see subscribers get update instantly ]---");
    });
}, 10000);
