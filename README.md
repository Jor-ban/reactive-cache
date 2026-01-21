# Reactive Cache

<a href="https://www.npmjs.com/package/@reactive-cache/core?activeTab=readme">
    <img src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" />
</a>

## Installation

```bash
$ npm install @reactive-cache/core
```


## Usage
```typescript
import { reactiveCache } from "@reactive-cache/core";
import { first, map } from "rxjs";
import { ajax } from "rxjs/ajax";

// lets just create an observable that makes http requests
const cachedTodo = reactiveCache<Todo>(
  "cachedObservable",
  ajax<Todo>("https://jsonplaceholder.typicode.com/todos/1").pipe(
    map((respWithMetadata) => respWithMetadata.response)
  )
);

// even tho the observable has many subscriptions, the request has not made again
cachedTodo
  .pipe(map((todo: Todo) => "Author id is: " + todo.userId))
  .subscribe(console.log);

cachedTodo.pipe(map((todo: Todo) => "Title is: " + todo.userId)).subscribe(console.log);

cachedTodo
  .pipe(map((todo: Todo) => (todo.completed ? "Completed" : "Not completed")))
  .subscribe(console.log);

setTimeout(() => {
  // the state just being droped and empty until a new subscription is emited
  cachedTodo.resetState();
  console.log("----------[ here the state resets ]-------------");
}, 5_000);

setTimeout(() => {
  // a new subscription has been emited, and all old subscribers instantly get new data
  cachedTodo.pipe(map((todo: Todo) => "Todo id: " + todo.id)).subscribe(console.log);
}, 7_000);

setTimeout(() => {
  console.log("-----------[ calling update ]------------");
  // now lets try to make it update itself without reseting
  cachedTodo
    .update()
    .pipe(first())
    .subscribe(() => {
      console.log("---[ as you can see subscribers get update instantly ]---");
    });
}, 10_000);
```
## Output

```bash
Title is: 1
Not completed
Author id is: 1
----------[ here the state resets ]-------------
Title is: 1
Not completed
Author id is: 1
Todo id: 1
-----------[ calling update ]------------
Title is: 1
Not completed
Author id is: 1
Todo id: 1
---[ as you can see subscribers get update instantly ]---
```

[![Edit reactive-cache-example](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/green-snow-yst6xw)