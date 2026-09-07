# Conventions de tests

## 1. Objectif

Ce document définit les conventions de tests pour la migration incrémentale de la TodoList legacy vers l’application Kanban cible.

Les tests servent à la fois à protéger les comportements existants pendant les refactors et à valider les nouvelles fonctionnalités.

---

## 2. Principes généraux

- Les tests doivent être déterministes et reproductibles.
- Ils ne doivent pas dépendre de leur ordre d’exécution.
- Ils ne doivent jamais utiliser les credentials ou la base de production.
- Toute nouvelle règle métier nécessite des tests automatisés appropriés.
- Les tests doivent vérifier un comportement observable plutôt qu’un détail privé d’implémentation.
- Les tests pertinents ne doivent pas être supprimés uniquement pour faire passer la CI.

---

## 3. Tests de caractérisation du legacy

Avant de refactorer un comportement legacy, il faut d’abord protéger les comportements qui doivent rester valides.

Comportements legacy typiques :

```text
Create Todo
List Todos
Update Todo
Delete Todo
```

Les tests de caractérisation ne signifient pas que l’architecture legacy est correcte. Ils établissent une baseline permettant de détecter les régressions accidentelles pendant la migration.

Processus cible :

```text
Comportement legacy
        ↓
Test de caractérisation
        ↓
Refactor / migration
        ↓
Le test reste vert
```

Un comportement devenu obsolète peut être supprimé uniquement si la décision produit correspondante est explicite.

---

## 4. Niveaux de tests

### Tests unitaires

Utiliser des tests unitaires pour la logique métier isolée :

- services ;
- validation ;
- autorisation ;
- transitions Kanban ;
- création des payloads d’événements ;
- fonctions pures.

Exemples :

```text
task.service.test.ts
auth.service.test.ts
```

Les tests unitaires ne doivent pas accéder réellement à PostgreSQL, RabbitMQ, au réseau ou au filesystem.

### Tests d’intégration

Utiliser les tests d’intégration pour les frontières techniques :

- route REST + controller + service + repository ;
- Prisma + PostgreSQL ;
- middleware d’authentification + endpoint protégé ;
- publisher RabbitMQ + consumer ;
- persistance après consommation d’un événement.

Exemples :

```text
projects.integration.test.ts
tasks.integration.test.ts
events.integration.test.ts
```

### Tests end-to-end

Utiliser les tests E2E pour les workflows utilisateurs critiques.

Workflow critique cible :

```text
Register
→ Login
→ Create Project
→ Create Task
→ Move Task
→ Update Task
→ Delete Task
```

Limiter les E2E aux workflows importants car ils sont plus lents et coûteux à maintenir.

---

## 5. Tests frontend

Les tests frontend se concentrent sur le comportement visible :

- rendu ;
- interactions ;
- états de chargement ;
- erreurs ;
- retours de validation ;
- navigation ;
- changements d’état issus de l’API.

Outils recommandés :

```text
Vitest
React Testing Library
```

Préférer les sélecteurs accessibles : rôles, labels et texte visible.

---

## 6. Tests backend

Les tests backend se concentrent sur les règles métier et le comportement HTTP.

Les tests unitaires des services doivent rester indépendants d’Express lorsque cela est pertinent.

Les tests d’intégration API doivent vérifier :

- méthode et route ;
- authentification ;
- autorisation ;
- validation ;
- code HTTP ;
- corps de réponse ;
- effets de bord sur la persistence.

Outils recommandés :

```text
Vitest
Supertest
```

---

## 7. Tests Prisma et PostgreSQL

Les tests d’intégration de base de données utilisent une base PostgreSQL dédiée aux tests.

Règles :

- ne jamais utiliser les données de développement ou de production ;
- isoler les données de test ;
- nettoyer/réinitialiser les données entre les tests ;
- appliquer les migrations cibles avant les tests d’intégration ;
- vérifier les contraintes et relations importantes.

Variable recommandée :

```text
DATABASE_URL_TEST
```

Lorsque les tests d’intégration conteneurisés sont disponibles, l’instance PostgreSQL de test doit être jetable.

Pendant la période de migration, des tests de persistence legacy peuvent coexister avec les tests d’intégration Prisma jusqu’à la migration complète du repository concerné.

---

## 8. Tests RabbitMQ et événements

### Niveau unitaire

Vérifier que :

- le bon événement est produit ;
- le payload est valide ;
- le consumer applique l’action métier attendue.

### Niveau intégration

Vérifier le workflow complet :

```text
Producteur
→ RabbitMQ
→ File
→ Consumer
→ Effet de bord
```

Workflow démontrable obligatoire :

```text
Tâche créée
→ task.created
→ RabbitMQ
→ Consumer de notification
→ Notification persistée
```

Lorsque ces mécanismes sont implémentés, tester également :

- doublons ;
- idempotence ;
- retries ;
- échecs du consumer ;
- payloads invalides.

---

## 9. Nommage des tests

```text
<cible>.test.ts
<cible>.integration.test.ts
<workflow>.e2e.test.ts
```

Exemples :

```text
task.service.test.ts
projects.integration.test.ts
kanban-workflow.e2e.test.ts
```

Préférer :

```ts
it("rejects login when the password is invalid", ...)
it("prevents a user from updating another user's project", ...)
it("publishes task.created after the task is persisted", ...)
```

Éviter les descriptions vagues comme `works`, `test login` ou `case 1`.

---

## 10. Structure des tests

Utiliser Arrange / Act / Assert lorsque cela améliore la lisibilité.

```ts
it("creates a project for the authenticated user", async () => {
  const input = { name: "Project Alpha" };

  const result = await projectService.create(userId, input);

  expect(result.name).toBe("Project Alpha");
  expect(result.ownerId).toBe(userId);
});
```

---

## 11. Mocks

Les mocks sont adaptés à l’isolation des tests unitaires, par exemple :

- repository dans un test unitaire de service ;
- simulation d’un échec d’infrastructure ;
- publisher RabbitMQ dans un test unitaire métier.

Ne pas mocker le composant que le test est censé valider.

Les tests d’intégration doivent utiliser de vraies frontières lorsque cela est raisonnable.

---

## 12. Cas négatifs et limites

Tester les cas négatifs pertinents :

- credentials invalides ;
- email dupliqué ;
- ressource inexistante ;
- accès interdit ;
- statut de tâche invalide ;
- deadline invalide ;
- événement dupliqué ;
- violation de contrainte DB ;
- broker indisponible lorsqu’une récupération est prévue.

Une fonctionnalité métier critique ne doit pas être testée uniquement sur le happy path.

---

## 13. Couverture

Objectif initial :

```text
>= 70 % de couverture globale
```

La couverture doit être générée dans la CI.

Pendant la migration, la couverture doit être interprétée avec la quantité de code legacy non encore migré. Toute logique métier nouvelle ou modifiée doit recevoir une couverture pertinente même si le legacy réduit encore la valeur globale.

---

## 14. Exigences CI

Au minimum, chaque Pull Request exécute :

```text
lint
typecheck
tests unitaires
coverage
build
```

Les tests d’intégration et E2E sont ajoutés à la CI dès que leur infrastructure est opérationnelle.

Un test obligatoire en échec bloque la Pull Request.

---

## 15. Definition of Done

Une Issue ne peut pas être considérée Done lorsque :

- les tests obligatoires manquent ;
- les tests obligatoires échouent ;
- la couverture requise n’est pas atteinte ;
- le comportement d’intégration pertinent n’a pas été validé.

Une fonctionnalité qui fonctionne uniquement localement n’est pas Done.
