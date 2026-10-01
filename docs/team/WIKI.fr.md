# Documentation et wiki GitHub

La documentation existe à deux endroits qui doivent rester identiques :

| Où | Rôle |
| --- | --- |
| `docs/` (+ `README.md`, `README.fr.md`, `frontend/README.md`) | **Source de vérité.** Rédigée et relue dans les pull requests, versionnée avec le code. |
| [Wiki GitHub](https://github.com/LegacycyLaFamille/kanban-app/wiki) | **Copie publiée**, plus simple à parcourir : barre latérale, une page par document, français et anglais côte à côte. |

**Toujours modifier `docs/`, jamais le wiki.** Chaque page générée commence
par une mention « Page générée depuis … » et est écrasée à la publication
suivante.

## Publication

`scripts/sync-wiki.mjs` transforme la documentation en pages de wiki :

- une page par fichier Markdown, dans l'espace de noms plat du wiki :
  `docs/backend/NOTIFICATIONS.md` → `NOTIFICATIONS`, les versions françaises
  prennent le suffixe `-FR` (`ONBOARDING-FR`), les index de dossier
  deviennent `ADR-Index` et `Standards-Index`, le README racine devient
  `Home` (`Accueil` en français) ;
- les liens entre documents deviennent des liens wiki (ancres conservées),
  les liens vers tout autre fichier du dépôt deviennent des liens GitHub vers
  la branche publiée ;
- `_Sidebar.md` (navigation par thème, avec un lien FR à côté de chaque page
  traduite) et `_Footer.md` (commit source) sont générés ;
- le script écrit un manifeste `.generated-pages` dans le wiki. À
  l'exécution suivante, il ne supprime que les pages listées dont la source
  n'existe plus : **les pages créées à la main dans le wiki ne sont jamais
  touchées**.

Le workflow **Publish Wiki** (`.github/workflows/wiki.yml`) le lance à chaque
push sur `main` qui modifie la documentation, et peut être déclenché à la
main depuis l'onglet Actions. Les liens pointent alors vers `main`.

## Publier à la main

```bash
git clone https://github.com/LegacycyLaFamille/kanban-app.wiki.git ../kanban-app.wiki
node scripts/sync-wiki.mjs ../kanban-app.wiki main
cd ../kanban-app.wiki
git add -A && git commit -m "docs: sync wiki" && git push
```

Lancer le script sans pousser permet de prévisualiser : le clone contient
alors exactement ce que le wiki afficherait.

## Ajouter un document

1. Ajouter le fichier Markdown dans `docs/` (et sa traduction `.fr.md` si le
   dossier est bilingue).
2. Le référencer dans le bon index (`README.md`, `README.md` du dossier).
3. Utiliser des liens relatifs (`../backend/EVENTS.md#section`) : ils
   fonctionnent sur GitHub et sont convertis pour le wiki.
4. Deux documents ne doivent pas avoir le même nom de fichier (sauf
   `README`) : le script s'arrête avec une erreur, car les noms de pages du
   wiki sont globaux.

Une fois fusionnée dans `main`, la page apparaît dans le wiki et dans sa
barre latérale.

## Si le workflow ne peut pas pousser

Le workflow pousse avec le `GITHUB_TOKEN` par défaut (`contents: write`). Si
l'organisation le restreint, créer un token à granularité fine avec
*Contents : lecture et écriture* sur ce dépôt, l'enregistrer comme secret
`WIKI_TOKEN`, et passer `token: ${{ secrets.WIKI_TOKEN }}` à l'étape « Check
out the wiki ».
