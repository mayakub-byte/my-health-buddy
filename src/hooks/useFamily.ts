// ============================================
// MY HEALTH BUDDY - useFamily Hook
// Manages family data from Supabase
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Family, FamilyMember } from '../types';

const FAMILY_STORAGE_KEY = 'mhb_family_id';

export function useFamily() {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load family data on mount and when auth state changes (e.g. after login on new device)
  useEffect(() => {
    loadFamily();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadFamily();
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadFamily = async () => {
    try {
      setLoading(true);

      let familyId: string | null = localStorage.getItem(FAMILY_STORAGE_KEY);

      if (familyId) {
        // Fetch family from Supabase by saved ID
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('id', familyId)
          .single();

        if (!familyError && familyData) {
          setFamily(familyData);
          const { data: membersData, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', familyId)
            .order('is_primary', { ascending: false });
          if (!membersError) setMembers(membersData || []);
          return;
        }
      }

      // No valid localStorage: if user is signed in, find family by user_id
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (userId) {
        const { data: familyData, error: familyError } = await supabase
          .from('families')
          .select('*')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (!familyError && familyData) {
          const fid = familyData.id;
          localStorage.setItem(FAMILY_STORAGE_KEY, fid);
          setFamily(familyData);
          const { data: membersData, error: membersError } = await supabase
            .from('family_members')
            .select('*')
            .eq('family_id', fid)
            .order('is_primary', { ascending: false });
          if (!membersError) setMembers(membersData || []);
        }
      }
    } catch (err) {
      console.error('Error loading family:', err);
      setError(err instanceof Error ? err.message : 'Failed to load family');
    } finally {
      setLoading(false);
    }
  };

  // Create new family
  const createFamily = async (
    familyName: string,
    familyMembers: Partial<FamilyMember>[]
  ): Promise<Family | null> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');

      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName, user_id: user.id })
        .select()
        .single();

      if (familyError) throw familyError;

      // Create family members
      const membersToInsert = familyMembers.map((member, index) => ({
        ...member,
        family_id: newFamily.id,
        is_primary: index === 0,
        avatar_color: getAvatarColor(index),
      }));

      const { data: newMembers, error: membersError } = await supabase
        .from('family_members')
        .insert(membersToInsert)
        .select();

      if (membersError) throw membersError;

      // Save to state and localStorage
      setFamily(newFamily);
      setMembers(newMembers || []);
      localStorage.setItem(FAMILY_STORAGE_KEY, newFamily.id);

      return newFamily;
    } catch (err) {
      console.error('Error creating family:', err);
      setError(err instanceof Error ? err.message : 'Failed to create family');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Add family member
  const addMember = async (member: Partial<FamilyMember>): Promise<FamilyMember | null> => {
    if (!family) return null;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .insert({
          ...member,
          family_id: family.id,
          avatar_color: getAvatarColor(members.length),
        })
        .select()
        .single();

      if (error) throw error;
      
      setMembers([...members, data]);
      return data;
    } catch (err) {
      console.error('Error adding member:', err);
      setError(err instanceof Error ? err.message : 'Failed to add member');
      return null;
    }
  };

  // Update family member
  const updateMember = async (
    memberId: string,
    updates: Partial<FamilyMember>
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update(updates)
        .eq('id', memberId);

      if (error) throw error;

      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, ...updates } : m))
      );
      return true;
    } catch (err) {
      console.error('Error updating member:', err);
      return false;
    }
  };

  // Delete family member
  const deleteMember = async (memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(members.filter((m) => m.id !== memberId));
      return true;
    } catch (err) {
      console.error('Error deleting member:', err);
      return false;
    }
  };

  // Reset family (for testing/logout)
  const resetFamily = () => {
    localStorage.removeItem(FAMILY_STORAGE_KEY);
    setFamily(null);
    setMembers([]);
  };

  return {
    family,
    members,
    loading,
    error,
    createFamily,
    addMember,
    updateMember,
    deleteMember,
    resetFamily,
    refreshFamily: loadFamily,
  };
}

// Helper function to get consistent avatar colors
function getAvatarColor(index: number): string {
  const colors = [
    '#4CAF50', // Green
    '#2196F3', // Blue
    '#FF9800', // Orange
    '#E91E63', // Pink
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
  ];
  return colors[index % colors.length];
}
