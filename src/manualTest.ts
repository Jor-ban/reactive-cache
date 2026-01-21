import {reactiveCache} from './index';
import axios from 'axios';
import { find, map } from "rxjs";

type Todo = {
  userId: number;
  id: number;
  title: string;
  completed: boolean;
};

const cachedObservable = reactiveCache<Todo>(
  "cachedObservable",
  axios.get<Todo>("https://jsonplaceholder.typicode.com/todos/1").then((response) => response.data)
);

cachedObservable
  .pipe(map((todo: Todo) => "Author id is: " + todo.userId))
  .subscribe(console.log);

cachedObservable
  .pipe(map((todo: Todo) => "Title is: " + todo.title))
  .subscribe(console.log);