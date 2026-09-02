# Conventions Git

## Conventional Commits
Le projet utilise Conventional Commits.

Format :
```text
<type>(scope-optionnel): <description>
```

Exemples :
```text
feat(auth): add login endpoint
fix(tasks): reject invalid task status
refactor(projects): isolate repository access
test(auth): add invalid password cases
docs(api): document project endpoints
ci: add lint job
chore: update dependencies
```

Types autorisés :
- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `style`
- `perf`
- `ci`
- `build`
- `chore`
- `revert`

Les descriptions utilisent l’impératif, commencent par une minuscule, restent concises et ne se terminent pas par un point.

## Branches
Branche principale : `main`.

Tout développement est réalisé sur une branche courte créée depuis la dernière version de `main`.

Préfixes :
`feature/`, `fix/`, `refactor/`, `test/`, `docs/`, `chore/`, `ci/`.

Format :
```text
<type>/<issue-id>-<description-courte>
```

Exemples :
```text
feature/S1-17-login
feature/S1-20-project-crud
fix/S2-08-task-form-validation
ci/S1-31-github-actions
```

Une Issue correspond normalement à une branche.

## Pull Requests
Les titres de PR suivent Conventional Commits lorsque cela est pertinent.

Chaque PR doit :
- être liée à l’Issue correspondante ;
- rester ciblée ;
- passer la CI ;
- recevoir au moins une approbation ;
- inclure des tests lorsque la logique métier change ;
- mettre à jour la documentation si nécessaire.

Lier l’Issue avec :
```text
Closes #42
```

## Stratégie de merge
Stratégie recommandée : **Squash and merge**.

Le commit final doit respecter Conventional Commits.

## Protection de main
`main` doit imposer :
- une Pull Request avant merge ;
- au moins une approbation ;
- les contrôles CI obligatoires ;
- la résolution des conversations de review ;
- aucun push direct.

Les contrôles doivent couvrir :
`lint`, `typecheck`, `tests`, `coverage`, `code quality`, `build`.

## Workflow
```text
Backlog
→ Ready
→ In Progress
→ In Review
→ Testing
→ Done
```

Utiliser `Blocked` lorsqu’il est impossible d’avancer.

## Pratiques interdites
Ne pas :
- push directement sur `main` ;
- mélanger des Issues sans rapport dans une PR ;
- merge avec une CI rouge ;
- contourner la review ;
- utiliser des commits vagues comme `update`, `fix stuff`, `work` ou `changes` ;
- versionner des identifiants, tokens, secrets `.env` ou `node_modules`.
