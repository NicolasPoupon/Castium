## Testing Strategy for Castium

This document explains **where the tests are**, **how to add new ones**, **how to run them**, and **which tools** are used.

---

### Tools Used

- **Vitest**
  - Testing framework for Vite/Nuxt projects, modern equivalent of Jest.
  - Handles unit, integration, component and functional tests.

- **Vue Test Utils**
  - Official testing library for **Vue 3**.
  - Allows mounting components (`mount`) and simulating interactions (clicks, input, etc.).

- **jsdom**
  - Provides a **simulated DOM** on the Node.js side to test Vue components and their interactions without a real browser.

- **GitHub Actions**
  - CI (Continuous Integration) that runs tests automatically **on every push** via the `.github/workflows/tests.yml` workflow (at the root of the repository).

---

## Test Structure

All tests related to `castium` are in the folder:

- `castium/tests/`
  - `unit/` → **unit** tests
  - `integration/` → **integration** tests
  - `component/` → **Vue component** tests
  - `functional/` → **functional** tests (user scenarios)
  - `test-setup.ts` → shared configuration (Vue Test Utils, etc.)

Current examples:

- **Unit**: `tests/unit/math.unit.test.ts`
- **Integration**: `tests/integration/math.integration.test.ts`
- **Component**: `tests/component/TestButton.spec.ts`
- **Functional**: `tests/functional/LoginForm.functional.test.ts`

---

## Test Types

### Unit Tests

- **Goal**: test **an isolated function**, without external dependencies.
- Current example: `sum` in `app/utils/math.ts`.
- File: `tests/unit/math.unit.test.ts`

A typical unit test looks like:

```ts
import { describe, it, expect } from 'vitest';
import { sum } from '@/utils/math';

describe('sum (unit)', () => {
    it('adds two numbers', () => {
        expect(sum(2, 3)).toBe(5);
    });
});
```

### Integration Tests

- **Goal**: verify that **multiple functions / modules work well together**.
- Current example: `average` + `sum` in `app/utils/math.ts`.
- File: `tests/integration/math.integration.test.ts`

These tests focus on **overall behavior** rather than each isolated function.

### Component Tests

- **Goal**: test a **Vue component** in isolation (render, props, events).
- Current example: `TestButton.vue` in `app/components/TestButton.vue`.
- File: `tests/component/TestButton.spec.ts`

Using **Vue Test Utils**:

```ts
import { mount } from '@vue/test-utils';
import TestButton from '@/components/TestButton.vue';

const wrapper = mount(TestButton, {
    props: { label: 'Click here' },
});

expect(wrapper.text()).toContain('Click here');
```

### Functional Tests

- **Goal**: simulate a **complete user scenario** on a component (and later on a page).
- Current example: `LoginForm.vue` in `app/components/LoginForm.vue`.
- File: `tests/functional/LoginForm.functional.test.ts`

Simulating form input and submission:

```ts
const wrapper = mount(LoginForm);
await wrapper.get('input#email').setValue('user@example.com');
await wrapper.get('input#password').setValue('super-secret');
await wrapper.trigger('submit.prevent');
```

---

## How to Run Tests

From the `castium` folder:

### Run all tests

```bash
npm test
```

### By test type

These scripts are defined in `castium/package.json`:

- **Unit tests only**

```bash
npm run test:unit
```

- **Integration tests only**

```bash
npm run test:integration
```

- **Functional tests only**

```bash
npm run test:functional
```

- **Component tests only**

```bash
npm run test:component
```

---

## How to Add a New Test

### 1. Choose the right folder

- **Pure utility function** → `tests/unit/`
- **Multiple functions/modules together** → `tests/integration/`
- **Isolated Vue component** → `tests/component/`
- **User scenario (form, simple flow)** → `tests/functional/`

### 2. Create a test file

Follow a **clear naming convention**:

- `*.unit.test.ts` for unit tests.
- `*.integration.test.ts` for integration tests.
- `*.spec.ts` for component tests.
- `*.functional.test.ts` for functional tests.

Example for a new `UserCard.vue` component:

- Component: `app/components/UserCard.vue`
- Test: `tests/component/UserCard.spec.ts`

### 3. Use Vitest helpers

- `describe`: test group.
- `it` / `test`: individual test case.
- `expect`: assertions.
- `beforeEach`, `afterEach`, etc. if setup/cleanup is needed.

---

## Continuous Integration (CI) with GitHub Actions

The file at the root of the repository:

- `.github/workflows/tests.yml`

### Behavior

- Triggers **automatically on every `git push`** on any branch.
- Runs:
  1. Repository checkout.
  2. Node.js installation.
  3. `npm install`
  4. `npm test`

### Goal

- Ensure that:
  - Tests pass before a code review or merge.
  - Regressions are detected **as soon as code is pushed**.

---

## Visual Summary

- **Where to write tests?**
  - `tests/unit` → very local logic.
  - `tests/integration` → multiple modules together.
  - `tests/component` → Vue components.
  - `tests/functional` → user scenarios.

- **How to run them?**
  - Locally: `npm test` or `npm run test:<type>`.
  - Remote: GitHub Actions runs them on every `push`.

You can use the existing files as a **template** when creating new tests.
