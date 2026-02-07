// ============================================
// MY HEALTH BUDDY - Meal Input / Dashboard
// Main home screen after login: snap meal or describe, then analyze
// ============================================

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { useFamily } from '../hooks/useFamily';
import { supabase } from '../lib/supabase';
import type { FamilyMember } from '../types';

export default function MealInput() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { members } = useFamily();

  const [userName, setUserName] = useState<string>('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const name =
        user?.user_metadata?.full_name ??
        user?.user_metadata?.name ??
        (user?.email ? user.email.split('@')[0] : null);
      setUserName(name || 'there');
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
  }, [members, selectedMemberId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setManualText('');
    }
    e.target.value = '';
  };

  const handleAnalyze = () => {
    if (!imageFile && !manualText.trim()) return;
    navigate('/scan/confirm', {
      state: {
        imageFile: imageFile ?? undefined,
        imagePreview: imagePreview ?? undefined,
        manualText: manualText.trim() || undefined,
        selectedMemberId: selectedMemberId ?? undefined,
      },
    });
  };

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

  const canAnalyze = !!imageFile || manualText.trim().length > 0;

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col pb-24">
      {/* Top: Greeting + Date */}
      <header className="px-4 pt-6 pb-3">
        <h1 className="text-xl font-bold text-neutral-800">
          Hello, {userName}! 👋
        </h1>
        <p className="text-neutral-500 text-sm mt-0.5">{today}</p>
      </header>

      {/* Family member horizontal scroll */}
      <section className="px-4 pb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {members.map((member) => (
            <MemberChip
              key={member.id}
              member={member}
              isSelected={selectedMemberId === member.id}
              onSelect={() => setSelectedMemberId(member.id)}
            />
          ))}
          {members.length === 0 && (
            <p className="text-sm text-neutral-400 py-2">No family members yet</p>
          )}
        </div>
      </section>

      {/* Main: Camera zone + manual entry */}
      <main className="flex-1 px-4">
        <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 overflow-hidden">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-10 flex flex-col items-center justify-center gap-2 text-neutral-500 hover:border-green-400 hover:bg-green-50/50 hover:text-green-600 transition-colors"
          >
            {imagePreview ? (
              <img
                src={imagePreview}
                alt="Captured meal"
                className="w-full h-40 object-cover"
              />
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-neutral-200 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-neutral-500" />
                </div>
                <span className="font-medium">Snap your meal</span>
              </>
            )}
          </button>
        </div>

        <p className="text-center text-neutral-400 text-sm mt-3">Or describe your meal</p>
        <input
          type="text"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          placeholder="e.g. Rice, dal, curry, and curd"
          className="input-field mt-2"
        />

        <button
          onClick={handleAnalyze}
          disabled={!canAnalyze}
          className="mt-4 w-full py-3.5 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold disabled:opacity-50 disabled:pointer-events-none transition-colors"
        >
          Analyze Meal
        </button>
      </main>
    </div>
  );
}

function MemberChip({
  member,
  isSelected,
  onSelect,
}: {
  member: FamilyMember;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const initial = member.name?.charAt(0)?.toUpperCase() || '?';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex-shrink-0 flex items-center gap-2 rounded-full pl-1 pr-3 py-1.5 border-2 transition-colors ${
        isSelected
          ? 'border-green-500 bg-green-50 text-green-700'
          : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
      }`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white"
        style={{ backgroundColor: member.avatar_color || '#22c55e' }}
      >
        {initial}
      </div>
      <span className="text-sm font-medium">{member.name}</span>
    </button>
  );
}
