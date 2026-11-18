# LëtzTrack

Test local : `npm install` puis `npm run dev` (les fonctions IA nécessitent Vercel : `npx vercel dev`).
Déploiement : dépôt GitHub -> Vercel (Import Project) -> variable GEMINI_API_KEY.
Vos food trucks : data/trucks.ts

## Signalements, validation et fil d'actu (mise en route)
1. Créez un projet gratuit sur supabase.com, puis dans « SQL Editor » collez et exécutez le contenu de `supabase.sql`.
2. Dans Supabase : Project Settings > API : copiez « Project URL » et la clé « service_role » (secrète, ne la partagez jamais).
3. Dans Vercel : Settings > Environment Variables, ajoutez :
   - `SUPABASE_URL` = le Project URL
   - `SUPABASE_SERVICE_KEY` = la clé service_role
   - `ADMIN_TOKEN` = un code secret long que vous choisissez (c'est votre mot de passe de modération)
4. Redéployez (Deployments > Redeploy).
5. Modération : ouvrez `https://votre-site/#/admin`, saisissez `ADMIN_TOKEN`. Vous voyez les signalements en attente, avec le téléphone, et vous les validez ou refusez. Un camion validé s'affiche pour tous et est annoncé dans le fil d'actu.
Les numéros de téléphone ne sont jamais visibles du public, seulement de vous.
