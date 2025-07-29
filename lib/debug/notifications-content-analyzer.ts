import fs from 'fs';

interface NotificationUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface FileNotification {
  id: string;
  userId: NotificationUser[];
  role: string;
  module: string;
  actionType: any;
  message: any;
  details: string;
  createdAt: string;
  isRead: boolean;
  severity: string;
}

interface ContentAnalysis {
  fileExists: boolean;
  fileSize: number;
  totalNotifications: number;
  userAnalysis: {
    searchedUserId: string;
    searchedUserEmail: string;
    exactIdMatches: number;
    exactEmailMatches: number;
    partialIdMatches: Array<{notificationId: string; foundId: string; similarity: string}>;
    partialEmailMatches: Array<{notificationId: string; foundEmail: string; similarity: string}>;
    allUniqueUserIds: string[];
    allUniqueEmails: string[];
    sampleNotifications: Array<{
      id: string;
      users: NotificationUser[];
      userCount: number;
    }>;
  };
  structureAnalysis: {
    validStructure: number;
    invalidStructure: number;
    emptyUserArrays: number;
    nullUserArrays: number;
    examples: Array<{
      notificationId: string;
      userIdType: string;
      userIdValue: any;
      isValid: boolean;
    }>;
  };
  recommendations: string[];
}

export class NotificationsContentAnalyzer {
  private static readonly FILE_PATH = '/var/www/labo.sekrane.fr/data/notifications.json';

  static async analyzeForUser(userId: string, userEmail: string): Promise<ContentAnalysis> {
    const analysis: ContentAnalysis = {
      fileExists: false,
      fileSize: 0,
      totalNotifications: 0,
      userAnalysis: {
        searchedUserId: userId,
        searchedUserEmail: userEmail,
        exactIdMatches: 0,
        exactEmailMatches: 0,
        partialIdMatches: [],
        partialEmailMatches: [],
        allUniqueUserIds: [],
        allUniqueEmails: [],
        sampleNotifications: []
      },
      structureAnalysis: {
        validStructure: 0,
        invalidStructure: 0,
        emptyUserArrays: 0,
        nullUserArrays: 0,
        examples: []
      },
      recommendations: []
    };

    try {
      // 1. Vérifier l'existence du fichier
      analysis.fileExists = fs.existsSync(this.FILE_PATH);
      if (!analysis.fileExists) {
        analysis.recommendations.push(`Fichier non trouvé: ${this.FILE_PATH}`);
        return analysis;
      }

      // 2. Lire le fichier
      const stats = fs.statSync(this.FILE_PATH);
      analysis.fileSize = stats.size;

      if (analysis.fileSize === 0) {
        analysis.recommendations.push('Fichier vide - aucune notification disponible');
        return analysis;
      }

      const rawContent = fs.readFileSync(this.FILE_PATH, 'utf8');
      const notifications: FileNotification[] = JSON.parse(rawContent);
      analysis.totalNotifications = notifications.length;

      if (notifications.length === 0) {
        analysis.recommendations.push('Fichier JSON valide mais aucune notification trouvée');
        return analysis;
      }

      // 3. Analyser la structure et collecter les données
      const allUserIds = new Set<string>();
      const allEmails = new Set<string>();

      notifications.forEach((notification, index) => {
        // Analyser la structure
        if (!notification.userId) {
          analysis.structureAnalysis.nullUserArrays++;
          analysis.structureAnalysis.examples.push({
            notificationId: notification.id,
            userIdType: typeof notification.userId,
            userIdValue: notification.userId,
            isValid: false
          });
        } else if (!Array.isArray(notification.userId)) {
          analysis.structureAnalysis.invalidStructure++;
          analysis.structureAnalysis.examples.push({
            notificationId: notification.id,
            userIdType: typeof notification.userId,
            userIdValue: notification.userId,
            isValid: false
          });
        } else if (notification.userId.length === 0) {
          analysis.structureAnalysis.emptyUserArrays++;
          analysis.structureAnalysis.examples.push({
            notificationId: notification.id,
            userIdType: 'array',
            userIdValue: notification.userId,
            isValid: false
          });
        } else {
          analysis.structureAnalysis.validStructure++;
          
          // Collecter les échantillons
          if (analysis.userAnalysis.sampleNotifications.length < 5) {
            analysis.userAnalysis.sampleNotifications.push({
              id: notification.id,
              users: notification.userId,
              userCount: notification.userId.length
            });
          }

          // Analyser les utilisateurs
          notification.userId.forEach(user => {
            if (user.id) allUserIds.add(user.id);
            if (user.email) allEmails.add(user.email);

            // Correspondances exactes
            if (user.id === userId) {
              analysis.userAnalysis.exactIdMatches++;
            }
            if (user.email === userEmail) {
              analysis.userAnalysis.exactEmailMatches++;
            }

            // Correspondances partielles (pour détecter les erreurs de casse, espaces, etc.)
            if (user.id && user.id.toLowerCase().includes(userId.toLowerCase()) && user.id !== userId) {
              analysis.userAnalysis.partialIdMatches.push({
                notificationId: notification.id,
                foundId: user.id,
                similarity: this.calculateSimilarity(userId, user.id)
              });
            }

            if (user.email && user.email.toLowerCase().includes(userEmail.toLowerCase()) && user.email !== userEmail) {
              analysis.userAnalysis.partialEmailMatches.push({
                notificationId: notification.id,
                foundEmail: user.email,
                similarity: this.calculateSimilarity(userEmail, user.email)
              });
            }
          });
        }
      });

      analysis.userAnalysis.allUniqueUserIds = Array.from(allUserIds).sort();
      analysis.userAnalysis.allUniqueEmails = Array.from(allEmails).sort();

      // 4. Générer les recommandations
      this.generateRecommendations(analysis);

      return analysis;

    } catch (error) {
      analysis.recommendations.push(`Erreur lors de l'analyse: ${error}`);
      return analysis;
    }
  }

  private static calculateSimilarity(str1: string, str2: string): string {
    if (str1.toLowerCase() === str2.toLowerCase()) return 'Casse différente';
    if (str1.trim() === str2.trim()) return 'Espaces en trop';
    if (str1.includes(str2) || str2.includes(str1)) return 'Contient';
    return 'Différent';
  }

  private static generateRecommendations(analysis: ContentAnalysis): void {
    const { userAnalysis, structureAnalysis, totalNotifications } = analysis;

    // Recommandations basées sur la structure
    if (structureAnalysis.invalidStructure > 0) {
      analysis.recommendations.push(
        `⚠️ ${structureAnalysis.invalidStructure} notifications ont une structure userId invalide (pas un array)`
      );
    }

    if (structureAnalysis.emptyUserArrays > 0) {
      analysis.recommendations.push(
        `⚠️ ${structureAnalysis.emptyUserArrays} notifications ont un array userId vide`
      );
    }

    if (structureAnalysis.nullUserArrays > 0) {
      analysis.recommendations.push(
        `⚠️ ${structureAnalysis.nullUserArrays} notifications ont userId null/undefined`
      );
    }

    // Recommandations basées sur l'utilisateur
    if (userAnalysis.exactIdMatches === 0 && userAnalysis.exactEmailMatches === 0) {
      analysis.recommendations.push(
        `❌ Aucune correspondance exacte trouvée pour l'utilisateur ${userAnalysis.searchedUserId} / ${userAnalysis.searchedUserEmail}`
      );

      if (userAnalysis.allUniqueUserIds.length > 0) {
        analysis.recommendations.push(
          `💡 IDs utilisateurs disponibles dans le fichier: ${userAnalysis.allUniqueUserIds.slice(0, 10).join(', ')}${userAnalysis.allUniqueUserIds.length > 10 ? '...' : ''}`
        );
      }

      if (userAnalysis.allUniqueEmails.length > 0) {
        analysis.recommendations.push(
          `💡 Emails disponibles dans le fichier: ${userAnalysis.allUniqueEmails.slice(0, 10).join(', ')}${userAnalysis.allUniqueEmails.length > 10 ? '...' : ''}`
        );
      }

      if (userAnalysis.partialIdMatches.length > 0) {
        analysis.recommendations.push(
          `🔍 IDs similaires trouvés: ${userAnalysis.partialIdMatches.map(m => `${m.foundId} (${m.similarity})`).join(', ')}`
        );
      }

      if (userAnalysis.partialEmailMatches.length > 0) {
        analysis.recommendations.push(
          `🔍 Emails similaires trouvés: ${userAnalysis.partialEmailMatches.map(m => `${m.foundEmail} (${m.similarity})`).join(', ')}`
        );
      }
    } else {
      analysis.recommendations.push(
        `✅ ${userAnalysis.exactIdMatches} correspondances par ID et ${userAnalysis.exactEmailMatches} par email trouvées`
      );
    }

    // Recommandations générales
    if (totalNotifications === 0) {
      analysis.recommendations.push('📝 Créez des notifications de test dans le fichier JSON');
    } else if (structureAnalysis.validStructure === 0) {
      analysis.recommendations.push('🔧 Corrigez la structure du fichier JSON - aucune notification valide trouvée');
    }
  }

  /**
   * Créer une notification de test pour l'utilisateur
   */
  static generateTestNotification(userId: string, userEmail: string, userName: string): FileNotification {
    return {
      id: `test_${Date.now()}`,
      userId: [
        {
          id: userId,
          email: userEmail,
          name: userName,
          role: 'ADMIN'
        }
      ],
      role: 'ADMIN',
      module: 'SYSTEM',
      actionType: 'TEST',
      message: {
        fr: 'Notification de test',
        en: 'Test notification'
      },
      details: 'Ceci est une notification de test générée automatiquement',
      createdAt: new Date().toISOString(),
      isRead: false,
      severity: 'INFO'
    };
  }

  /**
   * Suggérer des corrections pour le fichier
   */
  static async suggestCorrections(userId: string, userEmail: string): Promise<string[]> {
    const analysis = await this.analyzeForUser(userId, userEmail);
    const suggestions: string[] = [];

    if (!analysis.fileExists) {
      suggestions.push('1. Créer le fichier /var/www/labo.sekrane.fr/data/notifications.json');
      suggestions.push('2. Ajouter une structure JSON valide avec un array de notifications');
    } else if (analysis.totalNotifications === 0) {
      suggestions.push('1. Ajouter des notifications dans le fichier JSON');
      suggestions.push('2. Utiliser la structure: [{"id": "...", "userId": [{"id": "USER_001", "email": "admin@labo.fr", ...}], ...}]');
    } else if (analysis.userAnalysis.exactIdMatches === 0) {
      suggestions.push(`1. Vérifier que l'utilisateur ${userId} existe dans les notifications`);
      suggestions.push(`2. Vérifier que l'email ${userEmail} correspond`);
      
      if (analysis.userAnalysis.allUniqueUserIds.length > 0) {
        suggestions.push(`3. IDs disponibles: ${analysis.userAnalysis.allUniqueUserIds.join(', ')}`);
      }
      
      suggestions.push('4. Ajouter une notification de test avec generateTestNotification()');
    }

    return suggestions;
  }
}