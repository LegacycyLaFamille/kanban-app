# Standards de qualité du code

## Outils
La chaîne qualité utilise :
- **ESLint** comme linter JavaScript/TypeScript ;
- le contrôle statique des types **TypeScript** ;
- les tests automatisés ;
- la mesure de couverture ;
- une analyse statique de qualité comme SonarQube ou SonarCloud ;
- GitHub Actions pour la CI.

Si Prettier est activé, il sert de formatter ; ESLint reste le linter.

## ESLint
ESLint s’exécute sur le frontend et le backend.

Scripts attendus :
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

Aucune erreur de lint n’est acceptée dans une Pull Request.

## Vérification TypeScript
Exécuter le contrôle TypeScript séparément :
```text
tsc --noEmit
```

La CI échoue en cas d’erreur de type.

Éviter `any` sans justification documentée.

## Validation
Valider toutes les données externes :
- bodies HTTP ;
- paramètres de route ;
- query parameters ;
- variables d’environnement ;
- payloads d’événements.

Une bibliothèque de validation de schémas comme Zod peut être utilisée.

## Tests
Chaque fonctionnalité inclut les tests appropriés.

Niveaux :
- tests unitaires ;
- tests d’intégration ;
- tests end-to-end.

Workflow E2E critique minimal :
```text
Register
→ Login
→ Create Project
→ Create Task
→ Move Task
→ Update Task
→ Delete Task
```

## Couverture
Objectif initial :
```text
>= 70 % de couverture globale
```

Les règles métier critiques doivent rester testées même lorsque le seuil global est atteint.

## Analyse statique
L’outil qualité doit remonter :
- bugs ;
- vulnérabilités ;
- security hotspots ;
- code smells ;
- duplication ;
- problèmes de maintenabilité ;
- couverture lorsque disponible.

Aucun nouveau problème `blocker` ou `critical` n’est accepté.

## Quality Gate initial
```text
Erreurs ESLint           = 0
Erreurs TypeScript       = 0
Tests automatisés        = PASS
Problèmes critiques      = 0
Problèmes bloquants      = 0
Nouvelles vulnérabilités = 0
Couverture               >= 70 %
Build                     = PASS
```

## Règles des Pull Requests
Ne pas merge si :
- le lint échoue ;
- le contrôle TypeScript échoue ;
- les tests échouent ;
- le quality gate échoue ;
- la couverture requise n’est pas atteinte ;
- la documentation nécessaire manque ;
- les règles de review ne sont pas respectées.
