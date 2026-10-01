# Audit de l'authentification (S3-07)

**Date** : 2026-10-02 · **Périmètre** : inscription, connexion, persistance
de session, expiration, rafraîchissement, déconnexion, changement de mot de
passe et suppression de compte sur la version candidate
(`feat/S3-board-scoped-kanban`).
Version anglaise : [AUTH_AUDIT.md](AUTH_AUDIT.md).

## Méthode

1. Revue du code de `backend/src/modules/auth/`, `shared/security/` et du
   dépôt des utilisateurs.
2. Chaque scénario est un test automatisé contre **l'application réelle et
   une vraie base PostgreSQL** :
   [`backend/src/tests/integration/api/auth.api.int.test.ts`](../../backend/src/tests/integration/api/auth.api.int.test.ts)
   (26 tests, exécutés en CI par le job `integration-backend`).
3. **Reproduction** : les mêmes tests ont été exécutés sur le code d'avant
   les corrections. 11 sur 26 échouaient : ce sont les constats ci-dessous.
   Après correction, les 26 passent.

Aucun secret n'a été enregistré : les tests utilisent des comptes générés
sur une base jetable, et vérifient que réponses, traces et logs ne
contiennent ni mot de passe, ni hash, ni jeton.

## Constats

| # | Constat | Gravité | Avant (reproduit) | État |
| - | --- | --- | --- | --- |
| A1 | **La déconnexion ne révoquait pas le jeton d'accès** : un cookie copié restait valable jusqu'à 15 min. | Haute | `GET /auth/me` avec l'ancien cookie après déconnexion → **200** | Corrigé |
| A2 | **Un compte supprimé gardait l'accès** avec son jeton d'accès jusqu'à expiration. | Haute | `GET /projects` après `DELETE /auth/me` → **200** | Corrigé |
| A3 | **Un changement de mot de passe ne révoquait pas le jeton d'accès de l'autre session** (seulement son jeton de rafraîchissement). | Haute | ancien cookie après le changement → **200** | Corrigé |
| A4 | **Le jeton de rafraîchissement était accepté comme jeton d'accès** (même secret, pas de type) : un jeton de 7 jours ouvrait toutes les routes. | Haute | valeur de `refreshToken` envoyée en `accessToken` → **200** | Corrigé |
| A5 | **Les jetons de rafraîchissement étaient stockés en clair** dans `User.refreshToken` : une fuite de la base exposait les sessions actives. | Moyenne | valeur stockée = valeur du cookie | Corrigé |
| A6 | **La rotation pouvait réémettre le même jeton** : deux jetons signés dans la même seconde étaient identiques. | Moyenne | rafraîchissement en moins d'1 s → même jeton | Corrigé |
| A7 | Se connecter sur un second appareil laissait valide le jeton d'accès du premier (une seule session stockée par utilisateur). | Basse | premier appareil → **200** | Corrigé |
| A8 | **Les emails étaient sensibles à la casse** : `Alice@x.com` et `alice@x.com` pouvaient s'inscrire deux fois, et la connexion échouait avec une autre casse. | Moyenne | doublon → **201** ; connexion → **400** | Corrigé |
| A9 | Les mots de passe de plus de 72 octets étaient acceptés puis **tronqués en silence par bcrypt**. | Basse | → **201** | Corrigé |

### Corrections

- **Jetons d'accès liés à la session** (A1, A2, A3, A7) :
  `shared/security/tokens.ts`, `createRequireAuth.ts`. Chaque connexion crée
  une session ; le jeton d'accès porte son identifiant (`sid`) et chaque
  requête protégée vérifie que c'est toujours la session active de
  l'utilisateur. Déconnexion, changement de mot de passe, suppression du
  compte et nouvelle connexion l'effacent ou la remplacent : les anciens
  jetons sont refusés **dès la requête suivante**. Coût : une requête par
  clé primaire par requête authentifiée.
- **Jetons typés et algorithme imposé** (A4) : les jetons portent `typ`
  (`access` ou `refresh`) et sont vérifiés en `HS256` uniquement ;
  `requireAuth` n'accepte que `access`, `/auth/refresh` que `refresh`. Les
  jetons non signés (`alg: none`) ou signés avec un autre secret sont
  refusés (tests unitaires).
- **Jetons de rafraîchissement hachés** (A5) : la base stocke
  `SHA-256(refreshToken)`, qui sert aussi d'identifiant de session. Un jeton
  n'est jamais stocké ni journalisé.
- **Jetons de rafraîchissement uniques** (A6) : un `jti` aléatoire par
  jeton.
- **Normalisation des emails** (A8) : nettoyés et mis en minuscules par les
  schémas de validation (`shared/http/schemas.ts`), comparés sans tenir
  compte de la casse par le dépôt (les comptes existants continuent de
  fonctionner).
- **Limite de 72 octets** pour le mot de passe (A9), à l'inscription et au
  changement de mot de passe.

Note de déploiement : les sessions stockées avant ce changement ne
correspondent plus ; chaque utilisateur se reconnecte une fois après le
déploiement.

## Comportement vérifié (preuves : `auth.api.int.test.ts`)

| Scénario | Résultat |
| --- | --- |
| Inscription | 201, hash bcrypt (coût 12) stocké, aucun secret dans la réponse |
| Inscription invalide (email incorrect, mot de passe trop court ou > 72 octets, nom trop court, champ inconnu) | 400 `VALIDATION_ERROR`, rien n'est stocké |
| Email déjà utilisé (quelle que soit la casse) | 409 `EMAIL_ALREADY_IN_USE` |
| Connexion | 200, jetons uniquement dans des cookies `HttpOnly`, `SameSite=Strict` (15 min / 7 jours), jamais dans le corps |
| Mauvais mot de passe / email inconnu | même 401 `INVALID_CREDENTIALS`, aucun cookie |
| 10 connexions échouées depuis une IP en 15 min | la 11e → 429 `TOO_MANY_REQUESTS` |
| Sans cookie, jeton invalide, signé avec un autre secret, non signé ou expiré | 401 `UNAUTHENTICATED` |
| Rafraîchissement | 200, les deux jetons renouvelés ; l'ancien jeton de rafraîchissement → 401 `SESSION_EXPIRED` (rejeu refusé) |
| Déconnexion | cookies effacés ; les anciens jetons d'accès **et** de rafraîchissement → 401 |
| Changement de mot de passe | 204 ; ancienne session → 401 ; ancien mot de passe refusé ; mauvais mot de passe actuel → 400 |
| Suppression du compte | 204 ; ancienne session → 401 ; connexion → 401 |
| `/auth/me` | id, email, nom, rôle, date de création uniquement |

Tests unitaires : `tests/vitest/security/requireAuth.test.ts` (vrais JWT :
falsifié, expiré, `alg: none`, mauvais type, session révoquée, échec de la
base).

## Limites acceptées

- **Une session par utilisateur** : se connecter sur un second appareil
  déconnecte le premier. Cohérent avec le modèle de données (une session
  stockée).
- **Énumération des emails** : l'inscription répond 409 pour un email
  utilisé, et un email inconnu reçoit une réponse un peu plus rapide qu'un
  mauvais mot de passe (pas de comparaison bcrypt). Atténué par les limites
  de débit ; non bloquant pour ce produit.
- **Limites de débit par IP** (10 connexions échouées / 15 min, 20
  inscriptions / heure), en mémoire : remises à zéro au redémarrage et non
  partagées entre instances. Pas de verrouillage par compte.
- **Cookies `Secure` seulement si `NODE_ENV=production`** (défini dans
  l'image du backend) : la production doit être servie en HTTPS, sinon les
  navigateurs ignorent les cookies et personne ne peut se connecter.
- Le cookie de rafraîchissement est envoyé avec chaque requête d'API
  (chemin `/`) ; le limiter à `/api/v1/auth` réduirait son exposition.
- Pas de réinitialisation de mot de passe par email, pas de vérification
  d'email, pas de rotation du secret JWT : hors du périmètre du projet.

## Conclusion

Aucun défaut bloquant ne subsiste. Les constats A1 à A9 sont corrigés et
couverts par des tests automatisés exécutés en CI.
