
- dans l'inventaire, les cards affichent comme titre le type de matériel suivi de son volume, ce qui est une excelletnte idée à garder. Cependant, lorsqu'on veut en modifier un via le modal "Modifier l'équipement", il faut séparer la verreire de son volume et avoir la possibilité de modifier le volume
- pour les appariels de catégorie mesure ajouter un champ "résolution de l'appareil" à la fois lors de l'ajout dans l'inventaire et aussi dans le modal de "Modifier l'équipement"
- dans le modal de "Modifier l'équipement", ajouter un champ "volume" et un autre "champ"
- lors de la mise de la Quantité, lorsque la mise est positive, il faut annimer le label "Quantité:" et la nouvelle mise en jour en les mettant en vers gras et en grandissant lergement la font. L'animation dure 1 seconde.
- lors de l'ajout d'un matériel perso, on peut le faire depuis l'étape 1 "Catégorie Choisir le type de matériel". Lors de Choisir une catégorie, on peut cliquer pour ajouter un nouveau matériel qui sera ensuite asociée à une catégorie
- sur la même page, ajoutée la possiblité de faire une nouvelle catégorie qui peut être effacée et visible par tous 
- lors de l'ajout d'un matériel perso, il faut pouvoir l'ajouter dans une des catégories dispo
- lorsqu'un user ajoute un nouveau matériel, proposer dans un dialog stylisé et moderne de poursuivre l'ajout dans l'inventaire avec ce nouveau matériel, si oui, on passe à l'étape "Détails Compléter les informations" avec le nouveau matériel sélectionné
- dans l'étape 3 "Compléter les informations", les volumes doivent ^pouvoir être agrémentés par des valeurs perso. Les valeurs persos ajoutés sont ensuite réutilisable lors d'un prochain ajout même par un autre user

PROBLÈME 2 dans "/var/www/labo.sekrane.fr/app/chemicals" :
- lors de l'ajout d'un Nouveau produit chimique lorsque je clique sur "Choisir une molécule prédéfinie (optionnel)" : 
[Error] A props object containing a "key" prop is being spread into JSX:
  let props = {key: someKey, component: ..., tabIndex: ..., role: ..., id: ..., onMouseMove: ..., onClick: ..., onTouchStart: ..., data-option-index: ..., aria-disabled: ..., aria-selected: ..., className: ..., children: ...};
  <ForwardRef(Box) {...props} />
React keys must be passed directly to JSX without using spread:
  let props = {component: ..., tabIndex: ..., role: ..., id: ..., onMouseMove: ..., onClick: ..., onTouchStart: ..., data-option-index: ..., aria-disabled: ..., aria-selected: ..., className: ..., children: ...};
  <ForwardRef(Box) key={someKey} {...props} />
	error (node_modules_next_dist_445d8acf._.js:2249)
	jsxDEVImpl ([root-of-the-server]__5c1bc021._.js:278:153)
- lorsque je choisi un élément, le formulaire se met à jour avec les données mais l'erreur suivante s'affiche :
[Error] TypeError: existingChemicals.filter is not a function. (In 'existingChemicals.filter((chem)=>chem.id !== (chemical === null || chemical === void 0 ? void 0 : chemical.id) && (chem.name.toLowerCase() === name.toLowerCase() || chem.casNumber && casNumber && chem.casNumber === casNumber || chem.formula && formula && chem.formula === formula))', 'existingChemicals.filter' is undefined)
	reportError (_61bd66ee._.js:205)
- le select "Formule chimique" doit parfois afficher du texte avec chiffres en indices mais le cadre n'affiche pas correctement et c'est tronqué
- si on choisit une molécule preset et qu'on change un des champ, il faut changer le selcect des presets car les données ont changé et le texte info "Vous pouvez maintenant ajuster les quantités et informations de stockage." doit changé en conséquence informant qu'on fait une molécule différente
- si on revient les données enregistrés, le select doit revenir sur la molécule associée


PROLBÈME 3 dans "/var/www/labo.sekrane.fr/app/notebook" :
- lorsque j'ajoute un nouveau TP j'ai : 
Error [PrismaClientValidationError]: 
Invalid `__TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].notebookEntry.create()` invocation in
/var/www/labo.sekrane.fr/.next/server/chunks/[root-of-the-server]__f5d138b8._.js:122:170

  119 async function POST(request) {
  120     const body = await request.json();
  121     const { title, description, scheduledDate, duration, class: className, groups, createdById, objectives, procedure } = body;
→ 122     const notebook = await __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$db$2f$prisma$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["prisma"].notebookEntry.create({
            data: {
              title: "Mon TP",
              description: undefined,
              scheduledDate: new Date("Invalid Date"),
                             ~~~~~~~~~~~~~~~~~~~~~~~~
              duration: undefined,
              class: undefined,
              groups: undefined,
              createdById: undefined,
              objectives: undefined,
              procedure: undefined
            },
            include: {
              createdBy: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          })

Invalid value for argument `scheduledDate`: Provided Date object is invalid. Expected Date.
    at <unknown> (app/api/notebook/route.ts:33:46)
  31 |   } = body
  32 |   
> 33 |   const notebook = await prisma.notebookEntry.create({
     |                                              ^
  34 |     data: {
  35 |       title,
  36 |       description, {
  clientVersion: '6.12.0'
}
 POST /api/notebook/ 500 in 89ms

- organiser les TP preset par niveau : les niveau de section sont "Seconde", "Première", "Terminale", "Prépa 1ère année", "Prépa 2e année"
- lors de l'ajout d'un TP perso, on doit choisir un ou plusieurs section
- l'onglet TP preset est organisé d'abord par seection 
- on doit pourvoir modifier ses propores TP après ajout
 - permettre d'ajouter des fichiers et du matériel tout comme dans le Dialogue de création d'événement multi-étapes de "/var/www/labo.sekrane.fr/app/calendrier/page.tsx". Reprendre un maximum de ce dialogue pour l'adapter lors de l'ajout d'un nouveau TP

PROBLÈME 4 dans "/var/www/labo.sekrane.fr/app/calendrier/page.tsx" : 
- lors de l'affichage des calendrier dans le Dialogue de création d'événement multi-étapes, dès qu'on clique sur le champ de la date, le calendrier doit s'ouvir. Pas besoin de cliquer sur le bouton latéral à droite; De même pour l'heure. 
- pas besoin de date début et date de fin mais faire des crénau. On choisit un jour puis une durée entre deux horaires. On peut manuellement ajouter plusieurs créneaux
- lorsque je clique sur le select pour "Matériel nécessaire" avec "Sélectionnez le matériel qui sera utilisé pendant cette séance" j'ai l'erreur : [Error] TypeError: options.filter is not a function. (In 'options.filter((option)=>{
        if (filterSelectedOptions && (multiple ? value : [
            value
        ]).some((value2)=>value2 !== null && isOptionEqualToValue(option, value2))) {
            return false;
        }
        return true;
    })', 'options.filter' is undefined)
	reportError (node_modules_@mui_material_esm_6fb804ef._.js:24894)
	onUncaughtError (node_modules_next_dist_client_20b209c9._.js:1090)
	logCaughtError (node_modules_next_dist_compiled_react-dom_1f56dc06._.js:5196)
	runWithFiberInDEV (node_modules_next_dist_compiled_react-dom_1f56dc06._.js:890:140)
	(fonction anonyme) (node_modules_next_dist_compiled_react-dom_1f56dc06._.js:5237)

PROBLÈME 5 dans "/var/www/labo.sekrane.fr/app/admin/classes" :
- la Gestion des classes devraient afficher toutes les classes dispos avec posisibilités de les modifier
- une fois classe ajoutée, elle doit être dispo dans tous les select qui utilisent des classes. Notamment dans "Sélectionnez les classes qui participeront à cette séance" du fichier "/var/www/labo.sekrane.fr/app/calendrier/page.tsx"
- de même pour les salles de "/var/www/labo.sekrane.fr/app/admin/salles"







PROBLÈME 1 dans "/var/www/labo.sekrane.fr/app/chemicals" :
- mettre en place un système de reconnaissance auto soit par le nom soit par le cas. lorsqu'on commence à rentrer le nom du produit, une liste doit appariatre affichant les potentiel composés. De même pour le cas qui doit affiche le nombre mais aussi le nom de la molécule associée en petit en dessous

PROBLÈME 2 DANS "/var/www/labo.sekrane.fr/app/materiel" :
- dans "Modifier l'équipement", le champ de volumes doit êtr eun select avec les valeurs par défaut associé à la vverreire sélectionnée. On peut ajouter une valeur perso si besoin
- dans l'étape 3 de la timeline d'ajout dans l'inventaire avec "Compléter les informations", fusionner le select des volumes avec le champ de volume perso pour n'avoir qu'un seul input gérant els deux simulatanément
- lorsqu'un user ajoute un nouveau matériel, proposer dans un dialog stylisé et moderne de poursuivre l'ajout dans l'inventaire avec ce nouveau matériel, si oui, on passe à l'étape "Détails Compléter les informations" avec le nouveau matériel sélectionné
- lors de l'ajout d'un matériel perso, on peut le faire depuis l'ouverture de la page princiaple "/var/www/labo.sekrane.fr/app/materiel". Lors de Choisir une catégorie, on peut cliquer pour ajouter un nouveau matériel qui sera ensuite asociée à une catégorie
- sur la même page, ajoutée la possiblité de faire une nouvelle catégorie qui peut être effacée et visible par tous 
- le FAB pour ajout rapide ne fonctionne pas. appuery ne donne rien

PROBLÈME 3 : 
- lors de l'ajout d'un TP perso, on doit choisir un ou plusieurs section
- l'onglet TP preset affiche les TP enregistre en organisé d'abord par section 
- on doit pourvoir modifier ses propores TP après ajout
 - permettre d'ajouter des fichiers et du matériel tout comme dans le Dialogue de création d'événement multi-étapes de "/var/www/labo.sekrane.fr/app/calendrier/page.tsx". Reprendre un maximum de ce dialogue pour l'adapter lors de l'ajout d'un nouveau TP. 
 - organiser les TP preset par niveau : les niveau de section sont "Seconde", "Première", "Terminale", "Prépa 1ère année", "Prépa 2e année"










 per component="li" tabIndex={-1} role="option" id="_r_12_-opt..." onMouseMove={function handleOptionMouseMove} ...>
<MuiPaper-root as="li" ownerState={{component:"li", ...}} className="MuiPaper-r..." ref={null} tabIndex={-1} ...>
<Insertion>
<li className="MuiPaper-r..." tabIndex={-1} role="option" id="_r_12_-opt..." ...>
<ListItem disablePadding={true}>
<MuiListItem-root as="li" ref={function useForkRef.useMemo} ownerState={{...}} className="MuiListIte...">
<Insertion>
<li className="MuiListIte..." ref={function useForkRef.useMemo}>
<ListItemText primary={<ForwardRef(Typography)>} secondary={<ForwardRef(Grid)>}>
<MuiListItemText-root className="MuiListIte..." ref={null} ownerState={{primary:true, ...}}>
<Insertion>
<div className="MuiListIte...">
<Typography>
<Typography variant="body2" color="textSecondary" className="MuiListIte..." ref={null} ...>
<MuiTypography-root as="p" ref={null} className="MuiTypogra..." ...>
<Insertion>

PROBLÈME 2 dans "/var/www/labo.sekrane.fr/app/materiel" :

lors de l'ajout d'un matériel perso, le dialog de s'affiche bien mais si je clique sur "Oui, ajouter à l'inventaire" associé à "onClick={handleContinueToInventory}" j'ai l'erreur :
[Error] TypeError: undefined is not an object (evaluating 'formData.name.trim')
reportError (app_materiel_page_tsx_d659bdb3..js:1702:160)
onUncaughtError (node_modules_next_dist_client_20b209c9..js:1090)
logCaughtError (node_modules_next_dist_compiled_react-dom_1f56dc06..js:5196)
runWithFiberInDEV (node_modules_next_dist_compiled_react-dom_1f56dc06..js:890:140)
(fonction anonyme) (node_modules_next_dist_compiled_react-

pour la fonciton "handleDeleteEquipment", syuliser le dialogue en prenant exactement le mêe style que le dilaogue de "Dialogue de continuation après ajout de matériel personnalisé" avec "onClick={handleContinueToInventory}"
pour "handleDeleteEquipment", il ne faut pas recharger toutes la page mais faire une animation stylisé qui montré la supression aevec spiner autour du card supprimé. Les autres card s'ajusteront automatiquement lorsque la card sera suppirmé du DOM
IMPÉRATIVEMENT : lorsqu'on ajoute un nouveau materiel il doit apparaitre dans la catégorie associé mais spéaré des preset pour montrer que c'est perso. Afficher un petit chip qui montr ele nom de k'user qui l'a ajouté
PROBLÈME 3 dans "/var/www/labo.sekrane.fr/app/notebook/page.tsx" :

lorsque j'ouvre la page j'ai directement l'erreur :
[Error] TypeError: entries.forEach is not a function. (In 'entries.forEach((entry)=>{
if (entry.sections && entry.sections.length > 0) {
entry.sections.forEach((sectionId)=>{
if (organized[sectionId]) {
organized[sectionId].push(entry);
}
});
} else {
organized['sans-section'].push(entry);
}
})', 'entries.forEach' is undefined)
reportError (0758f389..js:133)
onUncaughtError (node_modules_next_dist_client_20b209c9..js:1090)
logCaughtError (node_modules_next_dist_compiled_react-dom_1f56dc06..js:5196)
runWithFiberInDEV (node_modules_next_dist_compiled_react-dom_1f56dc06..js:890:140)
(fonction anonyme) (node_modules_next_dist_compiled_react-dom_1f56dc06..js:5237)
lors de l'affichage des calendrier dans le Dialogue de création d'événement multi-étapes, dès qu'on clique sur le champ de la date, le calendrier doit s'ouvir. Pas besoin de cliquer sur le bouton latéral à droite; De même pour l'heure. pas besoin de date début et date de fin mais faire des crénau. On choisit un jour puis une durée entre deux horaires. On peut manuellement ajouter plusieurs créneaux
le matériel nécessaire et le s rpdtuis chimiques devraient afficher ceux dispos ou bien permettre d'ajouter des spéicifques
à l'ajout d'un novueau événément j'ai le message console "Événement créé avec succès!" mais rien n'apparait ni dans le candrier ni dans les ci-dessous :
<Tab label="Vue hebdomadaire" />
<Tab label="Liste des événements" />
<Tab label="Planning du jour" />
Pourtant j'ai bien "1 TP programmés"