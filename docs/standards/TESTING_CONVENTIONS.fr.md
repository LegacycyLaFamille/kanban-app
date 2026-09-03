# Conventions de tests

## 1. Objectif

Ce document définit les conventions de tests utilisées par le projet de refonte Kanban.

L’objectif est de conserver des tests cohérents, déterministes, maintenables et utiles pendant les trois sprints.

Ces conventions s’appliquent au frontend, au backend, à l’API, à la base de données et aux mécanismes orientés événements.

---

## 2. Principes généraux

- Toute nouvelle règle métier doit être couverte par des tests automatisés appropriés.
- Les tests doivent vérifier un comportement observable et non des détails internes d’implémentation.
- Les tests doivent être déterministes et reproductibles.
- Les tests ne doivent pas dépendre de leur ordre d’exécution.
- Les tests ne doivent pas utiliser de données réelles de production.
- Les tests ne doivent pas appeler de services externes de production.
- Un test en échec doit permettre d’identifier clairement le comportement cassé.
- Une Pull Request ne doit pas supprimer des tests pertinents uniquement pour faire passer la CI.

---

## 3. Niveaux de tests

Le projet utilise trois niveaux principaux de tests.

### 3.1 Tests unitaires

Les tests unitaires vérifient la logique métier isolée.

Cibles typiques :

- services ;
- fonctions pures ;
- logique de validation ;
- règles d’autorisation ;
- règles de transition de statut ;
- utilitaires métier.

Exemples :

```text
auth.service.test.ts
task.service.test.ts
project.service.test.ts
```

Les tests unitaires doivent éviter les accès réels à la base de données, au réseau, à RabbitMQ ou au système de fichiers.

Les dépendances peuvent être remplacées par des doubles de test lorsque l’isolation est utile.

---

### 3.2 Tests d’intégration

Les tests d’intégration vérifient le fonctionnement conjoint de plusieurs composants techniques.

Cibles typiques :

- route REST + controller + service + repository ;
- Prisma + PostgreSQL ;
- middleware d’authentification + endpoint protégé ;
- publisher RabbitMQ + consumer ;
- persistance après consommation d’un événement.

Exemples :

```text
projects.integration.test.ts
tasks.integration.test.ts
auth.integration.test.ts
events.integration.test.ts
```

Les tests d’intégration peuvent utiliser de vrais conteneurs de test ou des services de test dédiés lorsque cela est pertinent.

Ils ne doivent jamais utiliser la base de production.

---

### 3.3 Tests end-to-end

Les tests end-to-end valident les workflows utilisateurs critiques via l’application.

Workflow critique minimal :

```text
Inscription
→ Connexion
→ Création d’un projet
→ Création d’une tâche
→ Déplacement d’une tâche
→ Modification d’une tâche
→ Suppression d’une tâche
```

Les tests E2E doivent rester limités aux workflows importants car ils sont plus lents et plus coûteux à maintenir.

Exemples :

```text
authentication.e2e.test.ts
kanban-workflow.e2e.test.ts
```

---

## 4. Tests frontend

Les tests frontend doivent se concentrer sur les comportements visibles par l’utilisateur.

Tester :

- rendu ;
- interactions utilisateur ;
- états de chargement ;
- états d’erreur ;
- retours de validation ;
- navigation ;
- changements d’état issus de l’API.

Préférer les sélecteurs basés sur les rôles accessibles, labels et textes visibles.

Éviter les tests dépendant des détails privés d’implémentation d’un composant.

Outils recommandés :

```text
Vitest
React Testing Library
```

---

## 5. Tests backend

Les tests backend doivent se concentrer sur les règles métier et le comportement HTTP.

Les services doivent être testés unitairement indépendamment d’Express lorsque cela est pertinent.

Les tests d’intégration API doivent vérifier :

- méthode HTTP ;
- route ;
- authentification ;
- autorisation ;
- validation ;
- code de réponse ;
- corps de réponse ;
- effets de bord sur la persistance.

Outils recommandés :

```text
Vitest
Supertest
```

---

## 6. Tests Prisma et base de données

Les tests d’intégration liés à la base doivent utiliser une base de données dédiée aux tests.

Règles :

- ne jamais utiliser la base de développement ou de production pour les tests automatisés ;
- isoler les données de test ;
- nettoyer ou réinitialiser les données entre les tests ;
- appliquer les migrations avant les tests d’intégration ;
- vérifier les contraintes et relations importantes.

Variable d’environnement recommandée :

```text
DATABASE_URL_TEST
```

Si le projet utilise des tests d’intégration conteneurisés, l’instance PostgreSQL de test doit être jetable.

---

## 7. Tests RabbitMQ et orientés événements

Les workflows orientés événements doivent être testés à deux niveaux.

### Niveau unitaire

Vérifier que :

- le bon événement est produit ;
- le payload contient les données attendues ;
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

Pour le workflow démontrable obligatoire :

```text
Tâche créée
→ task.created
→ RabbitMQ
→ Consumer de notification
→ Notification persistée
```

Les tests doivent également couvrir, lorsque ces mécanismes sont implémentés :

- événements dupliqués ;
- idempotence ;
- retries ;
- échec du consumer ;
- payloads d’événement invalides.

---

## 8. Nommage des tests

Noms de fichiers :

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

Les descriptions doivent exprimer le comportement attendu.

Préférer :

```ts
it("rejects login when the password is invalid", ...)
it("prevents a user from updating another user's project", ...)
it("publishes task.created after a task is persisted", ...)
```

Éviter :

```ts
it("test login", ...)
it("works", ...)
it("case 1", ...)
```

---

## 9. Structure des tests

Utiliser une structure claire Arrange / Act / Assert.

Exemple :

```ts
it("creates a project for the authenticated user", async () => {
  // Arrange
  const input = { name: "Project Alpha" };

  // Act
  const result = await projectService.create(userId, input);

  // Assert
  expect(result.name).toBe("Project Alpha");
  expect(result.ownerId).toBe(userId);
});
```

Les commentaires sont facultatifs lorsque la structure est déjà évidente.

---

## 10. Données de test

Utiliser des données explicites et minimales.

Préférer des factories/builders lorsque plusieurs tests ont besoin d’objets similaires.

Exemples :

```text
createUserFixture()
createProjectFixture()
createTaskFixture()
```

Ne pas partager de données mutables entre plusieurs tests.

Éviter les valeurs aléatoires sauf si la seed est contrôlée.

---

## 11. Règles de mock

Les mocks sont utiles pour isoler des dépendances externes, mais le sur-mocking est interdit.

Mocker lorsque :

- un service est testé indépendamment de la persistance ;
- un échec externe doit être simulé ;
- RabbitMQ ou une infrastructure doit être isolée dans un test unitaire.

Ne pas mocker le composant que le test est censé valider.

Les tests d’intégration doivent utiliser de vraies frontières d’infrastructure lorsque cela est raisonnable.

---

## 12. Tests des erreurs et cas limites

Les cas négatifs pertinents doivent être testés.

Exemples :

- identifiants invalides ;
- email dupliqué ;
- UUID invalide ;
- ressource absente ;
- accès interdit à une ressource ;
- statut de tâche invalide ;
- deadline invalide ;
- événement dupliqué ;
- violation de contrainte DB ;
- indisponibilité du broker lorsqu’une récupération est prévue.

Tester uniquement le chemin nominal n’est pas suffisant pour une fonctionnalité métier critique.

---

## 13. Couverture

Objectif initial :

```text
>= 70 % de couverture globale
```

La couverture doit être générée automatiquement dans la CI.

La couverture ne remplace pas des tests pertinents.

Les règles métier critiques doivent être couvertes même si le seuil global est déjà atteint.

---

## 14. Exigences CI

La CI doit exécuter les tests automatisés appropriés pour chaque Pull Request.

Au minimum :

```text
lint
typecheck
tests unitaires
coverage
build
```

Les tests d’intégration et E2E doivent être ajoutés à la CI dès que leur infrastructure est disponible.

Un test obligatoire en échec bloque la Pull Request.

---

## 15. Exigences des Pull Requests

Lorsqu’une Pull Request modifie un comportement métier :

- les tests pertinents doivent être ajoutés ou mis à jour ;
- les tests existants pertinents doivent continuer de passer ;
- la description de PR doit indiquer comment le changement a été testé ;
- la couverture requise doit rester respectée.

Une fonctionnalité qui fonctionne localement mais qui n’a pas les tests appropriés n’est pas considérée comme terminée.

---

## 16. Alignement avec la Definition of Done

Les tests font partie de la Definition of Done.

Une Issue ne peut pas passer en `Done` lorsque :

- des tests obligatoires manquent ;
- des tests échouent ;
- la couverture requise n’est pas atteinte ;
- le comportement d’intégration pertinent n’a pas été validé.

---

## 17. Pratiques interdites

Ne pas :

- désactiver des tests pour faire passer la CI ;
- versionner des `.skip` ou équivalents sans justification documentée et temporaire ;
- dépendre de l’ordre d’exécution des tests ;
- utiliser des identifiants de production ;
- utiliser la base de production ;
- écrire des tests nécessitant une intervention manuelle ;
- utiliser des délais fixes lorsqu’une condition d’attente déterministe est possible ;
- tester uniquement des détails d’implémentation au lieu du comportement observable.
