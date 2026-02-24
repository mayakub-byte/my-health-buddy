// ============================================
// MY HEALTH BUDDY - useFamily Hook
// Manages family data from Supabase
// ============================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Family, FamilyMember } from '../types';

const FAMILY_STORAGE_KEY = 'mhb_family_id';

/** Normalize date to YYYY-MM-DD for Supabase date column */
function toISODate(value: string): string {
  if (!value) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parts = value.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts;
    if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
    return `${c}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`;
  }
  return value;
}

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

      // Safety timeout — don't hang forever if Supabase is unreachable
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Family load timed out')), 10000)
      );

      await Promise.race([loadFamilyInner(), timeout]);
    } catch (err) {
      console.error('Error loading family:', err);
      setError(err instanceof Error ? err.message : 'Failed to load family');
    } finally {
      setLoading(false);
    }
  };

  const loadFamilyInner = async () => {
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
          .order('created_at', { ascending: true })
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
  };

  // Create new family - returns { family, error } so UI can show specific error
  const createFamily = async (
    familyName: string,
    familyMembers: Partial<FamilyMember>[]
  ): Promise<{ family: Family | null; error: string | null }> => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        const msg = 'Not signed in. Please log in and try again.';
        setError(msg);
        return { family: null, error: msg };
      }

      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({ name: familyName, user_id: user.id })
        .select()
        .single();

      if (familyError) {
        const msg = familyError.message || JSON.stringify(familyError);
        console.error('SAVE ERROR (createFamily - families table):', msg);
        setError(msg);
        return { family: null, error: msg };
      }

      // Create family members - build clean insert objects with exact column names
      const membersToInsert = familyMembers.map((member, index) => {
        const rawDob = member.dob != null && member.dob !== '' ? member.dob : undefined;
        const dob = rawDob ? (rawDob.includes('/') ? toISODate(rawDob) : rawDob) : undefined;
        const row: Record<string, unknown> = {
          family_id: newFamily.id,
          name: (member.name || '').trim() || '',
          is_primary: index === 0,
          avatar_color: getAvatarColor(index),
          health_conditions: Array.isArray(member.health_conditions) ? member.health_conditions : [],
          dietary_preferences: Array.isArray(member.dietary_preferences) ? member.dietary_preferences : [],
        };
        if (dob) row.dob = dob;
        if (member.age_group != null) row.age_group = member.age_group;
        if (member.age != null) row.age = member.age;
        if (member.role != null) row.role = member.role;
        if (member.relationship != null && member.relationship !== '') row.relationship = member.relationship;
        return row;
      });

      console.log('=== SAVE DEBUG (createFamily members) ===');
      console.log('family_id:', newFamily.id);
      console.log('Payload:', JSON.stringify(membersToInsert, null, 2));

      const { data: newMembers, error: membersError } = await supabase
        .from('family_members')
        .insert(membersToInsert)
        .select();

      console.log('Result:', newMembers);
      console.log('Error:', JSON.stringify(membersError, null, 2));

      if (membersError) {
        const msg = membersError.message || JSON.stringify(membersError);
        console.error('SAVE ERROR (createFamily members):', msg, membersError);
        console.error('PAYLOAD:', JSON.stringify(membersToInsert, null, 2));
        setError(msg);
        return { family: null, error: msg };
      }

      // Save to state and localStorage
      setFamily(newFamily);
      setMembers(newMembers || []);
      localStorage.setItem(FAMILY_STORAGE_KEY, newFamily.id);

      return { family: newFamily, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create family';
      console.error('Error creating family:', err);
      setError(message);
      return { family: null, error: message };
    } finally {
      setLoading(false);
    }
  };

  // Add family member - returns { member, error } so UI can show specific error
  const addMember = async (member: Partial<FamilyMember>): Promise<{ member: FamilyMember | null; error: string | null }> => {
    if (!family) {
      const msg = 'No family loaded. Please refresh or complete family setup first.';
      console.error('FAMILY ID: null - family was not created properly');
      setError(msg);
      return { member: null, error: msg };
    }

    try {
      setError(null);
      // Normalize DOB to YYYY-MM-DD for Supabase date column
      const rawDob = member.dob != null && member.dob !== '' ? member.dob : undefined;
      const dob = rawDob ? (rawDob.includes('/') ? toISODate(rawDob) : rawDob) : undefined;

      const row: Record<string, unknown> = {
        family_id: family.id,
        name: (member.name || '').trim() || '',
        is_primary: false,
        avatar_color: getAvatarColor(members.length),
        health_conditions: Array.isArray(member.health_conditions) ? member.health_conditions : [],
        dietary_preferences: Array.isArray(member.dietary_preferences) ? member.dietary_preferences : [],
      };
      if (dob) row.dob = dob;
      if (member.age_group != null) row.age_group = member.age_group;
      if (member.age != null) row.age = member.age;
      if (member.role != null) row.role = member.role;
      if (member.relationship != null && member.relationship !== '') row.relationship = member.relationship;

      console.log('=== SAVE DEBUG (addMember) ===', { family_id: family.id, payload: row });

      const { data, error } = await supabase
        .from('family_members')
        .insert(row)
        .select()
        .single();

      if (error) {
        const msg = error.message || error.code || JSON.stringify(error);
        console.error('SAVE ERROR (addMember):', msg, error);
        console.error('PAYLOAD:', row);
        setError(msg);
        return { member: null, error: msg };
      }

      setMembers([...members, data]);
      return { member: data, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add member';
      console.error('Error adding member:', err);
      setError(message);
      return { member: null, error: message };
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

  // Auto-create default family for user (if none exists)
  const autoCreateDefaultFamily = async (): Promise<Family | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check if family already exists
      const { data: existingFamily, error: existingError } = await supabase
        .from('families')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.error('autoCreateDefaultFamily: families select failed:', existingError.message);
        return null;
      }
      if (existingFamily) {
        localStorage.setItem(FAMILY_STORAGE_KEY, existingFamily.id);
        setFamily(existingFamily);
        const { data: membersData, error: membersErr } = await supabase
          .from('family_members')
          .select('*')
          .eq('family_id', existingFamily.id)
          .order('is_primary', { ascending: false });
        if (!membersErr && membersData) setMembers(membersData);
        return existingFamily;
      }

      // Create new family
      const userName = user.email?.split('@')[0] || 'User';
      const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

      const { data: newFamily, error: familyError } = await supabase
        .from('families')
        .insert({
          name: `${displayName}'s Family`,
          user_id: user.id,
          primary_user_email: user.email || '',
        })
        .select()
        .single();

      if (familyError) throw familyError;
      if (!newFamily) return null;

      // Add user as first member
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: newFamily.id,
          name: displayName,
          age: 25,
          health_conditions: [],
          dietary_preferences: [],
          is_primary: true,
          avatar_color: getAvatarColor(0),
        });

      if (memberError) {
        console.error('Failed to create default member:', memberError);
      }

      // Save to state and localStorage
      localStorage.setItem(FAMILY_STORAGE_KEY, newFamily.id);
      setFamily(newFamily);
      
      // Load members
      const { data: membersData, error: loadMembersErr } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', newFamily.id)
        .order('is_primary', { ascending: false });
      if (!loadMembersErr && membersData) setMembers(membersData);

      return newFamily;
    } catch (err) {
      console.error('Error auto-creating family:', err);
      return null;
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
    autoCreateDefaultFamily,
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
