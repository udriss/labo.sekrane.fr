# 1. Supprimer les dossiers de migrations désormais vides (si git les montre encore)

# Imprimer l'heure de début.
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')
echo "Début : $START_TIME"


trap _print_end EXIT
git add prisma/migrations
# 2. Réinitialiser la base (adapté MySQL):
mysql -u root -p -e 'DROP DATABASE labo_2; CREATE DATABASE labo_2;'
# 3. Appliquer la migration init
npx prisma migrate deploy
# 4. Regénérer le client
npx prisma generate
# 5. Reseed si nécessaire
npm run db:seed:orchestrator

# Mesurer la durée en secondes
SECONDS=0

# Fonction pour imprimer l'heure de fin et la durée, appelée à la sortie du script
_print_end() {
    END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    DURATION=$SECONDS
    printf -v D_HMS '%02d:%02d:%02d' $((DURATION/3600)) $((DURATION%3600/60)) $((DURATION%60))
    echo "Fin   : $END_TIME (durée : $D_HMS)"
}