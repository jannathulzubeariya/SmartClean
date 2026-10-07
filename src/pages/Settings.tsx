import React, { useState, useEffect } from 'react';
import { Shield, PlayCircle, Save } from 'lucide-react';
import { api } from '../api/client';
import { useScan } from '../context/ScanContext';
import { Button } from '../components/Buttons';
import { FramedIcon } from '../components/FramedIcon';
import { CodeBlock } from '../components/CodeBlock';
import { SettingsControlIcon } from '../components/HandDrawnDecorations';

export const Settings: React.FC = () => {
  const { showToast, generateDemo } = useScan();
  const [settings, setSettings] = useState<any>({
    collision_policy: 'rename',
    duplicate_partial_kb: 64,
    max_history_entries: 500,
    auto_quarantine_before_delete: true
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const res = await api.getSettings();
    if (res.success && res.data) {
      setSettings(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await api.saveSettings(settings);
    setSaving(false);

    if (res.success) {
      showToast('Settings saved successfully', 'success');
    } else {
      showToast(res.error?.message || 'Failed to save settings', 'error');
    }
  };

  return (
    <div className="max-w-[1080px] mx-auto px-6 md:px-10 py-12 space-y-8 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-4 border-b-[1.5px] border-[var(--ink)] flex items-center gap-3">
        <FramedIcon icon={SettingsControlIcon} size="md" />
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-[var(--ink)]">
            Settings & Policies
          </h1>
          <p className="text-sm text-[var(--ink-soft)] mt-0.5">
            Configure safety barriers, collision handling, and local storage rules.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Safety Policies */}
        <div className="analog-card paper-grain p-6 space-y-6 text-xs">
          <div className="flex items-center gap-3 pb-3 border-b-[1.5px] border-[var(--ink)]/15">
            <FramedIcon icon={Shield} size="sm" />
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
              Safety & File Collision Handling
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="collision-policy" className="font-semibold text-sm text-[var(--ink)] block mb-1.5">
                Destination Collision Policy
              </label>
              <select
                id="collision-policy"
                value={settings.collision_policy || 'rename'}
                onChange={(e) => setSettings({ ...settings, collision_policy: e.target.value })}
                className="h-[44px] bg-[var(--paper)] border-[1.5px] border-[var(--ink)] rounded-[4px] px-3 text-xs text-[var(--ink)] focus:outline-none w-full max-w-sm cursor-pointer"
              >
                <option value="rename">Safe non-destructive rename: filename (1).ext</option>
                <option value="skip">Skip if destination exists</option>
              </select>
              <p className="text-xs text-[var(--ink-soft)] mt-1.5">
                SmartClean never overwrites an existing file. If a collision is encountered, it applies this policy.
              </p>
            </div>

            <div className="pt-4 border-t-[1.5px] border-[var(--ink)]/10">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_quarantine_before_delete ?? true}
                  onChange={(e) => setSettings({ ...settings, auto_quarantine_before_delete: e.target.checked })}
                  className="w-4 h-4 rounded-[2px] border-[1.5px] border-[var(--ink)] text-[var(--ink)] focus:ring-0 cursor-pointer"
                />
                <span className="font-medium text-sm text-[var(--ink)]">
                  Default delete action to Move to Quarantine (Reversible)
                </span>
              </label>
              <p className="text-xs text-[var(--ink-soft)] mt-1 pl-7">
                Protects against accidental loss by staging deletions in the quarantine vault first.
              </p>
            </div>
          </div>
        </div>

        {/* Protected Paths Box */}
        <div className="analog-card paper-grain p-6 space-y-4 text-xs">
          <div className="flex items-center gap-3 pb-3 border-b-[1.5px] border-[var(--ink)]/15">
            <FramedIcon icon={Shield} size="sm" />
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
              Protected Operating System Paths
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
            The following system locations are hard-blocked by SmartClean's path validation engine to prevent critical system instability:
          </p>
          <CodeBlock
            code={`• C:\\Windows and subdirectories\n• C:\\Program Files and C:\\Program Files (x86)\n• C:\\ProgramData and AppData\\Local\\Microsoft\n• System Volume Information, $Recycle.Bin, pagefile.sys\n• Linux / Unix: /bin, /sbin, /etc, /usr, /proc, /sys, /dev, /boot, /root`}
          />
        </div>

        {/* Demo Mode Generator Box */}
        <div className="analog-card paper-grain p-6 space-y-4 text-xs">
          <div className="flex items-center gap-3 pb-3 border-b-[1.5px] border-[var(--ink)]/15">
            <FramedIcon icon={PlayCircle} size="sm" />
            <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
              Demo Workspace Generator
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
            Generate a local sandbox folder (<code>SmartClean_Demo/</code>) populated with test files to verify duplicates detection, misplaced file moves, and quarantine restoration.
          </p>
          <Button
            type="button"
            variant="secondary"
            onClick={generateDemo}
          >
            <PlayCircle className="w-4 h-4 text-[var(--ink)]" />
            <span>Generate & Scan Demo Workspace</span>
          </Button>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={saving}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
};
