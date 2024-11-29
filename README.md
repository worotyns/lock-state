# LSS

Lock State Service for lock(s) management.

With just a few API calls, you can create, check, and modify your locks.

Sample usecases:

- Github actions - eg. like lock QA branch deployment when E2E testing is
  turning on etc,
- System CRONs, that can be "locked",
- Other cases when on system level (curl access) you want to stop executing in
  flow.

This service can be used for free with low workloads.

## Create new lock

HTTP **POST** `https://lock-states.deno.dev/locks`

### Url params:

- `l=true|1|T` optional if **set**, new lock will be "locked" by default
- `e=ttl_in_seconds` optional
- `k=custom_auth_key` optional custom auth key

### Returns:

- 200 = created

### Examples:

```sh
curl -X POST https://lock-states.deno.dev/locks            
{
    "lockId":"01hvkab4t422rap18rwjs2prnm",
    "lockKey":"b749f750-fbe3-11ee-9224-d7fd2399170d",
}
```

`lockId` is your lock identity and `lockKey` you should use as ?k=<lockKey> url
param when you want to **lock/unlock**

This lock will be locked by default and expire after 60 seconds

```sh
curl -X POST https://lock-states.deno.dev/locks?l=t&e=60           
{
    "lockId":"01hvkab4t422rap18rwjs2prnm",
    "lockKey":"b749f750-fbe3-11ee-9224-d7fd2399170d",
}
```

## Get lock state

HTTP **GET** `https://lock-states.deno.dev/locks/:lockId`

### Returns:

- 204 = unlocked
- 423 = locked
- 404 = not found

### Examples:

#### When unocked:

```sh
curl -X GET https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm -I
HTTP/2 204
```

#### When locked:

```sh
curl -X GET https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm -I
HTTP/2 423
```

## Lock

HTTP **PATCH** `https://lock-states.deno.dev/locks/:lockId/lock`

### Url params:

- `k=lockKey` required for auth
- `e=ttl_in_seconds` optional

### Returns:

- 204 = ok
- 401 = unauthorized
- 404 = not found
- 500 = internal server error

### Examples:

Lock forever

```sh
curl -X PATCH "https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm/lock?k=b749f750-fbe3-11ee-9224-d7fd2399170d" -I
HTTP/2 204
```

Lock for 60 seconds:

```sh
curl -X PATCH "https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm/lock?k=b749f750-fbe3-11ee-9224-d7fd2399170d&e=60" -I
HTTP/2 204
```

## Unlock

HTTP **PATCH** `https://lock-states.deno.dev/locks/:lockId/unlock`

### Url params:

- `k=lockKey` required for auth

### Returns:

- 204 = ok
- 401 = unauthorized
- 404 = not found
- 500 = internal server error

### Example:

```sh
curl -X PATCH "https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm/unlock?k=b749f750-fbe3-11ee-9224-d7fd2399170d" -I
HTTP/2 204
```

## Usecases

### Examples:

#### How to use in "shell" eg. to stop github actions pipeline

Exits with error code with -f curl flag

```sh
curl -X GET https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm -f && echo "there is no lock"
curl: (22) The requested URL returned error: 423
```

No exits with error code with -f curl flag

```sh
curl -X GET https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm -f && echo "there is no lock"
there is no lock
```

Retry until unlock:

```sh
curl --head -X GET --fail --retry 300 --retry-connrefused --retry-all-errors --retry-delay 30 https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm
```

## Others

### Discussion

[HackerNews](https://news.ycombinator.com/item?id=40050776)

### Repository

[Github](https://github.com/worotyns/lock-state)

### License

Copyright 2024 worotyns@icloud.com

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
