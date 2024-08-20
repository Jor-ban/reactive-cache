//
// import { reactiveCache } from "@reactive-cache/core";
//
// const data = reactiveCache(fetch('https://...'));
//
// data.subscribe((value) => {
//   console.log(value);
// });

import { reactiveCache } from './index';
import { ajax } from 'rxjs/ajax';
import { Observable } from "rxjs";

export class FetchDataService {
  public data = reactiveCache<unknown>(this.fetchData.bind(this));

  private fetchData(): Observable<unknown> {
    return ajax.get('https://jsonplaceholder.typicode.com/posts');
  }
}

const service = new FetchDataService();
service.data.subscribe(console.log)