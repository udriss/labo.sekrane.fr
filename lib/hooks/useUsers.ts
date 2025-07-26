// lib/hooks/useUsers.ts
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export const useUsers = () => {
  const { data: session } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;

    const fetchUsers = async () => {
      try {
        // Utiliser la route complète si admin, sinon la route publique
        const endpoint = session.user.role === 'ADMIN' || session.user.role === 'ADMINLABO'
          ? '/api/utilisateurs' 
          : '/api/utilisateurs/public';
          
        const response = await fetch(endpoint);
        if (response.ok) {
          const data = await response.json();
          setUsers(data);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [session]);

  return { users, loading };
};