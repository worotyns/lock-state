# LockState Service

Simple service with lock management. 
With just a few API calls, you can create, check, and modify locks effortlessly.

It may be useful for Github Actions Pipelines (like lock QA branch deployment when E2E testing is turning on etc.)

This service can be used in production with
low workloads.

## Create new lock

HTTP POST https://lock-states.deno.dev/locks

### Returns:

- 200 = created

### Example:

```sh
curl -X POST https://lock-states.deno.dev/locks            
{"lockId":"01hvkab4t422rap18rwjs2prnm","lockKey":"b749f750-fbe3-11ee-9224-d7fd2399170d","isLocked":false}
```

## Get lock state

HTTP GET https://lock-states.deno.dev/locks/:lockId

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

HTTP PATCH https://lock-states.deno.dev/locks/:lockId/lock

### url params:

- `k=lockKey` required for authroization
- `e=ttl_in_seconds` optional

### Returns:

- 204 = ok
- 401 = unauthorized
- 404 = not found
- 500 = internal server error

### Example:

```sh
curl -X PATCH "https://lock-states.deno.dev/locks/01hvkab4t422rap18rwjs2prnm/lock?k=b749f750-fbe3-11ee-9224-d7fd2399170d" -I
HTTP/2 204
```

## Unlock

HTTP PATCH https://lock-states.deno.dev/locks/:lockId/unlock

### url params:

- `k=lockKey` required for authroization

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

## Repository

[Github](https://github.com/worotyns/lock-state)
