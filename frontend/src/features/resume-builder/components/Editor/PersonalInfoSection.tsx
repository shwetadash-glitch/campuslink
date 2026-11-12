"use client";

import React, { useRef } from 'react';
import { PersonalInfo } from '../../types';
import { User, Mail, Phone, MapPin, Globe, Linkedin, Github, Trash2 } from '../Icons';

interface PersonalInfoSectionProps {
  personalInfo: PersonalInfo;
  onChange: (updates: Partial<PersonalInfo>) => void;
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  personalInfo,
  onChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onChange({ avatarUrl: reader.result as string, showAvatar: true });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      {/* Profile Photo Control */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12 rounded-full overflow-hidden bg-slate-200 border-2 border-slate-300 flex items-center justify-center flex-shrink-0">
            {personalInfo.avatarUrl ? (
              <img
                src={personalInfo.avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">Profile Photo</span>
              <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-semibold">
                Optional
              </span>
            </div>
            <p className="text-3xs text-slate-500">
              Tech & Executive resumes often omit photos for pure ATS scoring; Creative templates support it.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 text-2xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            {personalInfo.avatarUrl ? 'Change Photo' : 'Upload'}
          </button>
          {personalInfo.avatarUrl && (
            <button
              type="button"
              onClick={() => onChange({ avatarUrl: '', showAvatar: false })}
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Remove photo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <label className="flex items-center gap-1.5 text-2xs text-slate-600 cursor-pointer pl-1">
            <input
              type="checkbox"
              checked={personalInfo.showAvatar}
              onChange={(e) => onChange({ showAvatar: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Show on resume</span>
          </label>
        </div>
      </div>

      {/* Basic Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Full Name *
          </label>
          <div className="relative">
            <input
              type="text"
              value={personalInfo.fullName}
              onChange={(e) => onChange({ fullName: e.target.value })}
              placeholder="e.g. Alexander Vance"
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Professional Title *
          </label>
          <input
            type="text"
            value={personalInfo.jobTitle}
            onChange={(e) => onChange({ jobTitle: e.target.value })}
            placeholder="e.g. Staff Full-Stack Engineer"
            className="w-full text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Email Address *
          </label>
          <div className="relative">
            <input
              type="email"
              value={personalInfo.email}
              onChange={(e) => onChange({ email: e.target.value })}
              placeholder="alex@domain.com"
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Phone Number *
          </label>
          <div className="relative">
            <input
              type="tel"
              value={personalInfo.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Location (City, State / Country)
          </label>
          <div className="relative">
            <input
              type="text"
              value={personalInfo.location}
              onChange={(e) => onChange({ location: e.target.value })}
              placeholder="San Francisco, CA"
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            Personal Website / Portfolio
          </label>
          <div className="relative">
            <input
              type="text"
              value={personalInfo.website}
              onChange={(e) => onChange({ website: e.target.value })}
              placeholder="alexvance.dev"
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            LinkedIn Profile
          </label>
          <div className="relative">
            <input
              type="text"
              value={personalInfo.linkedin}
              onChange={(e) => onChange({ linkedin: e.target.value })}
              placeholder="linkedin.com/in/username"
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <Linkedin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div>
          <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wide mb-1">
            GitHub / Code Profile
          </label>
          <div className="relative">
            <input
              type="text"
              value={personalInfo.github}
              onChange={(e) => onChange({ github: e.target.value })}
              placeholder="github.com/username"
              className="w-full text-xs pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
            <Github className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
