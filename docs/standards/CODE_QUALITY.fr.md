# Standards de qualité du code

## 1. Objectif

Ces standards s’appliquent pendant toute la migration incrémentale de l’application JavaScript legacy vers l’architecture cible TypeScript.

Les règles qualité doivent améliorer progressivement la codebase sans imposer une réécriture massive.

---

## 2. Outils

La chaîne qualité utilise :

- **ESLint** pour JavaScript et TypeScript ;
- **TypeScript** pour le contrôle statique des types ;
- les tests automatisés ;
- la mesure de couverture ;
- une analyse statique comme SonarQube ou SonarCloud ;
- GitHub Actions pour la CI.

Si Prettier est activé, il sert de formatter ; ESLint reste le linter.

---

## 3. ESLint

ESLint doit couvrir à la fois le JavaScript legacy et le nouveau TypeScript pendant la migration.

Scripts attendus :

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

Le code nouveau ou modifié ne doit introduire aucune erreur de lint.

Les exceptions temporaires sur du code legacy non touché doivent être explicites, limitées et documentées plutôt que masquées globalement.

---

## 4. TypeScript

TypeScript est introduit progressivement.

JavaScript et TypeScript peuvent temporairement coexister.

Le nouveau code doit être écrit en TypeScript lorsque cela est raisonnable. Les modules migrés doivent passer le contrôle des types.

Commande recommandée :

```text
tsc --noEmit
```

Éviter `any` sauf justification technique.

---

## 5. Validation des entrées

Valider toutes les entrées externes :

- bodies HTTP ;
- paramètres de route ;
- query parameters ;
- variables d’environnement ;
- payloads RabbitMQ.

Une bibliothèque de schémas comme Zod peut être utilisée.

---

## 6. Tests et couverture

Toute règle métier nouvelle ou modifiée nécessite des tests appropriés.

Objectif initial :

```text
>= 70 % de couverture globale
```

Pendant la migration, l’équipe doit également surveiller la couverture du code nouveau et modifié afin que les lacunes du legacy ne servent pas à justifier du nouveau code non testé.

---

## 7. Analyse statique

L’analyse statique doit remonter :

- bugs ;
- vulnérabilités ;
- security hotspots ;
- code smells ;
- duplication ;
- problèmes de maintenabilité ;
- couverture lorsque disponible.

Aucun nouveau problème `blocker` ou `critical` n’est accepté.

Les problèmes legacy existants doivent être suivis comme dette technique et réduits progressivement selon leur priorité.

---

## 8. Quality Gate initial

```text
Nouvelles erreurs lint   = 0
Erreurs TypeScript       = 0
Tests obligatoires       = PASS
Nouveaux problèmes critical = 0
Nouveaux problèmes blocker  = 0
Nouvelles vulnérabilités = 0
Couverture               >= objectif validé
Build                     = PASS
```

Le gate peut devenir plus strict à mesure que la dette legacy diminue.

---

## 9. Règles des Pull Requests

Ne pas merge lorsque :

- les contrôles lint obligatoires échouent ;
- les contrôles TypeScript échouent sur le code nouveau/migré ;
- les tests obligatoires échouent ;
- le quality gate bloquant échoue ;
- la documentation nécessaire manque ;
- les règles de review ne sont pas respectées.

Une PR de migration doit rester ciblée et ne pas mélanger plusieurs changements architecturaux sans rapport.

---

## 10. Definition of Done

Une Issue terminée doit respecter la Definition of Done du projet, notamment :

- implémentation terminée ;
- tests appropriés ajoutés ;
- contrôles qualité validés ;
- CI validée ;
- documentation mise à jour ;
- Pull Request approuvée ;
- artefact de build/image Docker produit lorsque nécessaire.
