"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var admin, teacher, suppliers, additionalSuppliers, chemicals, additionalChemicals, materiel, additionalEquipment, notebookEntry, additionalNotebookEntries;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('🌱 Peuplement de la base de données LIMS...');
                    return [4 /*yield*/, prisma.users.upsert({
                            where: { email: 'admin@labo.fr' },
                            update: {},
                            create: {
                                email: 'admin@labo.fr',
                                password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlZhZg.qIuYDhsa', // "password123"
                                name: 'Administrateur Labo',
                                role: 'ADMIN',
                            },
                        })
                        // Créer un enseignant
                    ];
                case 1:
                    admin = _a.sent();
                    return [4 /*yield*/, prisma.users.upsert({
                            where: { email: 'prof@labo.fr' },
                            update: {},
                            create: {
                                email: 'prof@labo.fr',
                                password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewlZhZg.qIuYDhsa', // "password123"
                                name: 'Professeur Chimie',
                                role: 'TEACHER',
                            },
                        })
                        // Créer des fournisseurs
                    ];
                case 2:
                    teacher = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.supplier.create({
                                data: {
                                    name: 'VWR',
                                    email: 'commandes@vwr.fr',
                                    phone: '01 23 45 67 89',
                                    website: 'https://fr.vwr.com',
                                    isActive: true,
                                },
                            }),
                            prisma.supplier.create({
                                data: {
                                    name: 'Sigma-Aldrich',
                                    email: 'orders@sigmaaldrich.fr',
                                    phone: '01 98 76 54 32',
                                    website: 'https://www.sigmaaldrich.com',
                                    isActive: true,
                                },
                            }),
                        ])
                        // Ajout de fournisseurs supplémentaires
                    ];
                case 3:
                    suppliers = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.supplier.create({
                                data: {
                                    name: 'Fisher Scientific',
                                    email: 'contact@fisher.com',
                                    phone: '01 45 67 89 10',
                                    website: 'https://www.fishersci.com',
                                    isActive: true,
                                },
                            }),
                            prisma.supplier.create({
                                data: {
                                    name: 'Carlo Erba',
                                    email: 'info@carloerba.com',
                                    phone: '01 23 45 67 89',
                                    website: 'https://www.carloerba.com',
                                    isActive: true,
                                },
                            }),
                        ])];
                case 4:
                    additionalSuppliers = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.chemical.create({
                                data: {
                                    name: 'Acide chlorhydrique',
                                    formula: 'HCl',
                                    casNumber: '7647-01-0',
                                    quantity: 500,
                                    unit: 'mL',
                                    minQuantity: 100,
                                    concentration: 37,
                                    storage: 'Armoire acides',
                                    room: 'Labo 1',
                                    hazardClass: 'CORROSIVE',
                                    status: 'IN_STOCK',
                                    supplierId: suppliers[0].id,
                                    purchaseDate: new Date('2024-01-15'),
                                    expirationDate: new Date('2026-01-15'),
                                },
                            }),
                            prisma.chemical.create({
                                data: {
                                    name: 'Hydroxyde de sodium',
                                    formula: 'NaOH',
                                    casNumber: '1310-73-2',
                                    quantity: 250,
                                    unit: 'g',
                                    minQuantity: 50,
                                    concentration: 99,
                                    storage: 'Armoire bases',
                                    room: 'Labo 1',
                                    hazardClass: 'CORROSIVE',
                                    status: 'IN_STOCK',
                                    supplierId: suppliers[1].id,
                                    purchaseDate: new Date('2024-02-10'),
                                    expirationDate: new Date('2027-02-10'),
                                },
                            }),
                        ])
                        // Ajout de produits chimiques supplémentaires
                    ];
                case 5:
                    chemicals = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.chemical.create({
                                data: {
                                    name: 'Ethanol',
                                    formula: 'C2H5OH',
                                    casNumber: '64-17-5',
                                    quantity: 1000,
                                    unit: 'mL',
                                    minQuantity: 200,
                                    concentration: 96,
                                    storage: 'Armoire solvants',
                                    room: 'Labo 2',
                                    hazardClass: 'FLAMMABLE',
                                    status: 'IN_STOCK',
                                    supplierId: additionalSuppliers[0].id,
                                    purchaseDate: new Date('2024-05-01'),
                                    expirationDate: new Date('2026-05-01'),
                                },
                            }),
                            prisma.chemical.create({
                                data: {
                                    name: 'Acétone',
                                    formula: 'C3H6O',
                                    casNumber: '67-64-1',
                                    quantity: 500,
                                    unit: 'mL',
                                    minQuantity: 100,
                                    concentration: 99,
                                    storage: 'Armoire solvants',
                                    room: 'Labo 2',
                                    hazardClass: 'FLAMMABLE',
                                    status: 'IN_STOCK',
                                    supplierId: additionalSuppliers[1].id,
                                    purchaseDate: new Date('2024-06-15'),
                                    expirationDate: new Date('2026-06-15'),
                                },
                            }),
                        ])];
                case 6:
                    additionalChemicals = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.materiel.create({
                                data: {
                                    name: 'Bécher 100ml',
                                    type: 'GLASSWARE',
                                    quantity: 25,
                                    status: 'AVAILABLE',
                                    location: 'Étagère A1',
                                    room: 'Labo 1',
                                    supplierId: suppliers[0].id,
                                    purchaseDate: new Date('2024-01-10'),
                                },
                            }),
                            prisma.materiel.create({
                                data: {
                                    name: 'Erlenmeyer 250ml',
                                    type: 'GLASSWARE',
                                    quantity: 15,
                                    status: 'AVAILABLE',
                                    location: 'Étagère A2',
                                    room: 'Labo 1',
                                    supplierId: suppliers[0].id,
                                    purchaseDate: new Date('2024-01-10'),
                                },
                            }),
                            prisma.materiel.create({
                                data: {
                                    name: 'Balance de précision',
                                    type: 'MEASURING',
                                    model: 'Sartorius BP210S',
                                    serialNumber: 'BP210S-2024-001',
                                    quantity: 2,
                                    status: 'AVAILABLE',
                                    location: 'Paillasse centrale',
                                    room: 'Labo 1',
                                    supplierId: suppliers[1].id,
                                    purchaseDate: new Date('2024-03-01'),
                                    warrantyEnd: new Date('2027-03-01'),
                                },
                            }),
                            prisma.materiel.create({
                                data: {
                                    name: 'Plaque chauffante',
                                    type: 'HEATING',
                                    model: 'IKA C-MAG HS 7',
                                    quantity: 5,
                                    status: 'AVAILABLE',
                                    location: 'Armoire matériel',
                                    room: 'Labo 1',
                                    supplierId: suppliers[1].id,
                                    purchaseDate: new Date('2024-02-15'),
                                },
                            }),
                        ])
                        // Ajout d'équipements supplémentaires
                    ];
                case 7:
                    materiel = _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.materiel.create({
                                data: {
                                    name: 'Pipette automatique',
                                    type: 'MEASURING',
                                    quantity: 10,
                                    status: 'AVAILABLE',
                                    location: 'Étagère B1',
                                    room: 'Labo 2',
                                    supplierId: additionalSuppliers[0].id,
                                    purchaseDate: new Date('2024-07-01'),
                                },
                            }),
                            prisma.materiel.create({
                                data: {
                                    name: 'Hotte aspirante',
                                    type: 'SAFETY',
                                    quantity: 1,
                                    status: 'AVAILABLE',
                                    location: 'Mur Est',
                                    room: 'Labo 2',
                                    supplierId: additionalSuppliers[1].id,
                                    purchaseDate: new Date('2024-08-01'),
                                },
                            }),
                        ])];
                case 8:
                    additionalEquipment = _a.sent();
                    return [4 /*yield*/, prisma.notebookEntry.create({
                            data: {
                                title: 'Dosage acide-base',
                                description: 'Dosage de l\'acide chlorhydrique par la soude',
                                scheduledDate: new Date('2024-12-15T14:00:00'),
                                duration: 120,
                                class: 'TS1',
                                groups: ['Groupe A', 'Groupe B'],
                                createdById: teacher.id,
                                objectives: 'Déterminer la concentration d\'une solution d\'acide chlorhydrique',
                                procedure: '1. Préparer les solutions\n2. Effectuer le dosage\n3. Calculer la concentration',
                                status: 'SCHEDULED',
                            },
                        })
                        // Associer des produits chimiques au TP
                    ];
                case 9:
                    notebookEntry = _a.sent();
                    // Associer des produits chimiques au TP
                    return [4 /*yield*/, Promise.all([
                            prisma.notebookChemical.create({
                                data: {
                                    notebookId: notebookEntry.id,
                                    chemicalId: chemicals[0].id,
                                    quantityUsed: 25,
                                    unit: 'mL',
                                    notes: 'Solution à doser',
                                },
                            }),
                            prisma.notebookChemical.create({
                                data: {
                                    notebookId: notebookEntry.id,
                                    chemicalId: chemicals[1].id,
                                    quantityUsed: 0.1,
                                    unit: 'MOL',
                                    notes: 'Solution titrante 0.1M',
                                },
                            }),
                        ])
                        // Associer du matériel au TP
                    ];
                case 10:
                    // Associer des produits chimiques au TP
                    _a.sent();
                    // Associer du matériel au TP
                    return [4 /*yield*/, Promise.all([
                            prisma.notebookEquipment.create({
                                data: {
                                    notebookId: notebookEntry.id,
                                    equipmentId: materiel[0].id,
                                    quantity: 2,
                                    notes: 'Pour les solutions',
                                },
                            }),
                            prisma.notebookEquipment.create({
                                data: {
                                    notebookId: notebookEntry.id,
                                    equipmentId: materiel[1].id,
                                    quantity: 1,
                                    notes: 'Pour le dosage',
                                },
                            }),
                        ])
                        // Ajout de TP supplémentaires
                    ];
                case 11:
                    // Associer du matériel au TP
                    _a.sent();
                    return [4 /*yield*/, Promise.all([
                            prisma.notebookEntry.create({
                                data: {
                                    title: 'Synthèse de l\'aspirine',
                                    description: 'Synthèse de l\'acide acétylsalicylique à partir de l\'acide salicylique',
                                    scheduledDate: new Date('2024-11-20T10:00:00'),
                                    duration: 180,
                                    class: 'TS2',
                                    groups: ['Groupe C'],
                                    createdById: teacher.id,
                                    objectives: 'Apprendre les bases de la synthèse organique',
                                    procedure: '1. Mélanger les réactifs\n2. Chauffer sous reflux\n3. Purifier le réactif',
                                    status: 'SCHEDULED',
                                },
                            }),
                            prisma.notebookEntry.create({
                                data: {
                                    title: 'Analyse spectroscopique',
                                    description: 'Utilisation de la spectroscopie IR pour identifier des composés organiques',
                                    scheduledDate: new Date('2024-12-10T14:00:00'),
                                    duration: 120,
                                    class: 'TS3',
                                    groups: ['Groupe D'],
                                    createdById: teacher.id,
                                    objectives: 'Comprendre l\'utilisation de la spectroscopie IR',
                                    procedure: '1. Préparer les échantillons\n2. Effectuer les mesures\n3. Analyser les spectres',
                                    status: 'SCHEDULED',
                                },
                            }),
                        ])];
                case 12:
                    additionalNotebookEntries = _a.sent();
                    console.log('✅ Base de données peuplée avec succès!');
                    console.log("\uD83D\uDC64 Admin cr\u00E9\u00E9: ".concat(admin.email));
                    console.log("\uD83D\uDC68\u200D\uD83C\uDFEB Enseignant cr\u00E9\u00E9: ".concat(teacher.email));
                    console.log("\uD83C\uDFED ".concat(suppliers.length, " fournisseurs cr\u00E9\u00E9s"));
                    console.log("\uD83E\uDDEA ".concat(chemicals.length, " produits chimiques cr\u00E9\u00E9s"));
                    console.log("\uD83D\uDD2C ".concat(materiel.length, " \u00E9quipements cr\u00E9\u00E9s"));
                    console.log("\uD83D\uDCD3 1 TP d'exemple cr\u00E9\u00E9");
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); })
    .catch(function (e) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.error(e);
                return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                process.exit(1);
                return [2 /*return*/];
        }
    });
}); });
