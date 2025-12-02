## Stratégie de tests pour Castium

Ce document explique **où sont les tests**, **comment en ajouter**, **comment les lancer** et **quels outils** sont utilisés.

---

### Outils utilisés

- **Vitest**  
  - Framework de tests pour projets Vite/Nuxt, équivalent moderne de Jest.  
  - Gère les tests unitaires, d’intégration, de composants et fonctionnels.

- **Vue Test Utils**  
  - Bibliothèque officielle de tests pour **Vue 3**.  
  - Permet de monter des composants (`mount`) et de simuler des interactions (clics, saisie, etc.).

- **jsdom**  
  - Fournit un **DOM simulé** côté Node.js pour pouvoir tester les composants Vue et leurs interactions sans navigateur réel.

- **GitHub Actions**  
  - CI (Intégration Continue) qui exécute les tests automatiquement **à chaque push** grâce au workflow `.github/workflows/tests.yml` (à la racine du dépôt).

---

## Structure des tests

Tous les tests liés à `castium` sont dans le dossier :

- `castium/tests/`
  - `unit/` → tests **unitaires**
  - `integration/` → tests **d’intégration**
  - `component/` → tests de **composants Vue**
  - `functional/` → tests **fonctionnels** (scénarios utilisateur)
  - `test-setup.ts` → configuration partagée (Vue Test Utils, etc.)

Exemples actuels :

- **Unitaire** : `tests/unit/math.unit.test.ts`
- **Intégration** : `tests/integration/math.integration.test.ts`
- **Composant** : `tests/component/TestButton.spec.ts`
- **Fonctionnel** : `tests/functional/LoginForm.functional.test.ts`

---

## Types de tests

### Tests unitaires

- **But** : tester **une fonction isolée**, sans dépendances externes.  
- Exemple actuel : `sum` dans `app/utils/math.ts`.
- Fichier : `tests/unit/math.unit.test.ts`

Un test unitaire typique ressemble à :

```ts
import { describe, it, expect } from 'vitest';
import { sum } from '@/utils/math';

describe('sum (unit)', () => {
    it('additionne deux nombres', () => {
        expect(sum(2, 3)).toBe(5);
    });
});
```

### Tests d’intégration

- **But** : vérifier que **plusieurs fonctions / modules fonctionnent bien ensemble**.  
- Exemple actuel : `average` + `sum` dans `app/utils/math.ts`.  
- Fichier : `tests/integration/math.integration.test.ts`

On y teste le **comportement global** plutôt que chaque fonction isolée.

### Tests de composants

- **But** : tester un **composant Vue** en isolation (render, props, événements).  
- Exemple actuel : `TestButton.vue` dans `app/components/TestButton.vue`.  
- Fichier : `tests/component/TestButton.spec.ts`

On utilise **Vue Test Utils** :

```ts
import { mount } from '@vue/test-utils';
import TestButton from '@/components/TestButton.vue';

const wrapper = mount(TestButton, {
    props: { label: 'Cliquer ici' },
});

expect(wrapper.text()).toContain('Cliquer ici');
```

### Tests fonctionnels

- **But** : simuler un **scénario utilisateur complet** sur un composant (voire plus tard sur une page).  
- Exemple actuel : `LoginForm.vue` dans `app/components/LoginForm.vue`.  
- Fichier : `tests/functional/LoginForm.functional.test.ts`

On simule la saisie et la soumission d’un formulaire :

```ts
const wrapper = mount(LoginForm);
await wrapper.get('input#email').setValue('user@example.com');
await wrapper.get('input#password').setValue('super-secret');
await wrapper.trigger('submit.prevent');
```

---

## Comment lancer les tests

Depuis le dossier `castium` :

### Tout lancer

```bash
npm test
```

### Par type de test

Ces scripts sont définis dans `castium/package.json` :

- **Tests unitaires uniquement**

```bash
npm run test:unit
```

- **Tests d’intégration uniquement**

```bash
npm run test:integration
```

- **Tests fonctionnels uniquement**

```bash
npm run test:functional
```

- **Tests de composants uniquement**

```bash
npm run test:component
```

---

## Comment ajouter un nouveau test

### 1. Choisir le bon dossier

- **Fonction pure utilitaire** → `tests/unit/`
- **Plusieurs fonctions/modules ensemble** → `tests/integration/`
- **Composant Vue isolé** → `tests/component/`
- **Scénario utilisateur (formulaire, flow simple)** → `tests/functional/`

### 2. Créer un fichier de test

Respecte une **naming convention claire** :

- `*.unit.test.ts` pour les tests unitaires.
- `*.integration.test.ts` pour les tests d’intégration.
- `*.spec.ts` pour les tests de composants.
- `*.functional.test.ts` pour les tests fonctionnels.

Exemple pour un nouveau composant `UserCard.vue` :

- Composant : `app/components/UserCard.vue`
- Test : `tests/component/UserCard.spec.ts`

### 3. Utiliser les helpers Vitest

- `describe` : groupe de tests.
- `it` / `test` : cas de test individuel.
- `expect` : assertions.
- `beforeEach`, `afterEach`, etc. si besoin de setup/cleanup.

---

## Intégration Continue (CI) avec GitHub Actions

Le fichier à la racine du dépôt :

- `.github/workflows/tests.yml`

### Comportement

- Se déclenche **automatiquement à chaque `git push`** sur n’importe quelle branche.
- Exécute :
  1. Checkout du dépôt.
  2. Installation de Node.js.
  3. `npm install`
  4. `npm test`

### Objectif

- Garantir que :
  - Les tests passent avant une revue de code ou un merge.
  - Les régressions sont détectées **dès le push**.

---

## Résumé visuel

- **Où coder les tests ?**
  - `tests/unit` → logique très locale.
  - `tests/integration` → plusieurs modules ensemble.
  - `tests/component` → composants Vue.
  - `tests/functional` → scénarios utilisateur.

- **Comment les lancer ?**
  - Local : `npm test` ou `npm run test:<type>`.
  - Distant : GitHub Actions les lance à chaque `push`.

Tu peux t’inspirer des fichiers déjà présents comme **modèle** quand tu crées de nouveaux tests.  
Si tu veux que je t’aide à écrire un test précis (composant réel, page Nuxt, etc.), indique simplement le fichier cible et le type de test souhaité. 


