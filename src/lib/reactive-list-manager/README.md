# ReactiveListManager (formerly ReactiveListManager)

> A standalone, high-performance reactive height calculation system for virtualized lists

<!-- [![Tests](https://img.shields.io/badge/tests-13%20passing-brightgreen)](./ReactiveListManager.test.ts)
[![Performance](https://img.shields.io/badge/performance-1000%20updates%20%3C1ms-blue)](#performance)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/) -->

## 🚀 Features

- **Incremental Processing**: O(dirty items) instead of O(all items)
- **Reactive State**: Built with Svelte 5 runes for automatic updates
- **Framework Agnostic**: Standalone types, no external dependencies
- **High Performance**: 1000+ height updates processed in <1ms
- **Memory Efficient**: Tracks only measured vs estimated items
- **Comprehensive Testing**: 13 test cases including performance benchmarks

## 🎯 Problem It Solves

Traditional virtual list height calculations loop through **all items** on every change:

```typescript
// ❌ O(n) - Slow for large lists
let totalHeight = 0
for (let i = 0; i < items.length; i++) {
    totalHeight += heightCache[i] || estimatedHeight
}
```

ReactiveListManager processes only **dirty/changed items**:

```typescript
// ✅ O(dirty items) - Fast and reactive
manager.processDirtyHeights(changedItems)
const totalHeight = manager.getDerivedTotalHeight()
```

## 📦 Installation

```bash
# If using within svelte-virtual-list project
import { ReactiveListManager } from '$lib/reactive-list-manager'

# For standalone usage (copy the module)
cp -r src/lib/reactive-list-manager your-project/src/lib/
```

## 🚀 Quick Start

```typescript
import { ReactiveListManager } from './reactive-list-manager'

// Create manager
const manager = new ReactiveListManager({
    itemLength: 10000,
    itemHeight: 40
})

// Process height changes
const heightChanges = [
    { index: 0, oldHeight: undefined, newHeight: 45 },
    { index: 1, oldHeight: 40, newHeight: 50 }
]
manager.processDirtyHeights(heightChanges)

// Update calculated item height
manager.calculatedItemHeight = 42

// Get reactive total height (automatically updates)
const totalHeight = manager.totalHeight
console.log(`Total height: ${totalHeight}px`)
```

## 📖 API Documentation

### Constructor

```typescript
new ReactiveListManager(config: ListManagerConfig)
```

**Parameters:**

- `config.itemLength` - Total number of items
- `config.estimatedHeight` - Default height for unmeasured items

### Core Methods

#### `processDirtyHeights(changes: HeightChange[])`

Process height changes incrementally. This is the performance-critical method.

```typescript
const changes = [{ index: 0, oldHeight: undefined, newHeight: 45 }]
manager.processDirtyHeights(changes)
```

#### `totalHeight` (getter)

Get total height of all items (measured + estimated). This property is reactive and automatically updates when dependencies change.

```typescript
const totalHeight = manager.totalHeight // Automatically reactive
```

#### `calculatedItemHeight` (getter/setter)

Get or set the calculated average item height, which affects total height calculations.

```typescript
manager.calculatedItemHeight = 42 // Updates totalHeight automatically
const currentHeight = manager.calculatedItemHeight
```

### State Management

#### `updateItemLength(newLength: number)`

Update when items array changes.

#### `updateEstimatedHeight(newHeight: number)`

Update estimated height for unmeasured items.

#### `reset()`

Reset all state to initial values.

### Utilities

#### `getDebugInfo(): ListManagerDebugInfo`

Get comprehensive debug information.

```typescript
const debug = manager.getDebugInfo()
console.log(`Coverage: ${debug.coveragePercent}%`)
console.log(`Measured: ${debug.measuredCount}/${debug.itemLength}`)
```

#### `getMeasurementCoverage(): number`

Get percentage of items measured (0-100).

#### `hasSufficientMeasurements(threshold?: number): boolean`

Check if manager has sufficient measurement data.

## 🎨 Integration Examples

### With SvelteVirtualList

```typescript
// Create manager
const heightManager = new ReactiveListManager({
    itemLength: items.length,
    estimatedHeight: defaultEstimatedItemHeight
})

// Update on items change
$effect(() => {
    heightManager.updateItemLength(items.length)
})

// Process in callback
const updateHeight = () => {
    heightUpdateTimeout = calculateAverageHeightDebounced(
        // ... params
        (result) => {
            // Convert types if needed (or pass directly if compatible)
            const heightChanges = result.heightChanges

            // Process incrementally
            heightManager.processDirtyHeights(heightChanges)
        }
    )
}

// Update calculated height when needed
$effect(() => {
    heightManager.calculatedItemHeight = calculatedItemHeight
})

// Reactive total height (automatically updates)
let totalHeight = $derived(heightManager.totalHeight)
```

### Standalone Usage

```typescript
import { ReactiveListManager, benchmarkHeightManager } from './reactive-list-manager'

const manager = new ReactiveListManager({ itemLength: 1000, estimatedHeight: 50 })

// Performance monitoring
const results = benchmarkHeightManager(10000, 1000, 100)
console.log(`Average time: ${results.avgTime.toFixed(2)}ms`)
console.log(`Operations/sec: ${results.opsPerSecond.toFixed(0)}`)

// Test reactive totalHeight
manager.calculatedItemHeight = 50 // Triggers reactive update
console.log(`New total height: ${manager.totalHeight}`)
```

## ⚡ Performance

### Benchmarks

| Operation            | Items  | Time   | Performance  |
| -------------------- | ------ | ------ | ------------ |
| 1,000 dirty updates  | 10,000 | < 1ms  | 🚀 Excellent |
| 10,000 dirty updates | 10,000 | < 10ms | 🚀 Excellent |
| Complex scenarios    | 5,000  | < 25ms | ✅ Good      |

### Memory Usage

- **Measured Items**: Tracked incrementally
- **Unmeasured Items**: Single multiplier calculation
- **State**: Only 4 reactive variables total

### Compared to O(n) Loop

```typescript
// Before: O(n) calculation every time
for (let i = 0; i < 100000; i++) {
    /* ... */
} // ~10-50ms

// After: O(1) reactive access
manager.totalHeight // ~0.01ms
```

## 🧪 Testing

```bash
# Run all tests
npm run test -- ReactiveListManager.test.ts

# Verbose output
npm run test -- ReactiveListManager.test.ts --reporter=verbose

# Performance benchmarking
npm run test -- --grep "Performance Tests"
```

### Test Coverage

- ✅ **Initialization** (2 tests)
- ✅ **Performance** (3 tests) - Sub-millisecond operations
- ✅ **Accuracy** (2 tests) - Complex scenarios with alternating heights
- ✅ **State Management** (3 tests) - Updates, resets, configuration
- ✅ **Utilities** (3 tests) - Coverage tracking, debug info

## 🏗️ Architecture

### Core Principles

1. **Reactive State**: Uses Svelte 5 `$state` runes
2. **Incremental Processing**: Only process changed items
3. **Memory Efficiency**: Track totals, not individual measurements
4. **Type Safety**: Comprehensive TypeScript interfaces

### Data Flow

```text

Height Changes → processDirtyHeights() → Update State → getDerivedTotalHeight() → Reactive UI

```

### Internal State

```typescript
private _totalMeasuredHeight = $state(0)  // Sum of all measured heights
private _measuredCount = $state(0)        // Count of measured items
private _itemLength = $state(0)           // Total items
private _estimatedHeight = $state(40)     // Default estimate
```

## 🔧 Types

```typescript
interface HeightChange {
    readonly index: number
    readonly oldHeight: number | undefined
    readonly newHeight: number
}

interface ListManagerConfig {
    itemLength: number
    estimatedHeight: number
}

interface ListManagerDebugInfo {
    totalMeasuredHeight: number
    measuredCount: number
    itemLength: number
    coveragePercent: number
    estimatedHeight: number
}
```

## 📈 Roadmap

- [ ] Batch processing for very large change sets
- [ ] Configurable block-based calculations
- [ ] Export as standalone npm package
- [ ] React/Vue adapter examples
- [ ] Web Worker support for massive datasets

## 🤝 Contributing

1. Run tests: `npm run test -- ReactiveListManager.test.ts`
2. Add performance benchmarks for new features
3. Maintain O(1) or O(dirty) complexity
4. Update type definitions

## 📄 License

Part of the svelte-virtual-list project. See main [LICENSE](../../../LICENSE) file.

---

**Need help?** Check the [Integration Examples](./INTEGRATION_EXAMPLE.md) for detailed usage patterns.
