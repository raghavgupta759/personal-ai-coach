import React, { useState } from 'react';
import {
  Settings,
  User as UserIcon,
  Save,
  Trash2,
  Download,
  Shield,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../api';
import type { User } from '../types';

interface SettingsViewProps {
  user: User;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  onUpdateUser,
  onLogout,
}) => {
  const [name, setName] = useState(user.name);
  const [targetRole, setTargetRole] = useState(user.target_role || '');
  const [targetCompany, setTargetCompany] = useState(user.target_company || '');
  const [experienceLevel, setExperienceLevel] = useState(user.experience_level || '');
  const [language, setLanguage] = useState(user.preferred_language || 'en');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    try {
      const res = await api.updateMe({
        name,
        target_role: targetRole,
        target_company: targetCompany,
        experience_level: experienceLevel,
        preferred_language: language,
      });
      onUpdateUser(res.user);
      setSuccessMsg('Profile updated successfully.');
    } catch (e: any) {
      alert('Could not update profile: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const [interviews, analyses, studyPacks] = await Promise.all([
        api.listInterviews(),
        api.listAnalyses(),
        api.listStudyPacks(),
      ]);

      const data = {
        user,
        interviews: interviews.interviews,
        analyses: analyses.analyses,
        studyPacks: studyPacks.studyPacks,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personal_ai_coach_data_${user.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Export failed.');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.deleteAccount();
      alert('Account and data deleted.');
      onLogout();
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-12">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
          <Settings className="w-3.5 h-3.5 text-cyan-400" />
          <span>Profile & Privacy Controls</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Account Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your preparation target role, company preferences, data exports, and security settings.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/50 border border-emerald-900/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-slate-800/90 border-t-white/[0.12] space-y-6 shadow-2xl relative overflow-hidden">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-cyan-400" />
          <span>Candidate Information</span>
        </h3>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-3d w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-slate-800/90 rounded-xl text-xs text-slate-400 cursor-not-allowed shadow-inner"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Job Role</label>
              <input
                type="text"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g. Senior Full-Stack Engineer"
                className="input-3d w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Target Company</label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Stripe, Google, Datadog"
                className="input-3d w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="input-3d w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none bg-slate-950"
              >
                <option value="Junior (0-2 years)">Junior (0-2 years)</option>
                <option value="Mid-Level (3-5 years)">Mid-Level (3-5 years)</option>
                <option value="Senior (5-8 years)">Senior (5-8 years)</option>
                <option value="Staff / Principal (8+ years)">Staff / Principal (8+ years)</option>
                <option value="Engineering Manager">Engineering Manager</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-3d w-full px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none bg-slate-950"
              >
                <option value="en">English (United States)</option>
                <option value="en-gb">English (United Kingdom)</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-3d-primary px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider cursor-pointer flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Data Export & Account Deletion */}
      <div className="glass-panel-3d p-6 sm:p-8 rounded-3xl border border-slate-800/90 border-t-white/[0.12] space-y-6 shadow-2xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span>Data Privacy & Security Controls</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2 card-3d-hover">
            <h4 className="text-xs font-bold text-white">Export Your Data</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Download a complete JSON export of your uploaded resumes, analyses, mock transcripts, and scores.
            </p>
            <button
              onClick={handleExportData}
              className="mt-2 btn-3d-secondary px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download JSON Export</span>
            </button>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/30 border border-rose-900/50 space-y-2 card-3d-hover">
            <h4 className="text-xs font-bold text-rose-300">Delete Account & Data</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Permanently delete your profile, documents, analyses, and mock interview transcripts.
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="mt-2 px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/60 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Account</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleDeleteAccount}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-md shadow-rose-950"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
