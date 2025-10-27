# Zeta Reactivity

一个轻量级的 TypeScript 响应式系统库，参照了市面上常见的 "Signals" 框架（SolidJs，Angular，Vue），实现了细粒度的响应式编程模型。


## 核心概念

### Signal（信号）

Signal 是响应式系统的基础，用于存储可变的响应式状态。

```typescript
// 创建一个 signal
const count = createSignal(0);

// 读取值
console.log(count()); // 0
console.log(count.value); // 0

// 设置值
count.set(1);
count.value = 2;

// 更新值（传入更新函数）
const list = createSignal([1, 2, 3]);
list.update(arr => arr.push(4));
```

**自定义相等性判断**

```typescript
// 全局自定义相等性函数
setValueEqualsFn((a, b) => {
  if (a instanceof CustomClass && b instanceof CustomClass) {
    return a.equals(b);
  }
  return false;
});

// 或为单个 signal 指定相等性函数
const signal = createSignal("hello", (a, b) => a.length === b.length);
```

### Computed（计算属性）

Computed 从其他响应式值派生出新的响应式值，只在依赖变化时重新计算。

```typescript
const firstName = createSignal('John');
const lastName = createSignal('Doe');

tracked(createRoot(), () => {
  const fullName = createComputed(() => `${firstName()} ${lastName()}`);
  
  console.log(fullName()); // "John Doe"
  
  firstName.set('Jane');
  console.log(fullName()); // "Jane Doe"
});
```

**嵌套计算属性**

```typescript
const signal = createSignal(2);

tracked(createRoot(), () => {
  const computed1 = createComputed(() => signal() * 2);
  const computed2 = createComputed(() => computed1() * 2);
  
  console.log(computed2()); // 8
  
  signal.set(3);
  console.log(computed2()); // 12
});
```

**特性**：
- 惰性求值：只在被访问时才计算
- 自动缓存：值不变时不重新计算
- 检测循环依赖：防止无限递归

### Watch（监听器）

signals 库提供了一个操作来监视响应式函数，并在该函数的依赖项发生变化时接收通知。

`createWatch()` 在响应式上下文中调度并运行具有副作用的函数。此函数的 signal 依赖项被捕获，每当其任何依赖项发生变化时，副作用将重新执行：

```typescript
const counter = createSignal(0);
createWatch(() => console.log('计数器是:', counter()));
// 计数器是: 0

counter.set(1);
flushWatches();
// 计数器是: 1
```

Watch 不会与 set 同步执行（参见下面关于无故障执行的部分），而是通过 `flushWatches()` 来调度和解析。Watch 的确切执行时机由应用程序控制。

#### 延迟执行

可以使用 `defer` 选项创建 watch 以延迟初始执行：

```typescript
const signal = createSignal(1);

tracked(createRoot(), () => {
  let value;
  createWatch(() => {
    value = signal();
  }, { defer: true });
  
  console.log(value); // undefined（不会立即执行）
  
  flushWatches();
  console.log(value); // 1
});
```

## 追踪与非追踪上下文

### `tracked()`

`tracked()` 在响应式上下文中执行函数

```typescript
const value = createSignal(1);
const root = tracked(createRoot(), () => {
  // watch 被 root 所捕获，root 被释放掉后，watch也会一并被释放
  createWatch(() => {
    console.log(value());
  });
});

root.dispose();

flushWatches();

// 不会有任何输出
```

### `untracked()`

`untracked()` 在非响应式（非追踪）上下文中执行任意函数。函数内读取的所有 signal 都不会被添加为依赖项：

```typescript
const counter = createSignal(0);
const untrackedCounter = createSignal(0);

createWatch(() => {
  console.log(`counter: ${counter()}, untracked: ${untracked(() => untrackedCounter())}`);
});
// counter: 0, untracked: 0

untrackedCounter.set(1);
flushWatches();
// watch 不会重新运行，因为 untrackedCounter 是非追踪的

counter.set(1);
flushWatches();
// counter: 1, untracked: 1
```

## API 参考

### Signal API

- `createSignal<T>(value: T, equalsFn?: ValueEqualsFn<T>): Signal<T>` - 创建信号
- `signal()` / `signal.value` - 获取值
- `signal.set(value)` / `signal.value = value` - 设置值
- `signal.update(updater?)` - 更新值

### Computed API

- `createComputed<T>(computation: () => T, options?: ComputedOptions<T>): Computed<T>` - 创建计算属性
- `computed()` - 获取计算值

### Watch API

- `createWatch(fn: () => void, options?: WatchOptions): Watch` - 创建监听器
- `flushWatches()` - 刷新所有待处理的 watch
- `resetWatches()` - 重置 watch 队列

### 上下文 API

- `createRoot()` - 创建响应式根上下文
- `tracked(root, fn)` - 在追踪上下文中执行
- `untracked(fn)` - 在非追踪上下文中执行
- `onCleanup(fn)` - 注册清理函数
- `getActiveConsumer()` 获取当前追踪的上下文

### 相等性 API

- `setValueEqualsFn(fn)` - 设置全局相等性判断函数
- `checkValueEquals(a, b, equalsFn?)` - 检查值是否相等

## 工作原理

这是"signal"（信号）概念的一种实现。signal 是一个"响应式"的值，意味着它可以在值发生变化时通知感兴趣的消费者。此实现为构建细粒度响应式应用程序提供了基础。

Zeta Signals 是零参数函数（`() => T`）。执行时，它们返回 signal 的当前值。执行 signal 不会触发副作用，尽管它可能会延迟重新计算中间值。

特定的上下文（例如 `watch` 回调或 `computed` 表达式）可以是 _响应式的_。在这些上下文中，执行 signal 将返回值，同时也将该 signal 注册为相关上下文的依赖项。

这种上下文和 getter 函数机制允许 _自动_ 和 _隐式_ 地追踪 signal 依赖关系。用户无需声明依赖项数组，系统也不需要深度观察对象来拦截属性读取。Signal 只需记录它们何时被读取，以及被谁读取。
