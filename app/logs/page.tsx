// app/logs/page.tsx
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AuditLogViewer } from '@/components/audit/AuditLogViewer';

export const metadata: Metadata = {
  title: 'Journaux d\'Audit - LABO LIMS',
  description: 'Consultation des journaux d\'audit et d\'activité du système LABO LIMS',
};

export default async function LogsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/auth/signin');
  }

  // Vérifier les permissions - seuls les admins et enseignants peuvent voir tous les logs
  const userRole = (session.user as any).role;
  const hasFullAccess = userRole === 'ADMIN' || userRole === 'ADMINLABO';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Journaux d'Audit
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Consultation des activités et événements du système LABO LIMS
                </p>
              </div>
              
              {/* Badge de statut */}
              <div className="flex items-center space-x-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
                  <span className="text-sm text-gray-600">Système actif</span>
                </div>
              </div>
            </div>
          </div>

          {/* Dashboard principal */}
          <AuditLogViewer />
        </div>
      </div>
    </div>
  );
}
