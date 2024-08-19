# Reactive Cache

<a href="https://www.npmjs.com/package/@reactive-cache/core?activeTab=readme">
    <img src="https://img.shields.io/badge/npm-CB3837?style=for-the-badge&logo=npm&logoColor=white" />
</a>

## Installation

```bash
npm install reactive-cache
```


## Usage

```typescript
import { reactiveCache } from 'reactive-cache';

const data = reactiveCache(fetch('https://...'));

data.subscribe(console.log);
```

### Angular like

```typescript
import { reactiveCache } from '@reactive-cache/core';
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
```