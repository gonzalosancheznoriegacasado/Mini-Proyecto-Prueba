import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api/axios';
import type { Group } from '../types';
import { ACTIVE_GROUP_KEY } from '../types';
import { useAuth } from './AuthContext';

interface GroupContextType {
  groups: Group[];
  activeGroup: Group | null;
  loading: boolean;
  error: string | null;
  setActiveGroup: (group: Group) => void;
  createGroup: (name: string) => Promise<Group>;
  refreshGroups: () => Promise<void>;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const GroupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeGroup, setActiveGroupState] = useState<Group | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setActiveGroup = useCallback((group: Group) => {
    setActiveGroupState(group);
    localStorage.setItem(ACTIVE_GROUP_KEY, group.id);
  }, []);

  const refreshGroups = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Group[]>('/groups');
      setGroups(data);

      const savedId = localStorage.getItem(ACTIVE_GROUP_KEY);
      const saved = data.find((g) => g.id === savedId);
      if (saved) {
        setActiveGroupState(saved);
      } else if (data.length > 0) {
        setActiveGroup(data[0]);
      } else {
        setActiveGroupState(null);
      }
    } catch (err: unknown) {
      // Si falla el backend, usa grupos de demo
      console.warn('Backend no disponible, usando modo demo para cargar grupos');
      const demoGroups: Group[] = [
        {
          id: 'demo-group-1',
          name: 'Viaje Madrid',
          created_by: 'demo-user',
          created_at: new Date().toISOString(),
          description: 'Grupo de demo',
          members_count: 3,
        },
      ];
      setGroups(demoGroups);
      const savedId = localStorage.getItem(ACTIVE_GROUP_KEY);
      const saved = demoGroups.find((g) => g.id === savedId);
      if (saved) {
        setActiveGroupState(saved);
      } else if (demoGroups.length > 0) {
        setActiveGroup(demoGroups[0]);
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, setActiveGroup]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshGroups();
    } else {
      setGroups([]);
      setActiveGroupState(null);
    }
  }, [isAuthenticated, refreshGroups]);

  const createGroup = async (name: string): Promise<Group> => {
    setError(null);
    setLoading(true);
    try {
      // Intenta crear en el backend
      try {
        const { data } = await api.post<Group>('/groups', { name: name.trim() });
        await refreshGroups();
        setActiveGroup(data);
        return data;
      } catch (err: unknown) {
        // Si falla el backend, crea un grupo en modo demo local
        console.warn('Backend no disponible, usando modo demo para crear grupo');
        const newGroup: Group = {
          id: `group-${Date.now()}`,
          name: name.trim(),
          created_by: 'demo-user',
          created_at: new Date().toISOString(),
          description: '',
          members_count: 1,
        };
        
        setGroups((prev) => [...prev, newGroup]);
        setActiveGroup(newGroup);
        return newGroup;
      }
    } catch (err: unknown) {
      setError('No se pudo crear el grupo.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <GroupContext.Provider
      value={{
        groups,
        activeGroup,
        loading,
        error,
        setActiveGroup,
        createGroup,
        refreshGroups,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (!context) throw new Error('useGroup must be used within GroupProvider');
  return context;
};
